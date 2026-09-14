<p align="center">
  <img src="public/og-image.png" alt="HEVEN.FUN — Fun more. Pay less." width="100%" />
</p>

<p align="center">
  <a href="https://github.com/Tmezjbn/HevenStore/actions/workflows/ci.yml"><img src="https://github.com/Tmezjbn/HevenStore/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind 4" />
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
</p>

<p align="center">
  <a href="https://heven.fun"><strong>heven.fun</strong></a>
</p>

# HEVEN.FUN

**Purpose:** Human entry doc — what this repo is, how to run it, where money and ops truth live.

**Read this when:** onboarding, setting up a machine, or finding the right deeper doc.

Bilingual (AR/EN) digital storefront for games, subscriptions, gift cards, and one-time keys — plus a role-guarded dashboard (catalog, orders, users, support desk, badges, themes, website builder).

**Stack:** Vite + React 18 + TypeScript · Tailwind CSS 4 + DaisyUI 5 · Zustand (cart/wishlist/auth/appearance) · TanStack React Query (catalog) · Supabase (Postgres + RLS, Auth, Storage, Edge Functions) · Polar (payments) · Databuddy (consent-gated analytics).

## Quick start

```powershell
npm install
copy .env.example .env   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:5173. `VITE_SITE_URL` sets the origin used for canonicals: currently the staging origin (`https://heven.pages.dev`), switching to the production domain (`https://heven.fun`) at launch. Keep Edge `SITE_URL` on the same origin as the SPA build.

## Scripts

| Command | What |
|---------|------|
| `npm run dev` | Vite dev server |
| `npm run build` | Project refs typecheck + sitemap + Vite build + prerender |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Runs **every** `scripts/check-*.mjs` (**80** checks; all MUST pass) |
| `npm run preview` | Serve `dist/` |

PowerShell: chain with `;` — `&&` does not work here.

## Architecture

```mermaid
flowchart TB
  subgraph SPA["React SPA (Vite)"]
    Store["Storefront (MainLayout)<br/>Home / Store / Product / Cart / Checkout"]
    Dash["Dashboard (DashboardLayout, lazy, role-guarded)<br/>24 pages under src/pages/dashboard/"]
    Auth["Auth pages (lazy)"]
  end
  subgraph Supabase
    PG[("Postgres + RLS<br/>orders, products, profiles, …")]
    RPC["RPCs (SECURITY DEFINER)<br/>create_pending_order<br/>finalize_paid_order<br/>get_order_fulfillment"]
    EF["Edge Functions<br/>polar-checkout · polar-webhook<br/>client-error · databuddy-analytics<br/>purge-deleted-accounts · hard-delete-user"]
    ST["Storage buckets<br/>avatars · product-images · site-media"]
  end
  Polar["Polar hosted checkout"]
  SPA -->|anon key + JWT| PG
  SPA -->|RPC| RPC
  SPA -->|invoke| EF
  EF --> Polar
  Polar -->|webhook, signature-verified| EF
  EF -->|service role| RPC
```

### Checkout flow (server-authoritative)

```mermaid
sequenceDiagram
  participant C as CartPage / startPolarCheckout
  participant DB as create_pending_order (RPC)
  participant PC as polar-checkout (edge fn)
  participant P as Polar
  participant W as polar-webhook (edge fn)
  participant F as finalize_paid_order (RPC)
  participant S as CheckoutSuccessPage
  C->>DB: cart items + coupon (prices recomputed server-side)
  DB-->>C: pending order id (UUID PK)
  C->>PC: order_id (Supabase JWT)
  PC->>P: create checkout session
  P-->>C: redirect to hosted checkout
  P->>W: order.paid (signature verified)
  W->>F: finalize (service role only)
  F->>F: claim keys / decrement stock atomically
  S->>S: polls orders.status, shows fulfillment via get_order_fulfillment
```

Human-readable `orders.order_number` (`ORD-YYYYMMDD-########`) is assigned by a DB trigger; Polar/webhooks/deep links still use UUID `orders.id`. Details: `HANDOFF.md`.

### Project map

| Area | Location |
|------|----------|
| Routes + providers | `src/App.tsx` |
| Storefront pages | `src/pages/` (catalog = `GamesPage` + `types` prop) |
| Dashboard pages | `src/pages/dashboard/` (**24** pages) |
| Shared UI | `src/components/ui/` |
| State | `src/stores/` |
| Domain helpers | `src/lib/` |
| Catalog hooks | `src/hooks/useCatalog.ts`, `useSiteSettings.ts`, `usePageMeta.ts` |
| SQL / RLS / RPCs | `supabase/migrations/` (**134** files) |
| Edge functions | `supabase/functions/` (6 fns + `_shared`) |
| Invariant checks | `scripts/check-*.mjs` (**80**; via `npm test`) |

**Roles:** `owner | admin | moderator | support | seller | buyer | member` — see `HANDOFF.md` (moderator ≠ product staff; `support` = ticket desk).

## Environment

See `.env.example`. Client-safe vars are `VITE_*` only. Server secrets (Polar tokens, Databuddy API key, purge cron secret) live in **Supabase Edge Function secrets** — never in Vite. Payment setup: [POLAR_SETUP.md](./POLAR_SETUP.md).

## Deploy

1. Apply Supabase migrations (`supabase db push` or SQL editor) — checkout RPCs and RLS are required.
2. Deploy edge functions: `polar-checkout`, `polar-webhook` (`--no-verify-jwt`), `client-error` (`--no-verify-jwt`), `purge-deleted-accounts` (`--no-verify-jwt`), `hard-delete-user`, optional `databuddy-analytics`. JWT posture is also pinned in `supabase/config.toml` — a flag-less deploy leaves `polar-webhook`/`client-error`/`purge-deleted-accounts` unreachable (401).
3. Build the SPA (`npm run build`) and host `dist/` behind HTTPS. Build needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` for product HTML shells; without them, static routes still prerender.
4. Security headers: `public/_headers` (Netlify / Cloudflare Pages), `vercel.json` (Vercel), or the same set on your reverse proxy. SPA rewrite: `public/_redirects` (`/* /index.html 200`).
5. Set `VITE_SITE_URL` to the production origin for canonicals.
6. Point Polar webhook + Edge `SITE_URL` at that origin.
7. **Ops:** alerts, uptime, backup/PITR — **[OPS.md](./OPS.md)**. Live apply state is not verifiable from git.

## Docs map

| Doc | Use |
|-----|-----|
| **[HANDOFF.md](./HANDOFF.md)** | Invariants, roles, gotchas, verify, open items. **Read before checkout/auth/fulfillment.** |
| **[OPS.md](./OPS.md)** | Alerts, uptime, PITR, launch checklist (live-only items). |
| **[POLAR_SETUP.md](./POLAR_SETUP.md)** | Sandbox/prod Polar wiring. |
| **[PRODUCT.md](./PRODUCT.md)** + **[DESIGN.md](./DESIGN.md)** | Brand + UI rules before UI work. |
| **[AGENTS.md](./AGENTS.md)** | Short AI read-order. |

## Invariants (do not regress)

Orders, prices, coupons, and stock are server-authoritative (`create_pending_order` / `finalize_paid_order`). The client MUST NOT write `orders` / `order_items` / `coupon_usages`. Fulfillment secrets only via `get_order_fulfillment`. Full list + enforcement: `HANDOFF.md` + `scripts/check-checkout-authority.mjs`.

---

**Last verified:** 2026-07-24  
**How to update this doc:** Keep README as the map. Put deep invariants in HANDOFF; ops/live checks in OPS. Re-count checks/pages/migrations when those folders change.
