import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.MINIMAX_API_KEY,
      baseURL: "https://api.minimaxi.com/v1",
    });
  }
  return client;
}

const SYSTEM_PROMPT = `你是一个约会短信助手。用户是在约会早期不知道怎么回复暧昧对象短信的人。

每次生成3个不同风格的回复建议，每个不超过40字：

1. 🥨 俏皮/调侃型：有点调皮、幽默、轻松自信
2. 🧱 正经回应型：真诚、有温度、认真回应对方
3. 🤷 简短敷衍型：冷淡、简短、显得不那么在乎

输出格式（严格按这个格式，不要其他内容）：
🥨 [俏皮内容]
🧱 [正经内容]
🤷 [敷衍内容]`;

export interface ReplyOption {
  style: string;
  emoji: string;
  text: string;
}

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

  // Parse response: look for 🥨 🧱 🤷 emoji prefixes
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
        const text = trimmed.slice(emoji.length).trim().replace(/^[-–:：]\s*/, "");
        if (text) options.push({ style, emoji, text });
      }
    }
  }

  // Fallback: try numbered list
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

  // Final fallback
  if (options.length === 0) {
    return [
      { style: "俏皮/调侃型", emoji: "🥨", text: "这个不错～有意思" },
      { style: "正经回应型", emoji: "🧱", text: "我也玩得很开心，期待下次见面" },
      { style: "简短敷衍型", emoji: "🤷", text: "嗯" },
    ];
  }

  return options.slice(0, 3);
}
