// Supabase Edge Function: NOWPayments IPN receiver (wallet top-ups).
// Deploy: supabase functions deploy nowpayments-webhook --no-verify-jwt
//   (also pinned in supabase/config.toml)
//
// Secrets: NOWPAYMENTS_IPN_SECRET (IPN secret key), NOWPAYMENTS_API_KEY (re-fetch check).
// IPN URL to set in the NOWPayments dashboard:
//   https://<project-ref>.supabase.co/functions/v1/nowpayments-webhook
//
// Auth: header x-nowpayments-sig = HMAC-SHA512 (hex) of JSON.stringify(body with keys
// sorted recursively), keyed by the IPN secret. Constant-time compared.
// Money moves only via credit_wallet_topup (service_role, idempotent).
//
// partially_paid: credit only when the payload carries a fiat figure
// (actually_paid_at_fiat, USD); otherwise status is recorded with NO credit and
// staff reconcile via admin_adjust_wallet (OPS.md).

import { createClient } from 'npm:@supabase/supabase-js@2';

type Loose = Record<string, unknown>;

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const o = v as Loose;
    return Object.fromEntries(
      Object.keys(o)
        .sort()
        .map((k) => [k, sortKeys(o[k])]),
    );
  }
  return v;
}

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, [
    'sign',
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

const STATUS_MAP: Record<string, 'finished' | 'partially_paid' | 'failed' | 'expired'> = {
  finished: 'finished',
  partially_paid: 'partially_paid',
  failed: 'failed',
  refunded: 'failed',
  expired: 'expired',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('NOWPAYMENTS_IPN_SECRET');
  if (!secret) return new Response('Webhook secret not configured', { status: 500 });

  const raw = await req.text();
  let payload: Loose;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not object');
    payload = parsed as Loose;
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  const given = (req.headers.get('x-nowpayments-sig') ?? '').trim().toLowerCase();
  const expected = await hmacSha512Hex(secret, JSON.stringify(sortKeys(payload)));
  if (!given || !timingSafeEqual(given, expected)) {
    console.error('NOWPayments signature verification failed');
    return new Response('Invalid signature', { status: 401 });
  }

  const paymentStatus = String(payload.payment_status ?? '');
  const mapped = STATUS_MAP[paymentStatus];
  if (!mapped) return new Response('ok', { status: 200 }); // waiting/confirming/confirmed/sending…

  const topupId = payload.order_id;
  if (typeof topupId !== 'string' || !UUID_RE.test(topupId)) {
    console.error('ALERT_NOWPAYMENTS_BAD_ORDER_ID:', paymentStatus, String(topupId).slice(0, 64));
    return new Response('ok', { status: 200 }); // terminal: retrying cannot fix it
  }
  const paymentId = payload.payment_id != null ? String(payload.payment_id) : '';

  // Defense in depth: confirm status + order with NOWPayments itself before crediting.
  let received: number | null = null;
  const apiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
  let source: Loose = payload;
  if ((mapped === 'finished' || mapped === 'partially_paid') && apiKey && paymentId) {
    try {
      const res = await fetch(`https://api.nowpayments.io/v1/payment/${encodeURIComponent(paymentId)}`, {
        headers: { 'x-api-key': apiKey },
      });
      if (!res.ok) {
        console.error('NOWPayments payment re-fetch failed:', res.status, paymentId);
        return new Response('recheck retry', { status: 500 });
      }
      const live = (await res.json()) as Loose;
      if (String(live.payment_status) !== paymentStatus || String(live.order_id) !== topupId) {
        console.error('ALERT_NOWPAYMENTS_MISMATCH:', paymentId, live.payment_status, paymentStatus);
        return new Response('mismatch', { status: 500 });
      }
      source = live;
    } catch (e) {
      console.error('NOWPayments re-fetch error:', e);
      return new Response('recheck retry', { status: 500 });
    }
  }
  if (mapped === 'partially_paid') {
    const fiat = Number(source.actually_paid_at_fiat);
    received = Number.isFinite(fiat) && fiat > 0 ? fiat : null;
    if (received == null) console.error('ALERT_WALLET_PARTIAL_REVIEW: no fiat figure, no credit', topupId, paymentId);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.rpc('credit_wallet_topup', {
    p_topup_id: topupId,
    p_payment_id: paymentId,
    p_status: mapped,
    p_received_usd: received,
  });
  if (error) {
    console.error('credit_wallet_topup failed:', topupId, error);
    return new Response('credit retry', { status: 500 });
  }
  if ((data as Loose | null)?.result === 'not_found') {
    console.error('ALERT_NOWPAYMENTS_UNKNOWN_TOPUP:', topupId, paymentId);
  }
  return new Response('ok', { status: 200 });
});
