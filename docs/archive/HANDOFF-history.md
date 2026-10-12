# HANDOFF history (archived verbatim)

Dated / completed rows moved out of `HANDOFF.md` on 2026-10-12 to keep the always-read brief short. Nothing here is current instruction; see `HANDOFF.md`. Full 2026-07-24 audit: `LAUNCH-AUDIT-2026-07-24.md` (same folder).

## Current truth (old)

Baseline 6-domain audit completed 2026-07-20 (142 findings); phases 1–12 landed. Open items below.

Repo enforces server-authority checkout, sold-goods locks, SPA rewrite (`public/_redirects`), purge-secret CI guard (`scripts/check-purge-secret.mjs`), SEO/a11y/ops docs, support desk + order numbers + product effects as above. Frontend assumes migrations + edge deploys match what is in this tree.

## Completed / dated Open-items rows (old)

| What | Where | Who |
|------|-------|-----|
| PERF-2 partial ✅: dashboard CSS deferred off storefront main chunk (`product-editor`, `admin-catalog`, `settings-page`, `dashboard-role-surfaces`, `dashboard-owner-surfaces`, `dashboard-docs`, `analytics-page` + dynamic import; `check-dashboard-css-chunk.mjs`). Theme-skin split still rejected. Leftover = DaisyUI/Tailwind/storefront. See `LAUNCH-AUDIT-2026-07-24.md` PERF-2 | `src/styles/*.css` | Done 2026-07-29 |
| Deferred scale/refactor: (megafile splits + Admin/Owner unify DONE 2026-10-12: `src/css/*`, `dashboard/productEditor/*`, `dashboard/websiteBuilder/*`, `StaffProductsList.tsx`; checks read them via `scripts/_product-editor-source.mjs` / `builder-source.mjs` / `readIndexCss()`) generated Supabase types; webhook outbox; server catalog search | codebase | Eng when prioritized |

## Launch gate (2026-07-24 audit, old)

**Launch gate (2026-07-24 audit):** P0 SEC-1/SEC-2/SEC-3/SEO-1 cleared in repo — apply `20260723230000_support_tickets.sql` (edited pre-apply with helper `REVOKE`s) + `20260724160000_moderator_strip_fulfillment_secrets.sql`, and build prod with `VITE_SUPABASE_*`. FUNC-1 (support thread selection) cleared in repo via `loadTicketById` + `selectedFallback`. Remaining soft/P1 items still in `LAUNCH-AUDIT-2026-07-24.md`.

## Old project-map counts

`scripts/check-*.mjs` **80** files · **143** migrations · **24** dashboard pages (at 2026-07-24; now 83 / 149 / see HANDOFF).
