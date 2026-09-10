-- Owner internal log: avatar lock + coupon rules + $0.50 checkout floor.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'صور الملف والكوبونات وحدّ الدفع الأدنى',
  'Avatar lock, coupon rules, and $0.50 checkout floor',
  'رفع صورة الملف للبائعين والموظفين فقط، والكوبونات ما عاد تقبل نسبة فوق ١٠٠٪ أو قيمة صفر، والسلة تحت ٠.٥٠$ ما تدخل الدفع.',
  'Only sellers/staff can upload profile photos, coupons can’t be over 100% or zero, and carts under $0.50 can’t start checkout.',
  '',
  '',
  '{
    "what_ar": "المشتري/العضو ما يقدر يرفع صورة حتى لو حاول من أدوات المطور. قيم الكوبون صارت محكومة في قاعدة البيانات. لو المجموع بعد الخصم أقل من نصف دولار، الطلب ما ينشأ — Polar ما يقبل هالمبلغ.",
    "what_en": "Buyers/members can’t upload an avatar even via developer tools. Coupon values are enforced in the database. If the total after discount is under fifty cents, no order is created — Polar won’t accept that amount.",
    "why_ar": "رفع صور عشوائية من أي حساب يملأ التخزين ويُستغل. كوبون ١٥٠٪ أو صفر يكسر الحسابات. طلب معلّق بـ ٠$ يضل معلّق بدون دفع.",
    "why_en": "Any-account avatar uploads fill storage and can be abused. A 150% or zero coupon breaks math. A $0 pending order sits forever with no payment.",
    "how_ar": "تلقائي. لو زبون يشوف رسالة الحد الأدنى، يحتاج منتجات أغلى أو يزيل كوبون يصفّر السعر.",
    "how_en": "Automatic. If a shopper sees the minimum message, they need higher-priced items or must remove a coupon that zeros the price.",
    "benefits_ar": "لك: تخزين أنظف وكوبونات صحيحة. للزبون: رسالة واضحة بدل فشل دفع غامض.",
    "benefits_en": "For you: cleaner storage and sane coupons. For shoppers: a clear message instead of a mysterious payment failure."
  }'::jsonb,
  1060
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Avatar lock, coupon rules, and $0.50 checkout floor'
);
