---
target: Edit Product modal
total_score: 18
p0_count: 1
p1_count: 3
timestamp: 2026-07-14T16-03-28Z
slug: productspage-edit-product-modal
---
# Critique: Edit Product modal (`ProductsPage.tsx` + `Modal.tsx`)

Method: dual-agent (A: 8b60bfe3-da89-4956-b44b-f8cccebb4c3f · B: 3bd84667-aa57-49b9-8334-8352527dc2b2)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Save spinner exists; no dirty state; Save after long scroll |
| 2 | Match System / Real World | 2 | Fulfillment “details” vs storefront “Description”; FX/atmosphere jargon |
| 3 | User Control and Freedom | 2 | Esc/X/Cancel OK; no unsaved-discard; nested scrolls |
| 4 | Consistency and Standards | 2 | Daisy OK; FX dropdown vs atmosphere checkboxes inconsistent |
| 5 | Error Prevention | 2 | Key/stock honesty helps; discard loses edits |
| 6 | Recognition Rather Than Recall | 1 | ~9 equal sections; Media/Save easy to miss below fold |
| 7 | Flexibility and Efficiency | 1 | No Cmd+S; no quick-edit; every tweak = full editor |
| 8 | Aesthetic and Minimalist Design | 1 | Optional FX/atmosphere/seller/media always expanded |
| 9 | Error Recovery | 3 | formError plain; work preserved on failed save |
| 10 | Help and Documentation | 2 | Dense 10px hints; atmosphere “if enabled…” fog |
| **Total** | | **18/40** | **Poor** |

## Anti-Patterns Verdict

**LLM:** Not marketing AI-slop. Product failure = **modal-as-first-thought** for a full catalog editor. Card FX + 10-logo atmosphere bolted on at equal weight → taller mega-modal valley than Jul 10 (~24 → ~18).

**CLI:** exit 2 — 13× `design-system-font-size` (10/11px) on ProductsPage; Modal.tsx clean.  
**Browser:** Edit Product opened (fortnie). Overlay OK; 28 runtime findings — tiny-text aligns with CLI; cramped-padding/layout-transition/shell rules mostly page chrome behind modal. Live-server stopped. `skipped-heading` h1→h3 while modal open.

## Overall Impression

Commerce-first top (Basics + Pricing) is right; container is wrong. Biggest lever: sticky Save + collapse optional FX/atmosphere — or leave the modal for quick edits only.

## What's Working

1. Basics → Pricing before decoration  
2. EN/AR names + RTL Arabic; slug LTR mono  
3. Modal shell: labelledBy, Esc, focus trap, scroll lock  

## Priority Issues

### [P0] Full editor in scrolling `max-w-2xl` modal (~9 sections)
- **Why:** Product ban — modal laziness; high cognitive load  
- **Fix:** Edit page/drawer + sticky Save; modal only for price/stock quick edit  
- **Suggested command:** `$impeccable shape` / `$impeccable distill`

### [P1] Atmosphere 10-checkbox wall + dual logo systems
- **Why:** Wall of options; FX vs atmosphere = two mental models  
- **Fix:** Collapse; default control; one logo pattern  
- **Suggested command:** `$impeccable distill`

### [P1] Optional sections always expanded, equal legend weight
- **Why:** Every edit = full exam  
- **Fix:** Default-collapse Seller / FX / Atmosphere / Requirements / Media  
- **Suggested command:** `$impeccable quieter` / `$impeccable layout`

### [P1] Save/Cancel not sticky — after Media
- **Why:** High-stakes action buried  
- **Fix:** Sticky `modal-action` footer  
- **Suggested command:** `$impeccable polish`

### [P2] Fulfillment “Product details” vs Copy “Description”
- **Why:** Confusable; delivery vs public copy risk  
- **Fix:** Rename → “Delivery content”; contrast vs storefront  
- **Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Alex:** Price tweak opens atmosphere + seller + media marathon; no keyboard save.  
**Sam:** Tab through ~10 atmosphere checks + nested overflow; 10px helpers.  
**Nour:** AR name RTL OK; EN/AR descriptions far below fulfillment — language-switch risk.

## Minor Observations

- Legends same weight — no required vs optional  
- No “Clear atmosphere / use default”  
- FX “None” still full section  
- Nested seller scroll inside modal scroll  
- Values empty-state teach is good — reuse for collapsed sections  

## Questions to Consider

1. If Edit were a page with sticky Save, what still deserves a modal?  
2. Why two logo pickers (card FX vs atmosphere) with different UI?  
3. Should decoration (FX/atmosphere) appear before fulfillment keys?
