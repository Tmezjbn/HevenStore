-- Owner internal log: denser matrix FX + gradient color option.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-20'::date,
  'تأثير البطاقة أوضح + تدرج لوني',
  'Card effect denser + gradient tint',
  'مطر الماتريكس يملأ البطاقة بدون إعادة ظهور أثناء التمرير، ومن التعديل تقدر تفعّل تدرج لونين للتأثير.',
  'Matrix rain fills the card without re-spawning while you scroll, and product edit can enable a two-color gradient on the effect.',
  '',
  '',
  '{
    "what_ar": "تحسين تأثير جسم البطاقة: الماتريكس أكمل وأكثر ثباتاً، مع خيار تدرج لوني (لونان) من محرر المنتج.",
    "what_en": "Card-body effects improved: denser, steadier matrix rain, plus an optional two-color gradient from the product editor.",
    "why_ar": "التأثير كان يبان ناقص أو يعيد الظهور أثناء التمرير، ولون واحد ما يكفي لكل المنتجات.",
    "why_en": "The effect sometimes looked sparse or restarted while scrolling, and a single tint did not suit every product.",
    "how_ar": "منتجات → عدّل → تأثير جسم البطاقة → فعّل «تدرج لوني» واختر اللون الثاني.",
    "how_en": "Products → Edit → Card body effect → turn on Gradient color and pick the second color.",
    "benefits_ar": "بطاقات أوضح وأجمل بدون تشتيت أثناء التصفح.",
    "benefits_en": "Clearer, nicer cards without jank while browsing."
  }'::jsonb,
  'small',
  1270
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Card effect denser + gradient tint'
);
