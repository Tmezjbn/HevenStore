---
target: Products / ProductsPage
total_score: 18
p0_count: 1
p1_count: 2
timestamp: 2026-07-10T10-48-49Z
slug: src-pages-dashboard-productspage-tsx
---
Method: dual-agent (A: cb8c1009-92ed-465b-a057-e6341385d135 · B: bb58ae78-0ab4-4c83-8471-d0a74ce020bb)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Spinner only; toggle/save/delete give no persistent confirmation |
| 2 | Match System / Real World | 2 | EyeOff ≠ hide; Feature jargon; raw active; OOS+active |
| 3 | User Control and Freedom | 3 | Cancel OK; delete confirm but no undo |
| 4 | Consistency and Standards | 2 | Form i18n vs table English; primary ≠ Signal Teal |
| 5 | Error Prevention | 1 | Defaults stock 0 + status active; no stock↔status guard |
| 6 | Recognition Rather Than Recall | 2 | Icon-only 12px actions; Feature meaning opaque |
| 7 | Flexibility and Efficiency | 1 | No filters, bulk edit, shortcuts |
| 8 | Aesthetic and Minimalist Design | 2 | Clean shell, generic Daisy CRUD, duplicate titles |
| 9 | Error Recovery | 2 | Form alerts exist; empty search no recovery |
| 10 | Help and Documentation | 1 | One Feature hint; empty state teaches nothing |
| **Total** | | **18/40** | **Poor** |

Cognitive load: high (6+ checklist failures). Add modal alone is a 9–12 field wall.

#### Anti-Patterns Verdict

**LLM:** Not landing-page AI slop — product slop. Generic DaisyUI CRUD: zebra table, ghost icon squares, white primary CTA. Trusted Vault Signal Teal absent; heven theme primary is #fafafa. Stock 0 + active is a commerce trust failure baked into EMPTY_FORM defaults.

**Deterministic scan (CLI):** exit 2, 1 advisory — design-system-font-size 10px at ProductsPage.tsx:481 (form helper). Soft.

**Browser runtime:** 8 findings. Real page hit: cramped-padding on table wrapper. Rest (gradient-text ×2, bounce, stripes, layout-transition, flat-type) mostly shared dashboard chrome — false-positive risk for ProductsPage scope.

#### Overall Impression

Readable list skeleton, wrong commerce defaults. Biggest opportunity: stop selling empty stock as active, then make Add feel like vault catalog ops — not a field dump.

#### What's Working

1. Bilingual form fields with RTL on Arabic name/description.
2. Fulfillment fields progressive-disclose when product type ≠ other.
3. Clear column table + primary Add placement is the right job shape.

#### Priority Issues

**[P0] Sellable out-of-stock by design**
- What: Stock 0 + Status active on GTA5; EMPTY_FORM defaults the same.
- Why: Breaks Trust before flash — shoppers can see active listings with nothing to deliver.
- Fix: Default new products to draft/inactive; warn/block active when stock=0; OOS as warning badge.
- Suggested command: `$impeccable harden`

**[P1] Brand signal broken on primary CTA**
- What: + Add Product is white/near-white primary, not Signal Teal.
- Why: Admin fails Admin matches storefront quality / Rare Signal Rule.
- Fix: Align heven primary (or analytics/products override) to vault teal.
- Suggested command: `$impeccable colorize`

**[P1] Add/Edit modal is a field wall**
- What: One modal, ~9–12 controls, no sections/steps.
- Why: Extraneous load; easy to miss AR name / stock / status coupling.
- Fix: Sections (Basics · Pricing & stock · Bilingual · Media · Fulfillment) or short wizard.
- Suggested command: `$impeccable distill` (or `$impeccable shape` first)

**[P2] Icon-only row actions + wrong metaphor**
- What: EyeOff/Pencil/Trash 12px squares; EyeOff labeled Toggle status.
- Why: Misclicks; metaphor ≠ status.
- Fix: Labels or tooltips + larger targets; Hide/Show or Active/Inactive.
- Suggested command: `$impeccable audit` + `$impeccable clarify`

**[P2] Empty / search / Feature dead ends**
- What: Search miss = same as empty catalog; Feature is Select-all modal.
- Why: No teaching empty; Feature overpowered.
- Fix: Differentiate empty vs no-results; clear search; prefer row star.
- Suggested command: `$impeccable onboard` + `$impeccable layout`

#### Persona Red Flags

**Alex:** No filters/bulk/shortcuts; Feature modal is a detour; silent toggle/delete.

**Sam:** Icon-only 12px actions; search lacks accessible name beyond placeholder; native confirm for delete.

**Nadia:** Table ignores name_ar; badge always English active; "1 products" / Arabic count always منتج — wrong both ways at n=1.

#### Minor Observations

- Duplicate Products headings (layout h1 + page h2).
- Cramped padding on table wrapper (detector confirmed).
- No row thumbnail when image missing.
- Mobile = horizontal scroll only, no card stack.
- Feature copy references uppercase homepage section.

#### Questions to Consider

1. If stock is 0, should Active even be selectable?
2. Why is Feature a second product picker instead of a star on the row?
3. Would Nadia trust a vault that says "1 products" next to green active on empty stock?
4. Is this admin meant to feel like HEVEN.FUN, or a DaisyUI demo with a dark theme?
