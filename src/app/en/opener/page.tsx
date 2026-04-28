"use client";

import { useState, useEffect } from "react";
import { ReplyOption } from "@/lib/api";
import Link from "next/link";

const FREE_OPENER_LIMIT = 3;
const USES_KEY = "date-reply-en-opener-uses";
const SUBSCRIBED_KEY = "date-reply-en-subscribed";

const RELATIONSHIP_STAGES = [
  { value: "刚认识", label: "刚认识", desc: "刚匹配，还未聊天" },
  { value: "暧昧期", label: "暧昧期", desc: "有来有往，有点感觉" },
  { value: "约会1-2次", label: "约会1-2次", desc: "见过了，想继续发展" },
];

const STYLES = [
  { value: "不限", label: "不限" },
  { value: "俏皮", label: "俏皮" },
  { value: "正经", label: "正经" },
  { value: "简短", label: "简短" },
];

const GENDERS = [
  { value: "男追女", label: "我是男生 → 她" },
  { value: "女追男", label: "我是女生 → 他" },
];

export default function OpenerPage() {
  const [relationshipStage, setRelationshipStage] = useState("刚认识");
  const [style, setStyle] = useState("不限");
  const [gender, setGender] = useState("男追女");
  const [options, setOptions] = useState<ReplyOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ReplyOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [usesCount, setUsesCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(USES_KEY);
    setUsesCount(stored ? parseInt(stored, 10) : 0);
    setIsSubscribed(localStorage.getItem(SUBSCRIBED_KEY) === "true");
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "page_view", feature: "FeatureC", path: "/en/opener" }),
    }).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!isSubscribed && usesCount >= FREE_OPENER_LIMIT) {
      setShowPaywall(true);
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "opener_paywall_shown", feature: "FeatureC" }),
      }).catch(() => {});
      return;
    }

    setLoading(true);
    setOptions([]);
    setSelectedOption(null);

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "opener_generate_attempt", feature: "FeatureC" }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/opener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipStage, style, gender, subscribed: isSubscribed }),
      });
      const data = await res.json();
      if (data.options) {
        setOptions(data.options);
        if (!isSubscribed) {
          const newCount = usesCount + 1;
          setUsesCount(newCount);
          localStorage.setItem(USES_KEY, String(newCount));
        }
      } else if (data.error === "daily_limit_reached") {
        setShowPaywall(true);
      }
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "opener_generate_success", feature: "FeatureC", options_count: data.options.length }),
        }).catch(() => {});
      }
    } catch (e) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "opener_generate_error", feature: "FeatureC" }),
      }).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const copyOption = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const remainingFree = Math.max(0, FREE_OPENER_LIMIT - usesCount);

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">💬</div>
              <h2 className="text-xl font-bold text-gray-900">Free Openers Used Today</h2>
              <p className="text-gray-500 text-sm mt-1">Come back tomorrow for 3 more free openers</p>
            </div>

            {/* Promote Reply feature */}
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 mb-4">
              <div className="text-sm font-medium text-gray-800 mb-2">Want unlimited reply suggestions instead?</div>
              <p className="text-xs text-gray-600 mb-3">Get 3 reply options for any message you receive — for smoother dates.</p>
              <a href="https://buy.stripe.com/test_4gM00j4Eg5xIbFAayWcjS0a" className="block w-full py-2.5 bg-pink-500 text-white text-center rounded-xl text-sm font-medium hover:bg-pink-600">
                Unlock Reply Assistant · $9.99/month
              </a>
            </div>

            <div className="space-y-2">
              <Link href="/en" className="block w-full py-2.5 text-center text-pink-600 text-sm font-medium hover:text-pink-700">
                Try Reply Assistant (3 free uses)
              </Link>
              <button onClick={() => setShowPaywall(false)} className="w-full py-2 text-gray-400 text-sm hover:text-gray-600">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">✨ Opening Line Generator</h1>
            <p className="text-sm text-gray-500">Don&apos;t know what to start with? Get 3 options — pick one.</p>
          </div>
          <Link href="/en" className="text-sm text-pink-500 hover:text-pink-600 font-medium">
            Reply →
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Free uses */}
        {!isSubscribed && (
          <div className="mb-6 p-3 bg-pink-50 border border-pink-100 rounded-xl text-center text-sm text-pink-700">
            {remainingFree > 0 ? `${remainingFree} free openers left` : "Free openers exhausted"}
          </div>
        )}

        {/* Gender */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">I am...</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGender(g.value)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  gender === g.value
                    ? "bg-pink-500 text-white"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-pink-300"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Relationship stage */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Relationship stage</label>
          <div className="grid grid-cols-3 gap-2">
            {RELATIONSHIP_STAGES.map((s) => (
              <button
                key={s.value}
                onClick={() => setRelationshipStage(s.value)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  relationshipStage === s.value
                    ? "bg-pink-500 text-white"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-pink-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="mt-1 text-xs text-gray-400 text-center">
            {RELATIONSHIP_STAGES.find((s) => s.value === relationshipStage)?.desc}
          </div>
        </div>

        {/* Style preference */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Style preference</label>
          <div className="grid grid-cols-4 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                  style === s.value
                    ? "bg-pink-500 text-white"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-pink-300"
                }`}
              >
                {s.value}
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-4 bg-pink-500 text-white rounded-2xl font-medium text-lg hover:bg-pink-600 disabled:opacity-50 transition-colors mb-8"
        >
          {loading ? "🤔 Thinking..." : "✨ Get 3 Opening Lines"}
        </button>

        {/* Results */}
        {options.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-700">3 Opening Lines:</h3>
            {options.map((option, idx) => (
              <div
                key={idx}
                className={`p-4 bg-white border-2 rounded-2xl ${
                  selectedOption === option ? "border-pink-500 bg-pink-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl">{option.emoji}</span>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">{option.style}</div>
                    <p className="text-gray-800 font-medium">{option.text}</p>
                  </div>
                </div>
                {option.scene && (
                  <div className="text-xs text-gray-400 ml-9 mb-2">适用：{option.scene}</div>
                )}
                <button
                  onClick={() => copyOption(option.text, idx)}
                  className={`ml-9 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    copiedIdx === idx
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {copiedIdx === idx ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Switch */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 mb-3">Need to reply to a message instead?</p>
          <Link href="/en" className="text-pink-500 font-medium text-sm hover:text-pink-600">
            Try the Reply Assistant →
          </Link>
        </div>
      </div>
    </main>
  );
}
