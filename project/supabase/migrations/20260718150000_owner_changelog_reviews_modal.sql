-- Owner internal log: reviews modal compose, no edit, post-delete cooldown.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-18'::date,
  'تقييمات أوضح — نافذة + بدون تعديل',
  'Reviews modal, no edit, cooldown',
  'إضافة التقييم تفتح نافذة في الوسط بخلفية ضبابية. ما فيه تعديل بعد النشر، وبعد الحذف ساعة انتظار. وما عاد فيه «سجّل الدخول» على القائمة الفاضية.',
  'Add a review opens a centered blurred modal. No edit after post; one-hour wait after delete. Empty lists no longer say “Sign in.”',
  '',
  '',
  '{
    "what_ar": "تقييم المنتج صار أوضح: زر «أضف تقييماً» يفتح نافذة في الوسط بخلفية ضبابية. ما عاد فيه تعديل بعد النشر، وبعد الحذف تنتظر ساعة قبل تقييم نفس المنتج. وما عاد تظهر رسالة «سجّل الدخول» لما ما فيه تقييمات.",
    "what_en": "Product reviews are clearer: “Add a review” opens a centered modal with a blurred backdrop. No editing after you post. After delete you wait one hour before reviewing the same product again. Empty lists no longer push “Sign in to review.”",
    "why_ar": "النموذج المفتوح فوق القائمة يكرّر النص ويحس بالفوضى. التعديل اللانهائي يشجّع السبام. ورسالة تسجيل الدخول فوق صفحة فاضية تضايق الزائر.",
    "why_en": "An always-open form above the list feels cluttered and repeats your text. Endless edits invite spam. A sign-in nag on an empty list annoys visitors who just want to read.",
    "how_ar": "اشترِ المنتج → صفحة المنتج → أضف تقييماً. لو حذفت، انتظر ساعة. الزوار يشوفون القائمة بس بدون ضغط تسجيل.",
    "how_en": "Buy the product → product page → Add a review. If you delete, wait one hour. Visitors see the list without a login push.",
    "benefits_ar": "تجربة أنظف، ثقة أعلى، وأقل إساءة استخدام.",
    "benefits_en": "Cleaner UX, more trust, less abuse."
  }'::jsonb,
  1200
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Reviews modal, no edit, cooldown'
);
