import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  Loader2,
  X,
  Package,
  Zap,
  Shield,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { validateCoupon, couponDiscount } from '../lib/coupons';
import { startPolarCheckout } from '../lib/startPolarCheckout';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { useProductsByIds } from '../hooks/useCatalog';
import ProductMedia from '../components/ui/ProductMedia';
import { cartDeliveryLabel } from '../lib/productDelivery';

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function CartPage() {
  const { t, lang, contentDir } = useI18n();
  const navigate = useNavigate();
  usePageMeta({ title: t('السلة', 'Cart'), noindex: true });
  const { items, removeItem, updateQuantity, total, coupon, setCoupon, hydrateFromLive } =
    useCartStore();
  const user = useAuthStore((s) => s.user);
  const cartIds = items.map((i) => i.product.id);
  const { data: liveCart, isSuccess: liveReady } = useProductsByIds(cartIds);
  useEffect(() => {
    if (!liveReady || cartIds.length === 0) return;
    hydrateFromLive(liveCart ?? []);
  }, [liveReady, liveCart, cartIds.length, hydrateFromLive]);

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const subtotal = total();
  const discount = couponDiscount(coupon, subtotal);
  const finalTotal = Math.max(0, subtotal - discount);
  const canApply = couponCode.trim().length > 0;
  const delivery = cartDeliveryLabel(t, items, lang);

  const applyCoupon = async () => {
    if (!canApply || couponLoading) return;
    setCouponError('');
    setCouponLoading(true);
    const result = await validateCoupon(couponCode, subtotal);
    if ('coupon' in result) {
      setCoupon(result.coupon);
      setCouponCode('');
    } else {
      setCouponError(t(result.errorAr, result.errorEn));
    }
    setCouponLoading(false);
  };

  const completePayment = async () => {
    if (payLoading) return;
    if (!user) {
      navigate('/auth/login?next=/cart');
      return;
    }
    setPayError('');
    setPayLoading(true);
    try {
      // Re-check coupon at pay time (expiry / cap / min can change while cart sits).
      if (coupon) {
        const fresh = await validateCoupon(coupon.code, subtotal);
        if (!('coupon' in fresh)) {
          setCoupon(null);
          setPayError(t(fresh.errorAr, fresh.errorEn));
          setPayLoading(false);
          return;
        }
        setCoupon(fresh.coupon);
      }
      const result = await startPolarCheckout(items, useCartStore.getState().coupon, t);
      if (!result.ok) {
        if (result.clearCoupon) setCoupon(null);
        setPayError(result.error);
        setPayLoading(false);
      }
      // ok → window.location to Polar; leave spinner until unload
    } catch {
      setPayError(t('حدث خطأ أثناء معالجة الطلب. حاول مجدداً.', 'An error occurred. Please try again.'));
      setPayLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-base-100 pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center max-w-sm" dir={contentDir}>
          <ShoppingCart size={56} className="text-base-content/35 mx-auto mb-4" aria-hidden />
          <h1 className="text-xl font-bold mb-2 text-balance">
            {t('سلة التسوق فارغة', 'Your cart is empty')}
          </h1>
          <p className="text-sm text-base-content/70 mb-2 text-pretty">
            {t(
              'تصفح المتجر وأضف ألعاباً أو اشتراكات أو بطاقات هدايا.',
              'Browse the store and add games, subscriptions, or gift cards.',
            )}
          </p>
          <p className="text-xs text-base-content/70 mb-6 flex items-center justify-center gap-1.5">
            <Zap size={14} className="text-success shrink-0" aria-hidden />
            {t('تسليم فوري بعد الدفع', 'Instant delivery after payment')}
          </p>
          <Link to="/store" className="btn btn-primary">
            {t('تصفح المتجر', 'Browse Products')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 pt-20 pb-28 lg:pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8" dir={contentDir}>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <h1 className="text-2xl font-bold text-balance">{t('سلة التسوق', 'Shopping Cart')}</h1>
          <Link
            to="/store"
            className="link link-hover text-sm text-base-content/70 inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} className="rtl:rotate-180" aria-hidden />
            {t('متابعة التسوق', 'Continue shopping')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => {
              const name =
                lang === 'ar' ? item.product.name_ar || item.product.name : item.product.name;
              return (
                <div
                  key={item.product.id}
                  className="card card-side bg-base-200 border border-base-300 overflow-hidden"
                >
                  <Link
                    to={`/product/${item.product.slug}`}
                    className="relative w-28 sm:w-32 shrink-0 self-stretch bg-base-300/50"
                    aria-label={name}
                  >
                    {item.product.thumbnail_url ? (
                      <ProductMedia
                        src={item.product.thumbnail_url}
                        alt={name}
                        className="absolute inset-0 h-full w-full object-cover"
                        width={256}
                        sizes="128px"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-base-content/35">
                        <Package size={28} strokeWidth={1.5} aria-hidden />
                      </span>
                    )}
                  </Link>
                  <div className="card-body p-4 flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${item.product.slug}`}
                        className="font-semibold text-lg truncate block hover:text-primary"
                      >
                        <h2 className="text-lg font-semibold truncate">{name}</h2>
                      </Link>
                      <p className="text-base-content/60 text-base mt-1 tabular-nums">
                        {money(item.product.price)}
                      </p>
                      <p className="text-success font-bold text-xl tabular-nums">
                        {money(item.product.price * item.quantity)}
                      </p>
                      <div className="join mt-3">
                        <button
                          type="button"
                          className="btn btn-sm join-item min-h-12 min-w-12 px-0 text-base"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          aria-label={t('تقليل الكمية', 'Decrease quantity')}
                        >
                          <Minus size={18} />
                        </button>
                        <span
                          className="btn btn-sm join-item no-animation pointer-events-none min-h-12 min-w-12 text-base font-semibold tabular-nums"
                          aria-live="polite"
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm join-item min-h-12 min-w-12 px-0 text-base"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          aria-label={t('زيادة الكمية', 'Increase quantity')}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="btn btn-ghost btn-sm text-error min-h-11 min-w-11 px-0"
                        aria-label={t('إزالة من السلة', 'Remove from cart')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card bg-base-200 border border-base-300 sticky top-24 h-fit">
            <div className="card-body gap-3">
              <h2 className="card-title text-base">{t('ملخص الطلب', 'Order Summary')}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-base-content/70">{t('المجموع الفرعي', 'Subtotal')}</span>
                  <span className="tabular-nums">{money(subtotal)}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between gap-3 text-success">
                    <span className="flex items-center gap-1 min-w-0">
                      <Tag size={13} aria-hidden />
                      <span className="truncate">{coupon.code}</span>
                      <button
                        type="button"
                        onClick={() => setCoupon(null)}
                        aria-label={t('إزالة كود الخصم', 'Remove coupon')}
                        className="btn btn-ghost btn-xs min-h-8 min-w-8 px-0 opacity-70 hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </span>
                    <span className="tabular-nums shrink-0">-{money(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-base-content/70">{t('التسليم', 'Delivery')}</span>
                  <span
                    className={`font-medium ${delivery.isInstant ? 'text-success' : 'text-base-content'}`}
                  >
                    {delivery.label}
                  </span>
                </div>
              </div>

              {!coupon && (
                <div className="flex flex-col gap-1.5 pt-1">
                  {/* Logical join — DaisyUI .join uses physical radius + zeros disabled border-inline-end (outer edge in RTL) */}
                  <div className="cart-coupon-field">
                    <label className="input input-bordered flex items-center gap-2">
                      <Tag size={14} className="text-base-content/50 shrink-0" aria-hidden />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            applyCoupon();
                          }
                        }}
                        placeholder={t('أدخل كود الخصم', 'Coupon code')}
                        aria-label={t('أدخل كود الخصم', 'Coupon code')}
                        className="grow bg-transparent uppercase min-w-0"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !canApply}
                      className={`btn cart-coupon-apply ${canApply ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {couponLoading ? (
                        <Loader2 size={14} className="animate-spin" aria-hidden />
                      ) : (
                        t('تفعيل الكود', 'Apply')
                      )}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-error text-xs" role="alert">
                      {couponError}
                    </p>
                  )}
                </div>
              )}

              <div className="divider my-0" />
              <div className="hidden lg:flex justify-between items-center gap-3">
                <span className="font-semibold">{t('الإجمالي', 'Total')}</span>
                <span className="text-xl font-black tabular-nums">{money(finalTotal)}</span>
              </div>

              {!user && (
                <div
                  className="rounded-box border border-base-300 bg-base-100/60 px-3 py-3 text-sm space-y-2 hidden lg:block"
                  role="status"
                >
                  <p className="text-pretty text-base-content/80">
                    {t(
                      'سجّل الدخول لإتمام الدفع الآمن. سلة التسوق تبقى كما هي.',
                      'Sign in to complete secure checkout. Your cart stays as-is.',
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/auth/login?next=/cart" className="btn btn-primary btn-sm">
                      {t('تسجيل الدخول', 'Sign in')}
                    </Link>
                    <Link to="/auth/register?next=/cart" className="btn btn-ghost btn-sm">
                      {t('إنشاء حساب', 'Create account')}
                    </Link>
                  </div>
                </div>
              )}

              {payError && (
                <div role="alert" className="alert alert-error text-sm py-2 hidden lg:flex">
                  {payError}
                </div>
              )}

              <button
                type="button"
                onClick={completePayment}
                disabled={payLoading}
                className="btn btn-primary w-full min-h-12 hidden lg:flex gap-2"
              >
                {payLoading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CreditCard size={16} aria-hidden />}
                {user
                  ? t('إتمام الدفع', 'Complete Payment')
                  : t('تسجيل الدخول للدفع', 'Sign in to pay')}
              </button>

              <ul className="text-xs text-base-content/70 space-y-1.5 mt-1">
                <li className="flex items-start gap-2">
                  <Zap size={14} className="text-success shrink-0 mt-0.5" aria-hidden />
                  <span>
                    {delivery.isInstant
                      ? t('تسليم فوري بعد الدفع', 'Instant delivery after payment')
                      : t(`التسليم: ${delivery.label}`, `Delivery: ${delivery.label}`)}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={14} className="text-success shrink-0 mt-0.5" aria-hidden />
                  <span>
                    {t('دفع آمن عبر Polar', 'Secure payment via Polar')}
                  </span>
                </li>
                <li>
                  <Link
                    to={user ? '/dashboard/support' : '/auth/login?next=/dashboard/support'}
                    className="link link-hover text-base-content/70"
                  >
                    {t('المساعدة والتواصل', 'Help & support')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile thumb-zone pay */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-base-300 bg-base-200/95 backdrop-blur-sm px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 max-w-5xl mx-auto" dir={contentDir}>
          {!user && (
            <p className="text-xs text-base-content/70 text-pretty">
              {t(
                'سجّل الدخول لإتمام الدفع. السلة تبقى كما هي.',
                'Sign in to pay. Your cart stays as-is.',
              )}{' '}
              <Link to="/auth/register?next=/cart" className="link link-primary">
                {t('حساب جديد', 'New account')}
              </Link>
            </p>
          )}
          {payError && (
            <div role="alert" className="alert alert-error text-xs py-1.5">
              {payError}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-xs text-base-content/70 leading-none mb-1">
                {t('الإجمالي', 'Total')}
              </p>
              <p className="font-black text-lg tabular-nums leading-none">{money(finalTotal)}</p>
            </div>
            <button
              type="button"
              onClick={completePayment}
              disabled={payLoading}
              className="btn btn-primary flex-1 min-h-12 gap-2"
            >
              {payLoading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CreditCard size={16} aria-hidden />}
              {user
                ? t('إتمام الدفع', 'Complete Payment')
                : t('تسجيل الدخول للدفع', 'Sign in to pay')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
