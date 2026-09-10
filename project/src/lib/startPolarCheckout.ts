import { supabase } from './supabase';
import type { AppliedCoupon } from './coupons';
import type { CartItem } from '../types';

const TOKEN_MESSAGES: Record<string, [string, string]> = {
  OUT_OF_STOCK: ['نفدت كمية أحد المنتجات في سلتك.', 'An item in your cart is out of stock.'],
  PRODUCT_UNAVAILABLE: ['أحد المنتجات لم يعد متاحاً.', 'An item in your cart is no longer available.'],
  COUPON_INVALID: ['كود الخصم غير صالح.', 'Invalid coupon code.'],
  COUPON_EXPIRED: ['انتهت صلاحية كود الخصم.', 'This coupon has expired.'],
  COUPON_LIMIT: ['تم استنفاد كود الخصم.', 'This coupon has reached its usage limit.'],
  COUPON_MIN: ['لم تبلغ الحد الأدنى للطلب لهذا الكود.', 'Your order is below this coupon’s minimum.'],
  COUPON_USED: ['استخدمت هذا الكود من قبل.', 'You have already used this coupon.'],
  COUPON_BADGE: ['هذا الكود يتطلب شارة لا تملكها.', 'This coupon requires a badge you do not have.'],
  ACCOUNT_UNAVAILABLE: ['حسابك غير متاح حالياً.', 'Your account is currently unavailable.'],
  AMOUNT_TOO_LOW: [
    'الحد الأدنى للدفع هو 0.50$. أضف منتجات بسعر حقيقي أو أزل كوبون يصفّر المجموع.',
    'Minimum payment is $0.50. Add products with a real price, or remove a coupon that zeros the total.',
  ],
  RATE_LIMITED: [
    'محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.',
    'Too many attempts. Wait a minute and try again.',
  ],
};

type TFn = (ar: string, en: string) => string;

/** Server-authoritative pending order → Polar hosted checkout. Cart clears on success page only. */
export async function startPolarCheckout(
  items: CartItem[],
  coupon: AppliedCoupon | null,
  t: TFn,
): Promise<{ ok: true } | { ok: false; error: string; clearCoupon?: boolean }> {
  const { data: order, error: rpcErr } = await supabase.rpc('create_pending_order', {
    p_items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
    p_coupon_code: coupon?.code ?? null,
  });

  if (rpcErr || !order?.order_id) {
    const token = rpcErr?.message ?? '';
    const match = Object.keys(TOKEN_MESSAGES).find((k) => token.includes(k));
    return {
      ok: false,
      clearCoupon: Boolean(match?.startsWith('COUPON')),
      error: match
        ? t(TOKEN_MESSAGES[match][0], TOKEN_MESSAGES[match][1])
        : t('تعذر إنشاء الطلب. حاول مجدداً.', 'Could not create the order. Please try again.'),
    };
  }

  const { data: fn, error: fnErr } = await supabase.functions.invoke('polar-checkout', {
    body: { order_id: order.order_id },
  });
  if (!fnErr && fn?.url) {
    window.location.href = fn.url;
    return { ok: true };
  }

  let reason = '';
  try {
    const body = await (fnErr as { context?: Response })?.context?.json();
    reason = body?.error ?? '';
  } catch {
    /* no readable body */
  }
  console.warn('Polar checkout failed:', reason || fnErr);

  const errorMessages: Record<string, string> = {
    invalid_amount: t(
      'الحد الأدنى للدفع هو 0.50$. أضف منتجات بسعر حقيقي.',
      'Minimum payment is $0.50. Add products with a real price.',
    ),
    polar_not_configured: t(
      'بوابة الدفع غير مهيأة. تواصل مع الإدارة.',
      'Payment gateway is not configured. Contact support.',
    ),
    polar_error: t(
      'فشل إنشاء جلسة الدفع. حاول لاحقاً.',
      'Could not start checkout session. Try again later.',
    ),
  };
  return {
    ok: false,
    error:
      errorMessages[reason] ??
      t(
        'الدفع غير متاح حالياً. حاول لاحقاً أو تواصل معنا.',
        'Payment is unavailable right now. Try again later or contact us.',
      ),
  };
}
