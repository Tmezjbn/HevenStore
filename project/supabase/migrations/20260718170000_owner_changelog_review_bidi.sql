-- Owner internal log: Arabic UGC punctuation + delete under review.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-18'::date,
  'تقييمات عربية — علامات الترقيم بمكانها',
  'Arabic reviews — punctuation stays in place',
  'علامات مثل !!!! بعد كلام عربي تبان بعد الكلمة. وزر حذف تقييمك صار تحت النص.',
  'Marks like !!!! after Arabic stay after the word. Delete your review sits under the text.',
  '',
  '',
  '{
    "what_ar": "لو كتبت تقييم بالعربي وبعده علامات مثل !!!!، تظهر بعد الكلمة مو قبلها. وزر حذف تقييمك صار تحت النص.",
    "what_en": "Arabic review text with trailing marks like !!!! now stays after the word, not before it. Your delete control sits under the review text.",
    "why_ar": "الاتجاه الخاطئ للنص كان يخلي علامات التعجب تقفز لليسار. والحذف فوق التقييم كان سهل بالغلط.",
    "why_en": "Wrong text direction made exclamation marks jump to the left. Delete up top was too easy to hit by mistake.",
    "how_ar": "تلقائي بعد التحديث — اكتب تقييم عربي وجرّب الحذف تحت النص.",
    "how_en": "Automatic after deploy — post an Arabic review and use delete under the text.",
    "benefits_ar": "نص أوضح، وأقل حذف بالخطأ.",
    "benefits_en": "Clearer text, fewer accidental deletes."
  }'::jsonb,
  1210
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Arabic reviews — punctuation stays in place'
);
