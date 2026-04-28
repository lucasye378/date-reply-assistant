# Feature C v2 (Opening Line Generator) - Spec

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

## User Flow

### Input (Step 1)
- User pastes对方的 profile/bio content into a textarea
  - Bio, interests, common ground — anything useful
- No style selector upfront (风格在结果里选)
- No relationship stage selector
- Example placeholder: "粘贴对方的 Facebook/IG/Bumble profile 内容，或者描述你们怎么认识的..."

### Generate → Results (Step 2)
- API generates 3 opening line options in different styles:
  - 🥨 俏皮型 (playful/teasing)
  - 🧱 正经型 (sincere/proper)
  - ⚡ 简短型 (short/direct)
- Each option has a copy button
- User picks one, copies, sends

### Upgrade Prompt (Post-copy)
- After copying, user sees: "Want better replies? Try Reply Assistant →"

---

## Implementation

### Route: `/en/opener`
- Standalone page, NOT a tab of Reply page
- Single textarea input → generate → 3 style options in results
- Style selector appears in results (not input stage)

### Backend: `/api/opener`
- Input: `{ profile: string }` (no relationshipStage, style, gender)
- Output: 3 options with different styles
- Same access tiers as spec above

### Prompt Strategy
- Use profile content to generate contextually relevant openers
- 3 styles: 俏皮/正经/简短
- Each under 40 characters
- Copy-button per option

---

## Access Control
- Free: 3/day (localStorage + IP backend)
- Paid: unlimited

---

## Stripe Integration
- Payment Links
  - Monthly: `test_4gM00j4Eg5xIbFAayWcjS0a`
  - Yearly: `test_eVqfZhfiUaS29xs4aycjS09`
- Post-payment email verification via `/api/subscription-status`

---

## Upgrade Flow
1. User exhausts free openers → paywall modal
2. Modal promotes Reply Assistant ($9.99/mo)
3. User pays → email verification → activate subscription
