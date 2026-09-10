---
target: ProductDetailPage
total_score: 20
p0_count: 1
p1_count: 2
timestamp: 2026-07-10T13-49-39Z
slug: src-pages-productdetailpage-tsx
---
Method: dual-agent (A: aa28a2d0-1e71-4ef5-a3b4-7c16ee0ed8f3 · B: eb6e863e-55a0-4309-81c4-f3de1f4595ec)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Stock shown in text, but disabled CTA has no `aria-describedby`; add-to-cart success is visual-only |
| 2 | Match System / Real World | 2 | $1 AAA title breaks price expectations; no product type, platform, or fulfillment label |
| 3 | User Control and Freedom | 3 | Clear "Back to store" escape; no trap states |
| 4 | Consistency and Standards | 2 | ProductCard says "Out of stock"; detail page says "Add to Cart" (disabled). No wishlist parity |
| 5 | Error Prevention | 2 | Stock guard works, but no proactive alternative when inventory is zero |
| 6 | Recognition Rather Than Recall | 2 | `product_type`, category, gallery, sales count exist in model but aren't surfaced |
| 7 | Flexibility and Efficiency | 1 | No wishlist, sticky CTA, or keyboard accelerators on a commerce surface |
| 8 | Aesthetic and Minimalist Design | 3 | Clean two-column layout; minimal to the point of emptiness on sparse listings |
| 9 | Error Recovery | 2 | Out-of-stock is a dead end — no notify-me, related products, or support link |
| 10 | Help and Documentation | 1 | No delivery/fulfillment FAQ, support, or trust badges near the purchase decision |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment:** Not generic AI marketing slop — no cream heroes, gradient text, metric templates, or icon-card grids. The page is a restrained dark commerce scaffold that reads as **unfinished**, not over-designed. The product-register failure mode is **strangeness without purpose**: a hero-scale empty placeholder, $1 AAA pricing that triggers scam alarm, and a disabled gray CTA as the page's emotional ending.

**Deterministic scan:** CLI on `src/pages/ProductDetailPage.tsx` returned **0 findings** (`[]`, exit 0). Static TSX is clean.

**Browser overlay (injection succeeded):** 4 element groups / 9 rule hits — mostly **shared shell**, not PDP-authored:
- Header search `layout-transition` (×2) — Navbar, not product page
- Mobile drawer `layout-transition` — hidden off-screen
- Body-level `gradient-text`, `bounce-easing`, `repeating-stripes-gradient` — global theme/chrome

**Overlay missed; browser evidence caught on PDP:**
- Disabled "Add to Cart" computed contrast ~unreadable (DaisyUI disabled opacity stack)
- Star rating row nearly invisible on dark void (~1.2:1)
- Rating row lacks programmatic semantics (`aria-label`)

**False positives:** Treat header/menu/footer overlay hits as shell noise when scoping fixes to ProductDetailPage.

## Overall Impression

The PDP skeleton is sound — responsive grid, bilingual copy, loading/not-found states, price hierarchy. On live data (GTA5, no image, $1, 0 reviews, out of stock) it **fails the vault's core job**: earn trust at the purchase moment. The single biggest opportunity is turning the commerce block (price + stock + trust + CTA) into one confident decision surface, with out-of-stock as a recovery path instead of a dead end.

## What's Working

1. **Solid PDP scaffold** — Skeleton loading, not-found recovery, responsive `lg:grid-cols-2`, bilingual `t()` throughout, RTL-aware back icon.
2. **Commerce hierarchy basics** — Heavy title, prominent price, discount badge logic mirrors `ProductCard`.
3. **Seller trust hook (when data exists)** — Bordered seller chip with avatar fallback matches Trusted Vault tone.

## Priority Issues

### [P0] Out-of-stock dead end with misleading CTA label
- **Why:** Shoppers arrive to buy; disabled "Add to Cart" offers no recovery and contradicts `ProductCard`'s "Out of stock" label.
- **Fix:** When `stock <= 0`, button text → "Out of stock"; add `aria-describedby` to stock message. Below CTA: browse-similar links or notify-me stub.
- **Suggested command:** `$impeccable clarify`

### [P1] Missing trust signals at purchase decision
- **Why:** PRODUCT.md #1 and DESIGN.md require instant delivery, secure payment, support near CTA. Only a one-line stock message exists.
- **Fix:** Compact trust row (reuse homepage trust icons from `siteSettings`) directly above/below CTA; show fulfillment type chip from `product_type`.
- **Suggested command:** `$impeccable harden`

### [P1] Layout fracture — back link misaligned from content column
- **Why:** Back link sits in a separate full-width wrapper outside `max-w-5xl`, creating a left-floating orphan that breaks visual grouping (visible in live screenshot).
- **Fix:** Move back link inside the shared page shell aligned with grid start edge in LTR and RTL.
- **Suggested command:** `$impeccable layout`

### [P2] Disabled CTA and star row fail contrast
- **Why:** Browser computed styles show disabled button text at ~20% opacity; empty stars blend into void. Both fail the read test Sam and Jordan need.
- **Fix:** Explicit disabled button styles with readable label; star row with `aria-label` summary and higher-contrast empty-star treatment.
- **Suggested command:** `$impeccable audit`

### [P2] Commerce metadata under-surfaced
- **Why:** `product_type`, category, `images[]`, `sales_count` exist but aren't rendered — live GTA5 is a content desert.
- **Fix:** Type badge, category breadcrumb, image gallery fallback, sales count; extend `useProductBySlug` query as needed.
- **Suggested command:** `$impeccable distill`

## Persona Red Flags

**Casey (mobile shopper):** Tall `aspect-[4/3]` hero pushes price + CTA below fold past an empty placeholder. No sticky CTA. Back link top-left — poor thumb reach.

**Jordan (first-timer):** "GTA5 / $1 / 0 reviews" with no delivery explanation. Disabled cart button reads as broken site. No FAQ or support entry.

**Sam (accessibility):** Star rating decorative with no `aria-label`. Disabled CTA not associated with "Out of stock" text. Stock partly color-coded only.

**Nour (bilingual gamer):** Back link misalignment will feel like mirrored afterthought in Arabic. No secure-payment / instant-delivery proof at CTA. $1 + empty hero erodes premium boutique promise.

## Minor Observations

- No wishlist on detail page despite `ProductCard` parity
- `added` state uses 2s timeout with no `aria-live` announcement
- Hardcoded `$` prefix — no locale-aware currency for AR shoppers
- Description hidden when empty — fine, but sparse listings show a content desert
- Theme primary is neutral gray (`#ececec`), not Signal Teal per DESIGN.md — disabled CTA nearly invisible

## Questions to Consider

1. What if out-of-stock were a conversion surface — notify-me + "players also bought" — instead of the weakest possible end state?
2. Should a PDP this sparse exist for low-trust listings ($1 AAA, no image, 0 reviews), or should the vault gate them before they get a detail URL?
3. Is a full page necessary for digital keys, or would an in-catalog quick-buy sheet with trust row convert faster on mobile?
