-- Owner internal log: smoother storefront navigation and compact navbar.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-23'::date,
  'تنقّل أنعم داخل المتجر',
  'Smoother storefront navigation',
  'الانتقال بين الرئيسية وتصفح المتجر صار فوريًا وأنظف، والشريط العلوي يفتح ويختصر بسلاسة أثناء التمرير.',
  'Home and Explore Store now switch cleanly, while the top bar expands and compacts smoothly during scrolling.',
  '',
  '',
  '{
    "what_ar": "ثبّتنا حركة الشريط العلوي وأزلنا الومضة والقفزة عند الانتقال بين الرئيسية وتصفح المتجر.",
    "what_en": "We stabilized the top bar motion and removed the flash and jump between Home and Explore Store.",
    "why_ar": "القفزات الصغيرة أثناء التصفح تجعل المتجر يبدو أبطأ وأقل اكتمالًا.",
    "why_en": "Small jumps while browsing make the store feel slower and less finished.",
    "how_ar": "تلقائي — تنقّل بين الرئيسية وتصفح المتجر، ثم مرّر الصفحة للأعلى والأسفل.",
    "how_en": "Automatic — switch between Home and Explore Store, then scroll up and down.",
    "benefits_ar": "تصفح أهدأ، إحساس أسرع، وتركيز أوضح على المنتجات.",
    "benefits_en": "Calmer browsing, a faster feel, and clearer focus on products."
  }'::jsonb,
  'small',
  1330
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Smoother storefront navigation'
);
