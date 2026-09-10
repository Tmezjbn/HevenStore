-- Owner internal log: featuring menu moved onto Products catalog.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-20'::date,
  'تمييز المنتجات من الكتالوج (مو منشئ الموقع)',
  'Feature products from the catalog (not Website Builder)',
  'زر «ميّز المنتجات!» يفتح قائمة التمييز مباشرة في المنتجات: بحث، تحديد الكل، ترتيب، وحفظ للرئيسية وتصفح المتجر.',
  '“Feature Products!” opens the featuring menu right on Products: search, select all, reorder, and save for Home and Explore Store.',
  '',
  '',
  '{
    "what_ar": "بجانب عدّاد المنتجات زر «ميّز المنتجات!» يفتح قائمة تمييز هنا: رئيسية + تصفح المتجر، بحث، تحديد الكل، ترتيب، وحفظ.",
    "what_en": "Beside the product count, “Feature Products!” opens the featuring menu here: Home + Explore Store, search, select all, reorder, and save.",
    "why_ar": "ما يحتاج تفتح منشئ الموقع عشان تميّز منتجات — القائمة صارت في الكتالوج.",
    "why_en": "No need to open Website Builder just to feature products — the menu lives on the catalog.",
    "how_ar": "منتجات → ميّز المنتجات! → اختر/رتّب → حفظ التمييز.",
    "how_en": "Products → Feature Products! → pick/reorder → Save featuring.",
    "benefits_ar": "تمييز أسرع من نفس شاشة المنتجات.",
    "benefits_en": "Faster featuring from the same products screen."
  }'::jsonb,
  'small',
  1320
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Feature products from the catalog (not Website Builder)'
);
