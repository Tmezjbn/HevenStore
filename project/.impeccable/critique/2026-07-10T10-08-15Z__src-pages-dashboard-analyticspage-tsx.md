---
target: Store analytics / AnalyticsPage
total_score: 15
p0_count: 2
p1_count: 1
timestamp: 2026-07-10T10-08-15Z
slug: src-pages-dashboard-analyticspage-tsx
---
Method: dual-agent (A: 9661b4f4-0a80-4474-8229-091cf30a2e2b · B: 07ed5572-ae1a-4aa7-af30-b83eeb1eb38b)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Spinner-only load; no last-updated; refresh not busy-disabled |
| 2 | Match System / Real World | 2 | Bounce, Databuddy, CWV, Events = vendor/eng jargon for store owners |
| 3 | User Control and Freedom | 2 | Tabs/range work; no custom range; Databuddy is the real power exit |
| 4 | Consistency and Standards | 1 | Range filters traffic but not paid revenue/orders |
| 5 | Error Prevention | 1 | UI invites sales↔traffic range compare the data model forbids |
| 6 | Recognition Rather Than Recall | 2 | Must recall sales are lifetime and what Databuddy is |
| 7 | Flexibility and Efficiency | 1 | No shortcuts, compare, export, or deep-link to orders |
| 8 | Aesthetic and Minimalist Design | 1 | Hero-metric wallpaper + empty panels; DESIGN anti-SaaS hit |
| 9 | Error Recovery | 2 | Raw API errors; setup shows deploy CLI to owners |
| 10 | Help and Documentation | 1 | Overview empties teach nothing; no metric definitions |
| **Total** | | **15/40** | **Poor** |

Cognitive load: 6–7/8 checklist failures (high). Combined chrome = 10 controls before insight.

#### Anti-Patterns Verdict

**LLM assessment**: FAIL — category-reflex SaaS analytics. Hero-metric KPI tiles, identical card grid, empty chart as largest surface, teal bar theater with n≈2. Reads as a Databuddy wrapper, not Trusted Vault commerce admin. Second-order reflex: dark + teal charts after rejecting cream.

**Deterministic scan (CLI)**: exit 2, 2 findings — `design-system-font-size` (11px) at AnalyticsPage.tsx:315 and :670 (advisory). Likely intentional micro-meta; treat as soft.

**Browser runtime detect**: 7 findings — skipped-heading (h1 Analytics → h3 Visitors over time), gradient-text ×2, bounce-easing, layout-transition ×2, repeating-stripes. Most attributed to shared dashboard chrome (sidebar, brand logo), not page-local — false-positive risk for AnalyticsPage scope. Heading skip is real for this surface.

**Visual overlays**: Overlay injection ran on the live analytics tab; fresh-tab creation failed so evidence used the existing glass tab. No reliable separate [Human] tab guarantee.

#### Overall Impression

Chrome is competent; the story is broken. Biggest opportunity: make Overview answer one daily question — money + traffic for the selected range — and stop decorating emptiness.

#### What's Working

1. Bilingual AR/EN strings are first-class in source, not bolted on.
2. Resting chrome is restrained (Daisy tabs, join ranges, vault dark) — no cream/gradient-text/glass stack on the page itself.
3. Events empty state teaches (`purchase_completed`) — Overview should copy that pattern.

#### Priority Issues

**[P0] Range control lies about sales**
- Why: 7d selected beside all-time Paid revenue/orders destroys trust.
- Fix: Scope paid aggregates to preset, or label All time and separate from ranged traffic.
- Suggested command: `$impeccable harden`

**[P0] SaaS hero-metric / identical card grid**
- Why: Violates DESIGN.md anti-references; equal-weight noise; empty chart dominates.
- Fix: One commerce primary answer; demote vanity KPIs; kill 5 equal tiles; StatList when n≤2.
- Suggested command: `$impeccable distill` (or `$impeccable layout`)

**[P1] Empty/sparse states feel broken**
- Why: "No data yet" ×4 as hero = emotional valley; peak-end ends on emptiness.
- Fix: Teach what should appear, why n is low, next action; honest low-sample copy for Bounce —.
- Suggested command: `$impeccable onboard`

**[P2] Vendor leak + eng-only framing**
- Why: Databuddy button, CWV jargon, deploy CLI ≠ storefront-quality admin.
- Fix: Owner language; hide/rename vendor escape; non-dev setup copy.
- Suggested command: `$impeccable clarify`

**[P3] A11y / motion / contrast debt**
- Why: Tab ARIA missing; chart unlabeled; animate-ping without reduced-motion; /45 empty copy; heading skip.
- Fix: Proper tabs; text fallbacks; prefers-reduced-motion; ink-muted floor; fix h2 hierarchy.
- Suggested command: `$impeccable audit`

#### Persona Red Flags

**Alex (Power User)**: No shortcuts/compare/export; must leave to Databuddy for real work; one-bar chart wastes time.

**Sam (Accessibility)**: Tabs lack aria-selected/tablist; Recharts visual-only; Live ping ignores reduced-motion; empty copy ~45% opacity; status via color alone on vitals.

**Store Admin Nadia (bilingual owner)**: Cannot answer "how did we do in the last 7 days?" — money and traffic disagree on time. Bounce — vs Session 40m with n=2 unanswerable. Empty Visitors over time after seeing 2 visitors → daily tracking anxiety. Deploy CLI / Databuddy not her job. RTL risk on tabs-boxed + join.

#### Minor Observations

- Double title: layout Analytics + card Store analytics.
- Activity icon reused across panels.
- Hardcoded chart #2dd4bf / #64748b.
- Two accent systems: success green on orders vs primary on revenue.
- Live 30s full reload jank risk.
- CLI 11px advisory soft; browser gradient/bounce/stripes mostly shared chrome FP.

#### Questions to Consider

1. If Nadia's only daily question is money + traffic for the range, why open with five vanity tiles and a blank chart?
2. Why is Databuddy a first-class button on a Trusted Vault admin?
3. Would deleting the 5-KPI row and empty area chart make the page more premium?
4. What does Bounce — mean next to Session time 40m — and why show confident duration without low-sample honesty?
5. Is Health (CWV) a store-owner job or an engineer job — why peer-tab to Overview?
