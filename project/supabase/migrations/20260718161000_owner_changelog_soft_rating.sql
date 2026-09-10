INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-18'::date,
  'تقييم ناعم — النجوم المنخفضة ما تضرب بقوة',
  'Soft ratings — low stars barely move the score',
  'تقييم واحد بثلاث نجوم على منتج بخمس ≈ ٤.٩ مش ٣. النجوم تعرض الجزء الفارغ بشكل جزئي.',
  'One 3-star on a 5.0 product ≈ 4.9, not 3.0. Stars show partial fill on the last star.',
  '',
  '',
  '{
    "what_ar": "تقييم المنتج ما عاد ينزل بسرعة من تقييم واحد ضعيف. مثال: منتج بخمس نجوم + تقييم بثلاث نجوم ≈ ٤.٩، والنجمة الخامسة تبان شبه ممتلئة.",
    "what_en": "A single low review barely moves the product score. Example: 5.0 product + one 3-star ≈ 4.9, with the fifth star still mostly filled.",
    "why_ar": "تقييم واحد غاضب كان يخلي المنتج يبان ضعيف فوراً. نبي الحقيقة تطلع مع كثرة التقييمات، مو من صوت واحد.",
    "why_en": "One angry review used to crash the stars overnight. We want the score to reflect volume of opinion, not a single voice.",
    "how_ar": "تلقائي بعد التحديث. كل ما زادت التقييمات المنخفضة، الرقم ينزل أكثر — بس ببطء في البداية.",
    "how_en": "Automatic after deploy. More low reviews still pull the score down — just gently at first.",
    "benefits_ar": "منتجات جديدة تبقى جذابة، والتقييمات الكثيرة تظل صادقة.",
    "benefits_en": "New products stay attractive, while lots of reviews still tell the truth."
  }'::jsonb,
  1210
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Soft ratings — low stars barely move the score'
);
