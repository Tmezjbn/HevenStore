---
target: Store analytics / AnalyticsPage
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-07-14T15-35-25Z
slug: src-pages-dashboard-analyticspage-tsx
---
# Critique: Store analytics (`AnalyticsPage.tsx`)

Method: dual-agent (A: 7d6102e4-5717-402a-90fd-704048370a61 · B: 597996c8-ecbe-4e96-afd6-26d8e6baf16e)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Updated/refresh/skeletons solid; flat low-sample chart still reads “broken” |
| 2 | Match System / Real World | 3 | Store copy mostly plain; Health dumps LCP/CLS/p75 at boutique admins |
| 3 | User Control and Freedom | 3 | Tabs + ranges + refresh; no custom range / compare / export |
| 4 | Consistency and Standards | 2 | Home KPI grid ≠ Analytics prose brief; chart hex ≠ Daisy tokens; `$` vs `formatMoney` |
| 5 | Error Prevention | 3 | Low-sample bounce honesty; raw API tokens can still leak into error copy |
| 6 | Recognition Rather Than Recall | 3 | Dual chart series with no visible legend (hover / sr-only only) |
| 7 | Flexibility and Efficiency | 2 | Clicky tabs only; no shortcuts, filters, period compare |
| 8 | Aesthetic and Minimalist Design | 2 | Brief is lean; Overview still ships chart + 4 equal panels for ~2 visitors |
| 9 | Error Recovery | 3 | Retry + setup teach; Live/Events empties calm |
| 10 | Help and Documentation | 2 | Empties teach; “ask your developer” setup is a dead end |
| **Total** | | **26/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment:** Partial AI-slop. Range brief rejects the hero-metric template (Trusted Vault win). Below the fold, Overview collapses into stock analytics: teal Recharts area, 2×2 equal breakdown panels, Site speed KPI cards. With 2 visitors that wallpaper reads louder than the data.

**Deterministic scan:** CLI `detect.mjs` on `AnalyticsPage.tsx` → `[]` (exit 0). Browser overlay after inject reported mostly shell/global hits: `low-contrast`, `layout-transition`, `single-font`, `gradient-text`×2, `bounce-easing`, `repeating-stripes-gradient`. Treat page-local CLI as clean; runtime hits largely false positives from dashboard chrome / theme CSS, not Analytics markup.

**Visual overlays:** Injection succeeded on live `/dashboard/analytics`. Overlay labels visible in browser (low-contrast / layout-transition). Live-server :8400 started and stopped.

## Overall Impression

Honest money story at the top; generic analytics product below. Biggest opportunity: stop obligating a full analytics suite when sample is tiny — let Range brief (+ one chart or one list) carry Overview until traffic earns the wallpaper.

## What's Working

1. **Range brief as a sentence** — `$23.00 · 7 orders · 2 visitors` is Rare Signal, anti-SaaS, on-brand.
2. **Low-sample + EmptyTeach** — bounce “Low sample”, referrer/events empties that teach when data appears.
3. **Control a11y craft** — tablist + arrows, `aria-pressed` ranges, focus rings, `motion-reduce`, `dir="ltr"` on paths.

## Priority Issues

### [P1] Overview 2×2 breakdown is SaaS wallpaper under low sample
- **Why:** Equal Top pages / Sources / Devices / Countries dilute the brief; 2 visitors look like a broken Plausible clone.
- **Fix:** Gate panels until `visitors ≥ LOW_SAMPLE_VISITORS`; or Overview = brief + one chart + one ranked list.
- **Suggested command:** `$impeccable distill`

### [P1] Chart: hardcoded teal + dual series, no visible legend
- **Why:** `#2dd4bf` bypasses theme tokens (Vault = monochrome signal). Dashed pageviews invisible without hover. Flat “1” line reads as error.
- **Fix:** Theme-token stroke; single series default; visible legend/caption; low-sample chart treatment.
- **Suggested command:** `$impeccable colorize` (+ `$impeccable clarify`)

### [P2] Site speed reintroduces hero-metric cards Overview avoided
- **Why:** Three equal Errors / Visitors affected / Error share + nested vital tiles contradict Trusted Vault.
- **Fix:** One prose health sentence + status list; progressive disclosure for vitals.
- **Suggested command:** `$impeccable quieter`

### [P2] Chrome overload before insight (4 tabs × 4 ranges)
- **Why:** First viewport is control surface, not story; Store events often empty stub.
- **Fix:** Default Overview-focused chrome; demote Live/Health/Events or fold Health elsewhere.
- **Suggested command:** `$impeccable distill`

### [P3] Dashboard consistency drift
- **Why:** Home icon KPIs vs Analytics prose; width/`formatMoney`/duplicate “Analytics” headings.
- **Fix:** Align money/format/width; one hierarchy language.
- **Suggested command:** `$impeccable polish`

## Persona Red Flags

**Alex (power):** No compare periods, custom range, export, or page drill-down. Live auto-refresh with no pause. Country as `AF` codes — not ops-actionable.

**Sam (a11y):** Visitors vs pageviews cued by color + dash only (no on-canvas legend). Health vitals lean on success/warning/error color. Skeleton `sr-only` “Loading” English-only. Muted `/55`–`/65` metadata on void — contrast risk.

**Nour (bilingual store admin):** Long AR tab labels will crowd `tabs-boxed`. Revenue always `$` + Latin numerals. Setup “ask your developer” assumes a tech intermediary. Paths correctly `dir="ltr"`; country/device English sits awkward in AR.

## Minor Observations

- Nested cards on Health (Panel → vital tiles).
- Gauge icon for “No errors” is an odd metaphor.
- Live badge only when `liveCount > 0` — quiet Live looks dead.
- Error UI may append raw API error tokens.
- Chart muted `#64748b` ignores skins.
- Duplicate Analytics heading (layout H1 + page title).

## Questions to Consider

1. If honest story at 2 visitors is only the Range brief, why must Overview still look like a full analytics product?
2. Is Site speed a boutique-admin job — or a developer console in Vault clothes?
3. What if traffic stayed a footnote until sample ≥ 10, and orders/revenue were the only rare signal?
