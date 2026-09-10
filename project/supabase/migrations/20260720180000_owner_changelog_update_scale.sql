-- Big vs small owner changelog. Existing granular ship notes stay "small".
-- Jul 11–20 milestones promoted / synthesized as "big".

ALTER TABLE public.owner_changelog_entries
  ADD COLUMN IF NOT EXISTS update_scale text NOT NULL DEFAULT 'small';

ALTER TABLE public.owner_changelog_entries
  DROP CONSTRAINT IF EXISTS owner_changelog_entries_update_scale_check;

ALTER TABLE public.owner_changelog_entries
  ADD CONSTRAINT owner_changelog_entries_update_scale_check
  CHECK (update_scale IN ('big', 'small'));

CREATE INDEX IF NOT EXISTS owner_changelog_entries_scale_sort_idx
  ON public.owner_changelog_entries (update_scale, sort_order DESC, entry_date DESC);

-- Promote the Jul 11 audit / platform milestones (already written as big themes).
UPDATE public.owner_changelog_entries
SET update_scale = 'big'
WHERE title_en IN (
  'Safer checkout and payments',
  'Store fixes and faster browsing',
  'Clearer pages and easier access',
  'Ready for live traffic',
  'Editable policies and changelogs',
  'Checkout & access audit (phases 1–3)',
  'Store fixes & performance (phases 4–5)',
  'SEO, a11y & cleanup (phases 6–8)',
  'Production ops (phase 9)',
  'Editable policies & changelogs'
);

-- Synthesize Jul 11–20 big chapters (idempotent by title_en).
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order, update_scale
)
SELECT
  v.entry_date, v.title_ar, v.title_en, v.summary_ar, v.summary_en,
  '', '', v.lesson_json::jsonb, v.sort_order, 'big'
FROM (VALUES
  (
    '2026-07-14'::date,
    'مسار المال والمخزون أكثر أماناً',
    'Money path and stock stay honest',
    'الدفع والمخزون والكوبونات محمية على الخادم — أقل فرصة لطلب يدفع أقل أو يخصم مرتين.',
    'Payments, stock, and coupons stay server-guarded — less chance of underpay or double-claim.',
    '{
      "what_ar": "شدّينا مسار الدفع والمخزون وحدّ الكوبون وأرضية الدفع، مع خصوصية أوضح لحسابات الأعضاء والمشترين.",
      "what_en": "We tightened the payment and stock path, coupon rules, and checkout floor, plus clearer privacy for member and buyer profiles.",
      "why_ar": "أي ثغرة في المال أو المخزون تكلّف ثقة وفلوس. الخصوصية الخاطئة تعرض بيانات الناس.",
      "why_en": "Any money or stock hole costs trust and cash. Wrong privacy exposes people.",
      "how_ar": "تلقائي بعد التحديث — الدفع والطلبات تمر على الخادم. راجع الطلبات والكوبونات من لوحة التحكم.",
      "how_en": "Automatic after deploy — checkout and orders run through the server. Review orders and coupons in the dashboard.",
      "benefits_ar": "طلبات أوضح، مخزون أصدق، وحسابات أهدأ.",
      "benefits_en": "Clearer orders, honest stock, calmer accounts."
    }'::text,
    1752500000001::bigint
  ),
  (
    '2026-07-15'::date,
    'تقييمات حقيقية من مشترين دفعوا',
    'Real ratings from buyers who paid',
    'المشترون اللي اشتروا يقدرون يقيّمون المنتج. التقييمات تبني ثقة أوضح من النجوم الوهمية.',
    'Buyers who purchased can rate the product. Real reviews beat fake-looking stars.',
    '{
      "what_ar": "أضفنا تقييمات للمشترين بعد الدفع، مع نافذة أوضح وتبريد وتصحيحات للعربية، وتخفيف تأثير النجوم المنخفضة على المتوسط.",
      "what_en": "We added post-purchase buyer ratings, a clearer reviews modal with cooldown, Arabic punctuation fixes, and softer impact from low stars on the average.",
      "why_ar": "النجوم بدون رأي حقيقي ما تقنع. تقييم من مشترٍ فعلي يغيّر قرار الشراء.",
      "why_en": "Stars without a real voice do not convince. A paid buyer’s rating changes the purchase decision.",
      "how_ar": "على صفحة المنتج — فقط من اشترى يقيّم. المتوسط يتحدّث لوحده.",
      "how_en": "On the product page — only buyers who paid can rate. The average updates itself.",
      "benefits_ar": "ثقة أوضح للزائر ومتوسط يعكس التجربة.",
      "benefits_en": "Clearer shopper trust and an average that reflects experience."
    }'::text,
    1752500000002::bigint
  ),
  (
    '2026-07-18'::date,
    'واجهة المتجر أوضح وأسرع',
    'Clearer, faster storefront shopping',
    'كروت المنتجات، الاقتراحات، البنر، وشاشة التحميل — التسوق يبان أنظف وأسهل.',
    'Product cards, suggestions, the ad banner, and the loading screen — shopping feels cleaner and easier.',
    '{
      "what_ar": "حسّنا كروت الكتالوج وأزرار السلة، اقتراحات «المزيد من الخزنة»، ارتفاع البنر، وترتيب العربية، وشاشة تحميل بهوية HEVEN عند أول فتح.",
      "what_en": "We improved catalog cards and cart buttons, “more from the vault” suggestions, ad banner height, Arabic layout, and a HEVEN brand loading screen on first open.",
      "why_ar": "التسوق البطيء أو المبهم يخلّي الزبون يتردد قبل الدفع.",
      "why_en": "Slow or muddy shopping makes people hesitate before paying.",
      "how_ar": "تلقائي في المتجر — تصفّح المنتجات وحدّث الصفحة وشوف الفرق.",
      "how_en": "Automatic in the store — browse products and refresh to see the difference.",
      "benefits_ar": "تصفح أهدأ، أسعار أوضح، وانطباع أول أقوى.",
      "benefits_en": "Calmer browse, clearer prices, stronger first impression."
    }'::text,
    1752500000003::bigint
  ),
  (
    '2026-07-20'::date,
    'لوحة المالك بهوية الخزنة',
    'Owner dashboard, vault identity',
    'صفحة المنتجات والتصنيفات والمستخدمين والطلبات صارت أوضح للمالك — نفس هوية الخزنة، مو لوحة رخيصة منفصلة.',
    'Products, categories, users, and orders screens feel clearer for the owner — same vault identity, not a cheap separate admin.',
    '{
      "what_ar": "أعادنا تصميم أسطح المالك: كتالوج المنتجات مع نبض المخزون، شجرة التصنيفات، سجل المستخدمين، ودفتر الطلبات — مع تمييز الصفحة الحالية في الشريط الجانبي.",
      "what_en": "We redesigned owner surfaces: product catalog with a stock pulse, category tree, user roster, and orders ledger — plus a clear active page in the sidebar.",
      "why_ar": "لوحة ضعيفة تخلي إدارة المتجر بطيئة وتبان غير موثوقة حتى لو المتجر نفسه ممتاز.",
      "why_en": "A weak admin slows store ops and feels untrustworthy even when the shopfront is strong.",
      "how_ar": "من لوحة التحكم كمالك — المنتجات، التصنيفات، المستخدمون، الطلبات.",
      "how_en": "From the dashboard as owner — Products, Categories, Users, Orders.",
      "benefits_ar": "إدارة أسرع ونفس إحساس العلامة داخل لوحة التحكم.",
      "benefits_en": "Faster ops and the same brand feel inside the dashboard."
    }'::text,
    1752500000004::bigint
  )
) AS v(entry_date, title_ar, title_en, summary_ar, summary_en, lesson_json, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e WHERE e.title_en = v.title_en
);
