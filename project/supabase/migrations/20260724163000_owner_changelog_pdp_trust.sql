-- Owner internal log: product page shows delivery trust + low stock near Add to Cart.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-24'::date,
  'صفحة المنتج تعرض التسليم والمخزون المنخفض',
  'Product page shows delivery and low stock',
  'تحت زر الإضافة للسلة يظهر التسليم والدفع الآمن والدعم، ومع المخزون القليل يظهر «يتبقى N فقط» مثل البطاقات.',
  'Under Add to Cart shoppers see delivery, secure payment, and support — and “Only N left” when stock is low, same as the cards.',
  '',
  '',
  '{
    "what_ar": "صفحة المنتج صارت تعرض تحت زر الإضافة للسلة: وقت التسليم، دفع آمن عبر Polar، ورابط مساعدة. وإذا الكمية قليلة يظهر «يتبقى N فقط» بنفس عبارة بطاقات المتجر.",
    "what_en": "The product page now shows under Add to Cart: delivery timing, secure payment via Polar, and a help link. When stock is low it shows “Only N left” — the same phrase as store cards.",
    "why_ar": "الزبون يقرر الشراء من صفحة المنتج؛ لازم يشوف إثبات التسليم والأمان قبل السلة، ويعرف لو الكمية قليلة.",
    "why_en": "Shoppers decide on the product page; they need delivery and payment proof before the cart, and a clear cue when stock is running low.",
    "how_ar": "تلقائي بعد التحديث — افتح أي منتج متوفر. لو المخزون ٥ أو أقل تظهر عبارة الكمية القليلة.",
    "how_en": "Automatic after deploy — open any in-stock product. If stock is 5 or less, the low-stock line appears.",
    "benefits_ar": "ثقة أوضح عند الشراء، ونفس لغة السلة والبطاقات بدون لبس.",
    "benefits_en": "Clearer trust at buy time, and the same language as cart and cards — no mixed signals."
  }'::jsonb,
  'small',
  1784937700000
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Product page shows delivery and low stock'
);
