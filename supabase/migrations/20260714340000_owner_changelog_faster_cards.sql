-- Owner internal log: faster store cards + bigger ad dots.
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'بطاقات أسرع ونقاط إعلان أوضح',
  'Faster product cards and clearer ad dots',
  'صفحة المتجر والرئيسية صارت أخف (جلب بيانات البائعين دفعة واحدة)، ونقاط شريط الإعلانات أسهل للمس على الجوال.',
  'Store and home pages load lighter (seller info fetched in one batch), and ad-banner dots are easier to tap on phones.',
  '',
  '',
  '{
    "what_ar": "بدل ما الموقع يطلب بيانات كل بائع لوحده، صار يجيبها مرة واحدة. والصفحة الرئيسية ما عاد تسحب قائمة المنتجات مرتين. نقاط التنقل في إعلان المنتجات صارت مساحة لمس أكبر على الجوال.",
    "what_en": "Instead of asking for each seller one by one, the site now loads them in one request. The home page no longer pulls the product list twice. Ad-banner dots have a larger tap target on phones.",
    "why_ar": "طلبات كثيرة = بطء على الجوال والإنترنت الضعيف. نقاط صغيرة يصعب ضغطها.",
    "why_en": "Too many requests means slow phones and weak networks. Tiny dots are hard to tap.",
    "how_ar": "تشتغل تلقائياً بعد التحديث. ما تحتاج إعداد.",
    "how_en": "Works automatically after the update. No settings to change.",
    "benefits_ar": "للزبون: تصفح أسرع ولمس أسهل. لك: متجر يحس أخف بدون ما تغيّر شيء.",
    "benefits_en": "For shoppers: snappier browsing and easier taps. For you: a lighter-feeling store with nothing to configure."
  }'::jsonb,
  1040
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Faster product cards and clearer ad dots'
);
