#!/usr/bin/env python3
import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Translations map
translations = {
    '💬 约会短信助手': '💬 Dating Reply Assistant',
    '收到暧昧消息不知道怎么回？AI 帮你生成3个回复选项': "Don't know how to reply to your crush? Get 3 reply options powered by AI",
    '免费试用 ': 'Free trial ',
    ' 次，不绑卡': ' uses, no card needed',
    '试用次数已用完': 'Free uses exhausted',
    '解锁 Pro，无限用 →': 'Unlock Pro, unlimited →',
    '他们发的是...': "What they sent...",
    '粘贴对方发来的短信...': 'Paste their message here...',
    '选择关系阶段': 'Select relationship stage',
    '📌': '📌',
    '选择练习场景': 'Select practice scenario',
    '对方发的是...': "What they said...",
    '给你3个选择': 'get 3 options',
    '刚匹配不知道怎么开场': 'Just matched, don\'t know how to start',
    '约会1-2次后': 'After 1-2 dates, feeling something but not sure',
    '对方回复后不知道怎么继续': 'They replied, don\'t know how to continue',
    '被已读不回了怎么办': 'Message read but no reply, what to do?',
    '第一次约会前紧张': 'Nervous before first date, want to prepare',
    '✨ 给我建议': '✨ Get Suggestions',
    '🤔 思考中...': '🤔 Thinking...',
    '3个回复建议：': '3 Reply Options:',
    '俏皮/调侃型': 'Playful',
    '正经回应型': 'Sincere',
    '简短敷衍型': 'Dismissive',
    '或自己改改...': 'Or edit it yourself...',
    '在这里修改你的回复...': 'Edit your reply here...',
    '你的回复：': 'Your reply:',
    '已选': 'Selected',
    '📋 复制': '📋 Copy',
    '✓ 已复制': '✓ Copied',
    '📱 发送到 WhatsApp': '📱 Send to WhatsApp',
    '✓ 已打开 WhatsApp': '✓ Opened in WhatsApp',
    '🔒 阅后即焚，不保存记录，不用于训练': '🔒 Disappears after reading, never saved or used for training',
    '订阅包含所有功能，无隐藏费用。取消后当前周期内仍可使用。': 'All features included. Cancel anytime, access continues through billing period.',
    '暂不升级': 'Not now',
    '让约会更顺': 'cancel anytime',
    '月付 $9.99': 'Monthly $9.99',
    '年付 $59.99': 'Yearly $59.99',
    '省 $60': 'Save $60',
    '每月 $5，随时取消': '$5/mo, cancel anytime',
    '无限次生成回复建议，让约会更顺利 💕': 'Unlimited reply suggestions for smoother dates 💕',
    '订阅：': 'Subscription:',
    '月付': 'Monthly',
    '年付': 'Yearly',
    '解锁 Pro，无限次使用': 'Unlock Pro, unlimited uses',
}

for cn, en in translations.items():
    content = content.replace(cn, en)

# Fix "次" context (free uses)
content = content.replace('免费试用 3 次，不绑卡', 'Free trial 3 uses, no card needed')
content = content.replace('免费试用 ', 'Free trial ')
content = content.replace('次，不绑卡', ' uses, no card needed')

# Context labels - these are already in the CONTEXT_LABELS object
# Need to replace the object itself
old_context = '''const CONTEXT_LABELS: Record<string, string> = {
  "刚匹配不知道怎么开场": "刚匹配，不知道怎么发第一条消息",
  "约会1-2次后": "约会了1-2次，有点感觉但不确定对方",
  "对方回复后不知道怎么继续": "对方回复了，但不知道该怎么接话",
  "被已读不回了怎么办": "发消息被已读不回，不知道怎么办",
  "第一次约会前紧张": "第一次约会前紧张，想准备好说什么",
};'''

new_context = '''const CONTEXT_LABELS: Record<string, string> = {
  "刚匹配不知道怎么开场": "Just matched, don't know how to start a conversation",
  "约会1-2次后": "Been on 1-2 dates, feeling something but not sure where things stand",
  "对方回复后不知道怎么继续": "They replied, but not sure how to keep the conversation going",
  "被已读不回了怎么办": "Message read but no reply — what do I do?",
  "第一次约会前紧张": "Nervous before first date, want to prepare what to say",
};'''

content = content.replace(old_context, new_context)

# Fix DEMO_RESPONSES
old_demo = '''const DEMO_RESPONSES: ReplyOption[] = [
  { style: "自信有趣", emoji: "😏", text: "看来你终于被我的魅力吸引了～" },
  { style: "温柔确认", emoji: "😊", text: "我也玩得很开心，期待下次见～" },
  { style: "简洁酷", emoji: "👍", text: "嗯，周末见" },
];'''

new_demo = '''const DEMO_RESPONSES: ReplyOption[] = [
  { style: "自信有趣", emoji: "😏", text: "Looks like you've finally fallen for my charm~" },
  { style: "温柔确认", emoji: "😊", text: "Had so much fun, looking forward to the next date~" },
  { style: "简洁酷", emoji: "👍", text: "嗯，周末见" },
];'''

content = content.replace(old_demo, new_demo)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)

print("Done")
