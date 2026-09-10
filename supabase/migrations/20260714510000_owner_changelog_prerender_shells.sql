-- Owner internal log: build-time HTML shells for share/SEO bots.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'مشاركة رابط منتج تظهر العنوان والصورة الصحيحة',
  'Sharing a product link shows the right title and image',
  'لما أحد يشارك رابط منتج (واتساب، تويتر، بحث)، يظهر عنوان المنتج وصورته الصحيحة بدل عنوان المتجر العام — حتى قبل ما تفتح الصفحة كاملة.',
  'When someone shares a product link (WhatsApp, Twitter, search), the product title and image show correctly instead of the generic store title — even before the full page loads.',
  '',
  '',
  '{
    "what_ar": "صفحات المنتجات والصفحات الثابتة صارت تحمل عنوان ووصف وصورة جاهزة في أول HTML.",
    "what_en": "Product pages and key store pages now ship with the right title, description, and image in the first HTML.",
    "why_ar": "كثير بوتات المشاركة ومحركات البحث ما تشغّل جافاسكربت — كانت تشوف عنوان المتجر العام فقط.",
    "why_en": "Many share bots and search crawlers do not run JavaScript — they only saw the generic store title.",
    "how_ar": "تلقائي مع كل نشر للموقع. ما تحتاج تسوي شيء يدوي للمنتجات النشطة.",
    "how_en": "Automatic on every site deploy. No manual step for active products.",
    "benefits_ar": "روابط أوضح عند المشاركة، ومظهر أقوى في نتائج البحث.",
    "benefits_en": "Clearer shared links and a stronger look in search results."
  }'::jsonb,
  1160
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Sharing a product link shows the right title and image'
);
