# Funnel Analysis — date-reply.com
**Generated:** 2026-04-27  
**Status:** CRITICAL — Stripe is in TEST mode, ZERO revenue

---

## Key Finding: Payment System Non-Functional

**Both the Chinese (/zh) and English (/en) pages are using Stripe TEST payment links:**
- Monthly: `https://buy.stripe.com/test_4gM00j4Eg5xIbFAayWcjS0a`
- Yearly: `https://buy.stripe.com/test_eVqfZhfiUaS29xs4aycjS09`

The `test_` prefix means these are Stripe sandbox links — **no real money is being collected**. The Stripe dashboard confirms: Gross volume = $0.00, Net volume = $0.00.

**This is the #1 blocker.** Until this is fixed, nothing else in the funnel matters.

---

## Current Funnel Stages (Based on Code Analysis)

The tracking API (`/api/track`) captures these events:
- `page_view` — landing page loaded
- `generate_attempt` — user clicks "Get Options"
- `generate_success` — AI returns reply options
- `paywall_shown` — free uses exhausted, modal appears
- `bonus_granted` — user claims one-time bonus
- `copy` / `whatsapp` — user takes action with reply
- `upgrade_click` — user clicks paywall CTA
- `plan_selected` — user picks monthly/yearly
- `stripe_redirect` — user sent to Stripe

---

## Estimated Funnel (No Real Data — Supabase not configured)

The track endpoint writes to `analytics_events` in Supabase, but `supabaseAdmin` is null (no env vars configured), so events are only logged to console. **No analytics data is being persisted anywhere.**

Based on code inspection alone:

| Stage | Description | Status |
|-------|-------------|--------|
| Landing → First use | User arrives, pastes message, generates options | Working (client-side only) |
| First use → Free trial exhausted | 3 free uses tracked in localStorage | Working |
| Free exhausted → Paywall shown | Modal appears when uses >= 3 | Working |
| Paywall → "Unlock Pro" clicked | User clicks upgrade button | Working (tracked) |
| "Unlock Pro" → See pricing | Pricing modal renders | Working |
| Pricing → Payment | User selects plan | **BROKEN — Stripe test links** |
| Payment → Subscribed | Stripe webhook fires, writes to subscriptions table | **Webhook may work but no $ collected** |

---

## Single Biggest Drop-Off Point

**Pricing → Payment (100% drop-off assumed)**

Since Stripe is in test mode, every payment attempt fails to convert to revenue. Even if users reach the payment page, they're in sandbox mode.

**However, even if we ignore the test-mode issue:**
The funnel goes: Paywall modal → plan selected → Stripe redirect → checkout page. If we assume 10% of users who see the paywall actually click a plan, and 50% of those complete payment, that's still a massive structural issue.

**Recommended fix priority:**
1. **IMMEDIATE:** Replace `buy.stripe.com/test_...` links with live Stripe payment links (`buy.stripe.com/...` without `test_`)
2. Configure real Stripe price IDs in env vars
3. Ensure webhook is processing real subscription events

---

## What IS Being Tracked (in console.log only)

Since Supabase is not configured, ALL track events go to:
```
console.log(`[TRACK] ${timestamp} | action=${action} | feature=${feature} ...`)
```

These are NOT persisted anywhere accessible. To get real funnel data:
1. Configure Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY)
2. Verify analytics_events table exists and has proper schema
3. Add a dashboard/reporting layer for these events

---

## Actionable Recommendations

### 1. Fix Stripe Payment Links (Highest Impact)
**File:** `src/app/page.tsx` and `src/app/page.en.tsx`

Current (BROKEN):
```typescript
const PAYMENT_LINK_MONTHLY = "https://buy.stripe.com/test_4gM00j4Eg5xIbFAayWcjS0a";
const PAYMENT_LINK_YEARLY = "https://buy.stripe.com/test_eVqfZhfiUaS29xs4aycjS09";
```

Fix: Get live payment links from Stripe Dashboard → Product Catalog → Create products/prices → Copy payment links (without `test_` prefix).

### 2. Configure Supabase for Real Analytics
Add to environment:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

Then verify the `analytics_events` table exists and is being written to. This is the only way to get real funnel drop-off data.

### 3. Add Server-Side Event Persistence (Backup)
Since client-side tracking can be blocked by ad blockers/browsers, also add server-side events for:
- Payment link clicked (server-side in checkout/route.ts)
- Webhook received (already in webhook handler, but verify it fires)
- Subscription activated

---

## Summary

| Issue | Severity | Fix Complexity |
|-------|----------|----------------|
| Stripe in test mode | 🔴 CRITICAL | Trivial (swap URLs) |
| No analytics persistence | 🟡 HIGH | Medium (configure Supabase) |
| No real funnel data | 🟡 HIGH | Medium (add tracking dashboard) |

**The product itself works.** Users can generate replies, the paywall triggers correctly, and the UX flow is sound. The ONLY reason revenue is $0 is the Stripe test mode issue.