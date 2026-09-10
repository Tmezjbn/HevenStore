-- Owner internal log: ad blade style controls + carousel polish.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-20'::date,
  'شرائط الإعلان + تنقّل أوضح',
  'Ad blade style + carousel polish',
  'ضبط حجم ولون وشفافية شرائط الحافة، نص عربي يبدأ من الحافة، أسهم صحيحة، وزر احصل عليه الآن يتلوّن عند المرور مع تنقّل تلقائي للشرائح.',
  'Tune blade size, color, and opacity; Arabic text starts at the edge; arrows face correctly; Get it now hover returns; slides auto-advance.',
  '',
  '',
  '{
    "what_ar": "شرائط حافة بانر الإعلانات صارت قابلة لضبط الحجم واللون والشفافية من منشئ الموقع. والنص العربي يبدأ من الحافة صح، وأسهم التنقل وألوان زر «احصل عليه الآن!» عند المرور رجعت، والصور تتنقّل تلقائياً.",
    "what_en": "Ad banner blade strips can be sized, colored, and set for opacity in Website Builder. Arabic blade text starts at the edge correctly, carousel arrows and Get it now hover color/motion are back, and slides auto-advance again.",
    "why_ar": "الشرائط كانت تبان مقطوعة بالعربي، والأسهم مقلوبة، والزر بدون حياة — والبانر يوقف عن التنقّل بعد أي نقرة.",
    "why_en": "Arabic blades looked cut off mid-phrase, arrows faced the wrong way, the CTA felt dead on hover, and any click permanently stopped the carousel.",
    "how_ar": "منشئ الموقع → قسم الإعلانات → شرائط الحافة. على الرئيسية مرّر على الزر وجرّب الأسهم.",
    "how_en": "Website Builder → Ads section → Blade edge strips. On Home, hover the button and try the arrows.",
    "benefits_ar": "بانر أوضح، تحكم أوثق بالمظهر، وتنقّل أسهل للزائر.",
    "benefits_en": "Clearer banner, tighter look control, easier browsing for shoppers."
  }'::jsonb,
  'small',
  1260
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Ad blade style + carousel polish'
);
