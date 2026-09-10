-- Owner internal log: ad banner height control + fixed Get it now CTA.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-18'::date,
  'ارتفاع بانر الإعلانات + زر ثابت',
  'Ad banner height + steady Get it now',
  'تقدر تضبط ارتفاع بانر الإعلانات من منشئ الموقع. وزر «احصل عليه الآن!» ما عاد يتحرك مع الأسهم.',
  'Set ad banner height in Website Builder. “Get it now!” no longer slides when you change products.',
  '',
  '',
  '{
    "what_ar": "من منشئ الموقع تقدر تختار ارتفاع بانر الإعلانات (قصير / متوسط / طويل / أطول). وزر «احصل عليه الآن!» يثبت مكانه لما تنتقل بين المنتجات.",
    "what_en": "In Website Builder you can set the ad banner height (short / medium / tall / extra tall). The “Get it now!” button stays put when you switch products.",
    "why_ar": "البانر الطويل ياخذ مساحة كبيرة على الجوال. والزر اللي يتحرك مع الشريحة يشتت ويحس إن الصفحة ترتج.",
    "why_en": "A tall banner eats mobile space. A button that slides with each product feels jumpy and distracts from the CTA.",
    "how_ar": "منشئ الموقع → الرئيسية → منتجات بانر الإعلانات → ارتفاع البانر. احفظ الأقسام. جرّب الأسهم على الصفحة الرئيسية.",
    "how_en": "Website Builder → Home → Ad banner products → Banner height. Save sections. Try the arrows on the homepage.",
    "benefits_ar": "تحكم أوضح بمساحة الصفحة، وزر شراء ثابت يسهل الضغط عليه.",
    "benefits_en": "Clearer control over page space, and a steady buy button that’s easier to hit."
  }'::jsonb,
  1190
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Ad banner height + steady Get it now'
);
