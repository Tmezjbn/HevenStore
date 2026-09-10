---
target: Categories dashboard
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-07-11T13-05-35Z
slug: src-pages-dashboard-categoriespage-tsx
---
# Categories dashboard critique

**Target:** `src/pages/dashboard/CategoriesPage.tsx`

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Nest status + row highlight good; add/toggle/Aura bulk lack success confirmation |
| 2 | Match System / Real World | 2 | “Aura dual” / “Sub-sub” opaque; placeholders are the only domain clarity |
| 3 | User Control and Freedom | 2 | Escape from nest/edit exists; cascade delete has no undo |
| 4 | Consistency and Standards | 3 | DaisyUI patterns hold; Add-under uses `title`, edit/delete use `aria-label` |
| 5 | Error Prevention | 2 | Level-3 nest blocked; same-name siblings allowed; bulk Aura unconfirmed |
| 6 | Recognition Rather Than Recall | 2 | Indent + badges fail when names collide; Aura meaning not on-page |
| 7 | Flexibility and Efficiency | 2 | Add-under + sticky parent help; no reorder, no keyboard tree ops |
| 8 | Aesthetic and Minimalist Design | 2 | Aura header + dual toggles steal focus from taxonomy |
| 9 | Error Recovery | 2 | Slug-friendly error + edit cancel; delete/partial bulk hard to reverse |
| 10 | Help and Documentation | 2 | Main→Sub→Sub-sub subtitle helps; Visible/Aura undocumented |
| **Total** | | **22/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment:** Passes absolute AI-slop bans (no side-stripe, gradient text, glass default, identical icon-card grids, tracked eyebrows, border+wide shadow, 32px+ radius). Fails the **product trust** test: Aura bulk chrome and co-equal toggles make a Linear/Stripe-fluent admin pause. Nested identical labels (`we` → `we` → `we`) undermine hierarchy readout. Sticky bilingual form state can publish wrong AR under wrong parent.

**Deterministic scan:** `detect.mjs --json` exit 0, **0 findings** (`[]`). Clean on detector rules; trust/IA issues are human-review only.

**Visual overlays:** Not available — Assessment B had no browser MCP in shell agent; no reliable user-visible overlay.

## Overall Impression

Add-under + nest status is the right taxonomy idea. Execution still feels like generic Daisy CRUD with merchandising toggles bolted on. Biggest opportunity: make **building the tree** the only first-class job; demote Aura/Visible and make hierarchy readable when names collide.

## What's Working

1. **Add-under → focus form → nest status → sticky parent** is real taxonomy workflow, not generic CRUD.
2. **Flattened tree + indent + level badges + AR `dir="rtl"`** show hierarchy and i18n intent.
3. **Basics covered:** skeletons, empty state, `role="alert"` errors, slug collision copy, level-3 nest guard.

## Priority Issues

### P1 — Aura bulk + dual toggles on the taxonomy surface
- **Why:** Secondary merchandising competes with primary job (Main→Sub→Sub-sub).
- **Fix:** Move Aura (and maybe Visible bulk) to row menu / disclosure; header = tree actions only.
- **Suggested command:** `$impeccable distill` or `$impeccable layout`

### P1 — Hierarchy unreadable when labels collide
- **Why:** Indent + `└` + ghost badges fail when names repeat (`we→we→we`).
- **Fix:** Path/breadcrumb or parent chip; stronger indent; warn on duplicate sibling names.
- **Suggested command:** `$impeccable clarify` + `$impeccable layout`

### P1 — Bilingual + parent form state invites wrong catalog writes
- **Why:** AR can linger while EN/parent shifts; sticky `parent_id` easy to mis-nest.
- **Fix:** Stronger mode chip; reset AR on Add-under or confirm “next sibling under X”; explicit AR optional emptiness.
- **Suggested command:** `$impeccable harden` or `$impeccable clarify`

### P2 — Cascade delete is high-stakes with weak recovery
- **Why:** Native `confirm` only; children deleted; no undo.
- **Fix:** Show children count; typed confirm or block delete if children exist.
- **Suggested command:** `$impeccable harden`

### P2 — “Aura dual” / “Visible” semantics invisible
- **Why:** Power features with no on-page meaning; Visible = `is_active` without storefront copy.
- **Fix:** Tooltips/legend; rename (“Show in nav”, “Featured aura”).
- **Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Alex (Power User):** No drag-reorder; Aura select-all = N silent mutations; mouse-centric Add-under; no keyboard tree shortcuts.

**Sam (Accessibility):** Icon-only edit/delete; native `confirm()`; nest status not a live region; dual adjacent toggles; horizontal table scroll.

**Bilingual store owner (GTA 5 / Gift Card):** Placeholders teach the story UI doesn’t enforce; AR optional vs brand parity; Aura at top feels like accidental storefront switch; delete-fear on whole Games branch.

## Minor Observations

- `└` indent reads developer-tree, not Trusted Vault craft.
- Edit mode colspan collapses Name/Level abruptly.
- Sparkles on Aura slightly playful vs vault restraint.

## Questions to Consider

1. If Aura is storefront merchandising, why does it own the Categories header?
2. Would a collapsible tree with path chips prevent more mistakes than another table column?
3. Should “next sibling under X” be an explicit dismissible mode?
