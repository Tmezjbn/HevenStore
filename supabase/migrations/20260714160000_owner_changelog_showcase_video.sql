-- Owner internal log: showcase video autoplay + volume (product edit).
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'تشغيل فيديو العرض والصوت',
  'Showcase video autoplay and sound',
  'فيديو صفحة المنتج يشتغل تلقائياً، وفي إعدادات لكل منتج للتشغيل التلقائي ومستوى الصوت (افتراضي 25٪).',
  'Product-page showcase video autoplays, with per-product autoplay and volume controls (default 25%).',
  '',
  '',
  '{
    "what_ar": "فيديو العرض في صفحة المنتج يشتغل لحاله لما الزبون يفتح المنتج. ومن تعديل المنتج تقدر تشغّل أو توقف التشغيل التلقائي وتضبط الصوت (من صفر لمية، والافتراضي ٢٥٪).",
    "what_en": "The showcase video on the product page starts on its own when a shopper opens the product. In product edit you can turn autoplay on or off and set volume (0–100, default 25%).",
    "why_ar": "الزبون كان يشوف بوستر ثابت ويحتاج يضغط تشغيل — كثير يفوّتون الفيديو. والصوت العالي المفاجئ يزعج. نبي العرض يوصل بدون جهد، بصوت هادي.",
    "why_en": "Shoppers used to see a still poster and had to hit play — many never watched. Loud surprise audio is annoying. We want the demo to land with no effort and quiet sound.",
    "how_ar": "من المنتجات → عدّل → قسم عرض المنتج: تحت فيديو العرض تلاقي مفتاح التشغيل التلقائي وشريط الصوت. المتصفح يفرض بدء كتم الصوت عشان يسمح بالتشغيل التلقائي؛ الزبون يقدر يرفع الصوت من أزرار المشغّل. الصوت المضبوط يبقى جاهز لما يلغي الكتم.",
    "how_en": "Products → Edit → Showcase: under the showcase video you get an autoplay toggle and a volume slider. Browsers require a muted start so autoplay is allowed; the shopper can unmute with the player controls. The set volume is ready when they unmute.",
    "benefits_ar": "للزبون: يشوف المنتج يتحرك فوراً بدون بحث عن زر تشغيل. لك: تتحكم لكل منتج — فيديو صامت أو بصوت خفيف — من غير ما تلمس الكود.",
    "benefits_en": "For shoppers: the product demo moves immediately without hunting for play. For you: per-product control — silent or quiet audio — without touching code."
  }'::jsonb,
  1000
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Showcase video autoplay and sound'
);
