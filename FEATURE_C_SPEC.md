# FEATURE_C_SPEC.md — 开场白生成器（Feature C）

**Owner: W** | **Spec by: X** | **Status: Ready for development**

---

## 产品逻辑

### 输入
| 字段 | 类型 | 选项 |
|------|------|------|
| relationship_stage | string | "刚认识" / "暧昧期" / "约会1-2次" |
| style | string | "俏皮" / "正经" / "简短" |
| gender | string | "男追女" / "女追男" |

### 输出
3条开场白，每条包含：
- **emoji**: 表情符号
- **personality label**: 个性标签（如 "🌊 淡定型"）
- **text**: 开场白正文（一句话）
- **scene note**: 适用场景说明（10字以内）

### 示例

**输入:** `{ stage: "暧昧期", style: "俏皮", gender: "男追女" }`

**输出:**
```
[
  {
    emoji: "😏",
    label: "撩人型",
    text: "刷到你好几次了，不约可惜",
    scene: "对方近期动态相关"
  },
  {
    emoji: "🌊",
    label: "淡定型",
    text: "最近天气不错，出来坐坐？",
    scene: "刚认识想约见面"
  },
  {
    emoji: "⚡",
    label: "简短型",
    text: "在干嘛？",
    scene: "想快速开场"
  }
]
```

---

## 技术方案

### API Route
- **Endpoint:** `POST /api/opening-lines`
- **Auth:** None（免费功能入口）
- **Request body:** `{ stage, style, gender }`

### 实现
- 共用 `~/date-reply-assistant/src/lib/api.ts` 里的 MiniMax AI 调用逻辑
- 新 prompt，不同 system prompt
- 类似 Feature A 的 reply generation，但场景是"开场白"不是"回复"

### 文件位置
- API route: `~/date-reply-assistant/src/app/api/opening-lines/route.ts`
- Prompt 定义: 在 route.ts 内定义

---

## 与 Feature A 的关系

| 对比 | Feature A（回复建议） | Feature C（开场白） |
|------|---------------------|-------------------|
| 场景 | 用户收到消息，不知道怎么回 | 用户想主动发起聊天 |
| 输入 | 收到的消息 + 关系阶段 | 关系阶段 + 风格 + 性别 |
| 输出 | 3条回复选项 | 3条开场白 |

**共用infra，单独 prompt。** Feature A 代码在 `/lib/api.ts`，Feature C 参照它写。

---

## 开发顺序
1. W 先写 /api/opening-lines route
2. 前端页面 later（W自己决定要不要现在做）
3. Feature C 是留存点，先跑通 AI generation 就行
