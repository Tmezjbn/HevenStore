-- Owner internal log: third-party embeds play + Resources library in product editor.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-20'::date,
  'تضمين الفيديو يثبت + مكتبة موارد',
  'Embeds stay visible + Resources library',
  'روابط التضمين الخارجية تظهر في صفحة المنتج، وتُحفظ في موارد المحرر لإعادة الاستخدام مع فلاتر.',
  'Third-party embed links show on the product page, and save into the editor Resources library with filters.',
  '',
  '',
  '{
    "what_ar": "فيديو العرض يقبل صفحات التضمين الخارجية (مثل روابط /e/…) وتظهر في المتجر. عند التضمين يُحفظ الرابط في «الموارد» داخل محرر المنتج — مع تصفية: الكل، فيديو مضمّن، صور، ملفات فيديو.",
    "what_en": "Showcase video accepts third-party embed pages (like /e/… hosts) and they play in the store. Embedding a link also saves it to Resources in the product editor — with filters: All, Embedded vids, Images, Video files.",
    "why_ar": "بعض روابط التضمين كانت تبان «اختفت» لأن المتجر عاملها كملف فيديو. وتكرار لصق نفس الرابط كل مرة يضيّع وقت.",
    "why_en": "Some embed links looked like they vanished because the store treated them as video files. Re-pasting the same URL every time wastes time.",
    "how_ar": "منتجات → عدّل → عرض المنتج: الصق الرابط → تضمين. أو «جلب من الموارد» لاختيار رابط محفوظ. احفظ المنتج ليظهر في المتجر.",
    "how_en": "Products → Edit → Showcase: paste the URL → Embed. Or use Get from resources to pick a saved link. Save the product so it appears in the store.",
    "benefits_ar": "معاينة صادقة، روابط جاهزة لإعادة الاستخدام، وفيديو مضمّن يشتغل للزبون.",
    "benefits_en": "Honest preview, reusable links, and embeds that actually play for shoppers."
  }'::jsonb,
  'small',
  1250
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Embeds stay visible + Resources library'
);
