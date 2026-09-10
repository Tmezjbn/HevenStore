-- Owner internal log: lighter dashboard lists.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'لوحة تحكم أخف وأسرع',
  'Lighter, faster dashboard lists',
  'صفحات الكوبونات والشارات والفئات والمستخدمين والإشعارات تجيب بس الأعمدة اللي تحتاجها — اللوحة تفتح أسرع خاصة على الجوال.',
  'Coupons, badges, categories, users, and notifications pages fetch only the columns they need — the dashboard opens faster, especially on phones.',
  '',
  '',
  '{
    "what_ar": "قوائم اللوحة ما عاد تسحب كل أعمدة الجداول. نفس البيانات اللي تشوفها، بحجم أصغر.",
    "what_en": "Dashboard lists no longer pull every table column. Same data you see, smaller payloads.",
    "why_ar": "جلب كل الأعمدة يبطّئ الشبكة على الجوال ويزيد ضغط السيرفر.",
    "why_en": "Fetching every column slows mobile networks and loads the server.",
    "how_ar": "تلقائي بعد النشر.",
    "how_en": "Automatic after deploy.",
    "benefits_ar": "لوحة أسرع، أقل استهلاك بيانات.",
    "benefits_en": "Faster dashboard, less data use."
  }'::jsonb,
  1130
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Lighter, faster dashboard lists'
);
