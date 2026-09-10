-- Owner internal log: checkout/login rate limits.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'حماية من محاولات الدفع والدخول المتكررة',
  'Protection from rapid checkout and login attempts',
  'المتجر يحدّ محاولات إنشاء الطلب وتسجيل الدخول وفحص اسم المستخدم في الدقيقة، عشان يقلّ الإساءة والضغط على النظام.',
  'The store limits how often checkout, login lookup, and username checks can run per minute, cutting abuse and load.',
  '',
  '',
  '{
    "what_ar": "لو أحد يضغط دفع أو دخول كثير بسرعة، النظام يطلب منه ينتظر دقيقة. الزبون العادي ما يلاحظ.",
    "what_en": "If someone hammers pay or login too fast, the system asks them to wait a minute. Normal shoppers won’t notice.",
    "why_ar": "بدون حد، سكربتات تقدر تملأ الطلبات أو تجرب أسماء مستخدمين بلا توقف.",
    "why_en": "Without a cap, scripts can spam pending orders or probe usernames nonstop.",
    "how_ar": "تلقائي على الخادم بعد تطبيق التحديث.",
    "how_en": "Automatic on the server after you apply the update.",
    "benefits_ar": "حسابات أوضح، ضغط أقل، متجر أهدأ تحت الهجوم.",
    "benefits_en": "Clearer accounts, less load, calmer store under attack."
  }'::jsonb,
  1110
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Protection from rapid checkout and login attempts'
);
