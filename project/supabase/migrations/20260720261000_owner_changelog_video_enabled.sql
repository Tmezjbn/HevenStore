-- Owner internal log: showcase video opt-in toggle.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-20'::date,
  'فيديو العرض اختياري (افتراضي مطفأ)',
  'Showcase video is opt-in (off by default)',
  'تقدر تشغّل أو توقف فيديو العرض لكل منتج. الافتراضي مطفأ عشان ما تنفتح مواقع بث بإعلانات ثقيلة على الخصوصية. المنتجات اللي عندها فيديو من قبل تبقى شغّالة.',
  'You can turn showcase video on or off per product. Default is off so staff are not forced into embed hosts with invasive ads. Products that already had a video stay on.',
  '',
  '',
  '{
    "what_ar": "في تعديل المنتج → الوسائط → عرض المنتج، فيه مفتاح «إظهار فيديو العرض». وهو مطفأ للمنتجات الجديدة. لما تشغّله يظهر الفيديو للزبون؛ لما تطفيه يبقى الإعداد محفوظ بس ما يظهر في المتجر.",
    "what_en": "In product edit → Media → Showcase there is a “Show showcase video” switch. New products start off. When on, shoppers see the video; when off, your links stay saved but the storefront shows images only.",
    "why_ar": "بعض روابط التضمين تجيب إعلانات تتبّع — نبي ما تشتغل إلا لما تختار أنت.",
    "why_en": "Some embed hosts serve tracking-heavy ads — we only load them when you choose to.",
    "how_ar": "منتجات → عدّل → الوسائط → عرض المنتج → شغّل «إظهار فيديو العرض» بعد ما تجهز الروابط. احفظ المنتج.",
    "how_en": "Products → Edit → Media → Showcase → turn on “Show showcase video” after your links are ready. Save the product.",
    "benefits_ar": "تحكم أوضح بالخصوصية، وفيديو يظهر بس لما تحتاجه.",
    "benefits_en": "Clearer privacy control, and video only when you need it."
  }'::jsonb,
  'small',
  1290
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Showcase video is opt-in (off by default)'
);
