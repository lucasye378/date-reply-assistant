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

  const userPrompt = "对方profile：" + profile + "\n\n请给出3条约会开场白，每条40字以内。直接分3行输出。";

  const response = await getClient().chat.completions.create({
    model: "MiniMax-M2.7",
    messages: [
      { role: "system", content: "你是一个约会短信助手。用户需要约会开场白建议。直接输出3条，每条40字以内。分3行，每行一条，直接开始输出内容。" },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 600,
    temperature: 0.3,
  });

  // Extract: prefer reasoning_content for MiniMax M2.7
  const choice = response.choices?.[0];
  const content_raw = choice?.message?.content || "";
  const reasoning = (choice?.message as any)?.reasoning_content || "";
  const fromReasoning = stripThinking(reasoning);
  const content = hasChineseText(fromReasoning) && fromReasoning.length > 10
    ? fromReasoning
    : stripThinking(content_raw);
  console.log("[OPENER DEBUG] reasoning:", reasoning.substring(0, 300));
  console.log("[OPENER DEBUG] content_raw:", content_raw.substring(0, 300));
  console.log("[OPENER DEBUG] fromReasoning:", fromReasoning.substring(0, 200));
  console.log("[OPENER DEBUG] content:", content.substring(0, 200));

  // Split by newlines and parse
  const lines = content.split("\n").filter(function(l) { return l.trim().length > 2; });
  console.log("[OPENER DEBUG] lines:", lines);

  const styles = ["俏皮/调侃型", "正经回应型", "简短敷衍型"];
  const emojis = ["🥨", "🧱", "🤷"];
  const options: ReplyOption[] = [];

  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const line = lines[i].trim();
    const text = line.replace(/^[🥨🧱⚡\d.、:：\-\s]+/, "").trim();
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
