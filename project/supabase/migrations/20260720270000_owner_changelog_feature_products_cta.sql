-- Owner internal log: Feature Products! shortcut from catalog.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-20'::date,
  'زر «ميّز المنتجات!» من الكتالوج',
  'Feature Products! shortcut from catalog',
  'من قائمة المنتجات تقدر تفتح قائمة التمييز مباشرة: بحث، تحديد الكل، إلغاء التحديد، وترتيب المنتجات المميزة للرئيسية وتصفح المتجر.',
  'From the products list you can open the featuring menu directly: search, select all, deselect all, and order featured products for Home and Explore Store.',
  '',
  '',
  '{
    "what_ar": "بجانب عدّاد المنتجات في الكتالوج فيه زر «ميّز المنتجات!». يفتح منشئ الموقع على ودجات المنتجات المميزة.",
    "what_en": "Beside the product count in the catalog there is a “Feature Products!” button. It opens Website Builder on the featured-product widgets.",
    "why_ar": "تمييز المنتجات كان مدفون داخل منشئ الموقع — وصار أقرب وأنت تراجع الكتالوج.",
    "why_en": "Featuring lived buried in Website Builder — now it is one tap away while you review the catalog.",
    "how_ar": "منتجات → ميّز المنتجات! → اختر منتجات الرئيسية و/أو تصفح المتجر → احفظ الأقسام.",
    "how_en": "Products → Feature Products! → pick Home and/or Explore Store products → Save sections.",
    "benefits_ar": "وصول أسرع لقائمة التمييز مع بحث وتحديد جماعي.",
    "benefits_en": "Faster access to featuring with search and bulk select."
  }'::jsonb,
  'small',
  1300
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Feature Products! shortcut from catalog'
);
