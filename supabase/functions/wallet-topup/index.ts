// Supabase Edge Function: start a wallet top-up (NOWPayments hosted invoice).
//
// Secrets (supabase secrets set KEY=value):
//   NOWPAYMENTS_API_KEY  - NOWPayments API key (store settings)
//   SITE_URL             - live site origin (success/cancel redirects)
//
// Flow: user JWT -> create_wallet_topup (limits, rate limit, pending row, all
// enforced in SQL under the USER's identity) -> NOWPayments invoice -> return url.
// Credit happens ONLY in nowpayments-webhook after a verified signature.
// Deploy: supabase functions deploy wallet-topup

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

const TOKENS = [
  'WALLET_DISABLED',
  'TOPUP_TOO_LOW',
  'TOPUP_TOO_HIGH',
  'RATE_LIMITED',
  'ACCOUNT_UNAVAILABLE',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
  if (!apiKey) return json(req, { error: 'provider_not_configured' }, 503);

  const siteUrlEnv = Deno.env.get('SITE_URL');
  const siteUrl = (siteUrlEnv ?? 'http://localhost:5173').replace(/\/$/, '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  try {
    const body = await req.json().catch(() => null);
    const amount = Number((body as { amount?: unknown } | null)?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return json(req, { error: 'TOPUP_TOO_LOW' }, 400);

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(req, { error: 'unauthorized' }, 401);

    // Limits + rate limit + pending-row insert run in SQL as the caller.
    const { data: topupId, error: rpcErr } = await userClient.rpc('create_wallet_topup', {
      p_amount: amount,
    });
    if (rpcErr || typeof topupId !== 'string') {
      const msg = rpcErr?.message ?? '';
      const token = TOKENS.find((t) => msg.includes(t));
      if (token) return json(req, { error: token }, 400);
      console.error('create_wallet_topup failed:', rpcErr);
      return json(req, { error: 'internal' }, 500);
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // Server-trusted amount: read back what SQL stored (rounded to cents).
    const { data: row, error: rowErr } = await admin
      .from('wallet_topups')
      .select('amount_usd')
      .eq('id', topupId)
      .single();
    if (rowErr || !row) {
      console.error('topup readback failed:', topupId, rowErr);
      return json(req, { error: 'internal' }, 500);
    }

    const res = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_amount: Number(row.amount_usd),
        price_currency: 'usd',
        order_id: topupId,
        order_description: 'Wallet top-up',
        ipn_callback_url: `${supabaseUrl}/functions/v1/nowpayments-webhook`,
        success_url: `${siteUrl}/dashboard/wallet?topup=success`,
        cancel_url: `${siteUrl}/dashboard/wallet?topup=cancel`,
      }),
    });
    if (!res.ok) {
      console.error('NOWPayments invoice failed:', res.status, await res.text());
      // Leave the pending row; it expires unused and counts toward the hourly cap.
      return json(req, { error: 'provider_error', provider_status: res.status }, 502);
    }
    const invoice = (await res.json()) as { id?: string | number; invoice_url?: string };
    if (!invoice.invoice_url) {
      console.error('NOWPayments invoice missing url for', topupId);
      return json(req, { error: 'provider_error' }, 502);
    }

    const { error: saveErr } = await admin
      .from('wallet_topups')
      .update({ provider_invoice_id: invoice.id != null ? String(invoice.id) : null, updated_at: new Date().toISOString() })
      .eq('id', topupId);
    if (saveErr) console.error('provider_invoice_id save failed (non-fatal):', topupId, saveErr);

    return json(req, { url: invoice.invoice_url });
  } catch (e) {
    console.error('wallet-topup error:', e);
    return json(req, { error: 'internal' }, 500);
  }
});
