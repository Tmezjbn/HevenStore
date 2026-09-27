-- Owner internal log: smoother scrolling on Chrome-based browsers + cheaper card/hero effects.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-09-27'::date,
  'تمرير أنعم على كروم وبريف',
  'Smoother scrolling on Chrome and Brave',
  'شلنا سكربت كان يخلي عجلة الفأرة ثقيلة على كروم وبريف، فصار التمرير يستخدم طريق المتصفح المدمج مثل فايرفوكس. خففنا أيضاً لمعة بطاقات المنتج وحركة أسفل الواجهة الرئيسية عشان الصفحة تصير أخف.',
  'We removed a script that made mouse-wheel scrolling heavy on Chrome and Brave, so scrolling now uses the browser''s built-in smooth path like Firefox. The product-card shimmer and the homepage hero fade were also made lighter so the page feels smoother.',
  '',
  '',
  '{
    "what_ar": "تمرير الصفحة بالعجلة على كروم وبريف صار يشتغل مباشرة عبر المتصفح بدل سكربت مخصوص، ولمعة البطاقات وحركة أسفل الواجهة صاروا يرسموا بطريقة أرخص للمتصفح.",
    "what_en": "Wheel scrolling on Chrome and Brave now runs through the browser directly instead of a custom script, and the card shimmer plus homepage hero fade were switched to a cheaper way of animating.",
    "why_ar": "السكربت المخصوص كان يبطئ التمرير على كروم ويخلي الموقع ثقيل مقارنة بفايرفوكس.",
    "why_en": "The custom script made Chrome-based browsers scroll worse than Firefox and made the site feel heavy.",
    "how_ar": "تلقائي — افتح الموقع على كروم أو بريف ومرّر الصفحة؛ المفروض تحس بنفس نعومة فايرفوكس.",
    "how_en": "Automatic — open the site in Chrome or Brave and scroll; it should now feel as smooth as Firefox.",
    "benefits_ar": "تجربة أسلس لكل الزوار أياً كان المتصفح، وبطارية وحرارة أقل على الأجهزة.",
    "benefits_en": "A smoother visit for everyone on any browser, plus less battery and heat on devices."
  }'::jsonb,
  'small',
  1310
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Smoother scrolling on Chrome and Brave'
);
