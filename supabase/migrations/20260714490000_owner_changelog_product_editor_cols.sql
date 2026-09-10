-- Owner internal log: product editor/list leaner fetches.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'تعديل المنتجات أسرع من القائمة',
  'Faster product editing from the list',
  'قائمة المنتجات وصفحة التعديل تجيب الأعمدة المطلوبة بس — فتح منتج للتعديل أخف وأسرع.',
  'The products list and editor fetch only the columns they need — opening a product to edit is lighter and faster.',
  '',
  '',
  '{
    "what_ar": "من قائمة المنتجات للتحرير، التحميل صار أخف بدون ما ينقص شيء من الحقول اللي تعدّلها.",
    "what_en": "From the products list into edit, loading is lighter without dropping any fields you edit.",
    "why_ar": "سحب كل أعمدة المنتج في كل صفحة كان يبطّئ اللوحة.",
    "why_en": "Pulling every product column on every page slowed the dashboard.",
    "how_ar": "تلقائي بعد النشر.",
    "how_en": "Automatic after deploy.",
    "benefits_ar": "تعديل أسرع، أقل ضغط على الشبكة.",
    "benefits_en": "Faster editing, less network load."
  }'::jsonb,
  1140
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Faster product editing from the list'
);
