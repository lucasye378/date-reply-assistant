import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!process.env.MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY environment variable is not set");
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.MINIMAX_API_KEY,
      baseURL: "https://api.minimaxi.com/v1",
    });
  }
  return client;
}

function stripThinking(raw: string): string {
  let r = raw;
  for (;;) {
    const i = r.indexOf("<think>");
    const j = r.indexOf("</think>", i + 1);
    if (!(i >= 0 && j > i)) break;
    r = r.substring(0, i) + r.substring(j + 6);
  }
  return r.trim();
}

function hasChineseText(s: string): boolean {
  return /[\u4e00-\u9fa5][\u4e00-\u9fa5]/.test(s);
}

// Extract opener text from MiniMax M2.7 response
// The model is MiniMax-M2.7 (reasoning model) — reasoning_content has the actual output
// content is usually empty. reasoning_content format varies; we try multiple strategies.
function extractOpenerText(response: any): string {
  const choice = response.choices?.[0];
  if (!choice) return "";
  const reasoning = (choice.message as any)?.reasoning_content || "";
  const content = choice.message?.content || "";

  // Try content first (where Feature A successfully gets its output)
  const fromContent = stripThinking(content);
  if (hasChineseText(fromContent) && fromContent.length > 10) {
    return fromContent;
  }

  // Fallback to reasoning_content (MiniMax M2.7 may put opener there for reasoning tasks)
  const stripped = stripThinking(reasoning);

  // Strategy 1: numbered lines (1. xxx  2. xxx  3. xxx)
  const numbered = extractAllNumberedLines(stripped);
  if (numbered) return numbered;

  // Strategy 2: emoji-prefixed lines (🥨 xxx  🧱 xxx  🤷 xxx)
  const emojiLines = extractEmojiLines(stripped);
  if (emojiLines) return emojiLines;

  // Strategy 3: extract all Chinese sentences, filter by length (20-50 chars = likely opener)
  const sentences = extractChineseSentences(stripped);
  if (sentences.length >= 3) return sentences.slice(0, 3).join('\n');

  return fromContent || stripped;
}

// Find all numbered lines (1. xxx  2. xxx  3. xxx) and return them as joined string
function extractAllNumberedLines(s: string): string | null {
  const lines = s.split('\n');
  const openers: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Match: number + punctuation at start (1. 1、 1： etc.)
    if (/^[1-9][.、:：]/.test(trimmed)) {
      openers.push(trimmed.replace(/^[1-9][.、:：]\s*/, '').trim());
    }
  }
  if (openers.length >= 3) return openers.slice(0, 3).join('\n');
  return null;
}

// Find emoji-prefixed lines and return as joined string
function extractEmojiLines(s: string): string | null {
  const emojiMap: Record<string, string> = {
    "🥨": "俏皮", "🧱": "正经", "⚡": "简短", "💬": "回复",
  };
  const lines = s.split('\n');
  const openers: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    for (const [emoji, style] of Object.entries(emojiMap)) {
      if (trimmed.startsWith(emoji)) {
        openers.push(trimmed.slice(emoji.length).trim().replace(/^[-:：]\s*/, ''));
        break;
      }
    }
  }
  if (openers.length >= 3) return openers.slice(0, 3).join('\n');
  return null;
}

// Extract all Chinese sentences (5-60 chars) from string
function extractChineseSentences(s: string): string[] {
  // Split on common sentence-ending punctuation
  const segments = s.split(/[\u3002\uff01\uff1f\n]/);
  const sentences: string[] = [];
  for (const seg of segments) {
    const t = seg.trim();
    // Chinese opener is typically 5-60 chars
    if (t.length >= 5 && t.length <= 60 && hasChineseText(t)) {
      sentences.push(t);
    }
  }
  return sentences;
}


const SYSTEM_PROMPT = "你是一个约会短信助手。用户是在约会早期不知道怎么回复暧昧对象短信的人。\n\n每次生成3个不同风格的回复建议，每个不超过40字：\n\n1. 俏皮/调侃型：有点调皮、幽默、轻松自信\n2. 正经回应型：真诚、有温度、认真回应对方\n3. 简短敷衍型：冷淡、简短、显得不那么在乎\n\n输出格式（严格按这个格式，不要其他内容）：\n🥨 [俏皮内容]\n🧱 [正经内容]\n🤷 [敷衍内容]";

export interface ReplyOption {
  style: string;
  emoji: string;
  text: string;
  scene?: string;
}

// ============================================================
// Feature A: Reply Suggestions
// ============================================================

export async function generateReplySuggestions(
  theirMessage: string,
  context?: string
): Promise<ReplyOption[]> {
  const prompt = context
    ? "对方说：\"" + theirMessage + "\"\n背景：" + context + "\n\n请给出3个回复建议。"
    : "对方说：\"" + theirMessage + "\"\n\n请给出3个回复建议。";

  const response = await getClient().chat.completions.create({
    model: "MiniMax-M2.7",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_tokens: 800,
  });

  const content = response.choices?.[0]?.message?.content || "";

  const options: ReplyOption[] = [];

  const emojiMap: Record<string, string> = {
    "🥨": "俏皮/调侃型",
    "🧱": "正经回应型",
    "🤷": "简短敷衍型",
  };

  const lines = content.split("\n").filter(function(l) { return l.trim(); });
  for (const line of lines) {
    const trimmed = line.trim();
    for (const [emoji, style] of Object.entries(emojiMap)) {
      if (trimmed.startsWith(emoji)) {
        const text = trimmed.slice(emoji.length).trim().replace(/^[-:：]\s*/, "");
        if (text) options.push({ style: style, emoji: emoji, text: text });
      }
    }
  }

  if (options.length < 3) {
    const numbered = content.match(/^[1-3][.、]\s*(.+)/gm);
    if (numbered) {
      const styles = ["俏皮/调侃型", "正经回应型", "简短敷衍型"];
      const emojis = ["🥨", "🧱", "🤷"];
      for (let i = 0; i < Math.min(numbered.length, 3); i++) {
        const text = numbered[i].replace(/^[1-3][.、]\s*/, "");
        options.push({ style: styles[i], emoji: emojis[i], text: text });
      }
    }
  }

  if (options.length === 0) {
    return [
      { style: "俏皮/调侃型", emoji: "🥨", text: "这个不错～有意思" },
      { style: "正经回应型", emoji: "🧱", text: "我也玩得很开心，期待下次见面" },
      { style: "简短敷衍型", emoji: "🤷", text: "嗯" },
    ];
  }

  return options.slice(0, 3);
}

// ============================================================
// Feature C: Opening Line Generator
// ============================================================

interface OpenerParams {
  profile: string;
}

export async function generateOpeningLines(params: OpenerParams): Promise<ReplyOption[]> {
  const { profile } = params;

  const userPrompt = "对方profile：" + profile;

  const response = await getClient().chat.completions.create({
    model: "MiniMax-M2.7",
    messages: [
      { role: "system", content: "你是一个约会短信助手。用户需要约会开场白建议。\n\n每次生成3个不同风格的回复建议，每个不超过40字：\n\n1. 俏皮/调侃型：有点调皮、幽默、轻松自信\n2. 正经回应型：真诚、有温度、认真回应对方\n3. 简短敷衍型：冷淡、简短、显得不那么在乎\n\n输出格式（严格按这个格式，不要其他内容）：\n🥨 [俏皮内容]\n🧱 [正经内容]\n🤷 [敷衍内容]" },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 600,
    temperature: 0.3,
  });

  const content = extractOpenerText(response);

  // Parse: try numbered lines first
  const numbered = content.match(/^[1-9][.、:：]\s*(.+)/gm);
  if (numbered && numbered.length >= 3) {
    const styles = ["俏皮/调侃型", "正经回应型", "简短敷衍型"];
    const emojis = ["🥨", "🧱", "🤷"];
    const options: ReplyOption[] = [];
    for (let i = 0; i < Math.min(numbered.length, 3); i++) {
      const text = numbered[i].replace(/^[1-9][.、:：]\s*/, "").trim();
      if (text) options.push({ style: styles[i], emoji: emojis[i], text: text });
    }
    if (options.length === 3) return options;
  }

  // Split by newlines and assign styles
  const lines = content.split("\n").filter(function(l) { return l.trim().length > 3; });
  const styles = ["俏皮/调侃型", "正经回应型", "简短敷衍型"];
  const emojis = ["🥨", "🧱", "🤷"];
  const options: ReplyOption[] = [];

  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const text = lines[i].trim().replace(/^[🥨🧱⚡\d.、:：\-\s]+/, "").trim();
    if (text) {
      options.push({ style: styles[i], emoji: emojis[i], text: text });
    }
  }

  // Emoji-based fallback
  if (options.length < 3) {
    const emojiMap: Record<string, string> = {
      "🥨": "俏皮/调侃型", "🧱": "正经回应型", "⚡": "简短敷衍型",
    };
    for (const line of lines) {
      const trimmed = line.trim();
      for (const [emoji, style] of Object.entries(emojiMap)) {
        if (trimmed.startsWith(emoji)) {
          const text = trimmed.slice(emoji.length).trim().replace(/^[-:：]\s*/, "").trim();
          if (text && !options.find(function(o) { return o.emoji === emoji; })) {
            options.push({ style: style, emoji: emoji, text: text });
          }
        }
      }
    }
  }

  if (options.length < 3) {
    return [
      { style: "俏皮/调侃型", emoji: "🥨", text: "刷到你好几次了，不约可惜～" },
      { style: "正经回应型", emoji: "🧱", text: "看到你也喜欢爬山，下次一起？" },
      { style: "简短敷衍型", emoji: "🤷", text: "在干嘛？" },
    ];
  }

  return options.slice(0, 3);
}
