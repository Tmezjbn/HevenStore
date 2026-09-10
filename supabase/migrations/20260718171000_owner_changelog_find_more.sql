-- Owner internal log: Find More products rail redesign.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-18'::date,
  'المزيد من الخزنة — اقتراحات أوضح',
  'More from the vault — clearer product suggestions',
  'قسم المزيد تحت المنتج صار بعنوان أوضح، أسهم تنقّل، وبطاقات أسهل للقراءة.',
  'The more-products block under a product has a clearer title, prev/next controls, and more readable tiles.',
  '',
  '',
  '{
    "what_ar": "قسم «المزيد» تحت صفحة المنتج تغيّر: عنوان أوضح، أسهم للأمام/الخلف، وبطاقات أوضح مع ظل خفيف على الاسم.",
    "what_en": "The “more products” block under a product page is clearer: stronger title, prev/next arrows, and tiles with a readable name scrim.",
    "why_ar": "القسم القديم كان يبان فاضي أو مشوّش، خصوصاً لما صورة المنتج ناقصة. الزبون يحتاج يشوف خيارات ثانية بسرعة.",
    "why_en": "The old block felt empty or messy, especially when a product image was missing. Shoppers need other options at a glance.",
    "how_ar": "افتح أي منتج → انزل لتحت → «المزيد من الخزنة». جرّب الأسهم أو الإيقاف.",
    "how_en": "Open any product → scroll down → “More from the vault.” Try the arrows or pause.",
    "benefits_ar": "اكتشاف أسهل لمنتجات ثانية، وأقل لخبطة بصرية.",
    "benefits_en": "Easier discovery of other products, less visual confusion."
  }'::jsonb,
  1220
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'More from the vault — clearer product suggestions'
);
