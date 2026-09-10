-- Owner internal log: light/dark expands from the sun/moon button.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-23'::date,
  'الوضع الفاتح والداكن ينتشر من الشمس',
  'Light and dark expand from the sun',
  'تبديل الوضع الفاتح/الداكن صار ينتشر بسلاسة من زر الشمس أو القمر حتى يغطي الصفحة.',
  'Light/dark now expands smoothly from the sun or moon button until it covers the page.',
  '',
  '',
  '{
    "what_ar": "عند التبديل بين الوضع الفاتح والداكن، اللون الجديد ينتشر من زر الشمس/القمر حتى يغطي الصفحة.",
    "what_en": "When switching light and dark, the new look expands from the sun/moon button until it covers the page.",
    "why_ar": "تبديل فجائي يقطع الإحساس بالمتجر. الحركة من الزر تخلّي التغيير مفهومًا وممتعًا.",
    "why_en": "A hard cut breaks the store feel. Expanding from the button makes the change clear and pleasant.",
    "how_ar": "من الشريط العلوي — اضغط أيقونة الشمس أو القمر.",
    "how_en": "From the top bar — press the sun or moon icon.",
    "benefits_ar": "تبديل أوضح وأكثر أناقة بدون إرباك الزائر.",
    "benefits_en": "A clearer, more polished switch without jarring the shopper."
  }'::jsonb,
  'small',
  1340
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Light and dark expand from the sun'
);
