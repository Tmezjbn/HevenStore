-- Owner internal log: popular sort + safer login + Arabic page direction.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'ترتيب الأكثر مبيعاً وتسجيل دخول أوضح',
  'Popular sort and safer sign-in',
  'ترتيب «الأكثر مبيعاً» صار يعدّ المبيعات الحقيقية بعد الدفع، وصفحة الدخول ما عاد تكشف إن الحساب موجود أو لا، والعربية تقرأ بالاتجاه الصحيح في الصفحات الرئيسية.',
  '“Most popular” now counts real paid sales, sign-in no longer reveals whether an account exists, and Arabic reads the right direction on main store pages.',
  '',
  '',
  '{
    "what_ar": "كل عملية دفع ناجحة تزيد عدّاد مبيعات المنتج، فترتيب الأكثر مبيعاً في المتجر يعكس الواقع. رسالة تسجيل الدخول صارت واحدة سواء غلط الاسم أو كلمة المرور — ما عاد أحد يقدر يخمن إن الحساب موجود. وصفحات الرئيسية والمتجر والمنتج والبائع تقرأ العربية من اليمين لليسار بشكل صحيح.",
    "what_en": "Every successful payment bumps the product’s sales counter, so Most popular in the store matches reality. Sign-in shows one message for wrong username or wrong password — nobody can tell if an account exists. Home, store, product, and seller pages now read Arabic right-to-left correctly.",
    "why_ar": "ترتيب وهمي يضلّل الزبون. رسالة دخول مختلفة تكشف الحسابات للمخترقين. ونص عربي باتجاه إنجليزي يبان مكسور.",
    "why_en": "A fake popularity order misleads shoppers. Different login errors leak accounts to attackers. Arabic text in an English direction looks broken.",
    "how_ar": "العدّاد يزيد تلقائياً بعد الدفع. لا تحتاج تفعل شيء. جرّب تسجيل دخول باسم غلط — الرسالة نفسها ككلمة مرور غلط.",
    "how_en": "The counter updates automatically after payment. Nothing for you to configure. Try signing in with a wrong username — same message as a wrong password.",
    "benefits_ar": "للزبون: منتجات مشهورة حقيقية وعربية مريحة. لك: متجر أوضح وأصعب للاستطلاع الخبيث عن الحسابات.",
    "benefits_en": "For shoppers: real bestsellers and comfortable Arabic. For you: a clearer store that’s harder to probe for accounts."
  }'::jsonb,
  1020
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Popular sort and safer sign-in'
);
