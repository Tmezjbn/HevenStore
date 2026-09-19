# HANDOFF — Engineering memory (HEVEN.FUN)

**Purpose:** Server-authority invariants, roles, verify commands, and gotchas so a fresh agent does not break checkout/auth/fulfillment.

**Read this when:** fixing any bug; touching checkout, Polar, orders, stock, keys, roles, RLS, support tickets, or dashboard route guards. Also before claiming “done.”

## Stack

- Vite + React 18 + TypeScript · Tailwind CSS 4 + DaisyUI 5 · Zustand (cart/wishlist/auth/appearance) · TanStack React Query (catalog).
- Supabase: Postgres + RLS, Auth, Storage, Edge Functions under `supabase/functions/`.
- Payments: Polar. Checkout + webhook edge functions (signature-verified).
- Bilingual AR/EN. Every user-facing string goes through `t('عربي', 'English')` from `src/lib/i18n`. RTL parity is a first-class constraint.

## Roles (`src/types/index.ts`)

`Role` = `owner | admin | moderator | support | seller | buyer | member`.

| Role | Dashboard reality |
|------|-------------------|
| **owner** | Full site: products, categories, orders, users, builder, themes, settings, changelogs, deletion requests, support. |
| **admin** | Staff ops: products, orders, users, coupons, badges, analytics, support. Not owner-only site chrome. |
| **moderator** | **Not** product staff. Nav + product RLS stripped. Handles **escalated** support tickets + review moderation. Home: `ModeratorDashboardHome`. Check: `scripts/check-moderator-dashboard.mjs`. |
| **support** | Ticket desk at `/dashboard/support` (`SupportPage.tsx`, `src/lib/support.ts`). Claim / escalate / reject-escalation; **Important** + **Sellers** bins. Standing: default **100**, **−15** per rejected escalation, **restricted ≤40** (cannot escalate), owner/admin reset via `reset_support_standing`. Migration: `supabase/migrations/20260723230000_support_tickets.sql`. |
| **seller** | Own listings + sales fulfillment; seller support queue. |
| **buyer** / **member** | Own orders, profile, badges, open support tickets. |

Dashboard nav/roles: `src/layouts/DashboardLayout.tsx` (`allLinks`). MUST wait for profile load before redirecting, or refresh falsely kicks users out.

## Non-negotiable invariants (MUST NOT regress)

1. **The client never writes to money tables.** `orders`, `order_items`, `coupon_usages` are INSERT/UPDATE/DELETE-blocked by RLS for clients. Order creation goes through the `create_pending_order` RPC (recomputes prices, validates stock + coupon server-side). Payment finalization goes through `finalize_paid_order` RPC, called ONLY by the webhook. Never “fix” a checkout bug by adding a client-side `.from('orders').insert/update(...)`.
2. **Stock is server-decremented in `finalize_paid_order`.** Key-pool products: stock = count of unclaimed rows in `product_keys` (claimed atomically with `FOR UPDATE SKIP LOCKED`). Manual-stock products: atomic `GREATEST(0, stock - qty)`. Don't decrement anywhere else.
3. **Roles can't be self-assigned.** A trigger forces `role='member'` on profile INSERT; `guard_role_change` covers UPDATE. `profiles` SELECT = own row OR staff (via `current_user_role()` — always use that helper in RLS policies to avoid recursion).
4. **Dashboard routes are role-guarded** in `src/layouts/DashboardLayout.tsx` via the `allLinks` roles config. It waits for the profile to load before deciding — keep that, or users get falsely redirected on refresh.
5. **The success page never fakes success.** `CheckoutSuccessPage` handles missing/failed/processing states and only marks paid on a verified paid order. On paid it removes that order's `product_id`s from the cart (not a blank `clearCart` — revisiting an old paid URL must not wipe a newer cart). The cart is NOT cleared when starting Polar (abandoned Polar checkouts keep the cart). `signOut` / `signOutBoth` clear cart + wishlist (`clearLocalCommerce`) so shared devices don't leak the previous shopper's basket.
6. **Fulfillment secrets** (`product_secrets`, `product_keys.content`) are only exposed via the `get_order_fulfillment` RPC to the paid order's owner. Never SELECT them client-side.
7. **Sold goods are immutable from the client** (`20260720193000_audit_sec_keys_seller_reviews_orders.sql`): claimed `product_keys` rows reject JWT UPDATE/DELETE (`CLAIMED_KEY_LOCKED` trigger; service-role paths like `finalize_paid_order` pass); sellers can only INSERT `products` with `seller_id = auth.uid()` (staff may set it explicitly); `reviews` are insert/delete-only — no UPDATE policy (blocks retargeting `product_id` / `is_verified_purchase` forgery; UI never had edit); there is NO direct UPDATE policy on `orders` — status transitions go via RPCs/webhook only.

`scripts/check-checkout-authority.mjs` asserts most of these against source. Run it after any change near checkout/auth/fulfillment; extend it when you add a new invariant.

## Order numbers

- Display code: `orders.order_number` = `ORD-YYYYMMDD-########` (UTC date + 8-digit global sequence).
- Assigned by a `BEFORE INSERT` trigger off `orders_order_number_seq`. Migration: `20260723232000_orders_order_number.sql`.
- UUID `orders.id` remains the **PK** and is what Polar, webhooks, and deep links use.
- After insert, `order_number` is frozen (`ORDER_NUMBER_LOCKED` on UPDATE). Check: `scripts/check-order-number.mjs`.

## Product effects (not Website Builder)

Managed from the **Products** area:

| Effect | Where | Notes |
|--------|-------|--------|
| Aura (incl. `electric`) | `ProductEffectsDialog` / `ProductEffectsSection` | Canvas: `ElectricBorder.tsx`. Tunables: `aura_electric_json` + `aura_color`. |
| Hover 3D | same dialog | Aura rides `product-card__tilt-face` so glow tilts with the card; aura hosts suppress the card’s own border. Global tune: `site_settings.product_hover_3d_json`. |
| Card-body FX | product editor (`card_fx` JSON) | Matrix types 1/2; **type 3 = Letter Glitch**. No CHECK constraint on `card_fx`. |

Checks: `scripts/check-electric-aura.mjs`, `check-product-hover-3d-whole-card.mjs`, `check-product-card-fx.mjs`.

## How to fix a bug here

1. **Trace the real flow end to end before editing.** Checkout: `CartPage` → `startPolarCheckout` → `create_pending_order` RPC → `polar-checkout` edge fn → Polar → `polar-webhook` → `finalize_paid_order` RPC → `CheckoutSuccessPage` polls `orders.status`. A symptom on success often roots in the webhook or RPC.
2. **Fix the root cause in the shared function, not one caller.** Grep every caller of anything you touch.
3. **Prefer the existing pattern.** Catalog pages reuse `GamesPage` with a `types` prop. Media → `ProductMedia` / `InViewVideo`. Fulfillment display → `fulfillmentDisplay()` in `src/lib/fulfillment.ts`.
4. **Money/security behavior belongs in SQL**, not TypeScript. New behavior = timestamped idempotent migration under `supabase/migrations/` (`CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` before `CREATE POLICY`). RPCs: `SECURITY DEFINER SET search_path = public` and validate `auth.uid()` themselves.
5. **Verify before claiming done** (PowerShell — `&&` does not chain; use `;`):

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx eslint <files-you-touched>
```

6. **Non-trivial logic leaves one runnable check** — extend an existing `scripts/check-*.mjs` or add one small assert-based script. No test frameworks. `npm test` → `scripts/run-checks.mjs` runs **every** `scripts/check-*.mjs` (currently **80**); all MUST pass.

## Gotchas that already bit

- **PowerShell:** `cmd1 && cmd2` fails. Use `cmd1; if ($LASTEXITCODE -eq 0) { cmd2 }`.
- **Arabic string-replace anchors** can fail (encoding / RTL marks). Anchor on nearby ASCII (JSX attrs, tags).
- **`tsconfig.app.json` lib is ES2021** (needed for `replaceAll`). Don't downgrade.
- **Font links in `index.html`:** only Vault (default) fonts are render-blocking; other skins use `media="print"` + `data-onload-media="all"`, unlocked by `public/font-deferred.js` (CSP forbids inline `onload`). CSP MUST allow `api.fonts.coollabs.io` (CSS) and `cdn.fonts.coollabs.io` (woff2).
- **framer-motion MUST stay out of the main chunk.** `ProductAdsBanner`, `NotificationBell`, `FindMoreProducts` are `React.lazy`. Eager motion import on storefront ≈ +42 KB gzip. Assert: `scripts/check-motion-chunk.mjs` (run after `npm run build`).
- **Autoplay videos** go through `InViewVideo` (`ProductMedia.tsx`). Don't add raw `<video autoPlay>`.
- **Keyed products have derived stock.** Editor disables stock input when `product_keys` exist. Don't re-enable.
- **Coupon usage rows outlive orders:** `coupon_usages.order_id` is `ON DELETE SET NULL` by design.
- **DaisyUI custom themes MUST set `:root { --noise: 0 }`** (see `src/index.css`). Missing `--noise` → `--fx-noise` film grain flashes on `:active` / menu press.
- **Chromium ignores CSS `scroll-behavior` for wheel.** Storefront installs Blink-only wheel lerp (`src/lib/smoothScroll.ts` via `MainLayout`). Firefox uses native. Check: `scripts/check-storefront-scroll.mjs`.

## Project map

| Area | Location |
|------|----------|
| Commerce RPCs / RLS / key pool | `supabase/migrations/20260711100000_checkout_server_authority.sql` (+ later harden migrations) |
| Manual-stock finalize | `20260711120000_finalize_manual_stock.sql` |
| Profile/role hardening | `20260711110000_profiles_access_control.sql` |
| Sold-goods immutability | `20260720193000_audit_sec_keys_seller_reviews_orders.sql` |
| Phase-7 harden | `20260720200000_audit_sec_phase7_harden.sql` |
| Support tickets | `20260723230000_support_tickets.sql` · `src/lib/support.ts` · `SupportPage.tsx` |
| Order numbers | `20260723232000_orders_order_number.sql` |
| Payment webhook | `supabase/functions/polar-webhook/index.ts` |
| Checkout client | `src/lib/startPolarCheckout.ts`, `CartPage.tsx`, `CheckoutSuccessPage.tsx` |
| Catalog | `src/pages/GamesPage.tsx` |
| Product editor / keys UI | `src/pages/dashboard/ProductsPage.tsx`, `ProductEditorPage.tsx` |
| Role guard | `src/layouts/DashboardLayout.tsx` |
| Invariant self-checks | `scripts/check-*.mjs` (**80** files; `npm test`) |
| Edge functions | `polar-checkout`, `polar-webhook`, `client-error`, `databuddy-analytics`, `purge-deleted-accounts`, `hard-delete-user` (+ `_shared`) |
| Migrations on disk | **143** SQL files under `supabase/migrations/` |
| Dashboard pages | **24** under `src/pages/dashboard/` |

Deploy: migrations MUST be applied to the live Supabase project — **`npm run db:push`** (Supabase CLI linked; reads `SUPABASE_DB_PASSWORD` from `.env` + `SUPABASE_ACCESS_TOKEN` from `.devin/mcp_config.local.json`; applies only unrecorded files and writes `schema_migrations` rows itself — prefer it over SQL-editor pastes). Edge functions deploy separately — **`npm run deploy:functions -- <names>`** (or no names = all; needs a full Personal Access Token as `SUPABASE_ACCESS_TOKEN` in `.env` — the MCP token can't deploy). Site deploy: **`npm run deploy`** (build + `wrangler pages deploy` to the `heven` Pages project; needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in `.env`).

## Current truth

Baseline 6-domain audit completed 2026-07-20 (142 findings); phases 1–12 landed. Open items below.

Repo enforces server-authority checkout, sold-goods locks, SPA rewrite (`public/_redirects`), purge-secret CI guard (`scripts/check-purge-secret.mjs`), SEO/a11y/ops docs, support desk + order numbers + product effects as above. Frontend assumes migrations + edge deploys match what is in this tree.

## Open items

Each item: **what** · **where** · **who unblocks**.

| What | Where | Who |
|------|-------|-----|
| Confirm live DB has latest migrations (audit harden, support tickets, order numbers, …) | Supabase project / `supabase db push` | Owner / deployer |
| Confirm edge fns redeployed (esp. `polar-webhook` 500-on-finalize-failure retry; `client-error --no-verify-jwt`) | Supabase Edge Functions | Owner / deployer |
| Rotate live `PURGE_CRON_SECRET`, keep only placeholder in repo, re-run `supabase/cron/purge_due_account_deletions.sql` | Dashboard secrets + cron SQL | Owner (rotate before any commit of a real secret) |
| Wire Polar delivery-failure mail, log drain/uptime, enable PITR, run restore drill | `OPS.md` | Owner |
| Host SPA rewrite + security headers actually served | Host (`_redirects` / `vercel.json` / proxy) | Owner / deployer |
| Product decisions still deferred: guest checkout; full SSG/prerender; in-app refunds (owner: no) | Product / eng debt | Owner decision + eng |
| PERF-2 partial ✅: dashboard CSS deferred off storefront main chunk (`product-editor`, `admin-catalog`, `settings-page`, `dashboard-role-surfaces`, `dashboard-owner-surfaces`, `dashboard-docs`, `analytics-page` + dynamic import; `check-dashboard-css-chunk.mjs`). Theme-skin split still rejected. Leftover = DaisyUI/Tailwind/storefront. See `LAUNCH-AUDIT-2026-07-24.md` PERF-2 | `src/styles/*.css` | Done 2026-07-29 |
| Deferred scale/refactor: megafile splits (`index.css`, builder, product editor); Admin/Owner product-list unify; generated Supabase types; webhook outbox; server catalog search | codebase | Eng when prioritized |
| Optional image transforms | Storage Pro + `VITE_SUPABASE_IMAGE_TRANSFORM=true` | Owner |

Accepted (not open): SEC-5 auth tokens in localStorage — kept; rely on CSP. Rate limits on public RPCs already shipped in-repo.

**Launch gate (2026-07-24 audit):** P0 SEC-1/SEC-2/SEC-3/SEO-1 cleared in repo — apply `20260723230000_support_tickets.sql` (edited pre-apply with helper `REVOKE`s) + `20260724160000_moderator_strip_fulfillment_secrets.sql`, and build prod with `VITE_SUPABASE_*`. FUNC-1 (support thread selection) cleared in repo via `loadTicketById` + `selectedFallback`. Remaining soft/P1 items still in `LAUNCH-AUDIT-2026-07-24.md`.

## Working style

Lazy-senior / ponytail: reuse what exists, stdlib > dependency, shortest diff that fixes the **root cause**, no speculative abstractions, delete over add. Question scope. Mark deliberate corner-cuts with a `ponytail:` comment naming the ceiling and upgrade path. Never lazy about: trust-boundary validation, security, accessibility, RTL/i18n parity, and anything the user explicitly asked for. Details: `.cursor/rules/ponytail.mdc`.

---

**Last verified:** 2026-07-24  
**How to update this doc:** After any checkout/auth/fulfillment/role change, update the matching invariant/gotcha/open-item here in the same PR; re-count `scripts/check-*.mjs` if checks were added/removed; never weaken a security claim.
