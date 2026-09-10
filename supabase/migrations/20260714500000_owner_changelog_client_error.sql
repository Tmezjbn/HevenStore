-- Owner internal log: crash reports without analytics consent.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'أعطال المتجر توصلنا حتى لو الزبون رفض التحليلات',
  'Store crashes reach us even if analytics is declined',
  'لو انكسر شيء في المتجر، يصل تنبيه للسجلات حتى لو الزائر رفض رسالة التحليلات — عشان نصلّح بدون ما نتتبّع التسوق.',
  'If something breaks in the store, a signal still reaches our logs even when a visitor declined analytics — so we can fix bugs without tracking shopping.',
  '',
  '',
  '{
    "what_ar": "رفض التحليلات يوقف إحصاءات الزيارات، لكن أعطال الصفحة ما عاد تختفي في الظلام.",
    "what_en": "Declining analytics still stops visit stats, but page crashes no longer vanish in the dark.",
    "why_ar": "بدونه كنا عميان عن الأخطاء عند الزوار اللي رفضوا التتبع.",
    "why_en": "Without it we were blind to errors from visitors who refused tracking.",
    "how_ar": "تلقائي بعد نشر دالة client-error. تشوف السجلات في لوحة Supabase.",
    "how_en": "Automatic after deploying the client-error function. View logs in the Supabase dashboard.",
    "benefits_ar": "إصلاح أسرع، خصوصية الزائر محفوظة للإحصاءات.",
    "benefits_en": "Faster fixes; visitor privacy kept for analytics."
  }'::jsonb,
  1150
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Store crashes reach us even if analytics is declined'
);
