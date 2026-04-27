const fs = require('fs');

let content = fs.readFileSync('src/app/en/page.tsx', 'utf8');

const replacements = [
  ['💬 约会短信助手', '💬 Dating Reply Assistant'],
  ['收到暧昧消息不知道怎么回？AI 帮你生成3个回复选项', "Don't know how to reply to your crush? Get 3 AI reply options"],
  ['免费试用 ', 'Free trial '],
  ['试用次数已用完', 'Free uses exhausted'],
  ['解锁 Pro，无限用 →', 'Unlock Pro, unlimited →'],
  ['他们发的是...', "What they sent..."],
  ['粘贴对方发来的短信...', 'Paste their message here...'],
  ['✨ 给我建议', '✨ Get Suggestions'],
  ['🤔 思考中...', '🤔 Thinking...'],
  ['3个回复建议：', '3 Reply Options:'],
  ['俏皮/调侃型', 'Playful'],
  ['正经回应型', 'Sincere'],
  ['简短敷衍型', 'Dismissive'],
  ['或自己改改...', 'Or edit it yourself...'],
  ['在这里修改你的回复...', 'Edit your reply here...'],
  ['你的回复：', 'Your reply:'],
  ['已选', 'Selected'],
  ['📋 复制', '📋 Copy'],
  ['✓ 已复制', '✓ Copied'],
  ['📱 发送到 WhatsApp', '📱 Send to WhatsApp'],
  ['✓ 已打开 WhatsApp', '✓ Opened in WhatsApp'],
  ['🔒 阅后即焚，不保存记录，不用于训练', '🔒 Disappears after reading, never saved or used for training'],
  ['暂不升级', 'Not now'],
  ['月付 $9.99', 'Monthly $9.99'],
  ['年付 $59.99', 'Yearly $59.99'],
  ['省 $60', 'Save $60'],
  ['让约会更顺', 'cancel anytime'],
  ['无限次生成回复建议，让约会更顺利 💕', 'Unlimited AI replies for smoother dates 💕'],
  ['订阅包含所有功能，无隐藏费用。取消后当前周期内仍可使用。', 'All features included. Cancel anytime.'],
  ['解锁 Pro，无限次使用', 'Unlock Pro, unlimited uses'],
  ['次，不绑卡', ' uses, no card needed'],
  ['次免费机会', ' free uses'],
  ['次，不绑卡', ' uses, no card needed'],
  ['刚匹配，不知道怎么发第一条消息', "Just matched, don't know how to start"],
  ['约会了1-2次，有点感觉但不确定对方', 'Been on 1-2 dates, feeling something but unsure'],
  ['对方回复了，但不知道该怎么接话', 'They replied but unsure how to continue'],
  ['发消息被已读不回，不知道怎么办', 'Read but no reply — what now?'],
  ['第一次约会前紧张，想准备好说什么', 'Nervous before first date, want to prepare'],
  ['对方发的是...', "What they said..."],
  ['或自己改改...', 'Or edit it yourself...'],
  ['在这里修改你的回复...', 'Edit your reply here...'],
  ['你的回复：', 'Your reply:'],
  ['📌', '📌'],
  ['选择关系阶段', 'Select relationship stage'],
  ['已选', 'Selected'],
  ['看起来你终于被我的魅力吸引了～', "Looks like you've finally fallen for my charm~"],
  ['我也玩得很开心，期待下次见面', "I had fun too, looking forward to next time"],
];

for (const [old, newVal] of replacements) {
  content = content.split(old).join(newVal);
}

fs.writeFileSync('src/app/en/page.tsx', content);
console.log('Done');
