-- Owner internal log: buyer/member private profiles (no photo, no public find).
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, sort_order
)
SELECT
  '2026-07-14'::date,
  'خصوصية الأعضاء والمشترين',
  'Member and buyer profile privacy',
  'الأعضاء والمشترون ما يقدرون يغيّرون صورة الحساب، وصفحتهم العامة ما تنفتح إلا للموظفين من لوحة التحكم.',
  'Members and buyers cannot change their photo, and their public profile is not findable — only staff can open them from the dashboard.',
  '',
  '',
  '{
    "what_ar": "حساب العضو والمشتري صار خاص أكثر: ما فيه زر تغيير الصورة، وما أحد من الزوار يقدر يفتح صفحتهم بـ /seller أو يلاقيهم بالبحث العام. الموظفون (مالك/أدمن/مشرف) يشوفونهم من المستخدمين والطلبات كالعادة.",
    "what_en": "Member and buyer accounts are more private: no Change photo control, and visitors cannot open them via /seller or public lookup. Staff (owner/admin/moderator) still find them in Users and Orders as usual.",
    "why_ar": "هذي حسابات متسوقين مو بائعين. صورة عامة أو رابط ملف يفتح للجميع ما يناسب خصوصية الزبون، وقد يُستغل للتحرش أو السبام.",
    "why_en": "These are shopper accounts, not storefront sellers. A public photo or profile URL does not fit buyer privacy and can be abused for spam or harassment.",
    "how_ar": "من ملفي الشخصي: العضو/المشتري يشوف حرف الاسم بدل زر الصورة. رابط /seller لاسم مستخدم عضو يرجع «غير متاح». البائعون والموظفون يبقون بصفحات عامة وصورة اختيارية.",
    "how_en": "On My Profile, members/buyers see a letter avatar with no photo button. /seller for a member username returns unavailable. Sellers and staff keep public pages and optional photos.",
    "benefits_ar": "للمتسوق: خصوصية أعلى. لك: أقل ملفات عامة فاضيّة، وأوضح إن الصفحة العامة للبائعين والطاقم فقط.",
    "benefits_en": "For shoppers: stronger privacy. For you: fewer empty public profiles, and a clearer rule that public pages are for sellers and staff."
  }'::jsonb,
  1100
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Member and buyer profile privacy'
);
