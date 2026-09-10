-- Owner internal log: light modes tinted to each skin's main color.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-23'::date,
  'الوضع الفاتح بلون السمة',
  'Light mode follows each skin color',
  'الوضع الفاتح ما عاد أبيض صارخ — خلفياته تميل للون السمة المختارة (شفق، غروب، قهوة…).',
  'Light mode is no longer stark white — backgrounds lean into the selected skin color (Aurora, Sunset, Coffee…).',
  '',
  '',
  '{
    "what_ar": "عدّلنا خلفيات الوضع الفاتح لكل سمة حتى تميل للون الأساسي بدل الورق الأبيض.",
    "what_en": "We retinted every skin’s light mode so surfaces follow the main color instead of plain white paper.",
    "why_ar": "أبيض كامل يقطع هوية السمة ويجعل المتجر يبدو عامًا.",
    "why_en": "Pure white breaks skin identity and makes the store feel generic.",
    "how_ar": "من الشريط العلوي — اختر سمة ثم بدّل للوضع الفاتح.",
    "how_en": "From the top bar — pick a skin, then switch to light mode.",
    "benefits_ar": "فاتح وداكن يبقون نفس العائلة اللونية للمتجر.",
    "benefits_en": "Light and dark stay in the same color family for the store."
  }'::jsonb,
  'small',
  1350
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Light mode follows each skin color'
);
