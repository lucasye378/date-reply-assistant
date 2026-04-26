"use client";

import { useState, useRef } from "react";
import { ReplyOption } from "@/lib/api";

const CONTEXT_LABELS: Record<string, string> = {
  "刚匹配不知道怎么开场": "刚匹配，不知道怎么发第一条消息",
  "约会1-2次后": "约会了1-2次，有点感觉但不确定对方",
  "对方回复后不知道怎么继续": "对方回复了，但不知道该怎么接话",
  "被已读不回了怎么办": "发消息被已读不回，不知道怎么办",
  "第一次约会前紧张": "第一次约会前紧张，想准备好说什么",
};

// Demo responses for testing without API key
const DEMO_RESPONSES: ReplyOption[] = [
  { style: "自信有趣", emoji: "😏", text: "看来你终于被我的魅力吸引了～" },
  { style: "温柔确认", emoji: "😊", text: "我也玩得很开心，期待下次见～" },
  { style: "简洁酷", emoji: "👍", text: "嗯，周末见" },
];

export default function Home() {
  const [theirMessage, setTheirMessage] = useState("");
  const [context, setContext] = useState<string>("约会1-2次后");
  const [options, setOptions] = useState<ReplyOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ReplyOption | null>(null);
  const [customReply, setCustomReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!theirMessage.trim()) return;

    setLoading(true);
    setOptions([]);
    setSelectedOption(null);
    setCustomReply("");

    if (isDemoMode) {
      // Demo mode - return fake responses
      await new Promise((r) => setTimeout(r, 1000));
      setOptions(DEMO_RESPONSES);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theirMessage, context }),
      });

      const data = await res.json();
      if (data.options) {
        setOptions(data.options);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseThis = (option: ReplyOption) => {
    setSelectedOption(option);
    setCustomReply(option.text);
  };

  const finalReply = customReply || selectedOption?.text || "";

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">💬 约会短信助手</h1>
          <p className="text-sm text-gray-500 mt-1">不知道怎么回？给你3个选择</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Demo Mode Toggle */}
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isDemoMode}
              onChange={(e) => setIsDemoMode(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300"
            />
            <div>
              <span className="text-sm font-medium text-yellow-800">测试模式（无需 API key）</span>
              <p className="text-xs text-yellow-600">勾选后使用示例回复，方便测试 UI</p>
            </div>
          </label>
        </div>

        {/* Their Message Input */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            他们发的是...
          </label>
          <textarea
            ref={textareaRef}
            value={theirMessage}
            onChange={(e) => setTheirMessage(e.target.value)}
            placeholder="粘贴对方发来的短信..."
            className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-base"
            rows={3}
          />
        </div>

        {/* Context Selector */}
        <div className="mb-6">
          <button
            onClick={() => setShowContext(!showContext)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <span>📌</span>
            <span>{CONTEXT_LABELS[context] || "选择关系阶段"}</span>
            <span className="text-gray-400">{showContext ? "▲" : "▼"}</span>
          </button>

          {showContext && (
            <div className="mt-3 p-4 bg-white border border-gray-200 rounded-2xl space-y-2">
              {Object.entries(CONTEXT_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setContext(key);
                    setShowContext(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                    context === key
                      ? "bg-pink-100 text-pink-700"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!theirMessage.trim() || loading}
          className="w-full py-4 bg-pink-500 text-white rounded-2xl font-medium text-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-8"
        >
          {loading ? "🤔 思考中..." : "✨ 给我建议"}
        </button>

        {/* Reply Options */}
        {options.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-700">3个回复建议：</h3>
            {options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleUseThis(option)}
                className={`w-full p-4 bg-white border-2 rounded-2xl text-left transition-all ${
                  selectedOption === option
                    ? "border-pink-500 bg-pink-50"
                    : "border-gray-200 hover:border-pink-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{option.emoji}</span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">{option.style}</div>
                    <p className="text-gray-800">{option.text}</p>
                  </div>
                  {selectedOption === option && (
                    <span className="text-pink-500 font-medium text-sm">已选</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Custom Reply */}
        {options.length > 0 && (
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              或自己改改...
            </label>
            <textarea
              value={customReply}
              onChange={(e) => {
                setCustomReply(e.target.value);
                setSelectedOption(null);
              }}
              placeholder="在这里修改你的回复..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-base"
              rows={2}
            />
          </div>
        )}

        {/* Copy/Copy and Send */}
        {finalReply && (
          <div className="space-y-3">
            <div className="p-4 bg-gray-100 rounded-2xl">
              <div className="text-xs text-gray-500 mb-1">你的回复：</div>
              <p className="text-gray-800 font-medium">{finalReply}</p>
            </div>

            <button
              onClick={() => copyToClipboard(finalReply)}
              className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors"
            >
              {copied ? "✓ 已复制" : "📋 复制"}
            </button>
          </div>
        )}

        {/* Privacy Note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          🔒 阅后即焚，不保存记录，不用于训练
        </p>
      </div>
    </main>
  );
}
