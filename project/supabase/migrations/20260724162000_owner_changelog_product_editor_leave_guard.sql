-- Owner internal log: product editor asks before leaving with unsaved edits.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-24'::date,
  'تعديلات المنتج غير المحفوظة تسأل قبل المغادرة',
  'Unsaved product edits ask before leaving',
  'لو غيّرت منتجاً وحاولت تطلع بدون حفظ، المتصفح يسألك قبل ما تضيع التعديلات.',
  'If you change a product and try to leave without saving, the browser asks first so edits are not lost.',
  '',
  '',
  '{
    "what_ar": "محرر المنتج صار يوقفك بسؤال تأكيد لما فيه تغييرات غير محفوظة وتحاول تغادر الصفحة أو تغلق التبويب.",
    "what_en": "The product editor now confirms when you try to leave the page or close the tab with unsaved changes.",
    "why_ar": "تعديلات طويلة (وصف، مفاتيح، صور) كانت تضيع بهدوء لو ضغطت رجوع أو غيّرت الصفحة.",
    "why_en": "Long edits (copy, keys, images) were silently lost on Back or a page change.",
    "how_ar": "لوحة التحكم ← المنتجات ← عدّل منتجاً ← غيّر شيئاً ← اضغط رجوع أو انتقل لصفحة أخرى. ألغِ للبقاء، أو أكّد للمغادرة. بعد الحفظ المغادرة بدون سؤال.",
    "how_en": "Dashboard → Products → Edit a product → change something → press Back or go elsewhere. Cancel to stay, or confirm to leave. After Save, leaving stays quiet.",
    "benefits_ar": "أقل فقدان للتعديلات، وطمأنينة أوضح وأنت تبني العروض.",
    "benefits_en": "Fewer lost edits, and clearer peace of mind while you build listings."
  }'::jsonb,
  'small',
  1784938200000
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Unsaved product edits ask before leaving'
);
