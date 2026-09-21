-- Owner internal log: storefront polish pass (nav pill, PDP cards, animated thumbs).
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-09-21'::date,
  'لمسة جمالية على المتجر',
  'Storefront polish pass',
  'شريط التنقل صار كبسولة تلتصق بجانب الشعار وتنزلق للوسط عند النزول، وصور المنتج المصغّرة النشطة حصلت على إطار ضوئي يدور، وصفحة المنتج أوسع ببطاقات معلومات وتقييمات، وقسم «المزيد!» بأسلوب تحريري، وقائمة ثقة مرتبة تحت زر الشراء.',
  'The navbar links became a pill that docks beside the logo and glides to center on scroll, active media thumbnails got an orbiting neon rim, the product page is wider with info and review cards, the More! section got an editorial restyle, and the buy box has a tidy centered trust row.',
  '',
  '',
  '{
    "what_ar": "تحسينات شكل على واجهة المتجر: روابط التنقل داخل كبسولة تبدأ بجانب الشعار وتنزلق بسلاسة للمنتصف عند التمرير، الصورة المصغّرة النشطة في صفحة المنتج عليها إطار ضوئي يدور بهدوء، صفحة المنتج أوسع (92rem) مع بطاقات للمعلومات والتقييمات، قسم المزيد بعنوان تحريري، وسطر ثقة مختصر وموسّط تحت زر السلة.",
    "what_en": "Visual polish across the storefront: nav links live in a pill that docks beside the logo and glides to center on scroll, the active product thumbnail carries a slowly orbiting neon rim, the product page is wider (92rem) with carded info and reviews, the More! section got an editorial title treatment, and a compact centered trust row sits under Add to Cart.",
    "why_ar": "التفاصيل الصغيرة تبيع الثقة: حركة هادئة ومقصودة تشعر الزائر أن المتجر مبني بعناية، والبطاقات تفصل المعلومات بدل كتلة واحدة.",
    "why_en": "Small details sell trust: calm, purposeful motion makes the store feel carefully built, and cards separate information instead of one flat block.",
    "how_ar": "تلقائي — مرّر الصفحة الرئيسية وشاهد الكبسولة تنزلق للوسط، وافتح أي منتج وشاهد الإطار الضوئي على المصغّرة النشطة.",
    "how_en": "Automatic — scroll the home page and watch the pill glide to center; open any product and see the neon rim orbit the active thumbnail.",
    "benefits_ar": "متجر أشيك وأهدأ بالحركة، وقراءة أسهل لمعلومات المنتج.",
    "benefits_en": "A sharper, calmer-moving store and easier scanning of product info."
  }'::jsonb,
  'small',
  1300
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Storefront polish pass'
);
