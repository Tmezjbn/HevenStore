-- Owner internal log: lighter profile/seller fetches + coupon index.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'صفحات بائع وإشعارات أخف',
  'Lighter seller pages and notifications',
  'صفحة البائع والإشعارات وملف الحساب تجيب بس البيانات اللي تحتاجها، والكوبونات أسرع في الفحص الداخلي.',
  'Seller pages, notifications, and account profile fetch only what they need, and coupon checks are faster inside the database.',
  '',
  '',
  '{
    "what_ar": "المتجر يحمّل منتجات البائع والإشعارات بحجم أصغر. لوحة التحكم لو انكسر شيء في صفحة ما يطيح كل اللوحة.",
    "what_en": "The store loads seller products and notifications with a smaller payload. If one dashboard page crashes, the whole shell stays up.",
    "why_ar": "جلب كل الأعمدة يبطّئ الجوال. خطأ في صفحة وحدة كان يبيّض الشاشة كلها.",
    "why_en": "Fetching every column slows phones. One page error used to blank the whole screen.",
    "how_ar": "تلقائي بعد النشر وتطبيق قاعدة البيانات.",
    "how_en": "Automatic after deploy and database apply.",
    "benefits_ar": "تصفّح أسرع، لوحة أوضح عند الأعطال.",
    "benefits_en": "Faster browsing, clearer dashboard when something breaks."
  }'::jsonb,
  1120
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Lighter seller pages and notifications'
);
