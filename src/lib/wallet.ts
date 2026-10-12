import { supabase } from './supabase';
import type { AppliedCoupon } from './coupons';
import type { CartItem } from '../types';

/**
 * Store wallet (non-withdrawable store credit).
 * Server is the only authority: balances move only through SECURITY DEFINER RPCs
 * (`create_wallet_topup`, `pay_order_with_wallet`, `admin_adjust_wallet`) and the
 * `nowpayments-webhook` edge fn (signature-verified). Client never writes wallet tables.
 */

export type WalletConfig = {
  enabled: boolean;
  minTopup: number;
  maxTopup: number;
};

export type WalletEntry = {
  id: string;
  amount: number;
  kind: 'topup' | 'purchase' | 'refund' | 'adjust';
  note: string | null;
  order_id: string | null;
  topup_id: string | null;
  created_at: string;
};

export type WalletTopup = {
  id: string;
  amount_usd: number;
  credited_usd: number | null;
  status: 'pending' | 'finished' | 'partially_paid' | 'failed' | 'expired';
  created_at: string;
};

/** Above this the owner sees a risk warning before raising the top-up limit. */
export const WALLET_SOFT_LIMIT_USD = 500;
/** Hard ceiling the DB also enforces for the configurable limit. */
export const WALLET_HARD_LIMIT_USD = 10000;

type TFn = (ar: string, en: string) => string;

const TOKEN_MESSAGES: Record<string, [string, string]> = {
  WALLET_DISABLED: ['المحفظة غير مفعّلة حالياً.', 'The wallet is not enabled right now.'],
  TOPUP_TOO_LOW: ['المبلغ أقل من الحد الأدنى للشحن.', 'Amount is below the minimum top-up.'],
  TOPUP_TOO_HIGH: ['المبلغ أعلى من الحد الأقصى للشحن.', 'Amount is above the maximum top-up.'],
  INSUFFICIENT_FUNDS: ['رصيد المحفظة غير كافٍ.', 'Not enough wallet balance.'],
  ORDER_NOT_PAYABLE: ['لا يمكن دفع هذا الطلب.', 'This order can no longer be paid.'],
  RATE_LIMITED: ['محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.', 'Too many attempts. Wait a minute and try again.'],
  OUT_OF_STOCK: ['نفدت كمية أحد المنتجات في سلتك.', 'An item in your cart is out of stock.'],
  PRODUCT_UNAVAILABLE: ['أحد المنتجات لم يعد متاحاً.', 'An item in your cart is no longer available.'],
  COUPON_INVALID: ['كود الخصم غير صالح.', 'Invalid coupon code.'],
  COUPON_EXPIRED: ['انتهت صلاحية كود الخصم.', 'This coupon has expired.'],
  COUPON_LIMIT: ['تم استنفاد كود الخصم.', 'This coupon has reached its usage limit.'],
  COUPON_MIN: ['لم تبلغ الحد الأدنى للطلب لهذا الكود.', 'Your order is below this coupon’s minimum.'],
  COUPON_USED: ['استخدمت هذا الكود من قبل.', 'You have already used this coupon.'],
  COUPON_BADGE: ['هذا الكود يتطلب شارة لا تملكها.', 'This coupon requires a badge you do not have.'],
  ACCOUNT_UNAVAILABLE: ['حسابك غير متاح حالياً.', 'Your account is currently unavailable.'],
};

export function walletErrorMessage(raw: string | undefined | null, t: TFn): string {
  const token = raw ?? '';
  const match = Object.keys(TOKEN_MESSAGES).find((k) => token.includes(k));
  return match
    ? t(TOKEN_MESSAGES[match][0], TOKEN_MESSAGES[match][1])
    : t('تعذّر إتمام العملية. حاول مجدداً.', 'Something went wrong. Please try again.');
}

/** Parse wallet settings from site_settings values (strings). */
export function parseWalletConfig(s: Record<string, string | undefined>): WalletConfig {
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  const minTopup = num(s.wallet_topup_min_usd, 5);
  const maxTopup = Math.min(num(s.wallet_topup_max_usd, WALLET_SOFT_LIMIT_USD), WALLET_HARD_LIMIT_USD);
  return { enabled: s.wallet_enabled === 'true', minTopup, maxTopup: Math.max(maxTopup, minTopup) };
}

export async function fetchWalletBalance(): Promise<number> {
  const { data, error } = await supabase.rpc('my_wallet_balance');
  if (error) throw error;
  return Number(data ?? 0);
}

export async function fetchWalletLedger(limit = 50): Promise<WalletEntry[]> {
  const { data, error } = await supabase
    .from('wallet_ledger')
    .select('id, amount, kind, note, order_id, topup_id, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as WalletEntry[];
}

export async function fetchWalletTopups(limit = 20): Promise<WalletTopup[]> {
  const { data, error } = await supabase
    .from('wallet_topups')
    .select('id, amount_usd, credited_usd, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    amount_usd: Number(r.amount_usd),
    credited_usd: r.credited_usd == null ? null : Number(r.credited_usd),
  })) as WalletTopup[];
}

/** Creates a pending top-up server-side and redirects to the provider's hosted invoice. */
export async function startWalletTopup(amount: number, t: TFn): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke('wallet-topup', { body: { amount } });
  if (!error && data?.url) {
    window.location.href = data.url;
    return { ok: true };
  }
  let reason = '';
  try {
    const body = await (error as { context?: Response })?.context?.json();
    reason = body?.error ?? '';
  } catch {
    /* no readable body */
  }
  if (reason === 'provider_not_configured') {
    return { ok: false, error: t('بوابة الشحن غير مهيأة. تواصل مع الإدارة.', 'Top-up gateway is not configured. Contact support.') };
  }
  return { ok: false, error: walletErrorMessage(reason, t) };
}

/** Server-priced order paid entirely from the wallet; returns the order id for the success page. */
export async function payCartWithWallet(
  items: CartItem[],
  coupon: AppliedCoupon | null,
  t: TFn,
): Promise<{ ok: true; orderId: string } | { ok: false; error: string; clearCoupon?: boolean }> {
  const { data: order, error: rpcErr } = await supabase.rpc('create_pending_order', {
    p_items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
    p_coupon_code: coupon?.code ?? null,
  });
  if (rpcErr || !order?.order_id) {
    const msg = rpcErr?.message ?? '';
    return { ok: false, clearCoupon: msg.includes('COUPON'), error: walletErrorMessage(msg, t) };
  }
  const { error } = await supabase.rpc('pay_order_with_wallet', { p_order_id: order.order_id });
  if (error) return { ok: false, error: walletErrorMessage(error.message, t) };
  return { ok: true, orderId: order.order_id as string };
}

/** Owner/admin only (enforced in SQL). Positive = credit, negative = debit. */
export async function adminAdjustWallet(userId: string, amount: number, note: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_adjust_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_note: note,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

/** Staff read of balances for a page of users. */
export async function fetchWalletBalances(userIds: string[]): Promise<Record<string, number>> {
  if (!userIds.length) return {};
  const { data, error } = await supabase.from('wallets').select('user_id, balance').in('user_id', userIds);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.user_id as string, Number(r.balance)]));
}
