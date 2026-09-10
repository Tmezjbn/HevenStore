-- Owner internal log: clearer errors, safer reset, faster assets.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'أخطاء أوضح وصفحة منتج لا تكذب عليك',
  'Clearer errors and product page tells the truth',
  'صفحة المنتج تفرّق بين «غير موجود» و«مشكلة شبكة»، رابط استعادة كلمة المرور ما يفتح إلا من الإيميل، والتواريخ في الإشعارات بلغة الموقع، والأصول تُخزَّن في المتصفح أسرع.',
  'Product page separates “not found” from a network problem, password-reset only opens from the email link, notification dates match the site language, and static assets cache longer in the browser.',
  '',
  '',
  '{
    "what_ar": "لو انقطع النت، صفحة المنتج تقول جرّب مرة ثانية بدل ما تقول المنتج اختفى. استعادة كلمة المرور ما تشتغل لو بس فاتح حسابك عادي. الإشعارات والتواريخ صارت بلغتك.",
    "what_en": "If the network fails, the product page says try again instead of claiming the product vanished. Password reset only works from the email link, not a normal signed-in visit. Notification dates match your language.",
    "why_ar": "خلط خطأ الشبكة مع «غير موجود» يضيّع الزبون. فتح استعادة كلمة المرور لأي جلسة خطر.",
    "why_en": "Mixing a network blip with “not found” confuses shoppers. Opening password reset for any session is unsafe.",
    "how_ar": "تلقائي بعد النشر.",
    "how_en": "Automatic after deploy.",
    "benefits_ar": "زبون أوضح، حساب أأمن، متجر أسرع للزوار المتكررين.",
    "benefits_en": "Clearer shoppers, safer accounts, faster return visits."
  }'::jsonb,
  1090
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Clearer errors and product page tells the truth'
);
