import { supabase } from './supabase';

/** Public changelog shown under Resources — written by owners. */
export interface ChangelogEntry {
  id: string;
  date: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
}

export const DEFAULT_USER_CHANGELOG: ChangelogEntry[] = [];

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyChangelogEntry(): ChangelogEntry {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newId(),
    date: today,
    title_ar: '',
    title_en: '',
    body_ar: '',
    body_en: '',
  };
}

export function parseUserChangelog(raw: string): ChangelogEntry[] {
  if (!raw.trim()) return DEFAULT_USER_CHANGELOG;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_USER_CHANGELOG;
    const out: ChangelogEntry[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      out.push({
        id: typeof o.id === 'string' && o.id ? o.id : newId(),
        date: typeof o.date === 'string' ? o.date : '',
        title_ar: typeof o.title_ar === 'string' ? o.title_ar : '',
        title_en: typeof o.title_en === 'string' ? o.title_en : '',
        body_ar: typeof o.body_ar === 'string' ? o.body_ar : '',
        body_en: typeof o.body_en === 'string' ? o.body_en : '',
      });
    }
    return out;
  } catch {
    return DEFAULT_USER_CHANGELOG;
  }
}

/** Teachable “more details” for owner log (what / why / how / benefits). */
export interface OwnerChangelogLesson {
  what_ar: string;
  what_en: string;
  why_ar: string;
  why_en: string;
  how_ar: string;
  how_en: string;
  benefits_ar: string;
  benefits_en: string;
}

export const EMPTY_OWNER_LESSON: OwnerChangelogLesson = {
  what_ar: '',
  what_en: '',
  why_ar: '',
  why_en: '',
  how_ar: '',
  how_en: '',
  benefits_ar: '',
  benefits_en: '',
};

export function parseOwnerLesson(raw: unknown): OwnerChangelogLesson {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_OWNER_LESSON };
  const o = raw as Record<string, unknown>;
  const s = (k: keyof OwnerChangelogLesson) => (typeof o[k] === 'string' ? (o[k] as string) : '');
  return {
    what_ar: s('what_ar'),
    what_en: s('what_en'),
    why_ar: s('why_ar'),
    why_en: s('why_en'),
    how_ar: s('how_ar'),
    how_en: s('how_en'),
    benefits_ar: s('benefits_ar'),
    benefits_en: s('benefits_en'),
  };
}

export function lessonHasContent(lesson: OwnerChangelogLesson, ar: boolean): boolean {
  const pick = (a: string, e: string) => (ar ? a || e : e || a).trim();
  return !!(
    pick(lesson.what_ar, lesson.what_en) ||
    pick(lesson.why_ar, lesson.why_en) ||
    pick(lesson.how_ar, lesson.how_en) ||
    pick(lesson.benefits_ar, lesson.benefits_en)
  );
}

/** Seeded teaching copy (used until DB lesson_json is filled / after migration). */
export const OWNER_LESSON_SEEDS: Record<string, OwnerChangelogLesson> = {
  'Readable order numbers for shoppers and staff': {
    what_ar:
      'أضفنا رقم طلب واضح يظهر في صفحة نجاح الدفع وطلبات المشتري والبائع ولوحة الفريق. يمكن البحث بهذا الرقم. المعرّف التقني الطويل يبقى للنظام والدعم عند الحاجة.',
    what_en:
      'We added a clear order number on checkout success, buyer and seller order lists, and the staff dashboard. You can search by that number. The long technical ID stays for the system and support when needed.',
    why_ar:
      'معرّفات طويلة صعبة على الزبون والدعم عند المتابعة أو الإلغاء. رقم قصير يقلل الأخطاء ويسهّل المحادثة.',
    why_en:
      'Long IDs are hard for shoppers and support when following up or cancelling. A short number cuts mistakes and makes chat easier.',
    how_ar:
      'تلقائي بعد التحديث — افتح طلباتي أو الطلبات في اللوحة؛ الرقم يظهر كنص قصير مثل ORD-20260723-00000001. ابحث بنفس الرقم.',
    how_en:
      'Automatic after deploy — open My Orders or Orders in the dashboard; the number shows as short text like ORD-20260723-00000001. Search with that same number.',
    benefits_ar:
      'تواصل أوضح مع الزبائن، بحث أسرع، وتأكيد إلغاء/حذف أسهل بدون لصق معرّفات طويلة.',
    benefits_en:
      'Clearer customer talk, faster search, and easier cancel/delete confirm without pasting long IDs.',
  },
  'Live support tickets in the dashboard': {
    what_ar:
      'أضفنا رتبة «الدعم» لدردشة التذاكر من لوحة التحكم (الدعم). الفريق يأخذ التذكرة، يرد بالمحادثة، ويرفع الحالات المهمة. فيه قناة بائعين لمشتري ذلك البائع، وصندوق بائعين يظهر لفريق الدعم. المشرف لم يعد يدير المنتجات — يتعامل مع التذاكر المصعّدة ومراجعة التقييمات. لكل وكيل دعم مستوى ثقة يبدأ من ١٠٠؛ رفض التصعيد غير المناسب يخصم ١٥، وإذا وصل ٤٠ أو أقل يتوقف عن التصعيد حتى يعيد المالك أو الأدمن الضبط.',
    what_en:
      'We added a Support staff role for live chat tickets in the dashboard (Support). Agents claim a ticket, chat with the customer, and escalate important cases. Sellers get a channel for buyers of their shop, and Support sees a Sellers bin. Moderators no longer manage products — they handle escalated tickets and review moderation. Each support agent starts with a trust score of 100; a rejected escalation drops it by 15, and at 40 or below they cannot escalate until an owner or admin resets it.',
    why_ar:
      'الدعم لازم يعيش داخل المتجر بصلاحيات واضحة: رد سريع للحالات العادية، وتصعيد منظّم لما يحتاج رتب أعلى — مو رسائل مشتتة خارج اللوحة.',
    why_en:
      'Help should live inside the store with clear roles: fast replies for everyday cases, and orderly handoff when something needs a higher rank — not scattered messages outside the dashboard.',
    how_ar:
      'لوحة التحكم ← الدعم. امنح رتبة دعم من المستخدمون. الوكيل يأخذ التذكرة ويرد؛ الحالات المهمة تُرفع، والرتب الأعلى تقدر ترفض التصعيد غير المناسب. قناة البائع لمشتريه فقط. راجع مستوى ثقة الدعم من المستخدمون عند الحاجة وأعد الضبط.',
    how_en:
      'Dashboard → Support. Grant the Support role from Users. Agents claim and reply; important cases get escalated, and higher ranks can reject a bad escalation. The seller channel is only for that seller’s buyers. Check support trust from Users when needed and reset it.',
    benefits_ar:
      'رد أسرع للزبائن، تصعيد أوضح للمهم، بائعون يساعدون مشتريهم، ومشرفون على الشكاوى الحساسة والتقييمات بدل تشتيت المنتجات.',
    benefits_en:
      'Faster customer replies, clearer handoff for important cases, sellers helping their own buyers, and moderators on sensitive tickets and reviews instead of product busywork.',
  },
  'Adjustable storefront UI scale': {
    what_ar:
      'أضفنا خيار «حجم الواجهة» بجانب إعدادات السمة. يغيّر حجم النصوص والمسافات في المتجر معًا.',
    what_en:
      'We added a “UI scale” option beside theme defaults. It changes storefront type and spacing together.',
    why_ar:
      'الشاشات وأذواق الكثافة تختلف، بينما تكبير المتصفح يجب أن يبقى بيد الزائر لسهولة الوصول.',
    why_en:
      'Screens and density preferences vary, while browser zoom should remain under each visitor’s accessibility control.',
    how_ar: 'لوحة التحكم ← الثيمات ← حجم الواجهة ← اختر النسبة ← حفظ الإعدادات.',
    how_en: 'Dashboard → Themes → UI scale → choose a percentage → Save defaults.',
    benefits_ar: 'متجر أكثف افتراضيًا، مع تحكم واضح ودعم أفضل للجوال والتكبير.',
    benefits_en:
      'A denser default storefront with clear control and better phone and zoom support.',
  },
  'Smoother storefront navigation': {
    what_ar:
      'ثبّتنا حركة الشريط العلوي وأزلنا الومضة والقفزة عند الانتقال بين الرئيسية وتصفح المتجر.',
    what_en:
      'We stabilized the top bar motion and removed the flash and jump between Home and Explore Store.',
    why_ar: 'القفزات الصغيرة أثناء التصفح تجعل المتجر يبدو أبطأ وأقل اكتمالًا.',
    why_en: 'Small jumps while browsing make the store feel slower and less finished.',
    how_ar: 'تلقائي — تنقّل بين الرئيسية وتصفح المتجر، ثم مرّر الصفحة للأعلى والأسفل.',
    how_en: 'Automatic — switch between Home and Explore Store, then scroll up and down.',
    benefits_ar: 'تصفح أهدأ، إحساس أسرع، وتركيز أوضح على المنتجات.',
    benefits_en: 'Calmer browsing, a faster feel, and clearer focus on products.',
  },
  'Light and dark expand from the sun': {
    what_ar:
      'عند التبديل بين الوضع الفاتح والداكن، اللون الجديد ينتشر من زر الشمس/القمر حتى يغطي الصفحة.',
    what_en:
      'When switching light and dark, the new look expands from the sun/moon button until it covers the page.',
    why_ar: 'تبديل فجائي يقطع الإحساس بالمتجر. الحركة من الزر تخلّي التغيير مفهومًا وممتعًا.',
    why_en:
      'A hard cut breaks the store feel. Expanding from the button makes the change clear and pleasant.',
    how_ar: 'من الشريط العلوي — اضغط أيقونة الشمس أو القمر.',
    how_en: 'From the top bar — press the sun or moon icon.',
    benefits_ar: 'تبديل أوضح وأكثر أناقة بدون إرباك الزائر.',
    benefits_en: 'A clearer, more polished switch without jarring the shopper.',
  },
  'Light mode follows each skin color': {
    what_ar: 'عدّلنا خلفيات الوضع الفاتح لكل سمة حتى تميل للون الأساسي بدل الورق الأبيض.',
    what_en:
      'We retinted every skin’s light mode so surfaces follow the main color instead of plain white paper.',
    why_ar: 'أبيض كامل يقطع هوية السمة ويجعل المتجر يبدو عامًا.',
    why_en: 'Pure white breaks skin identity and makes the store feel generic.',
    how_ar: 'من الشريط العلوي — اختر سمة ثم بدّل للوضع الفاتح.',
    how_en: 'From the top bar — pick a skin, then switch to light mode.',
    benefits_ar: 'فاتح وداكن يبقون نفس العائلة اللونية للمتجر.',
    benefits_en: 'Light and dark stay in the same color family for the store.',
  },
  'Money path and stock stay honest': {
    what_ar:
      'شدّينا مسار الدفع والمخزون وحدّ الكوبون وأرضية الدفع، مع خصوصية أوضح لحسابات الأعضاء والمشترين.',
    what_en:
      'We tightened the payment and stock path, coupon rules, and checkout floor, plus clearer privacy for member and buyer profiles.',
    why_ar: 'أي ثغرة في المال أو المخزون تكلّف ثقة وفلوس. الخصوصية الخاطئة تعرض بيانات الناس.',
    why_en: 'Any money or stock hole costs trust and cash. Wrong privacy exposes people.',
    how_ar: 'تلقائي بعد التحديث — الدفع والطلبات تمر على الخادم. راجع الطلبات والكوبونات من لوحة التحكم.',
    how_en:
      'Automatic after deploy — checkout and orders run through the server. Review orders and coupons in the dashboard.',
    benefits_ar: 'طلبات أوضح، مخزون أصدق، وحسابات أهدأ.',
    benefits_en: 'Clearer orders, honest stock, calmer accounts.',
  },
  'Real ratings from buyers who paid': {
    what_ar:
      'أضفنا تقييمات للمشترين بعد الدفع، مع نافذة أوضح وتبريد وتصحيحات للعربية، وتخفيف تأثير النجوم المنخفضة على المتوسط.',
    what_en:
      'We added post-purchase buyer ratings, a clearer reviews modal with cooldown, Arabic punctuation fixes, and softer impact from low stars on the average.',
    why_ar: 'النجوم بدون رأي حقيقي ما تقنع. تقييم من مشترٍ فعلي يغيّر قرار الشراء.',
    why_en:
      'Stars without a real voice do not convince. A paid buyer’s rating changes the purchase decision.',
    how_ar: 'على صفحة المنتج — فقط من اشترى يقيّم. المتوسط يتحدّث لوحده.',
    how_en: 'On the product page — only buyers who paid can rate. The average updates itself.',
    benefits_ar: 'ثقة أوضح للزائر ومتوسط يعكس التجربة.',
    benefits_en: 'Clearer shopper trust and an average that reflects experience.',
  },
  'Clearer, faster storefront shopping': {
    what_ar:
      'حسّنا كروت الكتالوج وأزرار السلة، اقتراحات «المزيد من الخزنة»، ارتفاع البنر، وترتيب العربية، وشاشة تحميل بهوية HEVEN عند أول فتح.',
    what_en:
      'We improved catalog cards and cart buttons, “more from the vault” suggestions, ad banner height, Arabic layout, and a HEVEN brand loading screen on first open.',
    why_ar: 'التسوق البطيء أو المبهم يخلّي الزبون يتردد قبل الدفع.',
    why_en: 'Slow or muddy shopping makes people hesitate before paying.',
    how_ar: 'تلقائي في المتجر — تصفّح المنتجات وحدّث الصفحة وشوف الفرق.',
    how_en: 'Automatic in the store — browse products and refresh to see the difference.',
    benefits_ar: 'تصفح أهدأ، أسعار أوضح، وانطباع أول أقوى.',
    benefits_en: 'Calmer browse, clearer prices, stronger first impression.',
  },
  'Owner dashboard, vault identity': {
    what_ar:
      'أعادنا تصميم أسطح المالك: كتالوج المنتجات مع نبض المخزون، شجرة التصنيفات، سجل المستخدمين، ودفتر الطلبات — مع تمييز الصفحة الحالية في الشريط الجانبي.',
    what_en:
      'We redesigned owner surfaces: product catalog with a stock pulse, category tree, user roster, and orders ledger — plus a clear active page in the sidebar.',
    why_ar: 'لوحة ضعيفة تخلي إدارة المتجر بطيئة وتبان غير موثوقة حتى لو المتجر نفسه ممتاز.',
    why_en:
      'A weak admin slows store ops and feels untrustworthy even when the shopfront is strong.',
    how_ar: 'من لوحة التحكم كمالك — المنتجات، التصنيفات، المستخدمون، الطلبات.',
    how_en: 'From the dashboard as owner — Products, Categories, Users, Orders.',
    benefits_ar: 'إدارة أسرع ونفس إحساس العلامة داخل لوحة التحكم.',
    benefits_en: 'Faster ops and the same brand feel inside the dashboard.',
  },
  'Cleaner first load — brand loading screen': {
    what_ar:
      'لما تفتح الموقع أو تحدث الصفحة، تشوف شاشة تحميل بهوية HEVEN بدل ما المحتوى يظهر قطعة قطعة.',
    what_en:
      'Opening or refreshing the site shows a HEVEN loading screen instead of content popping in piece by piece.',
    why_ar: 'الظهور المتقطع للكروت والقائمة كان يبان غير مرتب ويقلل الإحساس بالثقة.',
    why_en: 'Pieces of the page popping in felt unfinished and less trustworthy.',
    how_ar: 'تلقائي — حدّث أي صفحة في المتجر وشوف الشاشة القصيرة.',
    how_en: 'Automatic — refresh any store page and you’ll see the short splash.',
    benefits_ar: 'أول انطباع أنظف وأهدأ.',
    benefits_en: 'A cleaner, calmer first impression.',
  },
  'Catalog cards — clearer prices and cart buttons': {
    what_ar:
      'بطاقات المتجر صارت أوضح: اسم أقصر، سعر أبرز، زر «أضف للسلة» أوضح، وتحذير المخزون المنخفض كشارة صغيرة. الشبكة ما عاد تضغط خمس بطاقات بصف واحد على الشاشات العريضة.',
    what_en:
      'Store product cards are clearer: tighter titles, stronger prices, a solid Add to Cart button, and low-stock as a small chip. Wide screens no longer cram five cards in one row.',
    why_ar:
      'العناوين الكبيرة والشبكة الضيقة كانت تخلّي البطاقة فوضوية ويصعب قراءة السعر والضغط على الشراء.',
    why_en:
      'Huge titles and a cramped five-column grid made cards noisy and made price and buy harder to scan.',
    how_ar: 'افتح صفحة الألعاب أو الرئيسية — نفس شكل البطاقة في كل الكتالوج.',
    how_en: 'Open Games or Home — the same card style across the catalog.',
    benefits_ar: 'تصفّح أسرع، وقرار شراء أوضح.',
    benefits_en: 'Faster browsing and a clearer buy decision.',
  },
  'More from the vault — clearer product suggestions': {
    what_ar:
      'قسم «المزيد» تحت صفحة المنتج تغيّر: عنوان أوضح، أسهم للأمام/الخلف، وبطاقات أوضح مع ظل خفيف على الاسم.',
    what_en:
      'The “more products” block under a product page is clearer: stronger title, prev/next arrows, and tiles with a readable name scrim.',
    why_ar:
      'القسم القديم كان يبان فاضي أو مشوّش، خصوصاً لما صورة المنتج ناقصة. الزبون يحتاج يشوف خيارات ثانية بسرعة.',
    why_en:
      'The old block felt empty or messy, especially when a product image was missing. Shoppers need other options at a glance.',
    how_ar: 'افتح أي منتج → انزل لتحت → «المزيد من الخزنة». جرّب الأسهم أو الإيقاف.',
    how_en: 'Open any product → scroll down → “More from the vault.” Try the arrows or pause.',
    benefits_ar: 'اكتشاف أسهل لمنتجات ثانية، وأقل لخبطة بصرية.',
    benefits_en: 'Easier discovery of other products, less visual confusion.',
  },
  'Arabic reviews — punctuation stays in place': {
    what_ar:
      'لو كتبت تقييم بالعربي وبعده علامات مثل !!!!، تظهر بعد الكلمة مو قبلها. وزر حذف تقييمك صار تحت النص.',
    what_en:
      'Arabic review text with trailing marks like !!!! now stays after the word, not before it. Your delete control sits under the review text.',
    why_ar:
      'الاتجاه الخاطئ للنص كان يخلي علامات التعجب تقفز لليسار. والحذف فوق التقييم كان سهل بالغلط.',
    why_en:
      'Wrong text direction made exclamation marks jump to the left. Delete up top was too easy to hit by mistake.',
    how_ar: 'تلقائي بعد التحديث — اكتب تقييم عربي وجرّب الحذف تحت النص.',
    how_en: 'Automatic after deploy — post an Arabic review and use delete under the text.',
    benefits_ar: 'نص أوضح، وأقل حذف بالخطأ.',
    benefits_en: 'Clearer text, fewer accidental deletes.',
  },
  'Soft ratings — low stars barely move the score': {
    what_ar:
      'تقييم المنتج ما عاد ينزل بسرعة من تقييم واحد ضعيف. مثال: منتج بخمس نجوم + تقييم بثلاث نجوم ≈ ٤.٩، والنجمة الخامسة تبان شبه ممتلئة.',
    what_en:
      'A single low review barely moves the product score. Example: 5.0 product + one 3-star ≈ 4.9, with the fifth star still mostly filled.',
    why_ar:
      'تقييم واحد غاضب كان يخلي المنتج يبان ضعيف فوراً. نبي الحقيقة تطلع مع كثرة التقييمات، مو من صوت واحد.',
    why_en:
      'One angry review used to crash the stars overnight. We want the score to reflect volume of opinion, not a single voice.',
    how_ar:
      'تلقائي بعد التحديث. كل ما زادت التقييمات المنخفضة، الرقم ينزل أكثر — بس ببطء في البداية.',
    how_en:
      'Automatic after deploy. More low reviews still pull the score down — just gently at first.',
    benefits_ar:
      'منتجات جديدة تبقى جذابة، والتقييمات الكثيرة تظل صادقة.',
    benefits_en:
      'New products stay attractive, while lots of reviews still tell the truth.',
  },
  'Reviews modal, no edit, cooldown': {
    what_ar:
      'تقييم المنتج صار أوضح: زر «أضف تقييماً» يفتح نافذة في الوسط بخلفية ضبابية. ما عاد فيه تعديل بعد النشر، وبعد الحذف تنتظر ساعة قبل تقييم نفس المنتج. وما عاد تظهر رسالة «سجّل الدخول» لما ما فيه تقييمات.',
    what_en:
      'Product reviews are clearer: “Add a review” opens a centered modal with a blurred backdrop. No editing after you post. After delete you wait one hour before reviewing the same product again. Empty lists no longer push “Sign in to review.”',
    why_ar:
      'النموذج المفتوح فوق القائمة يكرّر النص ويحس بالفوضى. التعديل اللانهائي يشجّع السبام. ورسالة تسجيل الدخول فوق صفحة فاضية تضايق الزائر.',
    why_en:
      'An always-open form above the list feels cluttered and repeats your text. Endless edits invite spam. A sign-in nag on an empty list annoys visitors who just want to read.',
    how_ar:
      'اشترِ المنتج → صفحة المنتج → أضف تقييماً. لو حذفت، انتظر ساعة. الزوار يشوفون القائمة بس بدون ضغط تسجيل.',
    how_en:
      'Buy the product → product page → Add a review. If you delete, wait one hour. Visitors see the list without a login push.',
    benefits_ar:
      'تجربة أنظف، ثقة أعلى، وأقل إساءة استخدام.',
    benefits_en:
      'Cleaner UX, more trust, less abuse.',
  },
  'Ad banner height + steady Get it now': {
    what_ar:
      'من منشئ الموقع تقدر تختار ارتفاع بانر الإعلانات (قصير / متوسط / طويل / أطول). وزر «احصل عليه الآن!» يثبت مكانه لما تنتقل بين المنتجات.',
    what_en:
      'In Website Builder you can set the ad banner height (short / medium / tall / extra tall). The “Get it now!” button stays put when you switch products.',
    why_ar:
      'البانر الطويل ياخذ مساحة كبيرة على الجوال. والزر اللي يتحرك مع الشريحة يشتت ويحس إن الصفحة ترتج.',
    why_en:
      'A tall banner eats mobile space. A button that slides with each product feels jumpy and distracts from the CTA.',
    how_ar:
      'منشئ الموقع → الرئيسية → منتجات بانر الإعلانات → ارتفاع البانر. احفظ الأقسام. جرّب الأسهم على الصفحة الرئيسية.',
    how_en:
      'Website Builder → Home → Ad banner products → Banner height. Save sections. Try the arrows on the homepage.',
    benefits_ar:
      'تحكم أوضح بمساحة الصفحة، وزر شراء ثابت يسهل الضغط عليه.',
    benefits_en:
      'Clearer control over page space, and a steady buy button that’s easier to hit.',
  },
  'Safer checkout and payments': {
    what_ar:
      'غيّرنا طريقة إتمام الطلب. المتصفح ما عاد يقرر السعر ولا يخصم من المخزون بنفسه. السيرفر هو اللي يثبّت الطلب، ويتأكد من الدفع، وبعدها يسلّم المفتاح الرقمي.',
    what_en:
      'We changed how checkout works. The browser no longer decides the price or reduces stock on its own. The server locks in the order, confirms payment, then delivers the digital key.',
    why_ar:
      'لو السعر أو المخزون يعتمد على الجهاز، يقدر أحد يلاعب الصفحة ويطلب بسعر غلط أو يخصم مخزون وهو ما دفع. نبي المتجر يثق فيه الزبون، ونبي أصحاب المتجر ينامون مرتاحين.',
    why_en:
      'If price or stock depended on the shopper’s device, someone could tamper with the page and buy at the wrong price or drain stock without paying. Shoppers need to trust the store, and you need orders you can rely on.',
    how_ar:
      'لما تضغط «اشترِ»، السيرفر يعيد حساب السعر من قاعدة البيانات، يتحقق من الكوبون والمخزون، وينشئ طلب معلّق. Polar يؤكد الدفع. بعدها فقط ينفتح المفتاح أو الاشتراك. صلاحيات الموظفين على بيانات العملاء صارت أضيق — يشوفون اللي يحتاجونه للشغل مو أكثر.',
    how_en:
      'When someone hits buy, the server recalculates price from the database, checks the coupon and stock, and creates a pending order. Polar confirms payment. Only then does the key or subscription unlock. Staff access to customer data is narrower — enough to do the job, not more.',
    benefits_ar:
      'للزبون: يدفع وهو مطمئن إن السعر اللي شافه هو اللي يتحاسب عليه، والمفتاح يجي بعد الدفع الحقيقي. لك: أقل تلاعب، مخزون أدق، وأقل وجع راس في الشكاوى «دفعت وما وصلني شيء» أو «السعر تغيّر».',
    benefits_en:
      'For shoppers: the price they saw is the price they pay, and the key arrives after real payment. For you: less tampering, more accurate stock, and fewer “I paid but got nothing” or “the price changed” headaches.',
  },
  'Store fixes and faster browsing': {
    what_ar:
      'أصلحنا صفحات كانت تتعطل أو تبطئ: الاشتراكات، بطاقات الهدايا، والكوبونات. وخفّفنا أول تحميل للصفحة عشان الزائر ما يستنى كثير.',
    what_en:
      'We fixed pages that broke or felt slow: subscriptions, gift cards, and coupons. We also lightened the first page load so visitors wait less.',
    why_ar:
      'صفحة مكسورة = زبون يمشي. صفحة ثقيلة على الجوال = نفس الشيء. المتجر الرقمي يعيش على الثقة والسرعة مع بعض.',
    why_en:
      'A broken page loses the sale. A heavy page on mobile does the same. A digital store lives on trust and speed together.',
    how_ar:
      'أصلحنا مسارات الاشتراكات والهدايا والكوبونات. الفيديو يتوقف لما يطلع برّة الشاشة عشان ما يأكل البطارية. قائمة المنتجات تتجزأ على دفعات بدل تحميل الكل دفعة واحدة. الخطوط والحركة ما عاد تعيق أول فتح.',
    how_en:
      'We fixed the subscription, gift-card, and coupon flows. Video pauses when it leaves the screen so it does not burn battery. The product list loads in pages instead of all at once. Fonts and motion no longer block the first open.',
    benefits_ar:
      'الزبون يلاقي اللي يبيه بسرعة ويكمل شراء من غير عثرة. أنت تشوف أقل بلاغات «الصفحة ما تشتغل» وأداء أوضح على الجوال.',
    benefits_en:
      'Shoppers find what they want faster and finish checkout without stumbling. You get fewer “the page is broken” reports and clearer mobile performance.',
  },
  'Clearer pages and easier access': {
    what_ar:
      'خلّينا الصفحات أوضح لمحركات البحث وللناس اللي تستخدم الكيبورد أو قارئ الشاشة، وحذفنا قطع لوحة قديمة ما عاد أحد يحتاجها.',
    what_en:
      'We made pages clearer for search engines and for people using a keyboard or screen reader, and removed old admin pieces nobody needed anymore.',
    why_ar:
      'لو جوجل ما يفهم عنوان الصفحة، المتجر يضيع في النتائج. ولو النافذة تحبس المؤشر أو ما تنقفل بـ Escape، الناس تتعب — خاصة اللي يعتمدون على الكيبورد.',
    why_en:
      'If search cannot read a page title, the store gets lost in results. If a dialog traps focus or will not close with Escape, people get stuck — especially keyboard users.',
    how_ar:
      'أضفنا عناوين ووصف وخريطة موقع. نوافذ الحوار تبقي التركيز داخلها وتنقفل بـ Escape. حسّنا التباين والتسميات. شلنا مكوّنات لوحة قديمة غير مستخدمة عشان ما تلخبط التطوير.',
    how_en:
      'We added page titles, descriptions, and a sitemap. Dialogs keep focus inside and close with Escape. Contrast and labels improved. Unused old admin components were removed so they stop cluttering the product.',
    benefits_ar:
      'فرص ظهور أفضل في البحث، تجربة أوضح للجميع، وكود أنظف يسهّل التحديثات الجاية بدون مفاجآت من شاشات ميتة.',
    benefits_en:
      'Better chance to show up in search, a clearer experience for everyone, and cleaner code so future updates are less surprising.',
  },
  'Ready for live traffic': {
    what_ar:
      'جهّزنا المتجر لاستقبال زوار حقيقيين: شاشة آمنة وقت الخطأ، رؤوس أمان أقوى، وفحوصات تلقائية قبل النشر.',
    what_en:
      'We prepared the store for real traffic: a safe error screen, stronger security headers, and automatic checks before release.',
    why_ar:
      'الموقع اللي ينهار قدام الزبون يخسر الثقة فوراً. واللي ينشر بدون فحص قد يكسّر الدفع أو الحسابات بدون ما ينتبه أحد.',
    why_en:
      'A store that crashes in front of a shopper loses trust instantly. Shipping without checks can break payments or accounts before anyone notices.',
    how_ar:
      'أي خطأ غير متوقع يطلع شاشة هادئة بدل صفحة بيضاء. أضفنا رؤوس أمان، وREADME للفريق، وأوامر npm test تتأكد من قواعد الدفع والحسابات قبل ما تعتمد التغيير.',
    how_en:
      'Unexpected errors show a calm screen instead of a blank break. We added security headers, a team README, and npm test checks that guard payment and account rules before you ship.',
    benefits_ar:
      'الزائر ما يشوف فوضى تقنية. أنت تنشر وأنت واثق إن الأساسيات (دفع وحسابات) ما انكسرت في الطريق.',
    benefits_en:
      'Visitors do not see a technical mess. You ship knowing the basics — payments and accounts — were not broken on the way out.',
  },
  'Editable policies and changelogs': {
    what_ar:
      'صار عندك مكانين واضحين للتحديثات: سجل داخلي لك أنت كمالك، وسجل عام يظهر للزوار. وكمان تقدر تعدّل سياسة الخصوصية وشروط الخدمة من الإعدادات بدون ما تلمس الكود.',
    what_en:
      'You now have two clear update places: an internal log for you as owner, and a public log for visitors. You can also edit Privacy and Terms in Settings without touching code.',
    why_ar:
      'القوانين والنصوص تتغير. لو كل مرة تحتاج مطوّر عشان جملة في الخصوصية، الموضوع يطيح. والزوار يستاهلون يعرفون وش تغيّر في المتجر بلغة بسيطة.',
    why_en:
      'Legal text and store news change. If every Privacy tweak needs a developer, it stalls. Visitors deserve plain updates about what changed in the store.',
    how_ar:
      'من الإعدادات → القانوني تعدّل الخصوصية والشروط. من هالصفحة: السجل الداخلي للمالك فقط (بهالشكل التعليمي تحت «المزيد»). السجل العام ينحفظ ويظهر في /updates وتحت الموارد في التذييل.',
    how_en:
      'Settings → Legal edits Privacy and Terms. On this page: the internal log is owner-only (with the teaching layout under More details). The public log saves and shows at /updates and under Resources in the footer.',
    benefits_ar:
      'تتحكم بالنصوص بسرعة، توضّح للزوار التحديثات، وتخلي السجل الداخلي مرجع لك ولفريقك بدون ما يتشاف للعالم.',
    benefits_en:
      'You control legal copy quickly, explain updates to visitors, and keep the internal log as a private reference for you and your team.',
  },
  'Jump opens sections + any video link': {
    what_ar:
      'قائمة «انتقال» تفتح القسم المطوي وتوصلك له. ولصق فيديو العرض يقبل أي رابط https (يوتيوب، فيميو، MP4، أو غيرهم).',
    what_en:
      'Jump opens a collapsed section and scrolls to it. Showcase paste accepts any https link (YouTube, Vimeo, MP4, or other).',
    why_ar:
      'النموذج طويل — القفز بدون فتح = ما تشوف شيء. وتحذير الروابط كان يوقفك عن لصق فيديو تبيه.',
    why_en:
      'The form is long — jump without open means you see nothing. The host warning blocked pasting the video you want.',
    how_ar:
      'منتجات → عدّل → قائمة انتقال على اليمين. وفي الوسائط الصق الرابط واضغط تطبيق.',
    how_en:
      'Products → Edit → Jump list on the right. In Media, paste the URL and apply.',
    benefits_ar:
      'تعديل أسرع، وفيديو من أي مصدر بدون رسالة حمراء توقفك.',
    benefits_en:
      'Faster editing, and video from any source without a red stop warning.',
  },
  'Card effect denser + gradient tint': {
    what_ar:
      'تحسين تأثير جسم البطاقة: الماتريكس أكمل وأكثر ثباتاً، مع خيار تدرج لوني (لونان) من محرر المنتج.',
    what_en:
      'Card-body effects improved: denser, steadier matrix rain, plus an optional two-color gradient from the product editor.',
    why_ar: 'التأثير كان يبان ناقص أو يعيد الظهور أثناء التمرير، ولون واحد ما يكفي لكل المنتجات.',
    why_en:
      'The effect sometimes looked sparse or restarted while scrolling, and a single tint did not suit every product.',
    how_ar: 'منتجات → عدّل → تأثير جسم البطاقة → فعّل «تدرج لوني» واختر اللون الثاني.',
    how_en: 'Products → Edit → Card body effect → turn on Gradient color and pick the second color.',
    benefits_ar: 'بطاقات أوضح وأجمل بدون تشتيت أثناء التصفح.',
    benefits_en: 'Clearer, nicer cards without jank while browsing.',
  },
  'Ad blade style + carousel polish': {
    what_ar:
      'شرائط حافة بانر الإعلانات صارت قابلة لضبط الحجم واللون والشفافية من منشئ الموقع. والنص العربي يبدأ من الحافة صح، وأسهم التنقل وألوان زر «احصل عليه الآن!» عند المرور رجعت، والصور تتنقّل تلقائياً.',
    what_en:
      'Ad banner blade strips can be sized, colored, and set for opacity in Website Builder. Arabic blade text starts at the edge correctly, carousel arrows and Get it now hover color/motion are back, and slides auto-advance again.',
    why_ar: 'الشرائط كانت تبان مقطوعة بالعربي، والأسهم مقلوبة، والزر بدون حياة — والبانر يوقف عن التنقّل بعد أي نقرة.',
    why_en:
      'Arabic blades looked cut off mid-phrase, arrows faced the wrong way, the CTA felt dead on hover, and any click permanently stopped the carousel.',
    how_ar: 'منشئ الموقع → قسم الإعلانات → شرائط الحافة. على الرئيسية مرّر على الزر وجرّب الأسهم.',
    how_en: 'Website Builder → Ads section → Blade edge strips. On Home, hover the button and try the arrows.',
    benefits_ar: 'بانر أوضح، تحكم أوثق بالمظهر، وتنقّل أسهل للزائر.',
    benefits_en: 'Clearer banner, tighter look control, easier browsing for shoppers.',
  },
  'Three showcase embeds + ads / no-ads': {
    what_ar:
      'محرر المنتج يقبل حتى 3 تضمينات فيديو، ولكل واحدة رابط مع إعلانات ورابط بدون. تختار أي تضمين وأي نسخة هي الافتراضية. في صفحة المنتج يظهر تبديل ومعاينات للفيديوهات المعبّأة.',
    what_en:
      'Product editor accepts up to 3 video embeds; each has a with-ads and without-ads link. You pick which embed and which version is default. On the product page, shoppers get a toggle and thumbs for filled embeds.',
    why_ar: 'رابط واحد ما يكفي لما عندك أكثر من عرض، وبعض الزوار يفضّلون فيديو بدون إعلانات.',
    why_en:
      'One link is not enough when you have several demos, and some shoppers prefer a no-ads stream.',
    how_ar:
      'منتجات → عدّل → عرض المنتج → عبّي تضمين 1–3 واختر الافتراضي. على صفحة المنتج بدّل «مع إعلانات / بدون».',
    how_en:
      'Products → Edit → Showcase → fill Embed 1–3 and set the default. On the product page, switch With ads / No ads.',
    benefits_ar: 'مرونة أكثر للدعم والإعلان، وتجربة أوضح للزائر.',
    benefits_en: 'More flexibility for support vs ads, clearer choice for the shopper.',
  },
  'Feature Products! shortcut from catalog': {
    what_ar:
      'بجانب عدّاد المنتجات زر «ميّز المنتجات!» يفتح قائمة تمييز هنا: رئيسية + تصفح المتجر، بحث، تحديد الكل، ترتيب، وحفظ.',
    what_en:
      'Beside the product count, “Feature Products!” opens the featuring menu here: Home + Explore Store, search, select all, reorder, and save.',
    why_ar:
      'ما يحتاج تفتح منشئ الموقع عشان تميّز منتجات — القائمة صارت في الكتالوج.',
    why_en:
      'No need to open Website Builder just to feature products — the menu lives on the catalog.',
    how_ar:
      'منتجات → ميّز المنتجات! → اختر/رتّب → حفظ التمييز.',
    how_en:
      'Products → Feature Products! → pick/reorder → Save featuring.',
    benefits_ar:
      'تمييز أسرع من نفس شاشة المنتجات.',
    benefits_en:
      'Faster featuring from the same products screen.',
  },
  'Feature products from the catalog (not Website Builder)': {
    what_ar:
      'بجانب عدّاد المنتجات زر «ميّز المنتجات!» يفتح قائمة تمييز هنا: رئيسية + تصفح المتجر، بحث، تحديد الكل، ترتيب، وحفظ.',
    what_en:
      'Beside the product count, “Feature Products!” opens the featuring menu here: Home + Explore Store, search, select all, reorder, and save.',
    why_ar:
      'ما يحتاج تفتح منشئ الموقع عشان تميّز منتجات — القائمة صارت في الكتالوج.',
    why_en:
      'No need to open Website Builder just to feature products — the menu lives on the catalog.',
    how_ar:
      'منتجات → ميّز المنتجات! → اختر/رتّب → حفظ التمييز.',
    how_en:
      'Products → Feature Products! → pick/reorder → Save featuring.',
    benefits_ar:
      'تمييز أسرع من نفس شاشة المنتجات.',
    benefits_en:
      'Faster featuring from the same products screen.',
  },
  'Showcase auto-switches player if video sticks': {
    what_ar:
      'على صفحة المنتج، لو فيديو العرض يعلق أو يفشل (كروم / بريف / فَيَرفُكس) والرابط الثاني موجود، النظام يبدّل مرة واحدة للمشغّل الآخر (1↔2).',
    what_en:
      'On the product page, if the showcase sticks or fails (Chrome / Brave / Firefox) and the other link exists, the store flips once to the other player (1↔2).',
    why_ar: 'بعض خدمات البث تنكسر على متصفح وتشتغل على الرابط الثاني.',
    why_en: 'Some stream hosts break in one browser or URL while the other player still works.',
    how_ar:
      'عبّي رابط المشغّل 1 و2 لكل تضمين. الزبون ما يحتاج يضغط شيء — التحويل يصير لو اللي شغال علق.',
    how_en:
      'Fill both Player 1 and Player 2 links per embed. Shoppers need not tap — it flips if the active one sticks.',
    benefits_ar: 'أقل صفحات فيديو بيضاء، وتجربة أوضح للزبون على كل المتصفحات.',
    benefits_en: 'Fewer blank showcase videos, clearer shopper experience on every browser.',
  },
  'Showcase video is opt-in (off by default)': {
    what_ar:
      'في تعديل المنتج → الوسائط → عرض المنتج، فيه مفتاح «إظهار فيديو العرض». وهو مطفأ للمنتجات الجديدة. لما تشغّله يظهر الفيديو للزبون؛ لما تطفيه يبقى الإعداد محفوظ بس ما يظهر في المتجر.',
    what_en:
      'In product edit → Media → Showcase there is a “Show showcase video” switch. New products start off. When on, shoppers see the video; when off, your links stay saved but the storefront shows images only.',
    why_ar: 'بعض روابط التضمين تجيب إعلانات تتبّع — نبي ما تشتغل إلا لما تختار أنت.',
    why_en: 'Some embed hosts serve tracking-heavy ads — we only load them when you choose to.',
    how_ar:
      'منتجات → عدّل → الوسائط → عرض المنتج → شغّل «إظهار فيديو العرض» بعد ما تجهز الروابط. احفظ المنتج.',
    how_en:
      'Products → Edit → Media → Showcase → turn on “Show showcase video” after your links are ready. Save the product.',
    benefits_ar: 'تحكم أوضح بالخصوصية، وفيديو يظهر بس لما تحتاجه.',
    benefits_en: 'Clearer privacy control, and video only when you need it.',
  },
  'Rename storefront video player labels': {
    what_ar:
      'تقدر تغيّر نص «مشغّلات الفيديو» و«المشغّل 1 / 2» اللي يظهر للزبون تحت صور العرض — عربي وإنجليزي. لو تركت الحقل فاضي يبقى الاسم الافتراضي.',
    what_en:
      'You can rename the “(Video Players)” title and “Player 1 / Player 2” buttons shoppers see under the showcase thumbs — Arabic and English. Leave a field blank to keep the default.',
    why_ar: 'أحياناً الأسماء العامة ما تناسب نوع المنتج أو طريقة العرض.',
    why_en: 'Generic player names do not always match the product or how you present the two streams.',
    how_ar:
      'منتجات → عدّل → عرض المنتج → «أسماء المشغّلات في المتجر». عبّي EN وAR أو اتركه فاضي. احفظ المنتج.',
    how_en:
      'Products → Edit → Showcase → “Storefront player names”. Fill EN and AR or leave blank. Save the product.',
    benefits_ar: 'تسمية أوضح للزبون بدون ما تغيّر روابط الفيديو.',
    benefits_en: 'Clearer naming for shoppers without changing the video links.',
  },
  'Embeds stay visible + Resources library': {
    what_ar:
      'فيديو العرض يقبل صفحات التضمين الخارجية (مثل روابط /e/…) وتظهر في المتجر. عند التضمين يُحفظ الرابط في «الموارد» داخل محرر المنتج — مع تصفية: الكل، فيديو مضمّن، صور، ملفات فيديو.',
    what_en:
      'Showcase video accepts third-party embed pages (like /e/… hosts) and they play in the store. Embedding a link also saves it to Resources in the product editor — with filters: All, Embedded vids, Images, Video files.',
    why_ar:
      'بعض روابط التضمين كانت تبان «اختفت» لأن المتجر عاملها كملف فيديو. وتكرار لصق نفس الرابط كل مرة يضيّع وقت.',
    why_en:
      'Some embed links looked like they vanished because the store treated them as video files. Re-pasting the same URL every time wastes time.',
    how_ar:
      'منتجات → عدّل → عرض المنتج: الصق الرابط → تضمين. أو «جلب من الموارد» لاختيار رابط محفوظ. احفظ المنتج ليظهر في المتجر.',
    how_en:
      'Products → Edit → Showcase: paste the URL → Embed. Or use Get from resources to pick a saved link. Save the product so it appears in the store.',
    benefits_ar: 'معاينة صادقة، روابط جاهزة لإعادة الاستخدام، وفيديو مضمّن يشتغل للزبون.',
    benefits_en: 'Honest preview, reusable links, and embeds that actually play for shoppers.',
  },
  'Showcase video autoplay and sound': {
    what_ar:
      'فيديو العرض في صفحة المنتج يشتغل لحاله لما الزبون يفتح المنتج. ومن تعديل المنتج تقدر تشغّل أو توقف التشغيل التلقائي وتضبط الصوت (من صفر لمية، والافتراضي ٢٥٪).',
    what_en:
      'The showcase video on the product page starts on its own when a shopper opens the product. In product edit you can turn autoplay on or off and set volume (0–100, default 25%).',
    why_ar:
      'الزبون كان يشوف بوستر ثابت ويحتاج يضغط تشغيل — كثير يفوّتون الفيديو. والصوت العالي المفاجئ يزعج. نبي العرض يوصل بدون جهد، بصوت هادي.',
    why_en:
      'Shoppers used to see a still poster and had to hit play — many never watched. Loud surprise audio is annoying. We want the demo to land with no effort and quiet sound.',
    how_ar:
      'من المنتجات → عدّل → قسم عرض المنتج: تحت فيديو العرض تلاقي مفتاح التشغيل التلقائي وشريط الصوت. المتصفح يفرض بدء كتم الصوت عشان يسمح بالتشغيل التلقائي؛ الزبون يقدر يرفع الصوت من أزرار المشغّل. الصوت المضبوط يبقى جاهز لما يلغي الكتم.',
    how_en:
      'Products → Edit → Showcase: under the showcase video you get an autoplay toggle and a volume slider. Browsers require a muted start so autoplay is allowed; the shopper can unmute with the player controls. The set volume is ready when they unmute.',
    benefits_ar:
      'للزبون: يشوف المنتج يتحرك فوراً بدون بحث عن زر تشغيل. لك: تتحكم لكل منتج — فيديو صامت أو بصوت خفيف — من غير ما تلمس الكود.',
    benefits_en:
      'For shoppers: the product demo moves immediately without hunting for play. For you: per-product control — silent or quiet audio — without touching code.',
  },
  'Stronger payment and stock safety': {
    what_ar:
      'سدّينا ثغرات نادرة لكن خطيرة في الدفع: لو زبون فتح صفحة الدفع مرتين وكمّل الدفعة القديمة، الطلب ما عاد ينحذف — يوصله منتجه عادي. ولو اشترى شخصان آخر قطعة بنفس اللحظة، النظام يعلّم الطلب للمراجعة بدل ما يبيع مخزون مو موجود. وصار تغيير حالة الطلب إلى «مدفوع» حصري لنظام الدفع نفسه. وأخيراً: حساب المالك يقدر ينشئ ويعدّل الكوبونات (كانت مقفولة عليه بالغلط).',
    what_en:
      'We closed rare but dangerous payment gaps: if a shopper opens checkout twice and pays the older session, their order is no longer deleted — they still get their product. If two people buy the last unit at the same moment, the system flags the order for review instead of selling stock that isn’t there. Only the payment system itself can mark an order as paid now. And the owner account can finally create and edit coupons (it was accidentally locked out).',
    why_ar:
      'أسوأ شيء يصير لمتجر رقمي: زبون يدفع فلوس حقيقية وما يوصله شيء. حتى لو الحالة نادرة، مرة وحدة كفيلة تكسر الثقة وتجيب نزاع بنكي. والمخزون السالب يعني بيع شيء ما تملكه.',
    why_en:
      'The worst thing for a digital store: a customer pays real money and gets nothing. Even if it’s rare, one incident breaks trust and triggers a bank dispute. Negative stock means selling something you don’t have.',
    how_ar:
      'الطلبات المعلّقة اللي بدأ لها دفع تنحفظ بدل ما تنحذف، فأي دفعة متأخرة تلاقي طلبها. خصم المخزون صار يتحقق من الكمية قبل الخصم، وأي نقص يطلع لك تنبيه «نقص مخزون» في صفحة الطلبات عشان تسلّم يدوياً أو ترجّع المبلغ. وحوّلنا صلاحية «مدفوع» للسيرفر فقط — ولا موظف يقدر يقلبها من الجدول.',
    how_en:
      'Pending orders that started a payment are kept instead of deleted, so any late payment finds its order. Stock is checked before it’s reduced, and any shortfall shows a “Stock shortfall” alert on the Orders page so you can deliver manually or refund. Marking “paid” is now server-only — no staff member can flip it from a table.',
    benefits_ar:
      'للزبون: كل ريال يدفعه يقابله طلب حقيقي يوصله. لك: صفر طلبات ضايعة، مخزون دقيق، تنبيهات واضحة للحالات النادرة، وتحكم كامل بالكوبونات من لوحتك.',
    benefits_en:
      'For shoppers: every dollar paid maps to a real order that arrives. For you: zero lost orders, accurate stock, clear alerts for the rare edge cases, and full coupon control from your dashboard.',
  },
  'Popular sort and safer sign-in': {
    what_ar:
      'كل عملية دفع ناجحة تزيد عدّاد مبيعات المنتج، فترتيب الأكثر مبيعاً في المتجر يعكس الواقع. رسالة تسجيل الدخول صارت واحدة سواء غلط الاسم أو كلمة المرور — ما عاد أحد يقدر يخمن إن الحساب موجود. وصفحات الرئيسية والمتجر والمنتج والبائع تقرأ العربية من اليمين لليسار بشكل صحيح.',
    what_en:
      'Every successful payment bumps the product’s sales counter, so Most popular in the store matches reality. Sign-in shows one message for wrong username or wrong password — nobody can tell if an account exists. Home, store, product, and seller pages now read Arabic right-to-left correctly.',
    why_ar:
      'ترتيب وهمي يضلّل الزبون. رسالة دخول مختلفة تكشف الحسابات للمخترقين. ونص عربي باتجاه إنجليزي يبان مكسور.',
    why_en:
      'A fake popularity order misleads shoppers. Different login errors leak accounts to attackers. Arabic text in an English direction looks broken.',
    how_ar:
      'العدّاد يزيد تلقائياً بعد الدفع. لا تحتاج تفعل شيء. جرّب تسجيل دخول باسم غلط — الرسالة نفسها ككلمة مرور غلط.',
    how_en:
      'The counter updates automatically after payment. Nothing for you to configure. Try signing in with a wrong username — same message as a wrong password.',
    benefits_ar:
      'للزبون: منتجات مشهورة حقيقية وعربية مريحة. لك: متجر أوضح وأصعب للاستطلاع الخبيث عن الحسابات.',
    benefits_en:
      'For shoppers: real bestsellers and comfortable Arabic. For you: a clearer store that’s harder to probe for accounts.',
  },
  'Fresh cart prices and larger catalog': {
    what_ar:
      'لما الزبون يفتح السلة أو المفضلة، الأسعار والمخزون تنسحب من جديد — منتج انحذف أو خلص ما يبقى معلّق ببيانات قديمة. قائمة المتجر ما عاد تقف عند ٥٠٠ منتج. وفيه رابط مخفي يظهر بالكيبورد للقفز لمتن الصفحة.',
    what_en:
      'When a shopper opens the cart or wishlist, prices and stock refresh — deleted or sold-out items no longer stick with stale data. The store list no longer stops at 500 products. A hidden keyboard link jumps straight to the page content.',
    why_ar:
      'سعر قديم في السلة = مفاجأة عند الدفع أو رفض الطلب. سقف ٥٠٠ يخفي منتجات جديدة. مستخدمو الكيبورد يحتاجون يتخطّون القائمة.',
    why_en:
      'A stale cart price surprises at checkout or fails the order. A 500-product ceiling hides new items. Keyboard users need to skip past the nav.',
    how_ar:
      'تشتغل تلقائياً. جرّب Tab في أول تحميل الصفحة — يظهر «تخطَّ إلى المحتوى».',
    how_en:
      'Works automatically. Press Tab on first page load — you’ll see Skip to content.',
    benefits_ar:
      'للزبون: سعر صحيح ومنتجات ظاهرة كلها. لك: أقل شكاوى «السعر تغيّر» ومتجر يكبر بدون سقف وهمي.',
    benefits_en:
      'For shoppers: correct prices and a full catalog. For you: fewer “the price changed” complaints and room for the catalog to grow.',
  },
  'Faster product cards and clearer ad dots': {
    what_ar:
      'بدل ما الموقع يطلب بيانات كل بائع لوحده، صار يجيبها مرة واحدة. والصفحة الرئيسية ما عاد تسحب قائمة المنتجات مرتين. نقاط التنقل في إعلان المنتجات صارت مساحة لمس أكبر على الجوال.',
    what_en:
      'Instead of asking for each seller one by one, the site now loads them in one request. The home page no longer pulls the product list twice. Ad-banner dots have a larger tap target on phones.',
    why_ar:
      'طلبات كثيرة = بطء على الجوال والإنترنت الضعيف. نقاط صغيرة يصعب ضغطها.',
    why_en:
      'Too many requests means slow phones and weak networks. Tiny dots are hard to tap.',
    how_ar:
      'تشتغل تلقائياً بعد التحديث. ما تحتاج إعداد.',
    how_en:
      'Works automatically after the update. No settings to change.',
    benefits_ar:
      'للزبون: تصفح أسرع ولمس أسهل. لك: متجر يحس أخف بدون ما تغيّر شيء.',
    benefits_en:
      'For shoppers: snappier browsing and easier taps. For you: a lighter-feeling store with nothing to configure.',
  },
  'Clearer text, safer links, bilingual confirms': {
    what_ar:
      'حسّنّا وضوح النصوص الثانوية في الصفحات. روابط تويتر/يوتيوب/تيليجرام والفوتر ما عاد تقبل إلا https أو بريد أو مسار داخل الموقع. وأزرار الحذف في اللوحة تفتح نافذة تأكيد بلغتك.',
    what_en:
      'Secondary copy on store pages is easier to read. Twitter/YouTube/Telegram and footer links only allow https, mailto, or in-site paths. Dashboard delete buttons open a confirm dialog in your language.',
    why_ar:
      'نص باهت يتعب العين. رابط خبيث في إعدادات الفوتر يقدر يضر الزبون. نافذة المتصفح الإنجليزية تكسر تجربة العربية.',
    why_en:
      'Faint text strains eyes. A malicious footer URL can hurt shoppers. The browser’s English confirm breaks the Arabic experience.',
    how_ar:
      'من منشئ الموقع حط روابط https فقط للشبكات. الحذف في اللوحة يطلب تأكيدك داخل الصفحة.',
    how_en:
      'In Website Builder, use https-only social URLs. Dashboard deletes ask for confirmation inside the page.',
    benefits_ar:
      'للزبون: قراءة أوضح وروابط آمنة. لك: لوحة بلغة الموقع بدون نوافذ نظام غريبة.',
    benefits_en:
      'For shoppers: clearer reading and safer links. For you: dashboard confirms in the site language, not OS popups.',
  },
  'Avatar lock, coupon rules, and $0.50 checkout floor': {
    what_ar:
      'المشتري/العضو ما يقدر يرفع صورة حتى لو حاول من أدوات المطور. قيم الكوبون صارت محكومة في قاعدة البيانات. لو المجموع بعد الخصم أقل من نصف دولار، الطلب ما ينشأ — Polar ما يقبل هالمبلغ.',
    what_en:
      'Buyers/members can’t upload an avatar even via developer tools. Coupon values are enforced in the database. If the total after discount is under fifty cents, no order is created — Polar won’t accept that amount.',
    why_ar:
      'رفع صور عشوائية من أي حساب يملأ التخزين ويُستغل. كوبون ١٥٠٪ أو صفر يكسر الحسابات. طلب معلّق بـ ٠$ يضل معلّق بدون دفع.',
    why_en:
      'Any-account avatar uploads fill storage and can be abused. A 150% or zero coupon breaks math. A $0 pending order sits forever with no payment.',
    how_ar:
      'تلقائي. لو زبون يشوف رسالة الحد الأدنى، يحتاج منتجات أغلى أو يزيل كوبون يصفّر السعر.',
    how_en:
      'Automatic. If a shopper sees the minimum message, they need higher-priced items or must remove a coupon that zeros the price.',
    benefits_ar:
      'لك: تخزين أنظف وكوبونات صحيحة. للزبون: رسالة واضحة بدل فشل دفع غامض.',
    benefits_en:
      'For you: cleaner storage and sane coupons. For shoppers: a clear message instead of a mysterious payment failure.',
  },
  'Smoother atmosphere and clearer sign-in forms': {
    what_ar:
      'تمرير الصفحة مع أجواء الموقع صار أنعم. حقول الدخول والتسجيل صارت بعناوين ظاهرة، وكلمة المرور فيها تلميح دائم: ٨ أحرف على الأقل.',
    what_en:
      'Scrolling with site atmosphere on feels smoother. Sign-in and register fields have visible titles, and passwords always show: at least 8 characters.',
    why_ar:
      'حسابات كثيرة أثناء التمرير تبطّئ الجهاز. حقل بدون عنوان يصعّب الاستخدام لقارئ الشاشة والناس الجدد.',
    why_en:
      'Too much work on every scroll frame slows phones. Fields with only placeholders are harder for screen readers and new users.',
    how_ar:
      'تلقائي. ما تحتاج إعداد.',
    how_en:
      'Automatic. Nothing to configure.',
    benefits_ar:
      'للزبون: دخول أوضح وجهاز أخف. لك: متجر يحس أسرع بدون ما تغيّر شيء.',
    benefits_en:
      'For shoppers: clearer auth and a lighter device. For you: a snappier store with no settings to touch.',
  },
  'Store crashes reach us even if analytics is declined': {
    what_ar:
      'رفض التحليلات يوقف إحصاءات الزيارات، لكن أعطال الصفحة ما عاد تختفي في الظلام.',
    what_en:
      'Declining analytics still stops visit stats, but page crashes no longer vanish in the dark.',
    why_ar:
      'بدونه كنا عميان عن الأخطاء عند الزوار اللي رفضوا التتبع.',
    why_en:
      'Without it we were blind to errors from visitors who refused tracking.',
    how_ar:
      'تلقائي بعد نشر دالة client-error. تشوف السجلات في لوحة Supabase.',
    how_en:
      'Automatic after deploying the client-error function. View logs in the Supabase dashboard.',
    benefits_ar:
      'إصلاح أسرع، خصوصية الزائر محفوظة للإحصاءات.',
    benefits_en:
      'Faster fixes; visitor privacy kept for analytics.',
  },
  'Faster product editing from the list': {
    what_ar:
      'من قائمة المنتجات للتحرير، التحميل صار أخف بدون ما ينقص شيء من الحقول اللي تعدّلها.',
    what_en:
      'From the products list into edit, loading is lighter without dropping any fields you edit.',
    why_ar:
      'سحب كل أعمدة المنتج في كل صفحة كان يبطّئ اللوحة.',
    why_en:
      'Pulling every product column on every page slowed the dashboard.',
    how_ar:
      'تلقائي بعد النشر.',
    how_en:
      'Automatic after deploy.',
    benefits_ar:
      'تعديل أسرع، أقل ضغط على الشبكة.',
    benefits_en:
      'Faster editing, less network load.',
  },
  'Lighter, faster dashboard lists': {
    what_ar:
      'قوائم اللوحة ما عاد تسحب كل أعمدة الجداول. نفس البيانات اللي تشوفها، بحجم أصغر.',
    what_en:
      'Dashboard lists no longer pull every table column. Same data you see, smaller payloads.',
    why_ar:
      'جلب كل الأعمدة يبطّئ الشبكة على الجوال ويزيد ضغط السيرفر.',
    why_en:
      'Fetching every column slows mobile networks and loads the server.',
    how_ar:
      'تلقائي بعد النشر.',
    how_en:
      'Automatic after deploy.',
    benefits_ar:
      'لوحة أسرع، أقل استهلاك بيانات.',
    benefits_en:
      'Faster dashboard, less data use.',
  },
  'Lighter seller pages and notifications': {
    what_ar:
      'المتجر يحمّل منتجات البائع والإشعارات بحجم أصغر. لوحة التحكم لو انكسر شيء في صفحة ما يطيح كل اللوحة.',
    what_en:
      'The store loads seller products and notifications with a smaller payload. If one dashboard page crashes, the whole shell stays up.',
    why_ar:
      'جلب كل الأعمدة يبطّئ الجوال. خطأ في صفحة وحدة كان يبيّض الشاشة كلها.',
    why_en:
      'Fetching every column slows phones. One page error used to blank the whole screen.',
    how_ar:
      'تلقائي بعد النشر وتطبيق قاعدة البيانات.',
    how_en:
      'Automatic after deploy and database apply.',
    benefits_ar:
      'تصفّح أسرع، لوحة أوضح عند الأعطال.',
    benefits_en:
      'Faster browsing, clearer dashboard when something breaks.',
  },
  'Protection from rapid checkout and login attempts': {
    what_ar:
      'لو أحد يضغط دفع أو دخول كثير بسرعة، النظام يطلب منه ينتظر دقيقة. الزبون العادي ما يلاحظ.',
    what_en:
      'If someone hammers pay or login too fast, the system asks them to wait a minute. Normal shoppers won’t notice.',
    why_ar:
      'بدون حد، سكربتات تقدر تملأ الطلبات أو تجرب أسماء مستخدمين بلا توقف.',
    why_en:
      'Without a cap, scripts can spam pending orders or probe usernames nonstop.',
    how_ar:
      'تلقائي على الخادم بعد تطبيق التحديث.',
    how_en:
      'Automatic on the server after you apply the update.',
    benefits_ar:
      'حسابات أوضح، ضغط أقل، متجر أهدأ تحت الهجوم.',
    benefits_en:
      'Clearer accounts, less load, calmer store under attack.',
  },
  'Lighter catalog and analytics only with consent': {
    what_ar:
      'صفحات المتجر تطلب أعمدة المنتج اللي تحتاجها بس. إخفاء بانر الخصوصية ما يعني تشغيل التتبع تلقائي. عرض الخصم في السلة أدق.',
    what_en:
      'Store pages fetch only the product fields they need. Hiding the privacy banner does not turn tracking on by itself. Cart discount display is more accurate.',
    why_ar:
      'جلب كل الأعمدة يبطّئ المتجر. التتبع بدون موافقة مشكلة خصوصية. فرق السنت يخلّي الزبون يشوف رقم غير اللي يُدفع.',
    why_en:
      'Fetching every column slows the store. Tracking without consent is a privacy risk. A one-cent gap confuses shoppers at checkout.',
    how_ar:
      'تلقائي بعد النشر. فعّل التحليلات عبر قبول الزائر أو تفضيلات الحساب.',
    how_en:
      'Automatic after deploy. Analytics need visitor accept or account prefs.',
    benefits_ar:
      'متجر أسرع، خصوصية أوضح، أرقام خصم أوثق.',
    benefits_en:
      'Faster store, clearer privacy, trustworthy discount numbers.',
  },
  'Clearer errors and product page tells the truth': {
    what_ar:
      'لو انقطع النت، صفحة المنتج تقول جرّب مرة ثانية بدل ما تقول المنتج اختفى. استعادة كلمة المرور ما تشتغل لو بس فاتح حسابك عادي. الإشعارات والتواريخ صارت بلغتك.',
    what_en:
      'If the network fails, the product page says try again instead of claiming the product vanished. Password reset only works from the email link, not a normal signed-in visit. Notification dates match your language.',
    why_ar:
      'خلط خطأ الشبكة مع «غير موجود» يضيّع الزبون. فتح استعادة كلمة المرور لأي جلسة خطر.',
    why_en:
      'Mixing a network blip with “not found” confuses shoppers. Opening password reset for any session is unsafe.',
    how_ar:
      'تلقائي بعد النشر.',
    how_en:
      'Automatic after deploy.',
    benefits_ar:
      'زبون أوضح، حساب أأمن، متجر أسرع للزوار المتكررين.',
    benefits_en:
      'Clearer shoppers, safer accounts, faster return visits.',
  },
  'Clearer dashboard path and confirm-email returns you': {
    what_ar:
      'فوق محتوى اللوحة يظهر مسار صغير يوضح وين أنت. بعد ما الزبون يأكد بريده، يقدر يرجع لصفحة الدفع أو السلة لو كان جاي منها. إغلاق النوافذ المنبثقة صار بلغتك.',
    what_en:
      'Above dashboard content a small trail shows where you are. After a shopper confirms email, they can return to checkout or cart if that’s where they came from. Popup close controls match the site language.',
    why_ar:
      'تعديل منتج بدون مسار يضلّل. تأكيد بريد يرجّع للرئيسية يقطع الشراء. زر Close الإنجليزي يكسر العربية.',
    why_en:
      'Editing a product with no trail is disorienting. Confirm email dumping to home breaks checkout. An English-only Close breaks Arabic UX.',
    how_ar:
      'تلقائي في اللوحة وصفحات الحساب.',
    how_en:
      'Automatic in the dashboard and account pages.',
    benefits_ar:
      'لك ولفريقك: تنقّل أسرع في اللوحة. للزبون: يكمل شراءه بعد تأكيد البريد.',
    benefits_en:
      'For you and staff: faster dashboard navigation. For shoppers: they can finish buying after confirming email.',
  },
  'Member and buyer profile privacy': {
    what_ar:
      'حساب العضو والمشتري صار خاص أكثر: ما فيه زر تغيير الصورة، وما أحد من الزوار يقدر يفتح صفحتهم بـ /seller أو يلاقيهم بالبحث العام. الموظفون (مالك/أدمن/مشرف) يشوفونهم من المستخدمين والطلبات كالعادة.',
    what_en:
      'Member and buyer accounts are more private: no Change photo control, and visitors cannot open them via /seller or public lookup. Staff (owner/admin/moderator) still find them in Users and Orders as usual.',
    why_ar:
      'هذي حسابات متسوقين مو بائعين. صورة عامة أو رابط ملف يفتح للجميع ما يناسب خصوصية الزبون، وقد يُستغل للتحرش أو السبام.',
    why_en:
      'These are shopper accounts, not storefront sellers. A public photo or profile URL does not fit buyer privacy and can be abused for spam or harassment.',
    how_ar:
      'من ملفي الشخصي: العضو/المشتري يشوف حرف الاسم بدل زر الصورة. رابط /seller لاسم مستخدم عضو يرجع «غير متاح». البائعون والموظفون يبقون بصفحات عامة وصورة اختيارية.',
    how_en:
      'On My Profile, members/buyers see a letter avatar with no photo button. /seller for a member username returns unavailable. Sellers and staff keep public pages and optional photos.',
    benefits_ar:
      'للمتسوق: خصوصية أعلى. لك: أقل ملفات عامة فاضيّة، وأوضح إن الصفحة العامة للبائعين والطاقم فقط.',
    benefits_en:
      'For shoppers: stronger privacy. For you: fewer empty public profiles, and a clearer rule that public pages are for sellers and staff.',
  },
  'Sharing a product link shows the right title and image': {
    what_ar:
      'صفحات المنتجات والصفحات الثابتة صارت تحمل عنوان ووصف وصورة جاهزة في أول HTML.',
    what_en:
      'Product pages and key store pages now ship with the right title, description, and image in the first HTML.',
    why_ar:
      'كثير بوتات المشاركة ومحركات البحث ما تشغّل جافاسكربت — كانت تشوف عنوان المتجر العام فقط.',
    why_en:
      'Many share bots and search crawlers do not run JavaScript — they only saw the generic store title.',
    how_ar:
      'تلقائي مع كل نشر للموقع. ما تحتاج تسوي شيء يدوي للمنتجات النشطة.',
    how_en:
      'Automatic on every site deploy. No manual step for active products.',
    benefits_ar:
      'روابط أوضح عند المشاركة، ومظهر أقوى في نتائج البحث.',
    benefits_en:
      'Clearer shared links and a stronger look in search results.',
  },
  'Buyers who paid can rate the product': {
    what_ar:
      'المشترون يكتبون تقييماً (نجوم + تعليق اختياري) على صفحة المنتج، ويقدرون يعدّلونه أو يحذفونه.',
    what_en:
      'Buyers write a rating (stars + optional comment) on the product page, and can edit or delete it.',
    why_ar:
      'النجوم بدون تقييمات حقيقية تبقى تسويق. التقييم من مشترٍ حقيقي يبني ثقة.',
    why_en:
      'Stars with no real reviews are just marketing. A real buyer rating builds trust.',
    how_ar:
      'تلقائي بعد النشر. فقط من اشترى المنتج يقيّم — مرة واحدة لكل منتج.',
    how_en:
      'Automatic after deploy. Only someone who bought the product can rate — once per product.',
    benefits_ar:
      'ثقة أوضح للزائر، ومتوسط نجوم يعكس التجربة الحقيقية.',
    benefits_en:
      'Clearer trust for visitors, and star averages that reflect real experience.',
  },
  'Product card motion respects reduce-motion': {
    what_ar:
      'بطاقات المنتجات تهدّئ الهالة والتأثيرات والإمالة عندما يطلب الجهاز تقليل الحركة. من منشئ الموقع تقدر تخلّي الحركة دائماً أو تهدّئها بالكامل. الأسعار والأزرار تبقى ظاهرة.',
    what_en:
      'Product cards calm the aura, effects, and tilt when the device asks for less motion. In Website Builder you can keep motion always on, or calm it fully. Prices and buttons stay visible.',
    why_ar:
      'بعض الأجهزة تفرض تقليل الحركة بالخطأ فكانت تخفي مظهر المنتجات. والبطاقات خارج الشاشة كانت تستهلك الجهاز بلا فائدة.',
    why_en:
      'Some devices force reduce-motion by mistake and were wiping product looks. Off-screen cards were also burning the device for no benefit.',
    how_ar:
      'منشئ الموقع → قسم الإعلانات (قرب لمعة التحويم) → حركة بطاقات المنتجات: تلقائي / دائماً / إيقاف.',
    how_en:
      'Website Builder → Ads section (near Glare hover) → Product card motion: Auto / Always / Off.',
    benefits_ar:
      'متجر ألطف لمن يفضّل حركة أقل، وخيار واضح لو جهازك يفرض الإعداد بالخطأ، وأداء أخف أثناء التمرير.',
    benefits_en:
      'A gentler store for shoppers who want less motion, a clear override if your device forces that setting, and lighter scrolling.',
  },
  'Product page shows delivery and low stock': {
    what_ar:
      'صفحة المنتج صارت تعرض تحت زر الإضافة للسلة: وقت التسليم، دفع آمن عبر Polar، ورابط مساعدة. وإذا الكمية قليلة يظهر «يتبقى N فقط» بنفس عبارة بطاقات المتجر.',
    what_en:
      'The product page now shows under Add to Cart: delivery timing, secure payment via Polar, and a help link. When stock is low it shows “Only N left” — the same phrase as store cards.',
    why_ar:
      'الزبون يقرر الشراء من صفحة المنتج؛ لازم يشوف إثبات التسليم والأمان قبل السلة، ويعرف لو الكمية قليلة.',
    why_en:
      'Shoppers decide on the product page; they need delivery and payment proof before the cart, and a clear cue when stock is running low.',
    how_ar:
      'تلقائي بعد التحديث — افتح أي منتج متوفر. لو المخزون ٥ أو أقل تظهر عبارة الكمية القليلة.',
    how_en:
      'Automatic after deploy — open any in-stock product. If stock is 5 or less, the low-stock line appears.',
    benefits_ar:
      'ثقة أوضح عند الشراء، ونفس لغة السلة والبطاقات بدون لبس.',
    benefits_en:
      'Clearer trust at buy time, and the same language as cart and cards — no mixed signals.',
  },
  'Unsaved product edits ask before leaving': {
    what_ar:
      'محرر المنتج صار يوقفك بسؤال تأكيد لما فيه تغييرات غير محفوظة وتحاول تغادر الصفحة أو تغلق التبويب.',
    what_en:
      'The product editor now confirms when you try to leave the page or close the tab with unsaved changes.',
    why_ar:
      'تعديلات طويلة (وصف، مفاتيح، صور) كانت تضيع بهدوء لو ضغطت رجوع أو غيّرت الصفحة.',
    why_en:
      'Long edits (copy, keys, images) were silently lost on Back or a page change.',
    how_ar:
      'لوحة التحكم ← المنتجات ← عدّل منتجاً ← غيّر شيئاً ← اضغط رجوع أو انتقل لصفحة أخرى. ألغِ للبقاء، أو أكّد للمغادرة. بعد الحفظ المغادرة بدون سؤال.',
    how_en:
      'Dashboard → Products → Edit a product → change something → press Back or go elsewhere. Cancel to stay, or confirm to leave. After Save, leaving stays quiet.',
    benefits_ar:
      'أقل فقدان للتعديلات، وطمأنينة أوضح وأنت تبني العروض.',
    benefits_en:
      'Fewer lost edits, and clearer peace of mind while you build listings.',
  },
};

function resolveLesson(raw: unknown, titleEn: string): OwnerChangelogLesson {
  const parsed = parseOwnerLesson(raw);
  if (lessonHasContent(parsed, false) || lessonHasContent(parsed, true)) return parsed;
  return OWNER_LESSON_SEEDS[titleEn] ? { ...OWNER_LESSON_SEEDS[titleEn] } : parsed;
}

export type OwnerUpdateScale = 'big' | 'small';

/** Titles treated as big when DB column missing (pre-migration fallback). */
const OWNER_BIG_TITLE_FALLBACK = new Set([
  'Safer checkout and payments',
  'Store fixes and faster browsing',
  'Clearer pages and easier access',
  'Ready for live traffic',
  'Editable policies and changelogs',
  'Checkout & access audit (phases 1–3)',
  'Store fixes & performance (phases 4–5)',
  'SEO, a11y & cleanup (phases 6–8)',
  'Production ops (phase 9)',
  'Editable policies & changelogs',
  'Money path and stock stay honest',
  'Real ratings from buyers who paid',
  'Clearer, faster storefront shopping',
  'Owner dashboard, vault identity',
]);

/** Owner-only log (RLS: owner). Summary on card; lesson_json under More details. */
export interface OwnerChangelogRow {
  id: string;
  entry_date: string;
  title_ar: string;
  title_en: string;
  summary_ar: string;
  summary_en: string;
  body_ar: string;
  body_en: string;
  lesson: OwnerChangelogLesson;
  update_scale: OwnerUpdateScale;
  sort_order: number;
  created_at: string;
}

const OWNER_SELECT =
  'id, entry_date, title_ar, title_en, summary_ar, summary_en, body_ar, body_en, lesson_json, update_scale, sort_order, created_at';

const OWNER_SELECT_LEGACY =
  'id, entry_date, title_ar, title_en, summary_ar, summary_en, body_ar, body_en, sort_order, created_at';

function normalizeOwnerRow(raw: Record<string, unknown>): OwnerChangelogRow {
  const title_en = typeof raw.title_en === 'string' ? raw.title_en : '';
  const scaleRaw = raw.update_scale;
  const update_scale: OwnerUpdateScale =
    scaleRaw === 'big' || scaleRaw === 'small'
      ? scaleRaw
      : OWNER_BIG_TITLE_FALLBACK.has(title_en)
        ? 'big'
        : 'small';
  return {
    id: String(raw.id ?? ''),
    entry_date: String(raw.entry_date ?? ''),
    title_ar: typeof raw.title_ar === 'string' ? raw.title_ar : '',
    title_en,
    summary_ar: typeof raw.summary_ar === 'string' ? raw.summary_ar : '',
    summary_en: typeof raw.summary_en === 'string' ? raw.summary_en : '',
    body_ar: typeof raw.body_ar === 'string' ? raw.body_ar : '',
    body_en: typeof raw.body_en === 'string' ? raw.body_en : '',
    lesson: resolveLesson(raw.lesson_json, title_en),
    update_scale,
    sort_order: typeof raw.sort_order === 'number' ? raw.sort_order : 0,
    created_at: String(raw.created_at ?? ''),
  };
}

export async function fetchOwnerChangelog(): Promise<OwnerChangelogRow[]> {
  const primary = await supabase
    .from('owner_changelog_entries')
    .select(OWNER_SELECT)
    .order('sort_order', { ascending: false })
    .order('entry_date', { ascending: false });
  if (!primary.error) {
    return (primary.data ?? []).map((r) => normalizeOwnerRow(r as Record<string, unknown>));
  }
  const legacy = await supabase
    .from('owner_changelog_entries')
    .select(OWNER_SELECT_LEGACY)
    .order('sort_order', { ascending: false })
    .order('entry_date', { ascending: false });
  if (legacy.error) throw legacy.error;
  return (legacy.data ?? []).map((r) => normalizeOwnerRow(r as Record<string, unknown>));
}

export type OwnerChangelogWrite = {
  entry_date: string;
  title_ar: string;
  title_en: string;
  summary_ar: string;
  summary_en: string;
  lesson: OwnerChangelogLesson;
  update_scale: OwnerUpdateScale;
  sort_order?: number;
};

export async function insertOwnerChangelogEntry(row: OwnerChangelogWrite): Promise<void> {
  const payload = {
    entry_date: row.entry_date,
    title_ar: row.title_ar,
    title_en: row.title_en,
    summary_ar: row.summary_ar,
    summary_en: row.summary_en,
    body_ar: '',
    body_en: '',
    lesson_json: row.lesson,
    update_scale: row.update_scale,
    sort_order: row.sort_order ?? Date.now(),
  };
  const primary = await supabase.from('owner_changelog_entries').insert(payload);
  if (!primary.error) return;
  // Pre-migration DBs: retry without update_scale.
  const { update_scale: _scale, ...legacy } = payload;
  void _scale;
  const retry = await supabase.from('owner_changelog_entries').insert(legacy);
  if (retry.error) throw primary.error;
}

export async function deleteOwnerChangelogEntry(id: string): Promise<void> {
  const { error } = await supabase.from('owner_changelog_entries').delete().eq('id', id);
  if (error) throw error;
}
