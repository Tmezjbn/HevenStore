import { supabase } from './supabase';

export interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export type CouponResult =
  | { coupon: AppliedCoupon }
  | { errorAr: string; errorEn: string };

export async function validateCoupon(codeRaw: string, subtotal: number): Promise<CouponResult> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { errorAr: 'أدخل كود الخصم', errorEn: 'Enter a coupon code' };

  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, min_order_amount, max_uses, uses_count, is_active, expires_at, required_badge_id')
      .eq('code', code)
      .maybeSingle();

    if (error || !data || !data.is_active) {
      return { errorAr: 'كود الخصم الذي أدخلته غير صالح', errorEn: 'Invalid coupon code' };
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { errorAr: 'انتهت صلاحية هذا الكود', errorEn: 'This coupon has expired' };
    }
    if (data.max_uses && data.uses_count >= data.max_uses) {
      return { errorAr: 'تم استنفاد هذا الكود', errorEn: 'This coupon has reached its usage limit' };
    }
    if (data.min_order_amount && subtotal < data.min_order_amount) {
      return {
        errorAr: `الحد الأدنى للطلب $${data.min_order_amount}`,
        errorEn: `Minimum order amount is $${data.min_order_amount}`,
      };
    }

    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;

    if (data.required_badge_id) {
      if (!uid) {
        return {
          errorAr: 'سجّل الدخول لاستخدام هذا الكود',
          errorEn: 'Sign in to use this coupon',
        };
      }
      const { data: ub } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', uid)
        .eq('badge_id', data.required_badge_id)
        .maybeSingle();
      if (!ub) {
        return {
          errorAr: 'هذا الكود يتطلب شارة لا تملكها',
          errorEn: 'This coupon requires a badge you do not have',
        };
      }
    }

    // Mirror create_pending_order COUPON_USED (paid usage only).
    if (uid) {
      const { data: usages } = await supabase
        .from('coupon_usages')
        .select('id, orders!inner(status)')
        .eq('coupon_id', data.id)
        .eq('user_id', uid)
        .eq('orders.status', 'paid')
        .limit(1);
      if (usages && usages.length > 0) {
        return {
          errorAr: 'استخدمت هذا الكود مسبقاً',
          errorEn: 'You already used this coupon',
        };
      }
    }

    return {
      coupon: {
        id: data.id,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
      },
    };
  } catch {
    return { errorAr: 'تعذر التحقق من الكود', errorEn: 'Could not validate the coupon' };
  }
}

export function couponDiscount(coupon: AppliedCoupon | null, subtotal: number): number {
  if (!coupon) return 0;
  // Mirror create_pending_order: round(..., 2) for percentage; LEAST for fixed.
  const raw =
    coupon.discount_type === 'percentage'
      ? (subtotal * coupon.discount_value) / 100
      : Math.min(coupon.discount_value, subtotal);
  return Math.round(raw * 100) / 100;
}
