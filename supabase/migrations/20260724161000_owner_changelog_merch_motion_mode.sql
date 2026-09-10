-- Owner internal log: product card motion honours reduce-motion, with an owner override.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-24'::date,
  'حركة بطاقات المنتجات تحترم تقليل الحركة',
  'Product card motion respects reduce-motion',
  'البطاقات تهدأ تلقائياً لمن يطلب حركة أقل، وعندك خيار «دائماً» لو جهازك يفرض الإعداد بالخطأ.',
  'Cards calm themselves for shoppers who want less motion, with an “Always” override if your device forces the setting.',
  '',
  '',
  '{
    "what_ar": "بطاقات المنتجات تهدّئ الهالة والتأثيرات والإمالة عندما يطلب الجهاز تقليل الحركة. من منشئ الموقع تقدر تخلّي الحركة دائماً أو تهدّئها بالكامل. الأسعار والأزرار تبقى ظاهرة.",
    "what_en": "Product cards calm the aura, effects, and tilt when the device asks for less motion. In Website Builder you can keep motion always on, or calm it fully. Prices and buttons stay visible.",
    "why_ar": "بعض الأجهزة تفرض تقليل الحركة بالخطأ فكانت تخفي مظهر المنتجات. والبطاقات خارج الشاشة كانت تستهلك الجهاز بلا فائدة.",
    "why_en": "Some devices force reduce-motion by mistake and were wiping product looks. Off-screen cards were also burning the device for no benefit.",
    "how_ar": "منشئ الموقع → قسم الإعلانات (قرب لمعة التحويم) → حركة بطاقات المنتجات: تلقائي / دائماً / إيقاف.",
    "how_en": "Website Builder → Ads section (near Glare hover) → Product card motion: Auto / Always / Off.",
    "benefits_ar": "متجر ألطف لمن يفضّل حركة أقل، وخيار واضح لو جهازك يفرض الإعداد بالخطأ، وأداء أخف أثناء التمرير.",
    "benefits_en": "A gentler store for shoppers who want less motion, a clear override if your device forces that setting, and lighter scrolling."
  }'::jsonb,
  'small',
  1784937600000
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Product card motion respects reduce-motion'
);
