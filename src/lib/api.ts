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

const SYSTEM_PROMPT = `你是一个约会短信助手。你的目标用户是在约会早期（1-3次见面后）不知道怎么回复暧昧对象/约会对象短信的人。

你的风格：
- 轻松、自然、不尴尬
- 有点小调皮但得体
- 简短（短信不用长篇大论）
- 帮助用户展现自信和有趣

每次你需要生成3个不同风格的回复建议：
1. 自信有趣型 - 有点调侃，展现幽默
2. 温柔确认型 - 表达兴趣但不过度
3. 简洁酷型 - 短一点，显得很忙但有兴趣

每个建议不超过50字。

用户会给你对方发来的短信内容，你需要根据上下文给出3个回复建议。`;

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

  // Parse the response - expect 3 options
  const options: ReplyOption[] = [];
  const lines = content.split("\n").filter((l) => l.trim());

  let currentStyle = "";
  let currentEmoji = "";
  let currentText = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[1-3][.、]/)) {
      if (currentText) {
        options.push({ style: currentStyle, emoji: currentEmoji, text: currentText });
      }
      // Extract style and emoji
      const match = trimmed.match(/^[1-3][.、]\s*([^\s]+)\s*[-–](.+)/);
      if (match) {
        currentStyle = match[1].replace(/[#*]/g, "");
        currentEmoji = "💬";
        currentText = match[2].trim();
      } else {
        currentStyle = "建议";
        currentEmoji = "💬";
        currentText = trimmed.replace(/^[1-3][.、]\s*/, "");
      }
    } else if (trimmed && currentText) {
      currentText += " " + trimmed;
    }
  }

  if (currentText && options.length < 3) {
    options.push({ style: currentStyle, emoji: currentEmoji, text: currentText });
  }

  // Fallback if parsing fails
  if (options.length === 0) {
    return [
      { style: "自信有趣", emoji: "😏", text: content.substring(0, 50) || "这个不错～" },
      { style: "温柔确认", emoji: "😊", text: "好的呀，我也玩得很开心！" },
      { style: "简洁酷", emoji: "👍", text: "嗯" },
    ];
  }

  return options.slice(0, 3);
}
