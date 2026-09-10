---
target: Edit Product modal (ProductsPage)
total_score: 24
p0_count: 1
p1_count: 3
timestamp: 2026-07-10T11-38-39Z
slug: src-pages-dashboard-productspage-tsx
---
⚠️ DEGRADED: single-context (sub-agent spawn aborted by user)

Target: Edit Product modal (`src/pages/dashboard/ProductsPage.tsx`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | OOS warning + save spinner solid; no dirty-state / section progress |
| 2 | Match System / Real World | 2 | “Product details” (post-pay secret) vs “Description” (storefront) collide |
| 3 | User Control and Freedom | 3 | Close/Cancel/backdrop work; no unsaved-discard guard; seller checkbox checked+disabled |
| 4 | Consistency and Standards | 3 | Daisy form vocabulary consistent; intra-form naming is not |
| 5 | Error Prevention | 3 | Active+0 stock blocked well; required fields only fail on submit |
| 6 | Recognition Rather Than Recall | 2 | Six equal sections in one scroll; Media/Save easy to miss |
| 7 | Flexibility and Efficiency | 1 | No Cmd/Ctrl+S, no fulfillment templates, modal-only path |
| 8 | Aesthetic and Minimalist Design | 2 | Dense modal wall; optional blocks always expanded at equal weight |
| 9 | Error Recovery | 3 | Stock / slug / permission messages are plain and actionable |
| 10 | Help and Documentation | 2 | Inline help exists but Seller essay + dual Fulfillment paths overload |
| **Total** | | **24/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment**: Not cream/SaaS-slop. Familiar Daisy admin form — earned familiarity mostly holds. Failure mode is product-register “modal as first thought”: a full catalog editor (basics → pricing → seller → fulfillment → bilingual copy → media) crammed into one scrolling `modal-box`. Equal-weight legends, long help paragraphs, and colliding “details/description” labels read as bolted-on features, not a vault-grade commerce tool.

**Deterministic scan**: `detect.mjs --json src/pages/dashboard/ProductsPage.tsx` → `[]` (exit 0). No automated slop-rule hits on this file.

**Visual overlays**: No reliable user-visible overlay. Mutable injection preflight succeeded (`document.title` + script tag), but loading `http://localhost:8400/detect.js` was blocked by the harness auto-review. Fallback: CLI clean + live modal screenshot/a11y tree.

## Overall Impression

Structure (sectioned fieldsets, OOS honesty, optional fulfillment) is the right direction. Biggest opportunity: make post-purchase delivery unmistakable from storefront copy, and stop treating a six-section editor as a dialog.

## What's Working

1. **Commerce honesty on stock** — “Active with 0 stock” warning + hard save block matches Trusted Vault / trust-before-flash.
2. **Fulfillment optionality** — Product details paste + optional Values, with “labels stay private,” matches the real delivery job.
3. **Bilingual basics** — EN/AR name fields with RTL on Arabic inputs; sectioned IA is scannable once you know the map.

## Priority Issues

### [P0] “Product details” vs “Description” naming collision
- **What**: Fulfillment “Product details” sits above Copy “Description (English/Arabic).” Same mental model, opposite audiences (buyer after pay vs public storefront).
- **Why it matters**: Admins will paste delivery content into Description (public leak) or leave Fulfillment empty (buyer gets nothing).
- **Fix**: Rename fulfillment field to e.g. “Delivery content” / “محتوى التسليم”; add one-line contrast: “Not the storefront description.” Optionally collapse Copy under “Storefront.”
- **Suggested command**: `$impeccable clarify`

### [P1] Seller checkbox checked while disabled with “No seller”
- **What**: “Show seller profile…” is `checked` + `disabled` when seller is empty.
- **Why it matters**: Looks enabled/on; teaches the wrong model of attribution.
- **Fix**: Uncheck when `seller_id` empty; or hide the control until a seller is chosen.
- **Suggested command**: `$impeccable harden`

### [P1] Full editor trapped in a scrolling modal
- **What**: Basics → Media in one `modal-box`; Save/Cancel at the end; Media often below the fold.
- **Why it matters**: Product register: modal is usually laziness for this density. Peak-end is “did I miss fulfillment/media?”
- **Fix**: Sticky modal footer for Save/Cancel; or move edit to a dedicated page / drawer with sticky actions; progressive disclosure for optional Seller / Fulfillment / Copy / Media.
- **Suggested command**: `$impeccable distill` (or `$impeccable layout`)

### [P1] Optional sections always fully expanded
- **What**: Seller, Fulfillment, Copy, Media always open at the same visual weight as Pricing.
- **Why it matters**: Cognitive load checklist fails single-focus / progressive disclosure; every edit feels like a 20-field exam.
- **Fix**: Default-collapse optional blocks; show summary chips (“No seller”, “No delivery content”, “No image”).
- **Suggested command**: `$impeccable distill`

### [P2] Seller help copy is an essay
- **What**: Long paragraph about any-role attribution under a disabled checkbox.
- **Why it matters**: Germane load becomes extraneous; first-timers stall.
- **Fix**: One short line; move role explanation to a tooltip or docs link.
- **Suggested command**: `$impeccable quieter` / `$impeccable clarify`

## Persona Red Flags

**Alex (Power admin)**: No keyboard save; must scroll entire modal; cannot batch-edit. Modal path only.

**Jordan (First-time admin)**: Will confuse Product details vs Description; seller checkbox looks “on” with No seller; Category dumps 6+ options with no recommended grouping.

**Sam (A11y)**: Dialog lacks clear `aria-labelledby` to “Edit Product”; long form is a linear tab marathon; disabled-but-checked checkbox is announced confusingly.

**Store owner (bilingual, AR/EN)**: Delivery vs storefront copy ambiguity is worse under language switch; Arabic description sits far from fulfillment paste.

## Cognitive Load

Failed: single focus, visual hierarchy, one-thing-at-a-time, minimal choices (category/seller lists), working memory (details vs description), progressive disclosure → **high** (5+ failures).

## Emotional Journey

Peak: OOS warning (trust). Valley: mid-modal Seller essay + dual fulfillment paths. End: Save below fold after Media — anxiety “did delivery content save?”

## Minor Observations

- Placeholder contrast on Product details / Optional original price may be weak on light vault theme.
- `role="dialog"` present; confirm focus trap + Esc (Daisy) in audit.
- Values empty state (“No values yet”) is good teaching copy — keep that pattern for collapsed sections.
- Table already shows “Active · no stock” — modal warning aligns well (consistency win).

## Questions to Consider

- What if Edit Product were a page with sticky save, and the modal only existed for “quick price/stock”?
- Should Fulfillment be the only place the word “details” appears?
- Does every product edit need Seller + Media visible by default?
