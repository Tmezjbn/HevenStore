-- Owner internal log: rename storefront video player labels.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-20'::date,
  'تسمية مشغّلات الفيديو في المتجر',
  'Rename storefront video player labels',
  'تقدر تغيّر عنوان «مشغّلات الفيديو» وأسماء المشغّل 1 و2 اللي يشوفها الزبون — عربي وإنجليزي. الفاضي = الافتراضي.',
  'You can rename the Video Players title and Player 1 / Player 2 labels shoppers see — Arabic and English. Blank keeps the default.',
  '',
  '',
  '{
    "what_ar": "تقدر تغيّر نص «مشغّلات الفيديو» و«المشغّل 1 / 2» اللي يظهر للزبون تحت صور العرض — عربي وإنجليزي. لو تركت الحقل فاضي يبقى الاسم الافتراضي.",
    "what_en": "You can rename the “(Video Players)” title and “Player 1 / Player 2” buttons shoppers see under the showcase thumbs — Arabic and English. Leave a field blank to keep the default.",
    "why_ar": "أحياناً الأسماء العامة ما تناسب نوع المنتج أو طريقة العرض.",
    "why_en": "Generic player names do not always match the product or how you present the two streams.",
    "how_ar": "منتجات → عدّل → عرض المنتج → «أسماء المشغّلات في المتجر». عبّي EN وAR أو اتركه فاضي. احفظ المنتج.",
    "how_en": "Products → Edit → Showcase → “Storefront player names”. Fill EN and AR or leave blank. Save the product.",
    "benefits_ar": "تسمية أوضح للزبون بدون ما تغيّر روابط الفيديو.",
    "benefits_en": "Clearer naming for shoppers without changing the video links."
  }'::jsonb,
  'small',
  1285
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Rename storefront video player labels'
);
