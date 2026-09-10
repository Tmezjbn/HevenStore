-- Plain-language summary for owner changelog (details stay in body_*).

ALTER TABLE public.owner_changelog_entries
  ADD COLUMN IF NOT EXISTS summary_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary_en text NOT NULL DEFAULT '';

-- Rewrite existing audit seeds into owner-friendly copy (by English title).
UPDATE public.owner_changelog_entries SET
  title_ar = 'طلبات ودفع أكثر أماناً',
  title_en = 'Safer checkout and payments',
  summary_ar = 'الطلبات والأسعار والمخزون تُدار بأمان على الخادم. حسابات العملاء محمية بشكل أفضل.',
  summary_en = 'Orders, prices, and stock are handled securely on the server. Customer accounts are better protected.',
  body_ar = 'لم يعد المتصفح يتحكم في أسعار الطلب أو المخزون. المفاتيح الرقمية تُسلَّم فقط بعد تأكيد الدفع. صلاحيات الموظفين لرؤية بيانات العملاء أصبحت أضيق.',
  body_en = 'The browser no longer controls order prices or stock. Digital keys unlock only after payment is confirmed. Staff access to customer data is narrower.'
WHERE title_en IN (
  'Checkout & access audit (phases 1–3)',
  'Safer checkout and payments'
);

UPDATE public.owner_changelog_entries SET
  title_ar = 'تحسينات المتجر والسرعة',
  title_en = 'Store fixes and faster browsing',
  summary_ar = 'صفحات الاشتراكات وبطاقات الهدايا تعمل. التصفح أصبح أخف وأسرع.',
  summary_en = 'Subscriptions and gift-card pages work correctly. Browsing feels lighter and faster.',
  body_ar = 'أُصلحت صفحات الاشتراكات وبطاقات الهدايا والكوبونات. الفيديو يتوقف خارج الشاشة. قائمة المنتجات تُحمَّل على دفعات. الخطوط والعناصر المتحركة لا تبطئ أول فتح للصفحة.',
  body_en = 'Subscriptions, gift cards, and coupons were fixed. Video pauses when off-screen. The product list loads in pages. Fonts and motion no longer slow the first page open.'
WHERE title_en IN (
  'Store fixes & performance (phases 4–5)',
  'Store fixes and faster browsing'
);

UPDATE public.owner_changelog_entries SET
  title_ar = 'وضوح للزوار وإمكانية وصول أفضل',
  title_en = 'Clearer pages and easier access',
  summary_ar = 'عناوين الصفحات أوضح لمحركات البحث، والنوافذ أسهل لوحة المفاتيح، وتم تنظيف واجهات غير مستخدمة.',
  summary_en = 'Page titles are clearer for search, dialogs work better with keyboard, and unused UI pieces were cleaned up.',
  body_ar = 'أُضيفت عناوين ووصف للصفحات وخريطة موقع. نوافذ الحوار تُبقي التركيز داخلها ويمكن إغلاقها بمفتاح Escape. تحسين التباين والتسميات. حُذفت مكوّنات لوحة قديمة غير مستخدمة.',
  body_en = 'Page titles, descriptions, and a sitemap were added. Dialogs keep focus inside and close with Escape. Contrast and labels improved. Unused old admin UI pieces were removed.'
WHERE title_en IN (
  'SEO, a11y & cleanup (phases 6–8)',
  'Clearer pages and easier access'
);

UPDATE public.owner_changelog_entries SET
  title_ar = 'جاهزية التشغيل',
  title_en = 'Ready for live traffic',
  summary_ar = 'أخطاء أقل وضوحاً للزوار، وحماية أقوى للرؤوس، وفحوصات تلقائية قبل النشر.',
  summary_en = 'Errors are handled more cleanly for visitors, security headers are stronger, and automatic checks run before release.',
  body_ar = 'عند حدوث خطأ غير متوقع تظهر شاشة آمنة بدل انهيار الصفحة. أُضيفت رؤوس أمان وملف README وفحوصات npm test للتأكد من قواعد الدفع والحسابات.',
  body_en = 'Unexpected errors show a safe screen instead of a broken page. Security headers, a README, and npm test checks protect payment and account rules.'
WHERE title_en IN (
  'Production ops (phase 9)',
  'Ready for live traffic'
);

UPDATE public.owner_changelog_entries SET
  title_ar = 'سياسات وسجل تحديثات',
  title_en = 'Editable policies and changelogs',
  summary_ar = 'يمكنك تعديل سياسة الخصوصية وشروط الخدمة من الإعدادات، ونشر تحديثات للزوار من هنا.',
  summary_en = 'You can edit Privacy and Terms in Settings, and publish visitor updates from this page.',
  body_ar = 'سياسة الخصوصية وشروط الخدمة تُحرَّران من لوحة الإعدادات. هذا السجل الداخلي للمالك فقط. السجل العام يظهر للزوار تحت «الموارد».',
  body_en = 'Privacy and Terms are editable in Settings. This internal log is owner-only. The public changelog appears for visitors under Resources.'
WHERE title_en IN (
  'Editable policies & changelogs',
  'Editable policies and changelogs'
);

-- Any other rows: if summary empty, copy first line of body as summary (one-time backfill).
UPDATE public.owner_changelog_entries
SET
  summary_en = CASE
    WHEN trim(summary_en) = '' AND trim(body_en) <> '' THEN left(body_en, 160)
    ELSE summary_en
  END,
  summary_ar = CASE
    WHEN trim(summary_ar) = '' AND trim(body_ar) <> '' THEN left(body_ar, 160)
    ELSE summary_ar
  END
WHERE trim(summary_en) = '' OR trim(summary_ar) = '';
