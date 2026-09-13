// Supabase Edge Function: Polar webhook receiver.
// Deploy: supabase functions deploy polar-webhook --no-verify-jwt

import { validateEvent, WebhookVerificationError } from 'npm:@polar-sh/sdk/webhooks';
import { createClient } from 'npm:@supabase/supabase-js@2';

type LooseRecord = Record<string, unknown>;

/** ok = done; retry = Polar should redeliver; terminal = logged, do not loop. */
type MarkResult = 'ok' | 'retry' | 'terminal';

function headersFromRequest(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

function getOrderId(data: LooseRecord): string | null {
  const meta = data.metadata as LooseRecord | undefined;
  if (!meta) return null;
  const id = meta.order_id ?? meta.orderId;
  return typeof id === 'string' ? id : null;
}

function getCheckoutId(data: LooseRecord, eventType: string): string | null {
  if (eventType === 'checkout.updated' && typeof data.id === 'string') return data.id;
  const cid = data.checkout_id ?? data.checkoutId;
  if (typeof cid === 'string') return cid;
  const nested = data.checkout as LooseRecord | undefined;
  if (nested && typeof nested.id === 'string') return nested.id;
  return null;
}

/** Paid amount in cents from the Polar payload, when it carries one. */
function getPaidCents(data: LooseRecord): number | null {
  for (const key of ['total_amount', 'amount', 'net_amount']) {
    const v = data[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

async function markOrderPaid(data: LooseRecord, eventType: string): Promise<MarkResult> {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Correlate the event to our order row.
  let orderId = getOrderId(data);
  if (!orderId) {
    const checkoutId = getCheckoutId(data, eventType);
    if (!checkoutId) {
      console.warn('paid event but no order_id or checkout_id', eventType, JSON.stringify(data).slice(0, 300));
      return 'terminal';
    }
    const { data: row, error: lookupErr } = await admin
      .from('orders')
      .select('id')
      .eq('polar_checkout_id', checkoutId)
      .maybeSingle();
    if (lookupErr) {
      console.error('checkout_id lookup failed:', checkoutId, lookupErr);
      return 'retry';
    }
    if (!row) {
      // Order row may not be committed yet — ask Polar to retry.
      console.warn('no order matched checkout_id (will retry):', checkoutId);
      return 'retry';
    }
    orderId = row.id;
  }

  // Keep Polar IDs on the order for support/reconciliation.
  const ids: Record<string, string> = {};
  if (typeof data.id === 'string' && eventType.startsWith('order.')) ids.polar_order_id = data.id;
  if (typeof data.id === 'string' && eventType === 'checkout.updated') ids.polar_checkout_id = data.id;
  if (Object.keys(ids).length) {
    const { error: idErr } = await admin.from('orders').update(ids).eq('id', orderId);
    if (idErr) console.warn('polar id update failed:', orderId, idErr);
  }

  // SEC-6: never finalize without a paid amount — null would skip the
  // underpay guard inside finalize_paid_order. Retry, not ACK: if no later
  // amount-bearing event arrives, a 200 here would strand a paid order as
  // pending forever (Polar stops redelivering).
  const paidCents = getPaidCents(data);
  if (paidCents == null) {
    console.warn('paid event missing amount — ask Polar to redeliver', eventType, orderId);
    return 'retry';
  }

  // Server-authoritative transition: verifies the paid amount covers the
  // order total, claims one-time keys atomically, records coupon usage.
  const { data: result, error } = await admin.rpc('finalize_paid_order', {
    p_order_id: orderId,
    p_paid_cents: paidCents,
  });
  if (error) {
    console.error('finalize_paid_order failed:', orderId, error);
    return 'retry';
  }
  if (result === 'paid' || result === 'already_paid') return 'ok';
  if (result === 'not_found') {
    // Money received but no order row — should be impossible now that
    // pending orders with a Polar session are superseded, never deleted.
    // Keep the full payload in logs for manual reconciliation/refund.
    console.error(
      'ORPHAN_PAID_RECEIPT: paid event with no order row — reconcile manually:',
      orderId,
      JSON.stringify(data).slice(0, 1000),
    );
    return 'terminal';
  }
  // Business rejections (underpay) — do not infinite-retry. ALERT_ tag → log-drain filter (OPS.md).
  console.error('ALERT_TERMINAL_FINALIZE:', orderId, result);
  return 'terminal';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('POLAR_WEBHOOK_SECRET');
  if (!secret) return new Response('Webhook secret not configured', { status: 500 });

  const body = await req.text();

  try {
    // Verify signature, then parse raw JSON — SDK camelCase transform drops metadata keys.
    validateEvent(body, headersFromRequest(req), secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.error('Webhook signature verification failed');
      return new Response('Invalid signature', { status: 401 });
    }
    console.error('Webhook verify error:', error);
    return new Response('Bad payload', { status: 400 });
  }

  let type = '';
  let data: LooseRecord = {};
  try {
    const payload = JSON.parse(body) as { type?: string; data?: LooseRecord };
    type = payload.type ?? '';
    data = payload.data ?? {};
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  const status = data.status;
  const isPaid =
    type === 'order.paid' ||
    (type === 'order.created' && status === 'paid') ||
    (type === 'checkout.updated' && status === 'succeeded');

  if (isPaid) {
    const outcome = await markOrderPaid(data, type);
    if (outcome === 'retry') {
      return new Response('finalize retry', { status: 500 });
    }
  }

  return new Response('ok', { status: 200 });
});
