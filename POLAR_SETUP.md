# Polar setup (sandbox → production)

**Purpose:** Wire Polar checkout + webhook to this repo’s edge functions without guessing URLs or secrets.

**Read this when:** configuring sandbox or production payments. Invariants: `HANDOFF.md`. Ops/alerts: `OPS.md`.

HEVEN.FUN uses one Polar **placeholder product** per checkout. Cart total is sent as an ad-hoc fixed price via the `prices` map — not the top-level `amount` field.

## 1. Sandbox org

1. Open [Polar sandbox](https://sandbox.polar.sh) and create or select an organization.
2. Create **any product** (name/price on Polar side do not matter — we override price at checkout).
3. Copy the product UUID from the product page URL or API.

## 2. API key

Organization → Settings → API → create access token. Copy it.

## 3. Webhook

Organization → Settings → Webhooks → Add endpoint:

| Field | Value |
|-------|-------|
| URL | `https://<project-ref>.supabase.co/functions/v1/polar-webhook` |
| Format | Raw |
| Events | `order.paid`, `checkout.updated` |

Replace `<project-ref>` with your Supabase project ref (Dashboard → Project Settings). Copy the webhook signing secret.

JWT verification on this function MUST be **off** (`--no-verify-jwt` on deploy) — Polar does not send a Supabase JWT.

## 4. Supabase secrets

From project root (PowerShell — one line):

```powershell
npx supabase secrets set POLAR_ACCESS_TOKEN=polar_at_xxx POLAR_PRODUCT_ID=your-product-uuid POLAR_WEBHOOK_SECRET=whsec_xxx SITE_URL=http://localhost:5173 POLAR_SERVER=sandbox
```

Replace values with your sandbox credentials. For production, `SITE_URL` MUST be the production origin (same idea as `VITE_SITE_URL` on the SPA).

## 5. Deploy edge functions

```powershell
npx supabase functions deploy polar-checkout
npx supabase functions deploy polar-webhook --no-verify-jwt
```

## 6. Test checkout

1. Product price in dashboard ≥ **$0.50** (Polar minimum for USD).
2. Log in as a **member** (not owner).
3. Add to cart → checkout → redirect to Polar sandbox.
4. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.
5. After pay: webhook marks order `paid` → `/checkout/success` shows fulfillment secrets (via `get_order_fulfillment`). Success page uses UUID `order_id`; human `order_number` is display-only.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `invalid_amount` | Cart total under $0.50 |
| `polar_not_configured` | Run `secrets set` with token + product ID |
| `polar_error` 401 | Wrong or expired `POLAR_ACCESS_TOKEN` |
| `polar_error` 422 | Bad product UUID or malformed payload — redeploy `polar-checkout` |
| Payment page loads but order stays pending | Webhook URL/secret wrong; check Supabase function logs |
| Webhook 401 Invalid signature | Re-copy `POLAR_WEBHOOK_SECRET` from Polar dashboard |
| Webhook returns 500 after pay | Finalize RPC failed — Polar should retry; see `OPS.md` alert tags |

## Production

1. Set `POLAR_SERVER=production`.
2. Use production API token, product UUID, and webhook endpoint (same URL pattern with prod project ref if different).
3. Set Edge `SITE_URL` to the production origin.
4. Enable Polar delivery-failure notifications (`OPS.md`).
5. Confirm live webhook redeploy includes the 500-on-finalize-failure retry behavior (`HANDOFF.md` open items).

---

**Last verified:** 2026-07-24  
**How to update this doc:** When Polar payload fields or required secrets change in `supabase/functions/polar-*`, update steps here. Never paste a real project-ref or live secret into this file.
