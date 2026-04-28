"use client";

import { useState, useEffect } from "react";
import { ReplyOption } from "@/lib/api";
import Link from "next/link";

const FREE_OPENER_LIMIT = 3;
const USES_KEY = "date-reply-en-opener-uses";
const SUBSCRIBED_KEY = "date-reply-en-subscribed";

const OPENER_CONTEXTS = [
  "Just matched — don't know what to say",
  "After a fun first date — keep the momentum",
  "They haven't replied — send a follow-up",
  "Saw their profile — want to stand out",
];

export default function OpenerPage() {
  const [context, setContext] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [options, setOptions] = useState<ReplyOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ReplyOption | null>(null);
  const [customReply, setCustomReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [usesCount, setUsesCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

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
    const contextText = showCustom ? customContext : context;
    if (!contextText.trim()) return;

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
    setCustomReply("");

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "opener_generate_attempt", feature: "FeatureC" }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/opener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: contextText }),
      });
      const data = await res.json();
      if (data.options) {
        setOptions(data.options);
        if (!isSubscribed) {
          const newCount = usesCount + 1;
          setUsesCount(newCount);
          localStorage.setItem(USES_KEY, String(newCount));
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const finalReply = customReply || selectedOption?.text || "";
  const remainingFree = Math.max(0, FREE_OPENER_LIMIT - usesCount);

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">💬</div>
              <h2 className="text-xl font-bold text-gray-900">Free Openers Exhausted</h2>
              <p className="text-gray-500 text-sm mt-1">Get unlimited opening lines for smoother dates</p>
            </div>
            <div className="space-y-3">
              <a href="https://buy.stripe.com/test_4gM00j4Eg5xIbFAayWcjS0a" className="block w-full py-3 bg-pink-500 text-white text-center rounded-xl font-medium hover:bg-pink-600">
                Unlock Pro — $9.99/month
              </a>
              <Link href="/en" className="block w-full py-3 text-center text-gray-500 text-sm hover:text-gray-700">
                ← Back to reply assistant
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">✨ Opening Line Generator</h1>
            <p className="text-sm text-gray-500">Don't know how to start? Get 3 options.</p>
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

        {/* Context selector */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            What's the situation?
          </label>
          <div className="grid grid-cols-1 gap-2">
            {OPENER_CONTEXTS.map((ctx) => (
              <button
                key={ctx}
                onClick={() => { setContext(ctx); setShowCustom(false); }}
                className={`p-3 rounded-xl text-left text-sm transition-colors ${
                  context === ctx && !showCustom
                    ? "bg-pink-100 border-2 border-pink-500 text-pink-700"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-pink-300"
                }`}
              >
                {ctx}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(true)}
              className={`p-3 rounded-xl text-left text-sm transition-colors ${
                showCustom
                  ? "bg-pink-100 border-2 border-pink-500 text-pink-700"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-pink-300"
              }`}
            >
              + Custom situation...
            </button>
          </div>

          {showCustom && (
            <textarea
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Describe the situation — who they are, what happened, how you want to come across..."
              className="w-full mt-3 px-4 py-3 bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              rows={3}
            />
          )}
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={loading || (!context && !customContext.trim())}
          className="w-full py-4 bg-pink-500 text-white rounded-2xl font-medium text-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-8"
        >
          {loading ? "🤔 Thinking..." : "✨ Get 3 Opening Lines"}
        </button>

        {/* Results */}
        {options.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-700">3 Opening Lines:</h3>
            {options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedOption(option); setCustomReply(""); }}
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
                    <span className="text-pink-500 font-medium text-sm">Selected</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Edit */}
        {options.length > 0 && (
          <div className="mb-6">
            <textarea
              value={customReply}
              onChange={(e) => { setCustomReply(e.target.value); setSelectedOption(null); }}
              placeholder="Edit your opener here..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              rows={2}
            />
          </div>
        )}

        {/* Copy */}
        {finalReply && (
          <button
            onClick={() => copyToClipboard(finalReply)}
            className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors"
          >
            {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
          </button>
        )}

        {/* Switch to Reply */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 mb-3">Already got a reply you need to answer?</p>
          <Link href="/en" className="text-pink-500 font-medium text-sm hover:text-pink-600">
            Try the Reply Assistant →
          </Link>
        </div>
      </div>
    </main>
  );
}
