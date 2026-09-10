-- Owner internal log: payment safety hardening (audit phase 1).
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'حماية أقوى للدفع والمخزون',
  'Stronger payment and stock safety',
  'ما عاد ممكن يدفع زبون ويضيع طلبه، والمخزون ما ينزل تحت الصفر، وصاحب المتجر يقدر يدير الكوبونات بنفسه.',
  'A customer can no longer pay and lose their order, stock can’t go below zero, and the owner can now manage coupons directly.',
  '',
  '',
  '{
    "what_ar": "سدّينا ثغرات نادرة لكن خطيرة في الدفع: لو زبون فتح صفحة الدفع مرتين وكمّل الدفعة القديمة، الطلب ما عاد ينحذف — يوصله منتجه عادي. ولو اشترى شخصان آخر قطعة بنفس اللحظة، النظام يعلّم الطلب للمراجعة بدل ما يبيع مخزون مو موجود. وصار تغيير حالة الطلب إلى «مدفوع» حصري لنظام الدفع نفسه. وأخيراً: حساب المالك يقدر ينشئ ويعدّل الكوبونات (كانت مقفولة عليه بالغلط).",
    "what_en": "We closed rare but dangerous payment gaps: if a shopper opens checkout twice and pays the older session, their order is no longer deleted — they still get their product. If two people buy the last unit at the same moment, the system flags the order for review instead of selling stock that isn’t there. Only the payment system itself can mark an order as paid now. And the owner account can finally create and edit coupons (it was accidentally locked out).",
    "why_ar": "أسوأ شيء يصير لمتجر رقمي: زبون يدفع فلوس حقيقية وما يوصله شيء. حتى لو الحالة نادرة، مرة وحدة كفيلة تكسر الثقة وتجيب نزاع بنكي. والمخزون السالب يعني بيع شيء ما تملكه.",
    "why_en": "The worst thing for a digital store: a customer pays real money and gets nothing. Even if it’s rare, one incident breaks trust and triggers a bank dispute. Negative stock means selling something you don’t have.",
    "how_ar": "الطلبات المعلّقة اللي بدأ لها دفع تنحفظ بدل ما تنحذف، فأي دفعة متأخرة تلاقي طلبها. خصم المخزون صار يتحقق من الكمية قبل الخصم، وأي نقص يطلع لك تنبيه «نقص مخزون» في صفحة الطلبات عشان تسلّم يدوياً أو ترجّع المبلغ. وحوّلنا صلاحية «مدفوع» للسيرفر فقط — ولا موظف يقدر يقلبها من الجدول.",
    "how_en": "Pending orders that started a payment are kept instead of deleted, so any late payment finds its order. Stock is checked before it’s reduced, and any shortfall shows a “Stock shortfall” alert on the Orders page so you can deliver manually or refund. Marking “paid” is now server-only — no staff member can flip it from a table.",
    "benefits_ar": "للزبون: كل ريال يدفعه يقابله طلب حقيقي يوصله. لك: صفر طلبات ضايعة، مخزون دقيق، تنبيهات واضحة للحالات النادرة، وتحكم كامل بالكوبونات من لوحتك.",
    "benefits_en": "For shoppers: every dollar paid maps to a real order that arrives. For you: zero lost orders, accurate stock, clear alerts for the rare edge cases, and full coupon control from your dashboard."
  }'::jsonb,
  1010
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Stronger payment and stock safety'
);
