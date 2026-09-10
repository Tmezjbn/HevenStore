-- Owner internal log: catalog product card + grid overhaul.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-18'::date,
  'بطاقات الكتالوج — سعر وسلة أوضح',
  'Catalog cards — clearer prices and cart buttons',
  'بطاقات المنتجات أوضح: عنوان أنظف، سعر أبرز، زر إضافة أوضح، وشبكة أوسع بطاقات.',
  'Product cards are clearer: cleaner titles, stronger prices, clearer add button, and a less cramped grid.',
  '',
  '',
  '{
    "what_ar": "بطاقات المتجر صارت أوضح: اسم أقصر، سعر أبرز، زر «أضف للسلة» أوضح، وتحذير المخزون المنخفض كشارة صغيرة. الشبكة ما عاد تضغط خمس بطاقات بصف واحد على الشاشات العريضة.",
    "what_en": "Store product cards are clearer: tighter titles, stronger prices, a solid Add to Cart button, and low-stock as a small chip. Wide screens no longer cram five cards in one row.",
    "why_ar": "العناوين الكبيرة والشبكة الضيقة كانت تخلّي البطاقة فوضوية ويصعب قراءة السعر والضغط على الشراء.",
    "why_en": "Huge titles and a cramped five-column grid made cards noisy and made price and buy harder to scan.",
    "how_ar": "افتح صفحة الألعاب أو الرئيسية — نفس شكل البطاقة في كل الكتالوج.",
    "how_en": "Open Games or Home — the same card style across the catalog.",
    "benefits_ar": "تصفّح أسرع، وقرار شراء أوضح.",
    "benefits_en": "Faster browsing and a clearer buy decision."
  }'::jsonb,
  1230
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Catalog cards — clearer prices and cart buttons'
);
