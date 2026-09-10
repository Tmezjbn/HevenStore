-- Owner internal log: product editor Jump opens sections; any video URL paste OK.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-15'::date,
  'قفز الأقسام يفتحها + أي رابط فيديو',
  'Jump opens sections + any video link',
  'من تعديل المنتج: قائمة انتقال تفتح القسم وتسكرّل له. ولصق رابط فيديو من أي مصدر مسموح.',
  'In product edit: Jump opens that section and scrolls to it. Paste a video link from any host.',
  '',
  '',
  '{
    "what_ar": "قائمة «انتقال» تفتح القسم المطوي وتوصلك له. ولصق فيديو العرض يقبل أي رابط https (يوتيوب، فيميو، MP4، أو غيرهم).",
    "what_en": "Jump opens a collapsed section and scrolls to it. Showcase paste accepts any https link (YouTube, Vimeo, MP4, or other).",
    "why_ar": "النموذج طويل — القفز بدون فتح = ما تشوف شيء. وتحذير الروابط كان يوقفك عن لصق فيديو تبيه.",
    "why_en": "The form is long — jump without open means you see nothing. The host warning blocked pasting the video you want.",
    "how_ar": "منتجات → عدّل → قائمة انتقال على اليمين. وفي الوسائط الصق الرابط واضغط تطبيق.",
    "how_en": "Products → Edit → Jump list on the right. In Media, paste the URL and apply.",
    "benefits_ar": "تعديل أسرع، وفيديو من أي مصدر بدون رسالة حمراء توقفك.",
    "benefits_en": "Faster editing, and video from any source without a red stop warning."
  }'::jsonb,
  1180
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Jump opens sections + any video link'
);
