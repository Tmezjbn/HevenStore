# HEVEN.FUN — Launch readiness audit (2026-07-24)

**Purpose:** Verified, prioritized, executable punch list for production launch. Snapshot — **delete this file once P0/P1 are cleared**; do not let it become a diary (that is why the old `AUDIT.md` was retired).

**Read this when:** planning the launch gate, or picking up a P0/P1 fix. Read `HANDOFF.md` first — its 7 invariants outrank anything here, and no fix below may weaken one.

**Method:** three independent review seats (security/payments · functionality/code/scale · UX/UI/a11y/perf/SEO) audited source + ran the check suite; findings deduped and spot-verified by the coordinator. No application code, migration, or doc was changed by the audit itself.

**Repo state at audit time:** `npm run typecheck` clean · `npm run lint` 0 errors / 10 warnings · `npm test` **All 79 checks passed** · `npm run build` exit 0 (Vite ✓ 5.14s, full pipeline ~42s) · 134 migrations · 24 dashboard pages · 6 edge functions. No git repo in this tree, so no diff baseline.

---

## D1 — Executive summary

| Score | /100 | Why |
|---|---:|---|
| **Overall** | **68** | Money path is genuinely server-authoritative and well guarded; the new support surface shipped with two privilege gaps, and launch is gated on operational apply/deploy. |
| Security | 58 | Strong baseline (roles, checkout authority, CORS, CSP files) undercut by SEC-1/2/3 on the support-era code. |
| Payments / business logic | 78 | Server recompute + signed webhook + idempotent finalize hold. Refund/chargeback and post-pay shortfall are ops gaps, not tampering holes. |
| Production readiness | 52 | Repo artifacts ready; live migrations, edge deploys, secrets, cron, headers, PITR all unverified. |
| Functionality | 76 | Storefront/checkout/catalog solid; support desk has real workflow breakage. |
| Code quality | 67 | 79 guardrail checks and clean `tsc`; megafiles, near-clone product lists, cast clusters. |
| Scalability | 71 | Fine for launch volumes; documented ceilings break around 10×. |
| UI | 78 | Vault default coherent; alternate skins ship two DESIGN.md anti-patterns. |
| UX | 72 | Cart trust strong; PDP under-delivers, product editor can lose work. |
| Accessibility | 74 | Focus trap / skip link / bilingual labels good; merch motion deliberately ignores reduced-motion. |
| Performance | 62 | ~800 kB CSS critical path (mostly DaisyUI/utilities/storefront — theme skins ≠ the weight); one uncapped animation loop. |
| SEO | 80 | Plumbing complete; product sitemap empty unless the production build has Supabase env. |

**Strengths:** checkout authority enforced in SQL *and* pinned by `scripts/check-checkout-authority.mjs`; 79 invariant checks gating CI; no client writes to money tables; no `dangerouslySetInnerHTML`; disciplined lazy-loading (motion/charts/plyr split, in-view video and card FX); bilingual AR/EN + RTL treated as a constraint.

**Weaknesses:** moderator privilege strip was incomplete at the RLS layer; two `SECURITY DEFINER` helpers shipped without least-privilege grants; no refund/chargeback path; CSS monolith dominates first paint; support desk workflow drops the agent out of threads.

### Verdict: **Ship with P0 gate**

| Gate | Item |
|---|---|
| P0 | **SEC-1** ✅ repo done — apply `20260724160000_moderator_strip_fulfillment_secrets.sql` |
| P0 | **SEC-2** + **SEC-3** ✅ repo done (pre-apply edit of `20260723230000_support_tickets.sql`) |
| P0 | **SEO-1** ✅ build gate done — prod build still needs `VITE_SUPABASE_*` so N > 0 |
| Soft gate | ~~**FUNC-1**~~ — fixed in repo (by-id `selectedFallback`); still confirm desk UX before staffing as primary |

**Sequencing note:** SEC-2/SEC-3 were patched in-place on the still-unapplied support migration; apply that edited file (not an older copy) together with the SEC-1 migration.

**Residual ops unknowns:** every item in `OPS.md` §6 (migrations applied, edge deploy versions, secrets, cron, Polar config, host headers, Auth settings, PITR, restore drill).

---

## D2 — Prioritized ledger (deduped)

Duplicate findings across seats are merged; the surviving ID is listed first.

### P0

| ID | Cat | Sev | Status | One-line |
|---|---|---|---|---|
| SEC-1 | Access control | Critical | ✅ Done | Fixed in `20260724160000_moderator_strip_fulfillment_secrets.sql` — staff policies are `owner`/`admin` + seller-owns-product; `moderator`/`support` excluded. Apply to live DB. |
| SEC-2 | AuthZ | Critical | ✅ Done (pre-apply) | `REVOKE ALL … FROM PUBLIC, anon, authenticated` added in-place on `notify_users` in `20260723230000_support_tickets.sql` (not yet applied live). |
| SEC-3 | AuthZ | High | ✅ Done (pre-apply) | Same in-place `REVOKE` on `support_role_ids` in `20260723230000_support_tickets.sql`. |
| SEO-1 | SEO | High | ✅ Done (build gate) | `generate-sitemap.mjs` fails the build when Supabase env is present and product count is 0 unless `ALLOW_EMPTY_SITEMAP=1`. Quiet skip when env absent. Production still needs `VITE_SUPABASE_*` in the build. |

### P1

| ID | Cat | Sev | Status | One-line |
|---|---|---|---|---|
| FUNC-1 | Functionality | High | ✅ Done | Claim / escalate / reject kept the open thread via `loadTicketById` + `selectedFallback` (not bin-list-only `selected`). |
| PAY-1 | Payments | High | ⏸ Deferred (owner) | No Polar refund/chargeback handling for now — revisit later. Known: reverse stays `paid` + fulfillment exposed until then. |
| UX-4 | UX | High | ✅ Done | Product editor leave-guard: `useBlocker(dirty && !saving)` + `beforeunload` (mirrors Website Builder). |
| PERF-1 | Performance | High | ✅ Done | `ElectricBorder` rAF gated by `IntersectionObserver` + `document.hidden` (static stroke offscreen). |
| UX-1 | UX | High | ✅ Done | PDP CTA trust row matches Cart (delivery / secure payment / support). |
| PERF-2 | Performance | High | ✅ Partial (2026-07-29) | Dashboard CSS deferred: editor + admin-catalog + settings-page + role surfaces + owner surfaces (`owner-ledger`/`tree`/`roster`/`catalog`, `admin-roster`) + guides/changelog + analytics via `src/styles/*.css` + dynamic `import()`. Storefront `.pe-reviews*` stays in main. Guard: `check-dashboard-css-chunk.mjs`. Leftover = DaisyUI+Tailwind+storefront (theme-skin split still rejected). |
| AX-1 | A11y | Medium | ✅ Done | `merch_motion_mode` (`auto`/`always`/`off`) — `auto` honors OS reduce-motion; `always` is Cursor/Windows escape hatch. |
| UX-2 | UX | Medium | ✅ Done | PDP shows card “Only N left” when stock tone is `low`. |
| PAY-2 | Inventory | Medium | ✅ accepted policy | Concurrent oversell finalizes `paid` with `KEY_SHORTFALL` / `STOCK_SHORTFALL` notes and no auto-refund; ops must watch. |

**AX-1 decided (owner):** honor `prefers-reduced-motion` via `merch_motion_mode` default `auto`; Website Builder → Ads → Product card motion (`always` escape hatch for forced OS flag).

### P2

| ID | Cat | One-line |
|---|---|---|
| SEC-4 | Security | ✅ Done — `check_rpc_rate` in `20260724170000_support_ticket_rate_limits.sql` (open 5/60s, post 20/60s). Apply live. |
| SEC-5 | Privacy | `order_is_visible_to_caller` lets any seller on a multi-seller order read buyer UUID and full cart totals. |
| PAY-3 | Payments | Webhook verifies amount but never currency (`price_currency` hardcoded USD today). |
| PAY-4 | Ops | `polar-checkout` defaults `SITE_URL=http://localhost:5173`, `POLAR_SERVER=sandbox` — launch checklist item. |
| FUNC-2 | Functionality | ✅ Done | `?bin=` syncs on bin change (queue\|mine\|important\|sellers\|all); mount-read kept. |
| FUNC-3 | Functionality | ✅ Done | Ticket list polls every `SUPPORT_POLL_MS` (4s), quiet refresh, skips while `document.hidden`. |
| CODE-1 | Code | Megafiles: `index.css` ~19k lines, `ProductEditorPage` ~5.0k, `WebsiteBuilderPage` ~4.4k. Extract incrementally when touched. |
| CODE-2 | Code | `OwnerProductsPage` / `AdminProductsPage` near-clones (merged with UI-5: divergent empty-state copy). |
| SCALE-1 | Scale | Catalog downloads up to 5000 actives then filters client-side (merged with PERF-4). Fine for launch, breaks at 10×. |
| SCALE-2 | Scale | Support search only covers the newest 200 rows per bin. |
| UI-1 | UI | Abyss + Aurora hero `h1` use `background-clip: text` gradient — DESIGN.md forbids gradient headlines. |
| UI-2 | UI | Dim + Aurora card hover pairs border shift with wide soft shadow — DESIGN.md forbids both on one element. |
| UX-5 | UX | ✅ Done — Cart + Checkout Success Help → `/dashboard/support` (guest: `/auth/login?next=/dashboard/support`). |
| AX-2 | A11y | Hero description uses `opacity-70` for body copy on Vault void. |
| PERF-5 | Performance | `srcset` path is wired but dark unless Storage transforms + `VITE_SUPABASE_IMAGE_TRANSFORM=true`. |
| SEO-6 | SEO | `generate-sitemap.mjs` pins the production origin while the app currently serves from the staging origin — noindex staging. |

### P3

`SEC-6` staff_notes readable by all support/moderator · `SEC-7` order-number enumeration (low while RLS holds) · `SEC-8` `set_support_ticket_status` can set `claimed` with null assignee · `SEC-9` confirm CSP served + tighten `frame-src` · `FUNC-4` support standing badge stale until profile refetch · `CODE-3` `CartPage` local `money()` bypasses `formatMoney` · `CODE-4` 10 lint warnings + `as unknown as` clusters (generated Supabase types would kill) · `SCALE-3` sync webhook, no outbox · ~~`AX-5`/`PERF-6`~~ support polls pause while `document.hidden` · `UI-3` Featured `h2` forced uppercase · `UI-4` auth card border + shadow · `SEO-2` same-URL hreflang (accepted tradeoff).

---

## D3 — Roadmap

| Phase | Contents | Why before the next | Exit criteria |
|---|---|---|---|
| **1. Privilege gaps** | SEC-1, SEC-2, SEC-3 | Digital inventory theft and notification forgery outrank everything; SEC-2/3 are cheapest before the support migration is applied | ✅ Repo: `20260724160000_moderator_strip_fulfillment_secrets.sql` + in-place REVOKEs on support helpers; check asserts added. Live: apply migrations; moderator JWT denied on keys/secrets; `has_function_privilege('authenticated', …)` false for both helpers |
| **2. Apply + deploy** | Apply all pending migrations, redeploy edge fns, set Edge `SITE_URL` / `POLAR_SERVER`, confirm cron (PAY-4). **Note:** `20260723230000_support_tickets.sql` was edited pre-apply (SEC-2/SEC-3 `REVOKE`s) — do not apply an older copy of that file. Also apply `20260724160000_moderator_strip_fulfillment_secrets.sql` (SEC-1). | Every later fix can silently miss prod until this is a repeatable gate | `OPS.md` §4 walked end to end; one sandbox paid order finalizes live; `has_function_privilege('authenticated', 'public.notify_users(uuid[],text,text,text,text,text,jsonb)', 'execute')` = false |
| **3. Launch SEO** | SEO-1, SEO-6 | Indexing damage compounds from day one and is slow to undo | Production build logs `N products` with N > 0; production `/sitemap.xml` lists PDPs; staging origin noindexed |
| **4. Support desk usable** | FUNC-1, then FUNC-2, FUNC-3, SEC-4 | Desk is now a customer-facing promise; do not staff it before the workflow holds | Claim from Queue and reject from Important keep the thread open; `?bin=` survives navigation and refresh; rate limit rejects the 6th ticket in 60s |
| **5. Money aftercare** | PAY-2 (ops), PAY-3 · PAY-1 deferred | Shortfall watch still matters; in-app refunds deferred by owner (see HANDOFF Open items) | Shortfall notes on ops watchlist; refund path not in launch gate |
| **6. Experience P1s** | UX-4, UX-1, UX-2, PERF-1, UX-5 | Data-loss guard and conversion trust are cheap and high-return | Editor confirms on dirty leave; PDP shows delivery + low stock; offscreen electric cards stop ticking; Help → ticket desk |
| **7. Weight + policy** | PERF-2 (partial ✅), AX-1 decision, PERF-5 | Dashboard-only CSS deferred (editor/admin/settings/role/owner/docs/analytics); theme split still rejected; AX-1 done; PERF-5 still open | Leftover PERF-2 = DaisyUI pruning / shared storefront; reduced-motion policy already written (AX-1) |
| **8. Debt** | CODE-1, CODE-2, SCALE-1, SCALE-2, remaining P3 | Only after launch holds | Touched-area extraction, no new clones |

---

## D4 — AI execution pack

Every task: read `HANDOFF.md` first · DB behavior = timestamped idempotent migration (`SECURITY DEFINER SET search_path = public`, `DROP POLICY IF EXISTS` before `CREATE POLICY`) · user-facing strings via `t('عربي','English')` · PowerShell uses `;` not `&&` · verify with `npm run typecheck; npm run lint; npm test; npm run build` · non-trivial logic extends a `scripts/check-*.mjs`.

### TASK-1 — SEC-1 · strip moderator from fulfillment secrets (P0) — ✅ DONE
- **Shipped:** `supabase/migrations/20260724160000_moderator_strip_fulfillment_secrets.sql`; asserts in `scripts/check-support-tickets.mjs` (newest policy body excludes `moderator`, keeps seller branch, no `support`).
- **Owner apply:** include that migration in the next `supabase db push` / SQL apply (after support migration if not yet applied).

### TASK-2 — SEC-2 + SEC-3 · least-privilege the support helpers (P0) — ✅ DONE (edited pre-apply)
- **Shipped:** in-place `REVOKE ALL … FROM PUBLIC, anon, authenticated` on `notify_users` + `support_role_ids` in `20260723230000_support_tickets.sql`. No `auth.uid()` FORBIDDEN guard (would break `PERFORM` from other DEFINER RPCs — JWT uid stays set). No other new DEFINER helpers in that migration lacked a REVOKE without intentional `GRANT` + caller authz (`set_user_role` and the public support RPCs are GRANT'd on purpose).
- **Owner apply:** apply the edited support migration (not an older copy); live-check `has_function_privilege` = false for both helpers.

### TASK-3 — SEO-1 · guarantee product URLs in the production build (P0) — ✅ DONE (gate)
- **Shipped:** `scripts/generate-sitemap.mjs` exits 1 when Supabase env is present and products = 0 (or query fails), unless `ALLOW_EMPTY_SITEMAP=1`. Quiet static-only when env absent. Asserts in `scripts/check-seo.mjs`.
- **Owner build:** set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` on the production build; confirm log `N products` with N > 0; after deploy fetch `/sitemap.xml` for `/product/…`.

### TASK-4 — FUNC-1 · keep the support thread open across transitions (P1) — ✅ DONE
- **Shipped:** `SupportPage` `loadTicketById` (`TICKET_COLS`) + `selectedFallback`; `selected = tickets.find(...) ?? selectedFallback`. Claim success also `setBin('mine')`. Asserts in `scripts/check-support-tickets.mjs`.
- **Acceptance:** Queue → Claim keeps the thread; Important → Reject keeps the thread with the same ticket selected; `?ticket=` deep links work from any bin.

### TASK-5 — PAY-1 · handle Polar refunds without breaking key immutability (P1) — ⏸ DEFERRED (owner)
- **Owner call (2026-07-24):** not now; maybe later. Out of launch gate. Pack kept for when you want it.
- **Objective:** A reversed payment must stop exposing fulfillment and must be visible to staff.
- **Files:** `supabase/functions/polar-webhook/index.ts`; new `mark_order_refunded` RPC (service-role only) if the paid-transition trigger blocks the update; `scripts/check-checkout-authority.mjs`.
- **Steps:** 1) Confirm the exact Polar event names in the dashboard. 2) On refund/dispute, set `orders.status = 'refunded'` and append a `POLAR_REFUNDED` note. 3) **Do not** delete or reclaim claimed keys — `CLAIMED_KEY_LOCKED` and invariant 7 stand; `get_order_fulfillment` is already `status = 'paid'` gated, so flipping status is sufficient. 4) Assert the refund event string and the service-role-only grant. 5) Redeploy the webhook.
- **Acceptance:** sandbox refund → order `refunded`, success page no longer reveals secrets, paid path untouched.
- **Regressions:** staff dashboards and analytics that filter `status = 'paid'`.

### TASK-6 — UX-4 · leave guard on the product editor (P1) · ✅ Done
- **Objective:** Stop silent loss of long edits.
- **Files:** `src/pages/dashboard/ProductEditorPage.tsx`.
- **Steps:** 1) Mirror `WebsiteBuilderPage`'s `useBlocker(dirty && !saving)` + `beforeunload`, reusing its bilingual confirm strings. 2) Reset the dirty baseline on save success so clean exits stay silent.
- **Acceptance:** dirty editor + sidebar navigation prompts; cancel stays, proceed leaves; saving then leaving is silent.
- **Regressions:** false prompts if the baseline is not reset after save.

### TASK-7 — PERF-1 · gate the electric aura loop on visibility (P1) — ✅ DONE
- **Shipped:** `ElectricBorder` `IntersectionObserver` + `document.hidden`; asserts in `check-electric-aura.mjs`.

### TASK-8 — UX-1 + UX-2 · trust and stock next to the PDP CTA (P1) · ✅ Done
- **Objective:** Match the trust signals Cart already shows, on the highest-intent page.
- **Files:** `src/pages/ProductDetailPage.tsx`.
- **Steps:** 1) Import `productDeliveryLabel` / `productDeliveryIsInstant` from `src/lib/productDelivery.ts` and the stock tone helper from `src/lib/productOos.ts`. 2) Render two or three compact bilingual trust lines under Add-to-Cart when in stock, reusing Cart's Zap/Shield vocabulary. 3) Show the same "Only N left" phrase cards use when the tone is `low`.
- **Acceptance:** instant and non-instant products each show correct delivery copy; a stock-2 product shows the low-stock line; Rare Signal budget respected (no primary-colored panel).
- **Regressions:** CTA column height at mobile widths, RTL mirroring.
- **Status:** Shipped under Add-to-Cart (in stock); checks in `check-product-delivery.mjs` + `check-product-stock.mjs`.

---

## D5 — Future improvements (not bugs)

1. **Server-side catalog** — RPC + `pg_trgm` search with real pagination retires the 5000 ceiling and the client filter (SCALE-1/PERF-4).
2. **Generated Supabase types** (`supabase gen types`) — removes the `as unknown as` clusters (CODE-4).
3. **PERF-2 CSS weight (partial ✅ 2026-07-29)** — Theme-skin split measured+rejected (~6.5 KB gzip). **Shipped:** product-editor + admin-catalog + settings-page + dashboard-role-surfaces + dashboard-owner-surfaces + dashboard-docs + analytics-page deferred via dynamic `import()`; `.pe-reviews*` stays on storefront. Optional later: DaisyUI prune only. Leave Vault + all skin token `@plugin` blocks in critical path until a real measured win appears.
4. **Supabase Realtime for support** — replaces both polls; the `ponytail:` comment in `src/lib/support.ts` already names this as the upgrade path (FUNC-3, AX-5).
5. **Webhook outbox / DLQ** — only when sustained paid-event volume approaches Edge or finalize saturation (SCALE-3).
6. **Reservation table for stock** — converts the pending-time availability check into a real hold, retiring PAY-2 at the cost of real complexity.
7. **Incremental megafile extraction** — pull `ProductFulfillmentPanel` and builder sections out as they are touched; unify the staff product lists (CODE-1, CODE-2).
8. **E2E smoke in CI** — browse → cart → mock pay → success.
9. **`staff_notes` in its own table** with owner/admin-only read (SEC-6).

---

## D6 — Verification appendix

**Ran on this machine, 2026-07-24:** `npm run typecheck` (clean) · `npm run lint` (0 errors, 10 warnings) · `npm test` (**All 79 checks passed**) · `npm run build` (exit 0, Vite ✓ 5.14s). Individual checks read: `check-checkout-authority`, `check-support-tickets`, `check-order-number`, `check-purge-secret`, `check-a11y`, `check-seo`, `check-ui-scale`, `check-bidi`, `check-motion-chunk`, `check-route-split`, `check-catalog-media-perf`, `check-scale`, `check-electric-aura`, `check-product-card-fx`.

**Measured bundle:** `index.css` 818.59 kB / 100.81 gzip · `index.js` 253.97 / 92.54 · `charts` 367.90 / 102.84 (lazy) · `vendor` 234.87 / 76.75 · `supabase` 131.88 / 35.69 · `motion` 128.89 / 42.39 (lazy) · `plyr` 113.20 / 33.65 · `ProductEditorPage` 110.37 / 29.96 · `WebsiteBuilderPage` 98.62 / 22.84. Source `src/index.css` ~512 kB / ~19k lines. Build log: `8 static + 0 products` (no Supabase env at build time).

**PERF-2 remeasure (2026-07-29, existing `dist`):** main CSS ~799 KB / ~98.5 KB gzip. Non-default-only `[data-theme]` rules ≈12 KB raw / **~6.5 KB gzip**. DaisyUI theme `@plugin` blocks = 12 × ~1 KB CSS vars (components already tokenized). Synthetic drop of `.pe-`+`.admin-` from main ≈154 KB raw / **~20 KB gzip** critical-path. No theme-split ship (would be no-op vs audit claim).

**PERF-2 slice shipped (2026-07-29):** extracted `.product-editor`/`.pe-*` BEM (+ `pe-fx-matrix-rain`) and `.admin-catalog*` into on-demand CSS chunks (`void import(...css)` from editor/admin products pages). Left `.pe-reviews*` + Tailwind `pe-*` utilities in main. Guard: `check-dashboard-css-chunk.mjs`.

**PERF-2 build bite (2026-07-29):** main CSS **799 KB / ~98.5 KB gzip → 677.77 KB / 87.23 KB gzip** (−121 KB / −11 KB gzip). New chunks: `product-editor-*.css` 84.08 / 10.50 gzip · `admin-catalog-*.css` 13.83 / 2.46 gzip. (Synthetic ~20 KB gzip assumed including more `.pe-` weight; `.pe-reviews*` stayed on critical path.)

**PERF-2 pass 2 (2026-07-29):** deferred `.settings-page*` → `settings-page.css` (SettingsPage) and role surfaces (`.owner-home*` / `.admin-home*` / `.mod-home*` / `.buyer-home*` / `.seller-home*` / `.buyer-ledger*` / `.seller-listings*` / `.seller-sales*`) → `dashboard-role-surfaces.css` (DashboardHomePage + BuyerOrdersPage + SellerProductsPage + SellerOrdersPage). **Build bite:** main CSS **677.77 / 87.23 gzip → 524.93 / 72.27 gzip** (−153 KB / −15 KB gzip). New chunks: `settings-page-*.css` 30.76 / 4.13 gzip · `dashboard-role-surfaces-*.css` 74.77 / 8.84 gzip. Leftover candidates (owner-ledger/tree/roster/catalog, guides, changelog) smaller or multi-page — next pass if still >~5 KB gzip.

**PERF-2 pass 3 (2026-07-29):** deferred owner surfaces (`.owner-ledger*` / `.owner-tree*` / `.owner-roster*` / `.admin-roster*` / `.owner-catalog*`) → `dashboard-owner-surfaces.css` (Orders/Categories/Users/OwnerProducts); guides+changelog → `dashboard-docs.css`; analytics (`.analytics-live*` / `.analytics-metric*` / `.analytics-panel*` / `.analytics-stat*`) → `analytics-page.css`. Guard extended. **Build bite:** main CSS **524.93 / 72.27 gzip → 390.42 / 59.83 gzip** (−135 KB / −12 KB gzip). New chunks: `dashboard-owner-surfaces-*.css` 60.16 / 6.38 gzip · `analytics-page-*.css` 14.75 / 2.48 gzip · `dashboard-docs-*.css` 11.35 / 2.11 gzip. **STOP — PERF-2 dashboard defer done** (leftover = DaisyUI/Tailwind/storefront shared; no more ≥~3 KB gzip safe dashboard-only slices).

**Browsers:** none driven. No runtime journey, contrast sampling, Lighthouse, or screen-reader pass was performed.

**Not tested / cannot verify from source:**

| Item | Evidence needed |
|---|---|
| Migrations actually applied live (support tickets, order numbers, aura JSON, audit harden) | Supabase migration history, or existence of `support_tickets` / `orders.order_number` |
| Whether `notify_users` EXECUTE is granted to `authenticated` live | `has_function_privilege` (settles SEC-2 severity) |
| Edge function deploy versions and secrets | Functions dashboard + a test webhook delivery |
| pg_cron schedules running | `cron.job` rows for purge and stale-pending cleanup |
| Polar endpoint config, signing secret, delivery backlog, sandbox vs production | Polar dashboard |
| Host serves `_headers` / `vercel.json` CSP, HSTS, SPA rewrite | `curl -I` the live origin + deep-link hard refresh |
| Supabase Auth rate limits, leaked-password protection | Auth settings |
| PITR tier and a real restore drill | `OPS.md` restore log (still empty) |
| Contrast AA across 12 themes + owner brand overrides | axe / DevTools per skin, dark and light, AR and EN |
| Keyboard tour of Support desk and Website Builder | Manual Tab/Escape in Chromium and Firefox |
| LCP element and field data; electric-aura jank magnitude | Lighthouse + Performance panel on the live origin with real media |
| Visual QA of electric / Letter Glitch / hover-3D | Browser with fixture products |
| Git history hygiene (secret never committed) | Hosted git — this workspace has no git repo |

---

**Last verified:** 2026-07-24  
**How to update this doc:** Tick items off as they land, and delete the file once P0/P1 are cleared — surviving long-lived items belong in `HANDOFF.md` Open items or `OPS.md` §6, not here.
