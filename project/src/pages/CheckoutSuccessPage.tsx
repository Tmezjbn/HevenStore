import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Clock, Copy, Check, KeyRound, XCircle, PackageSearch, ArrowRight, ShoppingBag } from 'lucide-react';
import { track } from '@databuddy/sdk/react';
import { shouldTrackAnalytics } from '../lib/analyticsConsent';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../stores/cartStore';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { fulfillmentDisplay, parseKeyUnits } from '../lib/fulfillment';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { parseProductTypesJson, productTypeLabel } from '../lib/productTypes';

type PaymentState = 'checking' | 'paid' | 'processing' | 'missing' | 'failed';

interface FulfillmentItem {
  product_id: string;
  name: string;
  name_ar: string | null;
  product_type: string;
  quantity: number;
  content: string | null;
  /** Newline-joined one-time keys claimed for this line (key-pool products). */
  keys: string | null;
  /** Per-key content + optional details override from get_order_fulfillment. */
  key_units?: unknown;
}

/**
 * Landing page after checkout (Polar hosted or built-in). Polls until the
 * webhook marks the order paid, then shows the purchased product details
 * (account credentials / gift card / code) via the secure RPC.
 */
export default function CheckoutSuccessPage() {
  const { t, lang, contentDir } = useI18n();
  const { settings } = useSiteSettings();
  const typeCustoms = parseProductTypesJson(settings.product_types_json);
  usePageMeta({ title: t('نتيجة الدفع', 'Checkout result'), noindex: true });
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const [state, setState] = useState<PaymentState>('checking');
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pollKey, setPollKey] = useState(0);

  useEffect(() => {
    // No order reference: never fake a success screen.
    if (!orderId) {
      setState('missing');
      return;
    }
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, order_number')
        .eq('id', orderId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.order_number) setOrderNumber(data.order_number);
      if (data?.status === 'paid') {
        setState('paid');
        // Drop only lines from this order — never wipe a later cart on revisit.
        const { data: fulfillment } = await supabase.rpc('get_order_fulfillment', {
          p_order_id: orderId,
        });
        if (!cancelled && Array.isArray(fulfillment)) {
          const rows = fulfillment as FulfillmentItem[];
          setItems(rows);
          const bought = new Set(rows.map((row) => row.product_id).filter(Boolean));
          const { items, removeItem, clearCart } = useCartStore.getState();
          for (const line of items) {
            if (bought.has(line.product.id)) removeItem(line.product.id);
          }
          if (useCartStore.getState().items.length === 0) clearCart();
        }
        if (shouldTrackAnalytics()) {
          track('purchase_completed', {
            order_id: orderId,
          });
        }
        return;
      }
      // Order not visible (bad id / not the caller's order) or terminally
      // unsuccessful — say so instead of spinning forever.
      if (!data) {
        setState('missing');
        return;
      }
      if (data.status === 'failed' || data.status === 'cancelled' || data.status === 'refunded') {
        setState('failed');
        return;
      }
      attempts += 1;
      if (attempts >= 45) {
        setState('processing');
        return;
      }
      timer = setTimeout(poll, 2000);
    };

    setState('checking');
    setOrderNumber(null);
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, pollKey]);

  const checkAgain = () => setPollKey((k) => k + 1);

  const copyContent = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — user can select manually.
    }
  };

  const delivered = items.filter((i) => i.content || i.keys || parseKeyUnits(i.key_units));

  const displayCode = orderNumber || orderId;
  const orderChip =
    displayCode ? (
      <button
        type="button"
        className="checkout-success__order-id"
        onClick={() => copyContent('order-id', displayCode)}
        title={displayCode}
        aria-label={
          copied === 'order-id'
            ? t('تم نسخ رقم الطلب', 'Order number copied')
            : t('نسخ رقم الطلب', 'Copy order number')
        }
      >
        <span className="checkout-success__order-id-label">{t('رقم الطلب', 'Order number')}</span>
        <span className="checkout-success__order-id-value font-mono tabular-nums" dir="ltr">
          {displayCode}
        </span>
        {copied === 'order-id' ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
      </button>
    ) : null;

  return (
    <div className="checkout-success" data-state={state}>
      <div className="checkout-success__atmosphere" aria-hidden />
      <div className="checkout-success__shell" dir={contentDir} aria-live="polite">
        {state === 'checking' && (
          <div className="checkout-success__panel checkout-success__panel--checking">
            <div className="checkout-success__mark" aria-hidden>
              <Loader2 size={28} strokeWidth={2.25} className="checkout-success__spin" />
            </div>
            <h1 className="checkout-success__title text-wrap-balance">
              {t('جارٍ تأكيد الدفع…', 'Confirming payment…')}
            </h1>
            <p className="checkout-success__lede text-pretty">
              {t('نؤكد الدفع — لحظة واحدةً.', 'Confirming with the vault — one moment.')}
            </p>
            {orderChip}
            <div className="checkout-success__pulse-bar" aria-hidden>
              <span />
            </div>
          </div>
        )}

        {state === 'paid' && (
          <div className="checkout-success__panel checkout-success__panel--paid">
            <div className="checkout-success__mark checkout-success__mark--ok" aria-hidden>
              <CheckCircle2 size={30} strokeWidth={2.25} />
            </div>
            <h1 className="checkout-success__title text-wrap-balance">
              {t('الدفع تم', 'Payment confirmed')}
            </h1>
            <p className="checkout-success__lede text-pretty">
              {t('طلبك في الخزنة — التفاصيل أدناه.', 'Your order is in the vault — details below.')}
            </p>
            {orderChip}

            {delivered.length > 0 ? (
              <div className="checkout-success__deliveries">
                <div className="checkout-success__deliveries-head">
                  <KeyRound size={15} strokeWidth={2.25} aria-hidden />
                  <h2 className="checkout-success__deliveries-title">
                    {t('تسليمك', 'Your delivery')}
                  </h2>
                  <span className="checkout-success__deliveries-count tabular-nums">
                    {delivered.length}
                  </span>
                </div>
                <ul className="checkout-success__list">
                  {delivered.map((item, i) => {
                    const text = fulfillmentDisplay(
                      item.content,
                      item.keys,
                      parseKeyUnits(item.key_units),
                    );
                    const [ar, en] = productTypeLabel(item.product_type, typeCustoms);
                    const copyKey = item.product_id;
                    const done = copied === copyKey;
                    return (
                      <li
                        key={item.product_id}
                        className="checkout-success__vault"
                        style={{ ['--i' as string]: i }}
                      >
                        <div className="checkout-success__vault-head">
                          <div className="checkout-success__vault-meta">
                            <p className="checkout-success__vault-name">
                              {lang === 'ar' ? item.name_ar || item.name : item.name}
                            </p>
                            <span className="checkout-success__vault-type">{t(ar, en)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyContent(copyKey, text)}
                            className={`checkout-success__copy${done ? ' is-done' : ''}`}
                          >
                            {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                            {done ? t('تم النسخ', 'Copied') : t('نسخ', 'Copy')}
                          </button>
                        </div>
                        <pre className="checkout-success__secret" dir="ltr">
                          {text}
                        </pre>
                      </li>
                    );
                  })}
                </ul>
                <p className="checkout-success__save-hint text-pretty">
                  {t(
                    'احفظ هذه التفاصيل — متاحة أيضاً في طلباتك.',
                    'Save these — also available on your orders page.',
                  )}
                </p>
              </div>
            ) : (
              <div className="checkout-success__pending-delivery">
                <Clock size={18} aria-hidden />
                <p className="text-pretty">
                  {t(
                    'الدفع مؤكد — التفاصيل تظهر هنا فور جاهزيتها، أو في طلباتك.',
                    'Payment confirmed — delivery details appear here when ready, or on your orders.',
                  )}
                </p>
              </div>
            )}

            <div className="checkout-success__actions">
              <Link to="/dashboard/orders" className="btn btn-primary gap-2">
                {t('طلباتي', 'My orders')}
                <ArrowRight size={16} aria-hidden className="checkout-success__rtl-flip" />
              </Link>
              <Link to="/store" className="btn btn-ghost gap-2">
                <ShoppingBag size={16} aria-hidden />
                {t('المتجر', 'Store')}
              </Link>
            </div>
            <Link to="/dashboard/support" className="link link-hover text-sm text-base-content/70">
              {t('المساعدة والتواصل', 'Help & support')}
            </Link>
          </div>
        )}

        {state === 'processing' && (
          <div className="checkout-success__panel checkout-success__panel--wait">
            <div className="checkout-success__mark checkout-success__mark--warn" aria-hidden>
              <Clock size={28} strokeWidth={2.25} />
            </div>
            <h1 className="checkout-success__title text-wrap-balance">
              {t('الدفع قيد المعالجة', 'Payment processing')}
            </h1>
            <p className="checkout-success__lede text-pretty">
              {t(
                'استلمنا الطلب — التأكيد خلال دقائق. تحقق من طلباتك.',
                'We have the order — confirmation in minutes. Check your orders.',
              )}
            </p>
            {orderChip}
            <div className="checkout-success__actions">
              <Link to="/dashboard/orders" className="btn btn-primary">
                {t('طلباتي', 'My orders')}
              </Link>
              <button type="button" onClick={checkAgain} className="btn btn-ghost">
                {t('تحقق مرة أخرى', 'Check again')}
              </button>
            </div>
            <Link to="/dashboard/support" className="link link-hover text-sm text-base-content/70">
              {t('المساعدة والتواصل', 'Help & support')}
            </Link>
          </div>
        )}

        {state === 'missing' && (
          <div className="checkout-success__panel checkout-success__panel--missing">
            <div className="checkout-success__mark checkout-success__mark--muted" aria-hidden>
              <PackageSearch size={28} strokeWidth={2.25} />
            </div>
            <h1 className="checkout-success__title text-wrap-balance">
              {t('لا يوجد طلب', 'No order found')}
            </h1>
            <p className="checkout-success__lede text-pretty">
              {t(
                'لا طلب مرتبط بهذه الصفحة. تحقق من طلباتك أو تابع التسوق.',
                'No order linked here. Check your orders or keep shopping.',
              )}
            </p>
            <div className="checkout-success__actions">
              <Link to="/dashboard/orders" className="btn btn-primary">
                {t('طلباتي', 'My orders')}
              </Link>
              <Link to="/store" className="btn btn-ghost">
                {t('المتجر', 'Store')}
              </Link>
            </div>
          </div>
        )}

        {state === 'failed' && (
          <div className="checkout-success__panel checkout-success__panel--fail">
            <div className="checkout-success__mark checkout-success__mark--err" aria-hidden>
              <XCircle size={28} strokeWidth={2.25} />
            </div>
            <h1 className="checkout-success__title text-wrap-balance">
              {t('لم يكتمل الدفع', 'Payment not completed')}
            </h1>
            <p className="checkout-success__lede text-pretty">
              {t(
                'الطلب لم يكتمل — لا خصم إن فشل الدفع. أعد المحاولة من السلة.',
                'Order incomplete — nothing owed if payment failed. Try again from the cart.',
              )}
            </p>
            {orderChip}
            <div className="checkout-success__actions">
              <Link to="/cart" className="btn btn-primary">
                {t('العودة إلى السلة', 'Back to cart')}
              </Link>
              <Link to="/dashboard/orders" className="btn btn-ghost">
                {t('طلباتي', 'My orders')}
              </Link>
            </div>
            <Link to="/dashboard/support" className="link link-hover text-sm text-base-content/70">
              {t('المساعدة والتواصل', 'Help & support')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
