"use client";

import { useState, useRef, useEffect } from "react";
import { ReplyOption } from "@/lib/api";

const FREE_USES_LIMIT = 3;
const USES_KEY = "date-reply-en-uses";
const SUBSCRIBED_KEY = "date-reply-en-subscribed";
const BONUS_USES_KEY = "date-reply-en-bonus-used";

const PAYMENT_LINK_MONTHLY = "https://buy.stripe.com/test_4gM00j4Eg5xIbFAayWcjS0a";
const PAYMENT_LINK_YEARLY = "https://buy.stripe.com/test_eVqfZhfiUaS29xs4aycjS09";

interface SubscriptionModalProps {
  onClose: () => void;
  onSubscribe: (plan: "monthly" | "yearly") => void;
  onBonus: () => void;
  loading: boolean;
  bonusUsed?: boolean;
}

function SubscriptionModal({ onClose, onSubscribe, onBonus, loading, bonusUsed }: SubscriptionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-pink-400 to-rose-500 p-6 text-white text-center">
          <div className="text-4xl mb-2">💬</div>
          <h2 className="text-xl font-bold">Free Uses Exceeded</h2>
          <p className="text-pink-100 text-sm mt-1">Unlock Pro, unlimited uses</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Success example */}
          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
            <div className="text-xs text-pink-600 font-medium mb-2">💡 What you'll get</div>
            <div className="text-xs text-gray-600 mb-2">Someone sent:</div>
            <div className="text-sm text-gray-800 italic mb-3">"hey, what's up? haven't heard from u in a while 😏"</div>
            <div className="text-xs text-gray-500 mb-2">You reply:</div>
            <div className="text-sm text-gray-900 font-medium">"haha been busy being amazing 😏 what about you?"</div>
            <div className="text-xs text-green-600 mt-2">✓ They replied 20 min later</div>
          </div>

          <button
            onClick={() => onSubscribe("monthly")}
            disabled={loading}
            className="w-full py-4 border-2 border-pink-500 rounded-2xl text-left px-5 hover:bg-pink-50 transition-colors disabled:opacity-50"
          >
            <div className="font-semibold text-gray-800">Monthly $9.99</div>
            <div className="text-xs text-gray-500 mt-0.5">cancel anytime</div>
          </button>

          <button
            onClick={() => onSubscribe("yearly")}
            disabled={loading}
            className="w-full py-4 bg-pink-500 text-white rounded-2xl text-left px-5 hover:bg-pink-600 transition-colors relative disabled:opacity-50"
          >
            <span className="absolute top-3 right-4 bg-white text-pink-500 text-xs font-bold px-2 py-0.5 rounded-full">
              Save $60
            </span>
            <div className="font-semibold">Yearly $59.99</div>
            <div className="text-xs text-pink-100 mt-0.5">$5/mo, cancel anytime</div>
          </button>

          {!bonusUsed && (
            <button
              onClick={onBonus}
              className="w-full py-3 text-sm text-pink-600 hover:text-pink-700 font-medium border-2 border-pink-200 rounded-xl hover:bg-pink-50 transition-colors"
            >
              Get 3 more free uses — only this once
            </button>
          )}

          <p className="text-center text-xs text-gray-400 mt-2">
            All features included. Cancel anytime. Access continues through billing period.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [theirMessage, setTheirMessage] = useState("");
  const [options, setOptions] = useState<ReplyOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ReplyOption | null>(null);
  const [customReply, setCustomReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [usesCount, setUsesCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [bonusUsed, setBonusUsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [contentVariant, setContentVariant] = useState("a");

  useEffect(() => {
    // Read A/B test variant from URL
    const params = new URLSearchParams(window.location.search);
    const variant = params.get("utm_content");
    if (variant) {
      setContentVariant(variant);
    }

    const stored = localStorage.getItem(USES_KEY);
    setUsesCount(stored ? parseInt(stored, 10) : 0);
    setIsSubscribed(localStorage.getItem(SUBSCRIBED_KEY) === "true");
    setBonusUsed(localStorage.getItem(BONUS_USES_KEY) === "true");

    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") === "true") {
      localStorage.setItem(SUBSCRIBED_KEY, "true");
      setIsSubscribed(true);
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Track page view with variant
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "page_view", feature: "FeatureA", path: "/en", variant: contentVariant }),
    }).catch(() => {});
  }, []);

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    setSubscribing(true);
    const event = { event: "plan_selected", plan, timestamp: new Date().toISOString() };
    localStorage.setItem("payment_event", JSON.stringify(event));

    const url = plan === "monthly" ? PAYMENT_LINK_MONTHLY : PAYMENT_LINK_YEARLY;
    window.location.href = url;
  };

  const handleBonus = () => {
    // Grant 3 bonus uses — once only per user
    const bonusUsed = localStorage.getItem(BONUS_USES_KEY);
    if (bonusUsed) return;
    localStorage.setItem(BONUS_USES_KEY, "true");
    const current = parseInt(localStorage.getItem(USES_KEY) || "0", 10);
    const newCount = Math.max(0, current - 3) + 3; // Refund the 3 used, then grant 3 more
    localStorage.setItem(USES_KEY, String(newCount));
    setUsesCount(newCount);
    setShowPaywall(false);
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bonus_granted", feature: "FeatureA" }),
    }).catch(() => {});
  };

  const handleGenerate = async () => {
    if (!theirMessage.trim()) return;

    if (!isSubscribed && usesCount >= FREE_USES_LIMIT) {
      setShowPaywall(true);
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "paywall_shown", feature: "FeatureA", uses_count: usesCount }),
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
      body: JSON.stringify({ action: "generate_attempt", feature: "FeatureA" }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theirMessage, context: "" }),
      });

      const data = await res.json();
      if (data.options) {
        setOptions(data.options);
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate_success", feature: "FeatureA", options_count: data.options.length }),
        }).catch(() => {});
        if (!isSubscribed) {
          const newCount = usesCount + 1;
          setUsesCount(newCount);
          localStorage.setItem(USES_KEY, String(newCount));
        }
      } else {
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate_error", feature: "FeatureA", error: data.error || "no_options" }),
        }).catch(() => {});
        console.error("API error:", data);
      }
    } catch (e) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_error", feature: "FeatureA", error: "network_error" }),
      }).catch(() => {});
      console.error("Request failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "copy", feature: "FeatureA" }),
    }).catch(() => {});
  };

  const sendToWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 2000);
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
          onBonus={handleBonus}
          loading={subscribing}
          bonusUsed={bonusUsed}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">💬 Dating Reply Assistant</h1>
          <p className="text-sm text-gray-500 mt-1">3 reply options. Pick one. Move on.</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Hero - A/B tested */}
        <div className="text-center mb-10">
          {contentVariant === "b" ? (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Stop staring at your phone. Get 3 reply options.
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Paste what they sent. Pick a reply. Done in 10 seconds.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Got a message you don't know how to reply to?
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Get 3 different response options. Choose one, send it, move on.
              </p>
            </>
          )}
          <button
            onClick={() => textareaRef.current?.focus()}
            className="w-full py-4 bg-pink-500 text-white rounded-2xl font-medium text-lg hover:bg-pink-600 transition-colors mb-3"
          >
            Try Free — 3 options in 3 seconds
          </button>
          <div className="inline-block bg-pink-100 text-pink-700 text-sm font-medium px-4 py-2 rounded-full">
            No signup needed. No data saved.
          </div>
        </div>

        {/* Free uses bar */}
        {!isSubscribed && (
          <>
            <div className="mb-6 p-3 bg-pink-50 border border-pink-100 rounded-xl flex items-center justify-between">
              <span className="text-sm text-pink-700">
                {remainingFree > 0
                  ? `Free trial ${remainingFree} uses, no card needed`
                  : "Free uses exhausted"}
              </span>
            </div>
            <button
              onClick={() => setShowPaywall(true)}
              className="w-full py-3 bg-pink-500 text-white rounded-xl font-medium text-base hover:bg-pink-600 transition-colors mb-6"
            >
              Unlock Pro, unlimited →
            </button>
          </>
        )}

        {/* Input */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            What they sent...
          </label>
          <textarea
            ref={textareaRef}
            value={theirMessage}
            onChange={(e) => setTheirMessage(e.target.value)}
            placeholder="Paste their message here..."
            className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-base"
            rows={3}
          />
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={!theirMessage.trim() || loading}
          className="w-full py-4 bg-pink-500 text-white rounded-2xl font-medium text-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-8"
        >
          {loading ? "🤔 Thinking..." : "✨ Get Options"}
        </button>

        {/* Results */}
        {options.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-700">3 Reply Options:</h3>
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
                    <span className="text-pink-500 font-medium text-sm">Selected</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Custom reply */}
        {options.length > 0 && (
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Or edit it yourself...
            </label>
            <textarea
              value={customReply}
              onChange={(e) => {
                setCustomReply(e.target.value);
                setSelectedOption(null);
              }}
              placeholder="Edit your reply here..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-base"
              rows={2}
            />
          </div>
        )}

        {/* Copy + WhatsApp */}
        {finalReply && (
          <div className="space-y-3">
            <div className="p-4 bg-gray-100 rounded-2xl">
              <div className="text-xs text-gray-500 mb-1">Your reply:</div>
              <p className="text-gray-800 font-medium">{finalReply}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(finalReply)}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
              <button
                onClick={() => sendToWhatsApp(finalReply)}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
              >
                {whatsappSent ? "✓ Opened in WhatsApp" : "📱 Send to WhatsApp"}
              </button>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">How it works</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">1</div>
              <div>
                <div className="font-medium text-gray-800">Paste the message you received</div>
                <div className="text-sm text-gray-500">Any dating app — Tinder, Bumble, Hinge, WhatsApp</div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">2</div>
              <div>
                <div className="font-medium text-gray-800">Get 3 reply options — different styles</div>
                <div className="text-sm text-gray-500">Playful, sincere, or cool — you choose</div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">3</div>
              <div>
                <div className="font-medium text-gray-800">Pick one, send it, move on</div>
                <div className="text-sm text-gray-500">No overthinking. No anxiety. Just respond and go.</div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">FAQ</h3>
          <div className="space-y-4">
            <div>
              <div className="font-medium text-gray-800 mb-1">Is this cheating?</div>
              <div className="text-sm text-gray-600">No. It's about having options. You choose what to send — we just help you find the words.</div>
            </div>
            <div>
              <div className="font-medium text-gray-800 mb-1">What apps does it work with?</div>
              <div className="text-sm text-gray-600">Tinder, Bumble, Hinge, WhatsApp, Instagram DMs — any messaging app.</div>
            </div>
            <div>
              <div className="font-medium text-gray-800 mb-1">How much?</div>
              <div className="text-sm text-gray-600">$9.99/month. 3 free tries to start. Cancel anytime.</div>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <p className="text-center text-xs text-gray-400 mt-12">
          🔒 Disappears after reading, never saved or used for training
        </p>
      </div>
    </main>
  );
}
