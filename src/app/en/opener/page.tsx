"use client";

import { useState, useEffect } from "react";
import { ReplyOption } from "@/lib/api";
import Link from "next/link";

const FREE_OPENER_LIMIT = 3;
const USES_KEY = "date-reply-en-opener-uses";
const SUBSCRIBED_KEY = "date-reply-en-subscribed";

export default function OpenerPage() {
  const [profile, setProfile] = useState("");
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
    if (!profile.trim()) return;

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
        body: JSON.stringify({ profile: profile.trim(), subscribed: isSubscribed }),
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
      } else if (data.error === "daily_limit_reached") {
        setShowPaywall(true);
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "opener_paywall_shown", feature: "FeatureC" }),
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
            <p className="text-sm text-gray-500">Paste their profile — get 3 openers to pick from.</p>
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

        {/* Profile textarea */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Their profile / bio
          </label>
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="Paste their Instagram bio, Bumble description, or how you met..."
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all"
            rows={5}
          />
          <p className="mt-1 text-xs text-gray-400">
            Include interests, job, what they post about — the more info, the better the openers.
          </p>
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={loading || !profile.trim()}
          className="w-full py-4 bg-pink-500 text-white rounded-2xl font-medium text-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-8"
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
                className={`bg-white border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                  selectedOption?.text === option.text
                    ? "border-pink-400 ring-2 ring-pink-100"
                    : "border-gray-100 hover:border-pink-200"
                }`}
                onClick={() => setSelectedOption(option)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{option.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 mb-1">{option.style}</div>
                    <div className="text-gray-800 text-sm leading-relaxed">{option.text}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyOption(option.text, idx);
                    }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      copiedIdx === idx
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-500"
                    }`}
                  >
                    {copiedIdx === idx ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upgrade nudge after results */}
        {options.length > 0 && (
          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 text-center">
            <p className="text-sm text-gray-700 mb-3">
              Want better <span className="font-medium">replies</span> to their messages?
            </p>
            <Link
              href="/en"
              className="inline-block w-full py-2.5 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors"
            >
              Try Reply Assistant →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
