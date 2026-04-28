"use client";

import { useState, useRef, useEffect } from "react";
import { ReplyOption } from "@/lib/api";

const CONTEXT_LABELS: Record<string, string> = {
  "刚匹配不知道怎么开场": "刚匹配，不知道怎么发第一条消息",
  "约会1-2次后": "约会了1-2次，有点感觉但不确定对方",
  "对方回复后不知道怎么继续": "对方回复了，但不知道该怎么接话",
  "被已读不回了怎么办": "发消息被已读不回，不知道怎么办",
  "第一次约会前紧张": "第一次约会前紧张，想准备好说什么",
};

const DEMO_RESPONSES: ReplyOption[] = [
  { style: "自信有趣", emoji: "😏", text: "看来你终于被我的魅力吸引了～" },
  { style: "温柔确认", emoji: "😊", text: "我也玩得很开心，期待下次见～" },
  { style: "简洁酷", emoji: "👍", text: "嗯，周末见" },
];

// Replace with your actual Stripe price IDs
const PRICE_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY ?? "price_monthly_placeholder";
const PRICE_YEARLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY ?? "price_yearly_placeholder";
const FREE_USES_LIMIT = 3;
const USES_KEY = "date-reply-uses";
const SUBSCRIBED_KEY = "date-reply-subscribed";

// Payment flow tracking
const trackPayment = (event: string, metadata?: Record<string, string>) => {
  const payload = {
    event,
    feature: "payment_flow",
    utm_source: localStorage.getItem("utm_source") || undefined,
    utm_medium: localStorage.getItem("utm_medium") || undefined,
    utm_campaign: localStorage.getItem("utm_campaign") || undefined,
    ...metadata,
    ts: Date.now(),
  };
  console.log("[PAYMENT_TRACK]", payload);
  localStorage.setItem("payment_event", JSON.stringify(payload));
};

interface SubscriptionModalProps {
  onClose: () => void;
  onSubscribe: (priceId: string) => Promise<void>;
  subscribing: boolean;
}

function SubscriptionModal({ onClose, onSubscribe, subscribing }: SubscriptionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-pink-400 to-rose-500 p-6 text-white text-center">
          <div className="text-4xl mb-2">💬</div>
          <h2 className="text-xl font-bold">试用次数已用完</h2>
          <p className="text-pink-100 text-sm mt-1">解锁 Pro，无限次使用</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-sm text-center">
            无限次生成回复建议，让约会更顺利 💕
          </p>

          <button
            onClick={() => {
              trackPayment("upgrade_click", { plan: "monthly" });
              trackPayment("plan_selected", { plan: "monthly", priceId: PRICE_MONTHLY });
              onSubscribe(PRICE_MONTHLY);
            }}
            disabled={subscribing}
            className="w-full py-4 border-2 border-pink-500 rounded-2xl text-left px-5 hover:bg-pink-50 transition-colors disabled:opacity-50"
          >
            <div className="font-semibold text-gray-800">月付 $9.99</div>
            <div className="text-xs text-gray-500 mt-0.5">随时取消，让约会更顺</div>
          </button>

          <button
            onClick={() => {
              trackPayment("upgrade_click", { plan: "yearly" });
              trackPayment("plan_selected", { plan: "yearly", priceId: PRICE_YEARLY });
              onSubscribe(PRICE_YEARLY);
            }}
            disabled={subscribing}
            className="w-full py-4 bg-pink-500 text-white rounded-2xl text-left px-5 hover:bg-pink-600 transition-colors relative disabled:opacity-50"
          >
            <span className="absolute top-3 right-4 bg-white text-pink-500 text-xs font-bold px-2 py-0.5 rounded-full">
              省 $60
            </span>
            <div className="font-semibold">年付 $59.99</div>
            <div className="text-xs text-pink-100 mt-0.5">每月 $5，随时取消</div>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
          >
            暂不升级
          </button>

          <p className="text-center text-xs text-gray-400 mt-2">
            订阅包含所有功能，无隐藏费用。取消后当前周期内仍可使用。
          </p>
        </div>
      </div>
    </div>
  );
}

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
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [usesCount, setUsesCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const subscribed = localStorage.getItem(SUBSCRIBED_KEY) === "true";
    setIsSubscribed(subscribed);
    const stored = parseInt(localStorage.getItem(USES_KEY) ?? "0", 10);
    setUsesCount(isNaN(stored) ? 0 : stored);

    // Capture UTM params on first visit
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    if (utmSource && !localStorage.getItem("utm_source")) {
      localStorage.setItem("utm_source", utmSource);
      localStorage.setItem("utm_medium", utmMedium || "");
      localStorage.setItem("utm_campaign", utmCampaign || "");
    }

    // Handle return from Stripe checkout
    if (params.get("subscribed") === "true") {
      localStorage.setItem(SUBSCRIBED_KEY, "true");
      setIsSubscribed(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setWaitlistSubmitting(true);
    try {
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "waitlist_join", email: waitlistEmail.trim() }),
      });
    } catch { /* ignore */ }
    setWaitlistSubmitted(true);
    setWaitlistSubmitting(false);
  };

  const handleGenerate = async () => {
    if (!theirMessage.trim()) return;

    if (!isSubscribed && usesCount >= FREE_USES_LIMIT) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    setOptions([]);
    setSelectedOption(null);
    setCustomReply("");

    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 1000));
      setOptions(DEMO_RESPONSES);
      setLoading(false);
      const next = usesCount + 1;
      setUsesCount(next);
      localStorage.setItem(USES_KEY, String(next));
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
        const next = usesCount + 1;
        setUsesCount(next);
        localStorage.setItem(USES_KEY, String(next));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const PAYMENT_LINK_MONTHLY = "https://buy.stripe.com/test_4gM00j4Eg5xIbFAayWcjS0a";
  const PAYMENT_LINK_YEARLY = "https://buy.stripe.com/test_eVqfZhfiUaS29xs4aycjS09";

  const track = (event: string, metadata?: Record<string, string>) => {
    const payload = { event, feature: "payment_flow", ...metadata, ts: Date.now() };
    console.log("[PAYMENT_TRACK]", payload);
    localStorage.setItem("payment_event", JSON.stringify(payload));
  };

  const handleSubscribe = async (priceId: string) => {
    trackPayment("stripe_redirect", { priceId });
    setSubscribing(true);
    const url = priceId === PRICE_MONTHLY ? PAYMENT_LINK_MONTHLY : PAYMENT_LINK_YEARLY;
    window.location.href = url;
  };

  const [whatsappSent, setWhatsappSent] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Track copy action
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "copy", feature: "FeatureA" }),
    }).catch(() => {});
  };

  const sendToWhatsApp = (text: string) => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
    setWhatsappSent(true);
    // Track WhatsApp send
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "whatsapp", feature: "FeatureA" }),
    }).catch(() => {});
  };

  const handleUseThis = (option: ReplyOption) => {
    setSelectedOption(option);
    setCustomReply(option.text);
  };

  const finalReply = customReply || selectedOption?.text || "";
  const remainingFree = Math.max(0, FREE_USES_LIMIT - usesCount);

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {showPaywall && (
        <SubscriptionModal
          onClose={() => setShowPaywall(false)}
          onSubscribe={handleSubscribe}
          subscribing={subscribing}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">💬 约会短信助手</h1>
          <p className="text-sm text-gray-500 mt-1">你选，我们帮你决定。</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        {!isSubscribed && (
          <>
            <div className="mb-6 p-3 bg-pink-50 border border-pink-100 rounded-xl flex items-center justify-between">
              <span className="text-sm text-pink-700">
                {remainingFree > 0
                  ? `免费试用 ${remainingFree} 次，不绑卡`
                  : "试用次数已用完"}
              </span>
            </div>
            <button
              onClick={() => setShowPaywall(true)}
              className="w-full py-3 bg-pink-500 text-white rounded-xl font-medium text-base hover:bg-pink-600 transition-colors mb-6"
            >
              解锁 Pro，无限用 →
            </button>
          </>
        )}

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
            <p className="text-xs text-gray-500 text-center mb-2">选择一个发送，或修改后发送</p>
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

        {/* Copy + WhatsApp */}
        {finalReply && (
          <div className="space-y-3">
            <div className="p-4 bg-gray-100 rounded-2xl">
              <div className="text-xs text-gray-500 mb-1">你的回复：</div>
              <p className="text-gray-800 font-medium">{finalReply}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(finalReply)}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors"
              >
                {copied ? "✓ 已复制" : "📋 复制"}
              </button>
              <button
                onClick={() => sendToWhatsApp(finalReply)}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
              >
                {whatsappSent ? "✓ 已打开 WhatsApp" : "📱 发送到 WhatsApp"}
              </button>
            </div>
          </div>
        )}

        {/* Waitlist */}
        <div className="mt-12 max-w-md mx-auto">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-3xl p-6 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">抢先体验 & 影响产品方向</h3>
            <p className="text-sm text-gray-600 mb-4">
              加入候补名单，获取新功能优先访问权，还有机会影响产品路线图。
            </p>
            {waitlistSubmitted ? (
              <div className="bg-green-50 border border-green-100 rounded-xl py-3 px-4 text-green-700 text-sm font-medium">
                🎉 谢谢！我们会联系你
              </div>
            ) : (
              <form
                onSubmit={handleWaitlistSubmit}
                className="flex gap-2"
              >
                <input
                  type="email"
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
                <button
                  type="submit"
                  disabled={waitlistSubmitting}
                  className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {waitlistSubmitting ? "..." : "加入候补"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Privacy Note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          🔒 阅后即焚，不保存记录，不用于训练
        </p>
      </div>
    </main>
  );
}
