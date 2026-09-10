-- Owner internal log: boot loading screen.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-20'::date,
  'تحميل أنظف — شاشة الهوية',
  'Cleaner first load — brand loading screen',
  'فتح الموقع أو التحديث يعرض شاشة HEVEN قصيرة بدل ظهور المحتوى قطعة قطعة.',
  'Opening or refreshing shows a short HEVEN loading screen instead of content popping in.',
  '',
  '',
  '{
    "what_ar": "لما تفتح الموقع أو تحدث الصفحة، تشوف شاشة تحميل بهوية HEVEN بدل ما المحتوى يظهر قطعة قطعة.",
    "what_en": "Opening or refreshing the site shows a HEVEN loading screen instead of content popping in piece by piece.",
    "why_ar": "الظهور المتقطع للكروت والقائمة كان يبان غير مرتب ويقلل الإحساس بالثقة.",
    "why_en": "Pieces of the page popping in felt unfinished and less trustworthy.",
    "how_ar": "تلقائي — حدّث أي صفحة في المتجر وشوف الشاشة القصيرة.",
    "how_en": "Automatic — refresh any store page and you’ll see the short splash.",
    "benefits_ar": "أول انطباع أنظف وأهدأ.",
    "benefits_en": "A cleaner, calmer first impression."
  }'::jsonb,
  1240
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Cleaner first load — brand loading screen'
);
