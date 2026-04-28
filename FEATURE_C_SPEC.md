# Feature C (Opening Line Generator) - Monetization Spec

## Strategic Decision (2026-04-27)

**Feature C is a FREE lead-gen tool, not a paid product.**

- Market has free alternatives: ToolMesh Opener, MatchGenius, Rizzagic
- Paid wall on opener = users go elsewhere
- Reply is the core痛点 (core pain point) and only monetization trigger
- Opener strategy: free 3/day → drive to Reply subscription

---

## Access Tiers

| Tier | Opener Access | Reply Access |
|------|--------------|-------------|
| Free | 3/day (IP-enforced) | 3 free uses |
| Paid ($9.99/mo or $59.99/yr) | Unlimited | Unlimited |

---

## Implementation

### Backend: `/api/opener`
- Accepts `{ relationshipStage, style, gender, subscribed }`
- **Free user (subscribed=false)**: IP-based rate limit, 3/day
  - Uses in-memory `Map<ip:date, count>` (Vercel serverless)
  - Returns `{ error: "daily_limit_reached" }` when exhausted (HTTP 429)
- **Paid user (subscribed=true)**: Unlimited, no rate limit check
- Subscribed status is soft-check from localStorage (gameable, accepted for MVP)

### Backend: `/api/subscription-status`
- Accepts `{ email }`
- Queries Stripe API: `stripe.customers.list({ email })` → check active subscriptions
- Returns `{ active: boolean, plan: "monthly" | "yearly" | null }`
- Used by checkout success page for post-payment email verification

### Frontend: `/en` (Reply page)
- After Stripe payment redirect (`/?subscribed=true`):
  - Shows "Verify Payment" modal asking for payment email
  - User enters email → calls `/api/subscription-status`
  - Stripe confirms active subscription → mark `SUBSCRIBED_KEY=localStorage`
  - Grants immediate access instead of waiting for webhook lag

### Frontend: `/en/opener`
- Passes `subscribed: isSubscribed` to `/api/opener` on each request
- `isSubscribed` read from localStorage on page load
- Free 3/day tracked in localStorage + backend IP enforcement
- Paywall modal shown when backend returns `daily_limit_reached`

---

## Rate Limit Reset
- Daily reset at midnight (server time)
- In-memory Map resets when Vercel serverless instance recycles
- For production-scale: migrate to Supabase `opener_usage` table

---

## Stripe Integration
- Payment Links (pre-created in Stripe Dashboard)
  - Monthly: `test_4gM00j4Eg5xIbFAayWcjS0a`
  - Yearly: `test_eVqfZhfiUaS29xs4aycjS09`
- `STRIPE_SECRET_KEY` env var for server-side API calls
- No Supabase required for basic subscription check (Stripe API direct query)

---

## Upgrade Flow
1. User hits free opener limit → sees paywall modal
2. Modal promotes Reply Assistant ($9.99/mo) with social proof
3. User clicks CTA → goes to Stripe Payment Link
4. After payment → lands on `/?subscribed=true` → email verification modal
5. Email verified → marked as paid in localStorage → unlimited access
