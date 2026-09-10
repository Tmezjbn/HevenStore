-- Owner changelog: structured lesson (what / why / how / benefits) instead of freeform body edit.

ALTER TABLE public.owner_changelog_entries
  ADD COLUMN IF NOT EXISTS lesson_json jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Safer checkout and payments
UPDATE public.owner_changelog_entries SET
  summary_ar = 'الدفع والطلبات صارت أأمن: السعر والمخزون من السيرفر، والمفتاح ما يوصل إلا بعد تأكيد الدفع.',
  summary_en = 'Checkout is safer: price and stock come from the server, and keys unlock only after payment is confirmed.',
  lesson_json = '{
    "what_ar": "غيّرنا طريقة إتمام الطلب. المتصفح ما عاد يقرر السعر ولا يخصم من المخزون بنفسه. السيرفر هو اللي يثبّت الطلب، ويتأكد من الدفع، وبعدها يسلّم المفتاح الرقمي.",
    "what_en": "We changed how checkout works. The browser no longer decides the price or reduces stock on its own. The server locks in the order, confirms payment, then delivers the digital key.",
    "why_ar": "لو السعر أو المخزون يعتمد على الجهاز، يقدر أحد يلاعب الصفحة ويطلب بسعر غلط أو يخصم مخزون وهو ما دفع. نبي المتجر يثق فيه الزبون، ونبي أصحاب المتجر ينامون مرتاحين.",
    "why_en": "If price or stock depended on the shopper’s device, someone could tamper with the page and buy at the wrong price or drain stock without paying. Shoppers need to trust the store, and you need orders you can rely on.",
    "how_ar": "لما تضغط «اشترِ»، السيرفر يعيد حساب السعر من قاعدة البيانات، يتحقق من الكوبون والمخزون، وينشئ طلب معلّق. Polar يؤكد الدفع. بعدها فقط ينفتح المفتاح أو الاشتراك. صلاحيات الموظفين على بيانات العملاء صارت أضيق — يشوفون اللي يحتاجونه للشغل مو أكثر.",
    "how_en": "When someone hits buy, the server recalculates price from the database, checks the coupon and stock, and creates a pending order. Polar confirms payment. Only then does the key or subscription unlock. Staff access to customer data is narrower — enough to do the job, not more.",
    "benefits_ar": "للزبون: يدفع وهو مطمئن إن السعر اللي شافه هو اللي يتحاسب عليه، والمفتاح يجي بعد الدفع الحقيقي. لك: أقل تلاعب، مخزون أدق، وأقل وجع راس في الشكاوى «دفعت وما وصلني شيء» أو «السعر تغيّر».",
    "benefits_en": "For shoppers: the price they saw is the price they pay, and the key arrives after real payment. For you: less tampering, more accurate stock, and fewer “I paid but got nothing” or “the price changed” headaches."
  }'::jsonb
WHERE title_en = 'Safer checkout and payments';

-- Store fixes and faster browsing
UPDATE public.owner_changelog_entries SET
  summary_ar = 'صفحات الاشتراكات وبطاقات الهدايا والكوبونات اشتغلت صح، والمتجر يفتح أخف وأسرع.',
  summary_en = 'Subscriptions, gift cards, and coupons work correctly, and the store opens lighter and faster.',
  lesson_json = '{
    "what_ar": "أصلحنا صفحات كانت تتعطل أو تبطئ: الاشتراكات، بطاقات الهدايا، والكوبونات. وخفّفنا أول تحميل للصفحة عشان الزائر ما يستنى كثير.",
    "what_en": "We fixed pages that broke or felt slow: subscriptions, gift cards, and coupons. We also lightened the first page load so visitors wait less.",
    "why_ar": "صفحة مكسورة = زبون يمشي. صفحة ثقيلة على الجوال = نفس الشيء. المتجر الرقمي يعيش على الثقة والسرعة مع بعض.",
    "why_en": "A broken page loses the sale. A heavy page on mobile does the same. A digital store lives on trust and speed together.",
    "how_ar": "أصلحنا مسارات الاشتراكات والهدايا والكوبونات. الفيديو يتوقف لما يطلع برّة الشاشة عشان ما يأكل البطارية. قائمة المنتجات تتجزأ على دفعات بدل تحميل الكل دفعة واحدة. الخطوط والحركة ما عاد تعيق أول فتح.",
    "how_en": "We fixed the subscription, gift-card, and coupon flows. Video pauses when it leaves the screen so it does not burn battery. The product list loads in pages instead of all at once. Fonts and motion no longer block the first open.",
    "benefits_ar": "الزبون يلاقي اللي يبيه بسرعة ويكمل شراء من غير عثرة. أنت تشوف أقل بلاغات «الصفحة ما تشتغل» وأداء أوضح على الجوال.",
    "benefits_en": "Shoppers find what they want faster and finish checkout without stumbling. You get fewer “the page is broken” reports and clearer mobile performance."
  }'::jsonb
WHERE title_en = 'Store fixes and faster browsing';

-- Clearer pages and easier access
UPDATE public.owner_changelog_entries SET
  summary_ar = 'عناوين أوضح لمحركات البحث، ونوافذ أسهل بالكيبورد، وتنظيف لواجهات قديمة ما نستخدمها.',
  summary_en = 'Clearer search titles, keyboard-friendlier dialogs, and cleanup of unused old UI.',
  lesson_json = '{
    "what_ar": "خلّينا الصفحات أوضح لمحركات البحث وللناس اللي تستخدم الكيبورد أو قارئ الشاشة، وحذفنا قطع لوحة قديمة ما عاد أحد يحتاجها.",
    "what_en": "We made pages clearer for search engines and for people using a keyboard or screen reader, and removed old admin pieces nobody needed anymore.",
    "why_ar": "لو جوجل ما يفهم عنوان الصفحة، المتجر يضيع في النتائج. ولو النافذة تحبس المؤشر أو ما تنقفل بـ Escape، الناس تتعب — خاصة اللي يعتمدون على الكيبورد.",
    "why_en": "If search cannot read a page title, the store gets lost in results. If a dialog traps focus or will not close with Escape, people get stuck — especially keyboard users.",
    "how_ar": "أضفنا عناوين ووصف وخريطة موقع. نوافذ الحوار تبقي التركيز داخلها وتنقفل بـ Escape. حسّنا التباين والتسميات. شلنا مكوّنات لوحة قديمة غير مستخدمة عشان ما تلخبط التطوير.",
    "how_en": "We added page titles, descriptions, and a sitemap. Dialogs keep focus inside and close with Escape. Contrast and labels improved. Unused old admin components were removed so they stop cluttering the product.",
    "benefits_ar": "فرص ظهور أفضل في البحث، تجربة أوضح للجميع، وكود أنظف يسهّل التحديثات الجاية بدون مفاجآت من شاشات ميتة.",
    "benefits_en": "Better chance to show up in search, a clearer experience for everyone, and cleaner code so future updates are less surprising."
  }'::jsonb
WHERE title_en = 'Clearer pages and easier access';

-- Ready for live traffic
UPDATE public.owner_changelog_entries SET
  summary_ar = 'لو صار خطأ ما ينهار الموقع قدام الزبون، وفيه حماية أقوى وفحوصات قبل ما ننشر.',
  summary_en = 'Unexpected errors no longer crash the page for visitors, with stronger headers and checks before release.',
  lesson_json = '{
    "what_ar": "جهّزنا المتجر لاستقبال زوار حقيقيين: شاشة آمنة وقت الخطأ، رؤوس أمان أقوى، وفحوصات تلقائية قبل النشر.",
    "what_en": "We prepared the store for real traffic: a safe error screen, stronger security headers, and automatic checks before release.",
    "why_ar": "الموقع اللي ينهار قدام الزبون يخسر الثقة فوراً. واللي ينشر بدون فحص قد يكسّر الدفع أو الحسابات بدون ما ينتبه أحد.",
    "why_en": "A store that crashes in front of a shopper loses trust instantly. Shipping without checks can break payments or accounts before anyone notices.",
    "how_ar": "أي خطأ غير متوقع يطلع شاشة هادئة بدل صفحة بيضاء. أضفنا رؤوس أمان، وREADME للفريق، وأوامر npm test تتأكد من قواعد الدفع والحسابات قبل ما تعتمد التغيير.",
    "how_en": "Unexpected errors show a calm screen instead of a blank break. We added security headers, a team README, and npm test checks that guard payment and account rules before you ship.",
    "benefits_ar": "الزائر ما يشوف فوضى تقنية. أنت تنشر وأنت واثق إن الأساسيات (دفع وحسابات) ما انكسرت في الطريق.",
    "benefits_en": "Visitors do not see a technical mess. You ship knowing the basics — payments and accounts — were not broken on the way out."
  }'::jsonb
WHERE title_en = 'Ready for live traffic';

-- Editable policies and changelogs
UPDATE public.owner_changelog_entries SET
  summary_ar = 'تقدر تعدّل الخصوصية والشروط من الإعدادات، وتنشر تحديثات للزوار من هالصفحة.',
  summary_en = 'You can edit Privacy and Terms in Settings, and publish visitor updates from this page.',
  lesson_json = '{
    "what_ar": "صار عندك مكانين واضحين للتحديثات: سجل داخلي لك أنت كمالك، وسجل عام يظهر للزوار. وكمان تقدر تعدّل سياسة الخصوصية وشروط الخدمة من الإعدادات بدون ما تلمس الكود.",
    "what_en": "You now have two clear update places: an internal log for you as owner, and a public log for visitors. You can also edit Privacy and Terms in Settings without touching code.",
    "why_ar": "القوانين والنصوص تتغير. لو كل مرة تحتاج مطوّر عشان جملة في الخصوصية، الموضوع يطيح. والزوار يستاهلون يعرفون وش تغيّر في المتجر بلغة بسيطة.",
    "why_en": "Legal text and store news change. If every Privacy tweak needs a developer, it stalls. Visitors deserve plain updates about what changed in the store.",
    "how_ar": "من الإعدادات → القانوني تعدّل الخصوصية والشروط. من هالصفحة: السجل الداخلي للمالك فقط (بهالشكل التعليمي تحت «المزيد»). السجل العام ينحفظ ويظهر في /changelog وتحت الموارد في التذييل.",
    "how_en": "Settings → Legal edits Privacy and Terms. On this page: the internal log is owner-only (with the teaching layout under More details). The public log saves and shows at /changelog and under Resources in the footer.",
    "benefits_ar": "تتحكم بالنصوص بسرعة، توضّح للزوار التحديثات، وتخلي السجل الداخلي مرجع لك ولفريقك بدون ما يتشاف للعالم.",
    "benefits_en": "You control legal copy quickly, explain updates to visitors, and keep the internal log as a private reference for you and your team."
  }'::jsonb
WHERE title_en = 'Editable policies and changelogs';
