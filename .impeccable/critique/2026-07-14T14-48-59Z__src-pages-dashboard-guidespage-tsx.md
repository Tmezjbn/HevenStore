---
target: GuidesPage /dashboard/guides
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-07-14T14-48-59Z
slug: src-pages-dashboard-guidespage-tsx
---
# Critique: GuidesPage (dashboard)

**Target:** `src/pages/dashboard/GuidesPage.tsx` · `/dashboard/guides`

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Role `btn-primary` clear; no live region on content swap |
| 2 | Match System / Real World | 3 | Bilingual ops copy solid; webhook/Polar dense for first-timers |
| 3 | User Control and Freedom | 3 | Owner/admin can preview roles; no “back to my role” when browsing |
| 4 | Consistency and Standards | 2 | `tablist/tab` without `tabpanel` / `aria-controls` |
| 5 | Error Prevention | 2 | High-stakes sections same weight as low-stakes |
| 6 | Recognition Rather Than Recall | 2 | No TOC, anchors, or deep links to dashboard pages |
| 7 | Flexibility and Efficiency | 1 | Click-only role pills; no search / keyboard tab pattern |
| 8 | Aesthetic and Minimalist Design | 2 | Identical 10-card wall; equal visual weight |
| 9 | Error Recovery | 2 | Read-only; no empty-guide state |
| 10 | Help and Documentation | 3 | Task-relevant bilingual help; not searchable / contextual |
| **Total** | | **23/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM:** Not marketing slop. Product strangeness: centered long prose (global `body { text-align: center }` bleed), identical Daisy card-per-section wall, incomplete tabs. Shell familiar; content area template-docs, not Vault-grade.

**CLI detector:** `GuidesPage.tsx` + `roleGuides.ts` → `[]` (clean).

**Live overlay:** 17 findings — **10× line-length** on guide paragraphs (strongest page-local); BODY-level gradient/bounce/stripes/layout-transition likely global false positives; `single-font` Rubik intentional. Overlay visible during run.

## Overall Impression

Strong staff copy + role IA trapped in centered card stack. Biggest win: start-aligned reading surface + hierarchy + real tabs or segmented control + deep links.

## What's Working

1. Role-scoped IA (`canPick` for owner/admin) — brief teammates well.
2. Practical AR/EN ops copy (Polar/webhook, stock, deletion).
3. `max-w-3xl` column constraint — width roughly in docs band; alignment/hierarchy fail.

## Priority Issues

### [P1] Center-aligned long prose
- **Why:** Docs scanability; storefront centering bleeds into admin.
- **Fix:** Guides (or dashboard prose) `text-start`; keep AR/EN stability via padding, not body-center.
- **Suggested command:** `$impeccable typeset`

### [P1] Identical card wall (Owner ×10)
- **Why:** No hierarchy; high-stakes flat vs changelogs.
- **Fix:** Drop per-section cards; headings + dividers; semantic callouts only for danger.
- **Suggested command:** `$impeccable layout` / `$impeccable distill`

### [P1] Incomplete tabs a11y
- **Why:** tab roles without panels.
- **Fix:** Real tabs + keyboard **or** radiogroup / segmented control.
- **Suggested command:** `$impeccable harden`

### [P2] No TOC / progressive disclosure
- **Fix:** Sticky nav or accordion groups (Start here / Danger).
- **Suggested command:** `$impeccable clarify`

### [P2] No deep links into dashboard
- **Fix:** Inline links to products, orders, users, deletion requests.
- **Suggested command:** `$impeccable onboard`

## Persona Red Flags

**Alex:** No `?role=` URL, no anchors, no jump-to-page from copy.

**Sam:** Tabs incomplete; duplicate H1 “Guides”; centered multi-line harder for some users; opacity-80 prose.

**Jordan:** Owner wall of 10 cards, no “read first”; jargon without link-out; no next-action CTA.

## Minor Observations

Layout chrome + page title → two H1s · Subtitle soft · Non-picker path restrained · Drawer Bebas override OK · Live line-length overlays on each body `<p>`.

## Questions to Consider

1. Notion-style docs (start-align + TOC) or one-screen briefing cards?
2. Why doesn’t dashboard prose opt out of `body { text-align: center }`?
3. End with “Do this next” deep links instead of meta “My Profile and Guides”?
