// Supabase Edge Function: create a Polar checkout session for a pending order.
//
// Secrets (supabase secrets set KEY=value):
//   POLAR_ACCESS_TOKEN   - Organization access token (sandbox org)
//   POLAR_PRODUCT_ID     - Any product UUID from sandbox dashboard
//   SITE_URL             - http://localhost:5173 (dev) or your live URL
//   POLAR_SERVER         - "sandbox" or "production"
//
// Deploy: supabase functions deploy polar-checkout

import { createClient } from 'npm:@supabase/supabase-js@2';

function corsHeaders(req: Request): Record<string, string> {
  const site = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
  const origin = (req.headers.get('Origin') ?? '').replace(/\/$/, '');
  const allowed = new Set([site, 'http://localhost:5173', 'http://127.0.0.1:5173']);
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? (req.headers.get('Origin') ?? site) : site,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  const accessToken = Deno.env.get('POLAR_ACCESS_TOKEN');
  const productId = Deno.env.get('POLAR_PRODUCT_ID');
  const siteUrlEnv = Deno.env.get('SITE_URL');
  const siteUrl = siteUrlEnv ?? 'http://localhost:5173';
  const polarServer = Deno.env.get('POLAR_SERVER') ?? 'sandbox';
  // Typo like 'prodution' must fail loud, not silently hit sandbox.
  if (polarServer !== 'sandbox' && polarServer !== 'production') {
    return json(req, { error: 'polar_server_invalid' }, 500);
  }
  const polarBase =
    polarServer === 'production' ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh';

  if (!accessToken || !productId) {
    return json(req, { error: 'polar_not_configured' }, 501);
  }
  // Production without SITE_URL would build success_url on localhost — fail loudly.
  if (polarBase === 'https://api.polar.sh' && !siteUrlEnv) {
    return json(req, { error: 'site_url_not_configured' }, 500);
  }

  try {
    const body = await req.json().catch(() => null);
    const order_id = (body as { order_id?: unknown } | null)?.order_id;
    if (
      typeof order_id !== 'string' ||
      !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(order_id)
    ) {
      return json(req, { error: 'order_id required' }, 400);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userData.user) return json(req, { error: 'unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, user_id, total, status, polar_checkout_id')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) return json(req, { error: 'order_not_found' }, 404);
    if (order.user_id !== userData.user.id) return json(req, { error: 'forbidden' }, 403);
    if (order.status !== 'pending') return json(req, { error: 'order_not_pending' }, 409);
    // One Polar session per order — a second paid session double-charges the
    // buyer and the later order.paid finalizes as already_paid (money taken,
    // no fulfillment). Retries go through a fresh pending order instead.
    if (order.polar_checkout_id) return json(req, { error: 'checkout_exists' }, 409);

    const amountCents = Math.round(Number(order.total) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 50) {
      return json(req, { error: 'invalid_amount' }, 400);
    }

    // Polar requires ad-hoc prices for dynamic cart totals — top-level "amount"
    // only works with custom/pay-what-you-want catalog prices and is often ignored.
    const res = await fetch(`${polarBase}/v1/checkouts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products: [productId],
        prices: {
          [productId]: [
            {
              amount_type: 'fixed',
              price_amount: amountCents,
              price_currency: 'usd',
            },
          ],
        },
        customer_email: userData.user.email,
        external_customer_id: userData.user.id,
        success_url: `${siteUrl}/checkout/success?order_id=${order.id}`,
        metadata: { order_id: order.id },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Polar checkout create failed:', res.status, detail);
      // Raw upstream detail stays in function logs — don't echo it to callers.
      return json(req, { error: 'polar_error', polar_status: res.status }, 502);
    }

    const checkout = await res.json();

    // Link Polar checkout to our order for webhook correlation. Guards:
    // status pending (order may finalize mid-request) AND polar_checkout_id
    // still null — a concurrent invoke winning the race makes this stamp a
    // no-op, and we must not hand out a second payable URL for one order.
    const { data: stamped, error: stampErr } = await admin
      .from('orders')
      .update({ polar_checkout_id: checkout.id })
      .eq('id', order.id)
      .eq('status', 'pending')
      .is('polar_checkout_id', null)
      .select('id');
    if (stampErr) {
      // Non-fatal: the webhook still correlates via metadata.order_id.
      console.error('polar_checkout_id stamp failed:', order.id, stampErr);
    }
    if (!stampErr && !stamped?.length) {
      // Lost the race — the winning session's URL is the only one buyers get;
      // this orphaned Polar checkout expires unpaid.
      return json(req, { error: 'checkout_exists' }, 409);
    }

    return json(req, { url: checkout.url });
  } catch (e) {
    console.error('polar-checkout error:', e);
    return json(req, { error: 'internal' }, 500);
  }
});
