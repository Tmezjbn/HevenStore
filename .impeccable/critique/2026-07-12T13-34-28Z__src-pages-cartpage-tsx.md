---
target: CartPage / shopping cart
total_score: 21
p0_count: 0
p1_count: 4
timestamp: 2026-07-12T13-34-28Z
slug: src-pages-cartpage-tsx
---
# Critique — CartPage (`src/pages/CartPage.tsx`)

Method: dual-agent (A: 9836021e-1648-499b-aef2-4bf15a6dc08e · B: 82eab3dd-8f0d-4f09-b721-a709ae08289c)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|------:|-----------|
| 1 | Visibility of System Status | 2 | Qty/remove silent; coupon spinner only |
| 2 | Match System / Real World | 3 | Cart OK; “Delivery Free” weak for digital keys |
| 3 | User Control and Freedom | 2 | One-tap remove, no undo, unlabeled trash |
| 4 | Consistency and Standards | 2 | `$1` vs `$2.00`; AR copy without cart RTL |
| 5 | Error Prevention | 2 | Tiny qty targets; no remove confirm |
| 6 | Recognition Rather Than Recall | 2 | Icon-only −/+ / trash |
| 7 | Flexibility and Efficiency | 2 | No continue-shopping on filled cart |
| 8 | Aesthetic and Minimalist Design | 2 | Blank thumb + ghost Apply break clean layout |
| 9 | Error Recovery | 3 | Coupon errors inline; empty has Browse CTA |
| 10 | Help and Documentation | 1 | No trust/support near checkout CTA |
| **Total** | | **21/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM:** Not classic AI landing slop. Product-slop = thin DaisyUI cart scaffold. Blank media, ghost disabled Apply, zero trust at money CTA → pauses every Steam/Stripe-fluent shopper.

**Deterministic scan:** CLI `detect.mjs --json src/pages/CartPage.tsx` → exit 0, `[]`. Browser overlay: 2 groups; heading-skip h1→h3 on line items is real CartPage issue. Footer h6 / gradient / bounce / stripe cues → treat as shell FPs.

## Overall Impression

Pattern correct (list + sticky summary + primary checkout). Execution under-vaults: missing product face, illegible Apply, no trust beat before pay. Biggest win = make line items look like real goods + trust under CTA.

## What's Working

1. Checkout CTA hierarchy — full-width primary = rare signal.
2. Familiar commerce IA — items + sticky summary.
3. Coupon path product-shaped — load / error / applied + remove.

## Priority Issues

### [P1] Blank line-item media
- **Why:** Empty figure → cart feels broken; kills trust on digital store.
- **Fix:** Always thumb or deliberate placeholder; never empty tonal hole.
- **Suggested command:** `$impeccable polish`

### [P1] No trust copy at checkout CTA
- **Why:** PRODUCT #1 / DESIGN do-list — instant delivery, secure pay, support near money.
- **Fix:** 1–2 lines under Proceed; keep primary ≤15% viewport.
- **Suggested command:** `$impeccable clarify` then `$impeccable polish`

### [P1] Disabled Apply contrast
- **Why:** ~20% ink on ~10% fill → looks broken, not disabled.
- **Fix:** Muted outline / ≥3:1 disabled label until code present.
- **Suggested command:** `$impeccable audit` / `$impeccable polish`

### [P1] Qty / remove touch targets
- **Why:** ~32×24 / ~36×24 ≪ 44×44 → mobile miss-taps.
- **Fix:** min 44px hit area; space trash from total.
- **Suggested command:** `$impeccable adapt`

### [P2] AR = copy swap, not cart RTL
- **Why:** No `dir={contentDir}` on cart; PRODUCT bilingual first-class.
- **Fix:** Wrap cart in `dir={contentDir}`; logical spacing on join/flex.
- **Suggested command:** `$impeccable harden`

### [P2] Empty cart teaches nothing
- **Why:** product.md empty states must teach.
- **Fix:** Continue + 2–3 recs / last viewed + one benefit line.
- **Suggested command:** `$impeccable onboard`

## Persona Red Flags

**Casey (mobile):** Tiny qty/remove; checkout below fold; ghost Apply; blank thumb.

**Riley (edge):** Priced SKU + no media; remove no undo; `$1` vs `$2.00`; no continue shopping.

**Jordan (first-timer):** Icon-only trash; Delivery/Free unexplained for digital; no help at money.

**HEVEN gamer (first-visit key buyer):** Needs vault proof (platform/region/instant). Gets dark square + $1 + white button → bounce risk.

## Minor Observations

- Title truncate under-weighs product name
- Trash missing `aria-label` (coupon X has one)
- Mobile needs sticky bottom checkout, not only `top-24` summary
- Page title display weight fights product restraint
- Heading skip h1→h3 on line items (overlay)

## Questions to Consider

1. Blank thumb forever → still ship pay path?
2. “Free delivery” = trust story for keys, or dodge?
3. Why cart skip `contentDir` when legal pages get RTL?
