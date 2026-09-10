-- Owner-controlled storefront density. Existing sites receive the new 90% default.
INSERT INTO public.site_settings (key, value)
VALUES ('ui_scale', '90')
ON CONFLICT (key) DO NOTHING;

-- Owner internal log: storefront UI scale control.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-23'::date,
  'حجم واجهة متجر قابل للتعديل',
  'Adjustable storefront UI scale',
  'يمكنك اختيار كثافة واجهة المتجر من 75٪ إلى 110٪، مع افتراضي أهدأ بنسبة 90٪.',
  'Choose storefront density from 75% to 110%, with a calmer 90% default.',
  '',
  '',
  '{
    "what_ar": "أضفنا خيار «حجم الواجهة» بجانب إعدادات السمة. يغيّر حجم النصوص والمسافات في المتجر معًا.",
    "what_en": "We added a “UI scale” option beside theme defaults. It changes storefront type and spacing together.",
    "why_ar": "الشاشات وأذواق الكثافة تختلف، بينما تكبير المتصفح يجب أن يبقى بيد الزائر لسهولة الوصول.",
    "why_en": "Screens and density preferences vary, while browser zoom should remain under each visitor’s accessibility control.",
    "how_ar": "لوحة التحكم ← الثيمات ← حجم الواجهة ← اختر النسبة ← حفظ الإعدادات.",
    "how_en": "Dashboard → Themes → UI scale → choose a percentage → Save defaults.",
    "benefits_ar": "متجر أكثف افتراضيًا، مع تحكم واضح ودعم أفضل للجوال والتكبير.",
    "benefits_en": "A denser default storefront with clear control and better phone and zoom support."
  }'::jsonb,
  'small',
  1340
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Adjustable storefront UI scale'
);
