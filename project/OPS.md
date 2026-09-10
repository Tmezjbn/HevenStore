# OPS — Alerts, uptime, backup, launch checklist

**Purpose:** Owner/dev runbook for production health. No in-app pager — wire host + Polar + Supabase.

**Read this when:** deploying, launching, rotating secrets, or checking whether live infra matches the repo.

Live Supabase/host/Polar state **cannot** be verified from source. Treat every checkbox below as something a human MUST confirm in dashboards.

## 1. Alerting

### Polar (payments)

1. Polar Dashboard → Webhooks → enable **delivery failure** emails/notifications.
2. Endpoint MUST be `https://<project-ref>.supabase.co/functions/v1/polar-webhook` (JWT verify **off**).
3. After deploy, send a test event; Edge Function logs should show activity.

### Supabase Edge Function logs

Watch / drain these strings (Dashboard → Edge Functions → Logs, or a log drain → Slack/email):

| Tag | Source | Meaning | Action |
|-----|--------|---------|--------|
| `CLIENT_ERROR` | `client-error` | Storefront crash beacon | Check path/stack; fix if recurrent |
| `ORPHAN_PAID_RECEIPT` | `polar-webhook` | Money in, no order row | Manual reconcile / refund in Polar |
| `ALERT_TERMINAL_FINALIZE` | `polar-webhook` | Paid event rejected (underpay / business) | Check order + Polar amount |
| `finalize_paid_order failed` | `polar-webhook` | RPC error → Polar retries (HTTP 500) | Fix DB/RPC; watch retries clear |
| `Webhook signature verification failed` | `polar-webhook` | Bad secret or payload | Rotate/check `POLAR_WEBHOOK_SECRET` |

**Minimum launch bar:** Polar failure emails on + weekly glance at `polar-webhook` + `client-error` logs. Preferred: log drain filter on the tags above.

### Cron jobs

Confirm scheduled (SQL editor / `cron.job`):

- `purge_due_account_deletions` — uses `PURGE_CRON_SECRET` (placeholder in repo; live secret only in Dashboard/Vault).
- `cleanup_stale_pending_orders` — ~04:00 UTC.

If either stops, pending carts/orders or soft-deleted accounts pile up. Re-run SQL in `supabase/cron/` after secret rotation. CI guards against committed live purge literals: `scripts/check-purge-secret.mjs`.

## 2. Uptime

Pick one external monitor (Cloudflare Health Check, Better Stack, UptimeRobot, …):

- **URL:** current live origin (`SITE_URL` / `VITE_SITE_URL`) — today the Cloudflare Pages staging origin `https://heven.pages.dev`; the `https://heven.fun` cutover is pending, so re-point the monitor, Polar webhook `SITE_URL`, and the SPA build var together on launch day.
- **Expect:** HTTP 200, interval ≤ 5 min
- **Alert:** email/SMS to owner
- Optional second check: `{origin}/store` (catches SPA rewrite breakage)

Uptime ≠ payment health — Polar webhook failures need §1.

## 3. Backup / PITR

Supabase owns Postgres backups. Before launch marketing:

1. Dashboard → **Project Settings → Add-ons / Database** → confirm **Point-in-Time Recovery** (or daily backups) for the plan you pay for. Note retention days.
2. Record: project ref, region, who has owner access, where secrets live (Edge Function secrets list).
3. **Restore drill (once):** throwaway branch/project or staging → restore a recent backup → smoke: login, open one product, verify tables `orders`, `products`, `product_keys` (or dry-run pending-order path). Log date below.
4. Storage buckets (`product-images`, `site-media`, …) are **not** fully covered by DB PITR — export critical media or confirm Storage backup policy separately if you rely on irreplaceable uploads.

**Do not** treat git + migrations as the only backup. Migrations rebuild schema; they do not restore live orders/keys.

## 4. Deploy gate (money/auth releases)

Before a release that touches money/auth:

1. `supabase db push` (or apply new migrations in SQL editor) — include latest audit/support/order-number migrations from `supabase/migrations/`.
2. Redeploy edge fns: `polar-checkout`, `polar-webhook --no-verify-jwt`, `client-error --no-verify-jwt`, `purge-deleted-accounts`, `hard-delete-user`, optional `databuddy-analytics`.
3. Edge secret `SITE_URL` = production origin (no localhost fallback in prod).
4. Host serves SPA rewrite (`public/_redirects` / `vercel.json`) + security headers.
5. Build with `VITE_SUPABASE_*` so sitemap/prerender get product URLs.

Details: `README.md` Deploy, `HANDOFF.md` invariants, `POLAR_SETUP.md`.

## 5. Client crash beacon

- `reportError` always POSTs to `client-error` (consent-independent). Databuddy errors stay consent-gated.
- Client dedupes identical message+path for ~60s (session); edge fn also rate-limits ~30/IP/min.
- Deploy: `npx supabase functions deploy client-error --no-verify-jwt`

## 6. Not verifiable from source (confirm live before launch)

Checklist for humans — none of these can be proven from the git tree alone:

- [ ] Migrations actually applied on production Supabase (incl. audit harden, support tickets, order numbers)
- [ ] Edge function deploy versions + secrets (`POLAR_WEBHOOK_SECRET`, `PURGE_CRON_SECRET`, `SITE_URL`, …)
- [ ] pg_cron schedules running (`purge_due_account_deletions`, `cleanup_stale_pending_orders`)
- [ ] Polar webhook endpoint, delivery backlog, sandbox vs production
- [ ] Host: SPA rewrite, HSTS, TLS, Cache-Control; whether `_headers` / `vercel.json` are actually served
- [ ] Supabase Auth settings (rate limits, confirm email, leaked-password protection)
- [ ] Backup retention / PITR tier
- [ ] Remote CI green; confirm `.env` / live secrets never hit remote git history
- [ ] Polar failure notifications + optional log drain wired
- [ ] External uptime check on production origin + optional `/store`

Engineering open items that are product/debt (not ops wiring): `HANDOFF.md` → Open items.

---

### Restore drill log

| Date | Who | Result |
|------|-----|--------|
| _(none yet)_ | | |

---

**Last verified:** 2026-07-24  
**How to update this doc:** After changing alert tags, cron SQL, or deploy steps in repo, update the matching section. After a restore drill, add a row to the log. Do not claim live boxes are checked without dashboard confirmation.
