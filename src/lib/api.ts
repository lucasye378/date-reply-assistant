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

function hasChineseText(s: string): boolean {
  return /[\u4e00-\u9fa5][\u4e00-\u9fa5]/.test(s);
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

function extractOpener(response: any): string {
  const c = response.choices?.[0];
  if (!c) return "";
  const raw = c.message?.content || "";
  const reasoning = (c.message as any)?.reasoning_content || "";

  // Strategy: split by sentence-ending punctuation to separate openers
  const text = stripThinking(reasoning) || stripThinking(raw);

  // Split by 。！？ or emoji boundaries
  // First try splitting by 。or！or？
  const sentences = text.split(/[。！？]/);
  const openers: string[] = [];
  for (const sent of sentences) {
    const trimmed = sent.trim();
    // Only include if has enough Chinese chars (at least 5)
    const chineseChars = trimmed.match(/[\u4e00-\u9fa5]/g) || [];
    if (chineseChars.length >= 5) {
      openers.push(trimmed);
    }
  }

  if (openers.length >= 3) {
    return openers.slice(0, 3).join("\n");
  }

  // Last resort: return text and let fallback parsing handle
  return text;
}

const SYSTEM_PROMPT = `你是一个约会短信助手。用户是在约会早期不知道怎么回复暧昧对象短信的人。

每次生成3个不同风格的回复建议，每个不超过40字：

1. 俏皮/调侃型：有点调皮、幽默、轻松自信
2. 正经回应型：真诚、有温度、认真回应对方
3. 简短敷衍型：冷淡、简短、显得不那么在乎

输出格式（严格按这个格式，不要其他内容）：
🥨 [俏皮内容]
🧱 [正经内容]
🤷 [敷衍内容]`;

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
    ? `对方说："${theirMessage}"\n背景：${context}\n\n请给出3个回复建议。`
    : `对方说："${theirMessage}"\n\n请给出3个回复建议。`;

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

  const lines = content.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    for (const [emoji, style] of Object.entries(emojiMap)) {
      if (trimmed.startsWith(emoji)) {
        const text = trimmed.slice(emoji.length).trim().replace(/^[-:：]\s*/, "");
        if (text) options.push({ style, emoji, text });
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
        options.push({ style: styles[i], emoji: emojis[i], text });
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

  const userPrompt = `对方profile：${profile}\n\n直接输出3条中文开场白，每条不超过40字。格式：\n🥨 [俏皮型开场白]\n🧱 [正经型开场白]\n⚡ [简短型开场白]`;

  const systemPrompt = "你是一个约会开场白助手。直接输出3条开场白，每条不超过40字。格式：🥨+空格+开场白。直接输出内容，不要解释。";

  const response = await getClient().chat.completions.create({
    model: "MiniMax-M2.7",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });

  const content = extractOpener(response);

  const lines = content.split("\n").filter((l) => l.trim());
  const styleMap: Record<number, { emoji: string; label: string }> = {
    0: { emoji: "🥨", label: "俏皮型" },
    1: { emoji: "🧱", label: "正经型" },
    2: { emoji: "⚡", label: "简短型" },
  };

  const options: ReplyOption[] = [];
  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const line = lines[i].trim();
    const text = line.replace(/^[🥨🧱⚡]\s*/, "").trim();
    if (text) {
      options.push({ style: styleMap[i].label, emoji: styleMap[i].emoji, text });
    }
  }

  // Fallback: emoji-based extraction
  if (options.length < 3) {
    const emojiMap: Record<string, string> = {
      "🥨": "俏皮型", "🧱": "正经型", "⚡": "简短型",
    };
    for (const line of lines) {
      const trimmed = line.trim();
      for (const [emoji, label] of Object.entries(emojiMap)) {
        if (trimmed.startsWith(emoji)) {
          const text = trimmed.slice(emoji.length).trim().replace(/^[-:：]\s*/, "").trim();
          if (text && !options.find((o) => o.emoji === emoji)) {
            options.push({ style: label, emoji, text });
          }
        }
      }
    }
  }

  if (options.length < 3) {
    const fallbacks: ReplyOption[] = [
      { style: "俏皮型", emoji: "🥨", text: "刷到你好几次了，不约可惜～" },
      { style: "正经型", emoji: "🧱", text: "看到你也喜欢爬山，下次一起？" },
      { style: "简短型", emoji: "⚡", text: "在干嘛？" },
    ];
    while (options.length < 3) {
      options.push(fallbacks[options.length]);
    }
  }

  return options.slice(0, 3);
}
