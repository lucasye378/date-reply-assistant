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

function stripThinkingTags(raw: string): string {
  const OPEN = "<think>";
  const CLOSE = "</think>";
  const i = raw.indexOf(OPEN);
  const j = raw.indexOf(CLOSE, i + 1);
  if (i >= 0 && j > i) {
    return (raw.substring(0, i) + raw.substring(j + CLOSE.length)).trim();
  }
  return raw;
}

function extractContent(response: any): string {
  const choice = response.choices?.[0];
  if (!choice) return "";
  const raw = choice.message?.content || "";
  return stripThinkingTags(raw) || raw;
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

  const content = extractContent(response);

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

  const prompt = `对方 profile 内容：${profile}\n\n请根据这个 profile，生成3条不同风格的中文约会开场白，每条不超过40字。输出格式：
🥨 [俏皮型开场白]
🧱 [正经型开场白]
⚡ [简短型开场白]`;

  const response = await getClient().chat.completions.create({
    model: "MiniMax-M2.7",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
  });

  const content = extractContent(response);

  const lines = content.split("\n").filter((l) => l.trim());
  const styleMap: Record<number, { emoji: string; label: string }> = {
    0: { emoji: "🥨", label: "开场白1" },
    1: { emoji: "🧱", label: "开场白2" },
    2: { emoji: "⚡", label: "开场白3" },
  };

  const options: ReplyOption[] = [];
  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const line = lines[i].trim();
    // Strip emoji at start
    const text = line.replace(/^[🥨🧱⚡]\s*/, "").trim();
    if (text) {
      options.push({ style: styleMap[i].label, emoji: styleMap[i].emoji, text });
    }
  }

  if (options.length < 3) {
    const emojiMap: Record<string, string> = {
      "🥨": "开场白1", "🧱": "开场白2", "⚡": "开场白3",
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
      { style: "开场白1", emoji: "🥨", text: "最近天气不错，约杯咖啡？" },
      { style: "开场白2", emoji: "🧱", text: "刷到你好几次了，不约可惜" },
      { style: "开场白3", emoji: "⚡", text: "在干嘛？" },
    ];
    while (options.length < 3) {
      options.push(fallbacks[options.length]);
    }
  }

  return options.slice(0, 3);
}
