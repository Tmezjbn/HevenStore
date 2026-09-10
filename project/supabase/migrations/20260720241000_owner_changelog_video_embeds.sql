-- Owner internal log: multi-embed showcase + ads/no-ads switch.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-20'::date,
  'ثلاثة فيديوهات عرض + نسخة بإعلانات',
  'Three showcase embeds + ads / no-ads',
  'تقدر تضيف حتى 3 روابط فيديو لكل منتج، ولكل رابط نسخة مع إعلانات ونسخة بدون، وتختار الافتراضي. الزائر يبدّل على صفحة المنتج.',
  'Each product can have up to 3 showcase embeds, each with an ads URL and a no-ads URL, plus a default you choose. Shoppers switch on the product page.',
  '',
  '',
  '{
    "what_ar": "محرر المنتج يقبل حتى 3 تضمينات فيديو، ولكل واحدة رابط مع إعلانات ورابط بدون. تختار أي تضمين وأي نسخة هي الافتراضية. في صفحة المنتج يظهر تبديل ومعاينات للفيديوهات المعبّأة.",
    "what_en": "Product editor accepts up to 3 video embeds; each has a with-ads and without-ads link. You pick which embed and which version is default. On the product page, shoppers get a toggle and thumbs for filled embeds.",
    "why_ar": "رابط واحد ما يكفي لما عندك أكثر من عرض، وبعض الزوار يفضّلون فيديو بدون إعلانات.",
    "why_en": "One link is not enough when you have several demos, and some shoppers prefer a no-ads stream.",
    "how_ar": "منتجات → عدّل → عرض المنتج → عبّي تضمين 1–3 واختر الافتراضي. على صفحة المنتج بدّل «مع إعلانات / بدون».",
    "how_en": "Products → Edit → Showcase → fill Embed 1–3 and set the default. On the product page, switch With ads / No ads.",
    "benefits_ar": "مرونة أكثر للدعم والإعلان، وتجربة أوضح للزائر.",
    "benefits_en": "More flexibility for support vs ads, clearer choice for the shopper."
  }'::jsonb,
  'small',
  1280
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Three showcase embeds + ads / no-ads'
);
