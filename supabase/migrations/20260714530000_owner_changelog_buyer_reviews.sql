-- Owner internal log: buyers can leave product reviews on the PDP.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'الزبائن اللي اشتروا يقدرون يقيّمون المنتج',
  'Buyers who paid can rate the product',
  'في صفحة المنتج: تقييمات حقيقية من مشترين دفعوا. بعد أول تقييم، النجوم تصير متوسط تقييمات الزبائن بدل الرقم الافتراضي.',
  'On the product page: real reviews from people who paid. After the first review, stars become the buyer average instead of the default seed.',
  '',
  '',
  '{
    "what_ar": "المشترون يكتبون تقييماً (نجوم + تعليق اختياري) على صفحة المنتج، ويقدرون يعدّلونه أو يحذفونه.",
    "what_en": "Buyers write a rating (stars + optional comment) on the product page, and can edit or delete it.",
    "why_ar": "النجوم بدون تقييمات حقيقية تبقى تسويق. التقييم من مشترٍ حقيقي يبني ثقة.",
    "why_en": "Stars with no real reviews are just marketing. A real buyer rating builds trust.",
    "how_ar": "تلقائي بعد النشر. فقط من اشترى المنتج يقيّم — مرة واحدة لكل منتج.",
    "how_en": "Automatic after deploy. Only someone who bought the product can rate — once per product.",
    "benefits_ar": "ثقة أوضح للزائر، ومتوسط نجوم يعكس التجربة الحقيقية.",
    "benefits_en": "Clearer trust for visitors, and star averages that reflect real experience."
  }'::jsonb,
  1170
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Buyers who paid can rate the product'
);
