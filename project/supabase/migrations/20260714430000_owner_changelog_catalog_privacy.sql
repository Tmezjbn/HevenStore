-- Owner internal log: lighter catalog, privacy opt-in, coupon cents.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'كتالوج أخف وتحليلات بموافقة فقط',
  'Lighter catalog and analytics only with consent',
  'المتجر يحمّل بيانات المنتجات بشكل أخف، التحليلات ما تشتغل إلا بعد قبول صريح (حتى لو طفيت رسالة الموافقة)، وخصم الكوبون في السلة يطابق الخادم للسنت.',
  'The store loads product data lighter, analytics only run after an explicit accept (even if you hide the consent message), and cart coupon math matches the server to the cent.',
  '',
  '',
  '{
    "what_ar": "صفحات المتجر تطلب أعمدة المنتج اللي تحتاجها بس. إخفاء بانر الخصوصية ما يعني تشغيل التتبع تلقائي. عرض الخصم في السلة أدق.",
    "what_en": "Store pages fetch only the product fields they need. Hiding the privacy banner does not turn tracking on by itself. Cart discount display is more accurate.",
    "why_ar": "جلب كل الأعمدة يبطّئ المتجر. التتبع بدون موافقة مشكلة خصوصية. فرق السنت يخلّي الزبون يشوف رقم غير اللي يُدفع.",
    "why_en": "Fetching every column slows the store. Tracking without consent is a privacy risk. A one-cent gap confuses shoppers at checkout.",
    "how_ar": "تلقائي بعد النشر. فعّل التحليلات عبر قبول الزائر أو تفضيلات الحساب.",
    "how_en": "Automatic after deploy. Analytics need visitor accept or account prefs.",
    "benefits_ar": "متجر أسرع، خصوصية أوضح، أرقام خصم أوثق.",
    "benefits_en": "Faster store, clearer privacy, trustworthy discount numbers."
  }'::jsonb,
  1100
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Lighter catalog and analytics only with consent'
);
