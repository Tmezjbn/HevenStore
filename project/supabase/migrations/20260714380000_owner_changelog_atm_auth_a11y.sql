-- Owner internal log: smoother atmosphere + clearer auth forms.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'أجواء أخف ونماذج دخول أوضح',
  'Smoother atmosphere and clearer sign-in forms',
  'تأثيرات الخلفية أخف أثناء التمرير، وصفحات الدخول/التسجيل فيها تسميات ظاهرة وتلميح «8 أحرف» لكلمة المرور.',
  'Background effects are lighter while scrolling, and sign-in/register forms show visible labels plus an “8 characters” password hint.',
  '',
  '',
  '{
    "what_ar": "تمرير الصفحة مع أجواء الموقع صار أنعم. حقول الدخول والتسجيل صارت بعناوين ظاهرة، وكلمة المرور فيها تلميح دائم: ٨ أحرف على الأقل.",
    "what_en": "Scrolling with site atmosphere on feels smoother. Sign-in and register fields have visible titles, and passwords always show: at least 8 characters.",
    "why_ar": "حسابات كثيرة أثناء التمرير تبطّئ الجهاز. حقل بدون عنوان يصعّب الاستخدام لقارئ الشاشة والناس الجدد.",
    "why_en": "Too much work on every scroll frame slows phones. Fields with only placeholders are harder for screen readers and new users.",
    "how_ar": "تلقائي. ما تحتاج إعداد.",
    "how_en": "Automatic. Nothing to configure.",
    "benefits_ar": "للزبون: دخول أوضح وجهاز أخف. لك: متجر يحس أسرع بدون ما تغيّر شيء.",
    "benefits_en": "For shoppers: clearer auth and a lighter device. For you: a snappier store with no settings to touch."
  }'::jsonb,
  1070
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Smoother atmosphere and clearer sign-in forms'
);
