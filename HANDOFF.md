# HANDOFF — Engineering brief (HEVEN.FUN)

**Purpose:** Server-authority invariants, roles, verify commands, gotchas, open items — so a fresh agent does not break checkout/auth/fulfillment.

**Read this when:** fixing any bug; touching checkout, Polar, orders, stock, keys, roles, RLS, support, dashboard guards; before claiming “done.” History/changelog: `docs/archive/HANDOFF-history.md`.

Stack/run/env: `README.md`. Design rules: `DESIGN.md`. Alerts/deploy gate: `OPS.md`. Polar: `POLAR_SETUP.md`.

## Rules for all UI strings
Every user-facing string goes through `t('عربي', 'English')` from `src/lib/i18n`; RTL parity is a constraint. Dates: always `fmtDate` / `fmtDateTime` / `fmtTime` from `src/lib/dates.ts` (Gregorian, Latin digits, bidi marks stripped) — never raw `toLocale*String`.

## Roles (`src/types/index.ts`)

`owner | admin | moderator | support | seller | buyer | member`.

| Role | Reality |
|------|---------|
| **owner** | Everything: products, categories, orders, users, builder, themes, settings, changelogs, deletion requests, support. |
| **admin** | Staff ops: products, orders, users, coupons, badges, analytics, support. Not owner-only site chrome. |
| **moderator** | **Not** product staff (nav + product RLS stripped; no fulfillment secrets). Handles **escalated** tickets + review moderation. Home `ModeratorDashboardHome`; check `check-moderator-dashboard.mjs`. |
| **support** | Ticket desk `/dashboard/support` (`SupportPage.tsx`, `src/lib/support.ts`): claim / escalate / reject-escalation; Important + Sellers bins. Standing default **100**, **−15** per rejected escalation, **≤40 = restricted** (cannot escalate); owner/admin reset via `reset_support_standing`. |
| **seller** | Own listings + sales fulfillment; seller support queue. |
| **buyer** / **member** | Own orders, profile, badges, open tickets. |

Route guards: `allLinks` in `src/layouts/DashboardLayout.tsx`; it MUST wait for the profile to load before redirecting, or refresh falsely kicks users out.

## Invariants (MUST NOT regress)

1. **Client never writes money tables.** `orders`, `order_items`, `coupon_usages` are INSERT/UPDATE/DELETE-blocked by RLS. Orders are created by RPC `create_pending_order` (server recomputes prices, validates stock + coupon) and finalized by `finalize_paid_order`, called ONLY by the webhook. Never fix checkout with client `.from('orders').insert/update`.
2. **Stock is decremented only in `finalize_paid_order`.** Key-pool products: stock = unclaimed `product_keys` rows (claimed atomically, `FOR UPDATE SKIP LOCKED`). Manual stock: atomic `GREATEST(0, stock - qty)`. Concurrent oversell finalizes `paid` with `KEY_SHORTFALL`/`STOCK_SHORTFALL` notes and no auto-refund (accepted; ops watch).
3. **Roles can't be self-assigned.** Trigger forces `role='member'` on profile INSERT; `guard_role_change` covers UPDATE. `profiles` SELECT = own row or staff via `current_user_role()` — always use that helper in RLS to avoid recursion.
4. **Dashboard routes are role-guarded** (see Roles).
5. **Success page never fakes success.** `CheckoutSuccessPage` handles missing/failed/processing; marks paid only on a verified paid order, then removes that order's `product_id`s from the cart (not blanket `clearCart` — an old paid URL must not wipe a newer cart). Cart is NOT cleared when starting Polar (abandoned checkouts keep it). `signOut`/`signOutBoth` clear cart + wishlist (`clearLocalCommerce`) for shared devices.
6. **Fulfillment secrets** (`product_secrets`, `product_keys.content`) are exposed only via `get_order_fulfillment` (status `paid`, order owner). Never SELECT them client-side. Staff policies on them are `owner`/`admin` + seller-owns-product; `moderator`/`support` excluded (`20260724160000_moderator_strip_fulfillment_secrets.sql`).
7. **Sold goods are immutable from the client** (`20260720193000_audit_sec_keys_seller_reviews_orders.sql`): claimed `product_keys` reject JWT UPDATE/DELETE (`CLAIMED_KEY_LOCKED`; service-role paths pass); sellers INSERT `products` only with `seller_id = auth.uid()` (staff may set it); `reviews` are insert/delete-only (no UPDATE policy); NO direct UPDATE policy on `orders` — transitions via RPCs/webhook only.
8. **SECURITY DEFINER helpers are least-privilege.** `REVOKE ALL … FROM PUBLIC, anon, authenticated` unless intentionally GRANTed with caller authz (`notify_users`, `support_role_ids` are revoked; do not add an `auth.uid()` guard — it breaks DEFINER-to-DEFINER `PERFORM`).
9. **Staff notes** live in `profile_staff_notes` (RLS staff-only; write via RPC `set_staff_notes`; `src/lib/staffNotes.ts`). `profiles.staff_notes` is pinned NULL by a CHECK — never use it.
10. **Order numbers:** `orders.order_number` = `ORD-YYYYMMDD-########` (UTC date + global sequence), set by BEFORE INSERT trigger, frozen after (`ORDER_NUMBER_LOCKED`). UUID `orders.id` stays the PK for Polar/webhooks/deep links. Check `check-order-number.mjs`.
11. **Admin/owner stock totals** come from RPC `product_stock_pulse()` (`src/lib/stockPulse.ts`) — avoids the PostgREST 1000-row cap. Don't re-aggregate client-side.
12. **`client-error` edge fn rejects bodies >16 KB.** Deployed `--no-verify-jwt` (also pinned in `supabase/config.toml`, as are `polar-webhook` and `purge-deleted-accounts`).
13. **Coupon usage rows outlive orders:** `coupon_usages.order_id` is `ON DELETE SET NULL` by design.
14. **Keyed products have derived stock.** Editor disables the stock input when `product_keys` exist. Don't re-enable.
15. **Store wallet (non-withdrawable store credit).** Balances move only server-side: `credit_wallet_topup` (service_role, called by the HMAC-SHA512-verified `nowpayments-webhook`), `pay_order_with_wallet` (debit + `finalize_paid_order` in one transaction; `orders.payment_method='wallet'`), `admin_adjust_wallet` (owner/admin, note required). `wallets`/`wallet_ledger`/`wallet_topups` are SELECT-only for clients; ledger is append-only (RLS + trigger). Limits live in `site_settings` (`wallet_enabled`, `wallet_topup_min_usd`, `wallet_topup_max_usd`) with a DB guard (1 ≤ min ≤ max ≤ 10000). `partially_paid` without a USD figure credits nothing — staff reconcile (`OPS.md`). Check `check-wallet.mjs`.

`scripts/check-checkout-authority.mjs` asserts most of these. Run it after any checkout/auth/fulfillment change; extend it for new invariants.

## Gotchas that already bit

- **PowerShell:** `&&` fails; use `;`. **Arabic string-replace anchors** can fail (RTL marks) — anchor on nearby ASCII.
- **`tsconfig.app.json` lib is ES2021** (for `replaceAll`). Don't downgrade.
- **Fonts (`index.html`):** only Vault fonts are render-blocking; other skins use `media="print"` + `data-onload-media="all"` unlocked by `public/font-deferred.js` (CSP forbids inline `onload`). CSP MUST allow `api.fonts.coollabs.io` (CSS) + `cdn.fonts.coollabs.io` (woff2).
- **framer-motion stays out of the main chunk** (`ProductAdsBanner`, `NotificationBell`, `FindMoreProducts` are `React.lazy`; eager ≈ +42 KB gzip). `check-motion-chunk.mjs` after `npm run build`.
- **Autoplay video** goes through `InViewVideo` (`ProductMedia.tsx`); no raw `<video autoPlay>`.
- **DaisyUI custom themes MUST set `:root { --noise: 0 }`** (in `src/css/01-themes.css`), or film grain flashes on `:active`/menu press.
- **Storefront scrolling is native** — no JS wheel interception (a Blink-only lerp lost to compositor scrolling). Back-to-top uses `smoothScrollWindowTo` (`src/lib/smoothScroll.ts`). Check `check-storefront-scroll.mjs`.
- **CSS layout:** `src/index.css` only `@import`s `src/css/01-themes.css … 13-reviews.css` — order matters. Themes + DaisyUI theme blocks are in `01-themes.css`. Dashboard CSS is lazy in `src/styles/*.css` (guard `check-dashboard-css-chunk.mjs`); storefront `.pe-reviews*` stays in main.
- **Check scripts read split sources** via `scripts/_product-editor-source.mjs`, `scripts/builder-source.mjs`, and `readIndexCss()` (index.css + `src/css/*`). New split files must be reachable there.
- **Product effects** (Products area, not Website Builder): aura incl. `electric` (`ProductEffectsDialog`, `ElectricBorder.tsx`, `aura_electric_json` + `aura_color`; aura rides `product-card__tilt-face`); Hover 3D (`site_settings.product_hover_3d_json`); card-body FX `card_fx` JSON (matrix 1/2, **3 = Letter Glitch**; no CHECK). Checks: `check-electric-aura`, `check-product-hover-3d-whole-card`, `check-product-card-fx`.

## Fixing a bug here

1. **Trace the flow end to end.** Checkout: `CartPage` → `startPolarCheckout` → `create_pending_order` → `polar-checkout` → Polar → `polar-webhook` → `finalize_paid_order` → `CheckoutSuccessPage` polls `orders.status`. Success-page symptoms often root in webhook/RPC.
2. **Fix the shared function, not one caller;** grep every caller.
3. **Reuse patterns:** catalog = `GamesPage` + `types` prop; media = `ProductMedia`/`InViewVideo`; fulfillment display = `fulfillmentDisplay()` (`src/lib/fulfillment.ts`).
4. **Money/security belongs in SQL.** New behavior = timestamped idempotent migration (`CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` before `CREATE POLICY`); RPCs `SECURITY DEFINER SET search_path = public` and validate `auth.uid()` themselves.
5. **Leave one runnable check** — extend a `scripts/check-*.mjs` or add one assert script. No test frameworks.

## Verify

```powershell
npm run typecheck; npm run lint; npm test; npm run build; npx eslint <touched files>
```

`npm test` = `scripts/run-checks.mjs` runs every `scripts/check-*.mjs` (**84**; all MUST pass).

## File map

| Area | Location |
|------|----------|
| Commerce RPCs/RLS/key pool | `supabase/migrations/20260711100000_checkout_server_authority.sql` (+ `…120000_finalize_manual_stock`, `…110000_profiles_access_control`, `20260720193000_audit_sec_*`, `20260720200000_audit_sec_phase7_harden`) |
| Support / order numbers | `20260723230000_support_tickets.sql`, `20260724170000_support_ticket_rate_limits.sql`, `20260723232000_orders_order_number.sql` · `src/lib/support.ts`, `SupportPage.tsx` |
| Edge functions | `supabase/functions/`: `polar-checkout`, `polar-webhook`, `wallet-topup`, `nowpayments-webhook`, `client-error`, `databuddy-analytics`, `purge-deleted-accounts`, `hard-delete-user`, `_shared` |
| Wallet | `20261012160000_store_wallet.sql` · `wallet-topup` + `nowpayments-webhook` edge fns · `src/lib/wallet.ts` · `check-wallet.mjs` |
| Checkout client | `src/lib/startPolarCheckout.ts`, `CartPage.tsx`, `CheckoutSuccessPage.tsx` |
| Catalog | `src/pages/GamesPage.tsx`, `src/hooks/useCatalog.ts` |
| Product editor | `ProductEditorPage.tsx` (entry, ~1100 lines) + `src/pages/dashboard/productEditor/*` |
| Website builder | `WebsiteBuilderPage.tsx` (entry, ~1400) + `src/pages/dashboard/websiteBuilder/*` |
| Staff product lists | `src/pages/dashboard/StaffProductsList.tsx` (`variant` prop); `AdminProductsPage`/`OwnerProductsPage` are thin wrappers |
| Storefront CSS | `src/index.css` → `src/css/01…13-*.css`; dashboard CSS `src/styles/*.css` |
| Role guard | `src/layouts/DashboardLayout.tsx` |
| Self-checks | `scripts/check-*.mjs` (83) |
| Counts (2026-10-12) | 149 migrations · 24 dashboard pages in `src/pages/dashboard/` |

Deploy (details in `README.md`/`OPS.md`): `npm run db:push` · `npm run deploy:functions -- <names>` · `npm run deploy`.

## Open items

Format: **what** · **where** · **who**.

| What | Where | Who |
|------|-------|-----|
| Confirm edge fns redeployed (`polar-webhook` 500-on-finalize-failure retry; `client-error --no-verify-jwt`) | Supabase Edge Functions | Owner/deployer |
| Polar failure mail, log drain/uptime, PITR, restore drill | `OPS.md` | Owner |
| Host serves SPA rewrite + security headers; tighten CSP `frame-src` (currently `'self' https:`) | `public/_headers`, `vercel.json` | Owner/deployer |
| Prod build has `VITE_SUPABASE_*` so sitemap lists products (build fails if env set and 0 products) | Build env | Owner |
| Sitemap origin pinned to `https://heven.fun` (`scripts/generate-sitemap.mjs`) while app serves staging `heven.pages.dev`; noindex staging until cutover | script / host | Owner |
| Webhook verifies amount but not currency (USD hardcoded) | `polar-webhook` | Eng |
| `order_is_visible_to_caller` lets any seller on a multi-seller order read buyer UUID + whole order | `20260720191000_fix_orders_rls_recursion.sql` | Eng |
| Skin anti-patterns vs DESIGN.md: Abyss/Aurora hero `h1` gradient text (`src/css/09-skin-personalities.css`); Aurora card hover border + wide shadow; hero desc `opacity-70` on Vault (`HomePage.tsx`) | CSS / HomePage | Eng/design |
| Catalog downloads up to 5000 actives and filters client-side; support search covers newest 200 per bin (`SupportPage.tsx`) | `useCatalog.ts`, `SupportPage.tsx` | Eng when scale needs it |
| Debt: generated Supabase types (`as unknown as` clusters); webhook outbox; server catalog search; `CartPage` local `money()` bypasses `formatMoney`; support standing badge stale until profile refetch | codebase | Eng when prioritized |
| Product decisions deferred: guest checkout; full SSG; in-app refunds/chargebacks (owner: not now — a reversed Polar payment stays `paid` + fulfillment exposed) | Product | Owner |
| Wallet go-live: set secrets `NOWPAYMENTS_API_KEY` + `NOWPAYMENTS_IPN_SECRET`; deploy `wallet-topup` + `nowpayments-webhook`; set IPN URL in NOWPayments dashboard; turn custody off + set payout wallet; then set `wallet_enabled=true` | NOWPayments dashboard / Supabase | Owner |
| Optional image transforms | Storage Pro + `VITE_SUPABASE_IMAGE_TRANSFORM=true` | Owner |

Verified 2026-10-12: all 149 migrations applied on live; edge secrets `SITE_URL` + `POLAR_SERVER` set; `PURGE_CRON_SECRET` rotated and matched to the cron job (they had drifted apart); `claimed` always gets an assignee (`20261012120000`).

Accepted (not open): auth tokens in localStorage (rely on CSP); same-URL hreflang; public-RPC and support-ticket rate limits already shipped.

## Working style

Lazy-senior / ponytail: reuse, stdlib > dependency, shortest diff fixing the **root cause**, no speculative abstractions. Mark deliberate corner-cuts with a `ponytail:` comment naming ceiling + upgrade path. Never lazy about trust-boundary validation, security, accessibility, RTL/i18n. Details: `.cursor/rules/ponytail.mdc`.

---

**Last verified:** 2026-10-12  
**How to update:** After any checkout/auth/fulfillment/role change, update the matching invariant/gotcha/open item in the same PR; re-count checks if added/removed; never weaken a security claim. Move completed/dated rows to `docs/archive/HANDOFF-history.md`.
