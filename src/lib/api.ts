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
        const text = trimmed.slice(emoji.length).trim().replace(/^[-–:：]\s*/, "");
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
  relationshipStage: string;
  style: string;
  gender: string;
}

const OPENER_PROMPTS: Record<string, string> = {
  "刚认识-男追女": "刚认识阶段，男生追女生。生成的开场白要自然不油腻，帮她容易接话。",
  "刚认识-女追男": "刚认识阶段，女生追男生。生成的开场白要自信有趣，吸引对方注意。",
  "暧昧期-男追女": "暧昧期，男生追女生。开场白可以稍微调皮一些，制造暧昧氛围。",
  "暧昧期-女追男": "暧昧期，女生追男生。开场白可以自信一些，表达兴趣。",
  "约会1-2次-男追女": "约会1-2次后，男生追女生。可以稍微放松一些，自然继续。",
  "约会1-2次-女追男": "约会1-2次后，女生追男生。可以主动一些，延续约会氛围。",
};

const OPENER_STYLES: Record<string, { emoji: string; label: string }> = {
  "wave": { emoji: "🌊", label: "淡定型" },
  "smirk": { emoji: "😏", label: "俏皮型" },
  "bolt": { emoji: "⚡", label: "简短型" },
};

export async function generateOpeningLines(params: OpenerParams): Promise<ReplyOption[]> {
  const { relationshipStage, style, gender } = params;
  const context = OPENER_PROMPTS[`${relationshipStage}-${gender}`] || "刚认识阶段，轻松自然的开场白。";
  const styleFilter = style !== "不限" ? `（优先${style}风格）` : "";

  const prompt = `${context}${styleFilter}\n\nGenerate 3 Chinese dating opener lines. Line 1 = calm/natural, Line 2 = playful, Line 3 = short/direct. Max 40 chars each. Output only the 3 lines, nothing else.`;

  const apiResponse = await getClient().chat.completions.create({
    model: "MiniMax-M2.7",
    messages: [
      { role: "system", content: "你是一个约会开场白助手。根据用户输入的场景，生成3条不同风格的开场白。每条一行，不超过40字。格式：淡定自然\n俏皮有趣\n简短直接。" },
      { role: "user", content: prompt },
    ],
    max_tokens: 600,
  });

  const content = apiResponse.choices?.[0]?.message?.content || "";

  const lines = content.split("\n").filter((l) => l.trim());
  const styleMap: Record<number, { emoji: string; label: string }> = {
    0: { emoji: "🌊", label: "淡定型" },
    1: { emoji: "😏", label: "俏皮型" },
    2: { emoji: "⚡", label: "简短型" },
  };

  const options: ReplyOption[] = [];
  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const text = lines[i].trim().replace(/^[\d①②③\.、:\-\[\]]+\s*/, "").trim();
    if (text) {
      options.push({ style: styleMap[i].label, emoji: styleMap[i].emoji, text });
    }
  }

  // Fallback: emoji-based parsing
  if (options.length < 3) {
    for (const line of lines) {
      const trimmed = line.trim();
      for (const [, { emoji, label }] of Object.entries(OPENER_STYLES)) {
        if (trimmed.startsWith(emoji)) {
          const text = trimmed.slice(emoji.length).trim().replace(/^[-–:：]\s*/, "").trim();
          if (text && !options.find((o) => o.emoji === emoji)) {
            options.push({ style: label, emoji, text });
          }
        }
      }
    }
  }

  // Final fallback
  if (options.length < 3) {
    const fallbacks: ReplyOption[] = [
      { style: "淡定型", emoji: "🌊", text: "最近天气不错，约杯咖啡？" },
      { style: "俏皮型", emoji: "😏", text: "刷到你好几次了，不约可惜" },
      { style: "简短型", emoji: "⚡", text: "在干嘛？" },
    ];
    while (options.length < 3) {
      options.push(fallbacks[options.length]);
    }
  }

  return options.slice(0, 3);
}
