-- Owner internal log: showcase auto-switches Player when embed stuck (esp. Firefox).
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-20'::date,
  'تبديل تلقائي للمشغّل لو الفيديو علق',
  'Showcase auto-switches player if video sticks',
  'لو المشغّل الحالي علق أو انكسر (كروم / بريف / فَيَرفُكس)، المتجر يجرّب المشغّل الآخر تلقائي (1↔2) لو الرابط الثاني موجود.',
  'If the active player sticks or breaks (Chrome / Brave / Firefox), the store auto-tries the other player (1↔2) when that link exists.',
  '',
  '',
  '{
    "what_ar": "على صفحة المنتج، لو فيديو العرض يعلق أو يفشل (كروم / بريف / فَيَرفُكس) والرابط الثاني موجود، النظام يبدّل مرة واحدة للمشغّل الآخر (1↔2).",
    "what_en": "On the product page, if the showcase sticks or fails (Chrome / Brave / Firefox) and the other link exists, the store flips once to the other player (1↔2).",
    "why_ar": "بعض خدمات البث تنكسر على متصفح وتشتغل على الرابط الثاني.",
    "why_en": "Some stream hosts break in one browser or URL while the other player still works.",
    "how_ar": "عبّي رابط المشغّل 1 و2 لكل تضمين. الزبون ما يحتاج يضغط شيء — التحويل يصير لو اللي شغال علق.",
    "how_en": "Fill both Player 1 and Player 2 links per embed. Shoppers need not tap — it flips if the active one sticks.",
    "benefits_ar": "أقل صفحات فيديو بيضاء، وتجربة أوضح للزبون على كل المتصفحات.",
    "benefits_en": "Fewer blank showcase videos, clearer shopper experience on every browser."
  }'::jsonb,
  'small',
  1310
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Showcase auto-switches player if video sticks'
);
