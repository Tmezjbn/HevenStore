-- Owner internal log: dashboard breadcrumbs + confirm-email next + modal close AR.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'مسار أوضح في اللوحة وتأكيد بريد يرجّع للمكان الصح',
  'Clearer dashboard path and confirm-email returns you',
  'لوحة التحكم فيها مسار صفحات (مثل المنتجات → تعديل)، ورابط تأكيد البريد يرجّع الزبون للمكان اللي كان رايح له، وأزرار إغلاق النوافذ صارت عربية/إنجليزية.',
  'The dashboard shows a page trail (like Products → Edit), email confirm links return shoppers where they were headed, and modal close controls are Arabic/English.',
  '',
  '',
  '{
    "what_ar": "فوق محتوى اللوحة يظهر مسار صغير يوضح وين أنت. بعد ما الزبون يأكد بريده، يقدر يرجع لصفحة الدفع أو السلة لو كان جاي منها. إغلاق النوافذ المنبثقة صار بلغتك.",
    "what_en": "Above dashboard content a small trail shows where you are. After a shopper confirms email, they can return to checkout or cart if that’s where they came from. Popup close controls match the site language.",
    "why_ar": "تعديل منتج بدون مسار يضلّل. تأكيد بريد يرجّع للرئيسية يقطع الشراء. زر Close الإنجليزي يكسر العربية.",
    "why_en": "Editing a product with no trail is disorienting. Confirm email dumping to home breaks checkout. An English-only Close breaks Arabic UX.",
    "how_ar": "تلقائي في اللوحة وصفحات الحساب.",
    "how_en": "Automatic in the dashboard and account pages.",
    "benefits_ar": "لك ولفريقك: تنقّل أسرع في اللوحة. للزبون: يكمل شراءه بعد تأكيد البريد.",
    "benefits_en": "For you and staff: faster dashboard navigation. For shoppers: they can finish buying after confirming email."
  }'::jsonb,
  1080
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Clearer dashboard path and confirm-email returns you'
);
