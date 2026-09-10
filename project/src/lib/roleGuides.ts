import type { Role } from '../types';

export interface GuideSection {
  headingAr: string;
  headingEn: string;
  bodyAr: string;
  bodyEn: string;
}

export interface RoleGuide {
  titleAr: string;
  titleEn: string;
  sections: GuideSection[];
}

/** Shared shape: what / can / how / benefit — positive only (no cannot lists). */
export const ROLE_GUIDES: Record<Role, RoleGuide> = {
  owner: {
    titleAr: 'دليل المالك',
    titleEn: 'Owner guide',
    sections: [
      {
        headingAr: 'شو يعني تكون مالك؟',
        headingEn: 'What is an Owner?',
        bodyAr:
          'المالك هو المسؤول النهائي عن المتجر والفريق. أنت تضبط الاتجاه، الصلاحيات، شكل الموقع، والمال — وكل قرار كبير يمرّ منك.',
        bodyEn:
          'The Owner is the final authority on the store and the team. You set direction, permissions, site look, and money — every big decision runs through you.',
      },
      {
        headingAr: 'شو يقدر المالك يسوي؟',
        headingEn: 'What an Owner can do',
        bodyAr:
          'إدارة المنتجات والتصنيفات والطلبات والمستخدمين والرتب (بما فيها الدعم)، التذاكر والتصعيد، إعادة ضبط تقييم الدعم، الكوبونات والشارات، الإشعارات والتحليلات، إعدادات المتجر والثيمات ومنشئ الموقع، سجلات التحديث، وطلبات حذف الحساب.',
        bodyEn:
          'Manage products, categories, orders, users and roles (including Support), tickets and escalations, reset Support standing, coupons and badges, notifications and analytics, store settings, themes, website builder, changelogs, and account-deletion requests.',
      },
      {
        headingAr: 'كيف المالك يسوي اللي يقدر عليه؟',
        headingEn: 'How an Owner does those things',
        bodyAr:
          'من لوحة التحكم: المنتجات؛ التصنيفات؛ الطلبات؛ المستخدمون لتغيير الرتب (امنح دعم) وملاحظات الفريق وإعادة ضبط تقييم التصعيد؛ الدعم للتذاكر؛ الكوبونات والشارات؛ الإعدادات ومنشئ الموقع والثيمات؛ طلبات الحذف؛ ملفي الشخصي.',
        bodyEn:
          'From the dashboard: Products; Categories; Orders; Users to change roles (grant Support), staff notes, and reset escalation standing; Support for tickets; Coupons and Badges; Settings, Website Builder, and Themes; Deletion requests; My Profile.',
      },
      {
        headingAr: 'كيف المالك يفيد نفسه والمتجر؟',
        headingEn: 'How an Owner benefits himself and the store',
        bodyAr:
          'رتب واضحة وفريق موثوق = أقل أخطاء وأسرع رد. كتالوج مرتّب ودفع نظيف = ثقة الزبائن ومبيعات أعلى. سجّل التحديثات المهمة للزوار، وخلّ الإعدادات القانونية والتواصل جاهزة — أنت تبني سمعة المتجر ودخلّه معاً.',
        bodyEn:
          'Clear roles and a trusted team mean fewer mistakes and faster replies. A tidy catalog and clean payment flow build buyer trust and sales. Log important updates for visitors and keep legal/contact settings ready — you grow reputation and revenue together.',
      },
    ],
  },
  admin: {
    titleAr: 'دليل الأدمن',
    titleEn: 'Admin guide',
    sections: [
      {
        headingAr: 'شو يعني تكون أدمن؟',
        headingEn: 'What is an Admin?',
        bodyAr:
          'الأدمن يشغّل المتجر يومياً: الكتالوج، الطلبات، العملاء، العروض، والتحليلات — يد الإدارة التنفيذية بجانب المالك.',
        bodyEn:
          'An Admin runs the store day to day: catalog, orders, customers, offers, and analytics — the owner’s operating right hand.',
      },
      {
        headingAr: 'شو يقدر الأدمن يسوي؟',
        headingEn: 'What an Admin can do',
        bodyAr:
          'إدارة المنتجات والطلبات والمستخدمين (عرض وتعطيل/تفعيل وملاحظات)، التذاكر والتصعيد وإعادة ضبط تقييم الدعم، الكوبونات والشارات، الإشعارات، والتحليلات.',
        bodyEn:
          'Manage products, orders, and users (view, disable/enable, notes), tickets and escalations plus Support standing reset, coupons and badges, notifications, and analytics.',
      },
      {
        headingAr: 'كيف الأدمن يسوي اللي يقدر عليه؟',
        headingEn: 'How an Admin does those things',
        bodyAr:
          'من المنتجات حدّث الكتالوج. من الطلبات راقب Polar. من الدعم عالج المهم أو ارفض تصعيداً سيئاً. من المستخدمين عطّل حساباً مسيئاً وأعد ضبط تقييم وكيل الدعم عند الحاجة. الكوبونات والشارات والتحليلات كما قبل.',
        bodyEn:
          'On Products keep the catalog current. On Orders watch Polar. On Support handle Important or reject a bad escalation. On Users disable abuse and reset a Support agent’s standing when needed. Coupons, badges, and analytics as before.',
      },
      {
        headingAr: 'كيف الأدمن يفيد نفسه والمتجر؟',
        headingEn: 'How an Admin benefits himself and the store',
        bodyAr:
          'سرعة حل الطلبات وجودة المنتجات = زبائن راضين ومبيعات أنظف. كوبونات وشارات ذكية تجيب تكرار شراء. شغلك اليومي يبني ثقة المالك بك ويفتح فرص مسؤولية أكبر — والمتجر يظل سريع ومرتب.',
        bodyEn:
          'Fast order handling and solid product quality mean happier buyers and cleaner sales. Smart coupons and badges drive repeat purchases. Daily excellence builds the owner’s trust in you and grows your responsibility — while the store stays fast and tidy.',
      },
    ],
  },
  moderator: {
    titleAr: 'دليل المشرف',
    titleEn: 'Moderator guide',
    sections: [
      {
        headingAr: 'شو يعني تكون مشرف؟',
        headingEn: 'What is a Moderator?',
        bodyAr:
          'المشرف يحمي جودة المجتمع: تذاكر مُصعَّدة، تقييمات، وملاحظات الفريق — مو كتالوج المنتجات.',
        bodyEn:
          'A Moderator protects community quality: escalated tickets, reviews, and staff notes — not the product catalog.',
      },
      {
        headingAr: 'شو يقدر المشرف يسوي؟',
        headingEn: 'What a Moderator can do',
        bodyAr:
          'صندوق المهم وجميع التذاكر (رد)، حذف التقييمات والرد عليها، قراءة ملاحظات الفريق، الإشعارات وملفي الشخصي والأدلة.',
        bodyEn:
          'Important bin and all tickets (reply), delete and reply to reviews, read staff notes, notifications, My Profile, and guides.',
      },
      {
        headingAr: 'كيف المشرف يسوي اللي يقدر عليه؟',
        headingEn: 'How a Moderator does those things',
        bodyAr:
          'من الدعم افتح مهم أولاً — إن كان التصعيد غير مناسب ارفضه مع سبب فيرجع لطابور الدعم. راجع التقييمات على صفحة المنتج للحذف أو الرد. ملاحظات الفريق تظهر في التذكرة (قراءة فقط).',
        bodyEn:
          'From Support open Important first — if an escalation is wrong, reject with a reason so it returns to the Support queue. On the product page delete or reply to reviews. Staff notes appear on the ticket (read-only).',
      },
      {
        headingAr: 'كيف المشرف يفيد نفسه والمتجر؟',
        headingEn: 'How a Moderator benefits himself and the store',
        bodyAr:
          'تصعيد نظيف وتقييمات مضبوطة = ثقة أعلى وأقل فوضى على الدعم. شغلك الدقيق يبني سمعتك ويفتح فرص نمو.',
        bodyEn:
          'Clean escalations and tidy reviews mean more trust and less Support chaos. Careful work builds your reputation and room to grow.',
      },
    ],
  },
  support: {
    titleAr: 'دليل الدعم',
    titleEn: 'Support guide',
    sections: [
      {
        headingAr: 'شو يعني تكون دعم؟',
        headingEn: 'What is Support?',
        bodyAr:
          'وكيل الدعم هو خط الرد الأول: يستلم التذاكر، يتكلم مع الزبون، ويصعّد فقط لما يلزم فريق أعلى.',
        bodyEn:
          'Support is the first reply line: claim tickets, chat with the shopper, and escalate only when a higher desk is needed.',
      },
      {
        headingAr: 'شو يقدر الدعم يسوي؟',
        headingEn: 'What Support can do',
        bodyAr:
          'طابور عام وقناة البائعين، استلام تذكرة واحدة، الرد في المحادثة، التصعيد للمهم إن لم يكن التقييم مقيّداً.',
        bodyEn:
          'General queue and Sellers channel, claim one ticket, reply in-thread, escalate to Important when standing is not restricted.',
      },
      {
        headingAr: 'كيف الدعم يسوي اللي يقدر عليه؟',
        headingEn: 'How Support does those things',
        bodyAr:
          'من الدعم افتح الطابور → استلام → رد. لقضايا البائعين استخدم تبويب البائعين (بحث وترتيب). التصعيد المرفوض يخصم ١٥ من تقييمك؛ عند ٤٠ أو أقل يتوقف التصعيد حتى يعيد المالك/الأدمن الضبط إلى ١٠٠.',
        bodyEn:
          'From Support open Queue → Claim → reply. For seller issues use the Sellers tab (search and sort). A rejected escalation costs 15 standing; at 40 or below escalation stops until Owner/Admin resets to 100.',
      },
      {
        headingAr: 'كيف الدعم يفيد نفسه والمتجر؟',
        headingEn: 'How Support benefits himself and the store',
        bodyAr:
          'رد سريع وتصعيد صادق = زبائن أهدأ ومتجر أوثق. تقييمك الجيد يبقيك قادراً على التصعيد عند الحاجة الحقيقية.',
        bodyEn:
          'Fast honest replies mean calmer buyers and a more trusted store. Good standing keeps escalation available for real need.',
      },
    ],
  },
  seller: {
    titleAr: 'دليل البائع',
    titleEn: 'Seller guide',
    sections: [
      {
        headingAr: 'شو يعني تكون بائع؟',
        headingEn: 'What is a Seller?',
        bodyAr:
          'البائع يعرض ويبيع منتجاته داخل المتجر وله صفحة عامة باسم المستخدم، ويعتني بعرضه وإشعاراته.',
        bodyEn:
          'A Seller lists and sells their own products inside the store, has a public page by username, and looks after their listing and notifications.',
      },
      {
        headingAr: 'شو يقدر البائع يسوي؟',
        headingEn: 'What a Seller can do',
        bodyAr:
          'إضافة وتعديل عروضه، فتح مبيعاتي لنسخ مفاتيح التسليم لمشتري عروضه، الرد على تذاكر مشتري عروضه من الدعم، الإشعارات، إدارة ملفي الشخصي، وتصفح الأدلة.',
        bodyEn:
          'Add and edit their listings, open My sales to copy fulfillment keys for buyers of their listings, reply on those buyers’ Support tickets, notifications, manage My Profile, and browse guides.',
      },
      {
        headingAr: 'كيف البائع يسوي اللي يقدر عليه؟',
        headingEn: 'How a Seller does those things',
        bodyAr:
          'من عروضي أنشئ أو عدّل عروضك. من مبيعاتي افتح التسليم وانسخ المفاتيح. من الدعم رد على تذاكر مشتري عروضك فقط. صفحتك العامة على /seller/اسم-المستخدم.',
        bodyEn:
          'On My listings create or edit offers. On My sales open Fulfillment and copy keys. On Support reply only to tickets from buyers of your listings. Your public page is /seller/{username}.',
      },
      {
        headingAr: 'كيف البائع يفيد نفسه والمتجر؟',
        headingEn: 'How a Seller benefits himself and the store',
        bodyAr:
          'عروض جذابة وصادقة = مبيعات أكثر ليك وثقة أعلى للمتجر. صفحة بائع مرتّبة تجيب زوار يكرّرون الشراء — نجاحك جزء من نجاح المتجر.',
        bodyEn:
          'Attractive, honest listings mean more sales for you and more trust for the store. A tidy seller page brings repeat visitors — your success is part of the store’s success.',
      },
    ],
  },
  buyer: {
    titleAr: 'دليل المشتري',
    titleEn: 'Buyer guide',
    sections: [
      {
        headingAr: 'شو يعني تكون مشترٍ؟',
        headingEn: 'What is a Buyer?',
        bodyAr:
          'المشتري عضو أتمّ عملية شراء واحدة على الأقل. الرتبة تُمنح تلقائياً بعد أول طلب مدفوع — أنت عميل موثوق في المتجر.',
        bodyEn:
          'A Buyer is a member who completed at least one purchase. The rank is granted automatically after the first paid order — you are a trusted customer of the store.',
      },
      {
        headingAr: 'شو يقدر المشتري يسوي؟',
        headingEn: 'What a Buyer can do',
        bodyAr:
          'التسوق والدفع من السلة، عرض طلباته الشخصية وتفاصيل التسليم بعد الدفع، فتح تذكرة دعم عامة أو لبائع اشتريت منه، تقييم المنتجات المشتراة، إدارة ملفي الشخصي والشارات والإشعارات، وتصفح الأدلة.',
        bodyEn:
          'Shop and pay from Cart, view personal orders and fulfillment after payment, open a general or seller Support ticket for a seller you bought from, review purchased products, manage My Profile, badges, and notifications, and browse guides.',
      },
      {
        headingAr: 'كيف المشتري يسوي اللي يقدر عليه؟',
        headingEn: 'How a Buyer does those things',
        bodyAr:
          'أضف للسلة ثم «إتمام الدفع» عبر Polar وأنت مسجّل الدخول. بعد النجاح افتح طلباتك للتسليم. من الدعم افتح تذكرة — للبائع الصق معرّفه إن لزم. من ملفي الشخصي حدّث بياناتك وشاراتك.',
        bodyEn:
          'Add to Cart, then Complete Payment via Polar while signed in. After success open your orders for fulfillment. From Support open a ticket — paste the seller id when needed. On My Profile update your details and badges.',
      },
      {
        headingAr: 'كيف المشتري يفيد نفسه والمتجر؟',
        headingEn: 'How a Buyer benefits himself and the store',
        bodyAr:
          'تقييمات صادقة تساعد غيرك تختار صح وتقوّي سمعة المتجر. شراء منتظم + شارات = عروض أنسب لك، ومتجر ينمو من عملاء راضين.',
        bodyEn:
          'Honest reviews help others choose well and strengthen the store’s reputation. Regular purchases plus badges unlock better offers for you — and the store grows from happy customers.',
      },
    ],
  },
  member: {
    titleAr: 'دليل العضو',
    titleEn: 'Member guide',
    sections: [
      {
        headingAr: 'شو يعني تكون عضو؟',
        headingEn: 'What is a Member?',
        bodyAr:
          'العضو حساب مسجّل باسم مستخدم وبريد: يقدر يتصفح، يفضّل منتجات، ويتسوّق بعد تسجيل الدخول. هذه نقطة البداية في المتجر.',
        bodyEn:
          'A Member is a registered account with username and email: browse, wishlist, and shop while signed in. This is the starting rank in the store.',
      },
      {
        headingAr: 'شو يقدر العضو يسوي؟',
        headingEn: 'What a Member can do',
        bodyAr:
          'تصفح المتجر والمفضلة، الدفع من السلة بعد الدخول، عرض الطلبات والإشعارات، فتح تذكرة دعم من اللوحة، إدارة ملفي الشخصي (بما فيها طلب حذف الحساب)، وتصفح الأدلة.',
        bodyEn:
          'Browse the store and wishlist, pay from Cart while signed in, view orders and notifications, open a Support ticket from the dashboard, manage My Profile (including account-deletion request), and browse guides.',
      },
      {
        headingAr: 'كيف العضو يسوي اللي يقدر عليه؟',
        headingEn: 'How a Member does those things',
        bodyAr:
          'سجّل الدخول، تصفّح وأضف للمفضلة أو السلة، ثم ادفع. من اللوحة افتح الدعم لتذكرة، وطلباتك وإشعاراتك وملفي الشخصي. لطلب الحذف: من ملفي الشخصي بعد تأكيد الاسم وكلمة المرور.',
        bodyEn:
          'Sign in, browse, wishlist or add to Cart, then pay. From the dashboard open Support for a ticket, plus orders, notifications, and My Profile. To request deletion: My Profile after confirming name and password.',
      },
      {
        headingAr: 'كيف العضو يفيد نفسه والمتجر؟',
        headingEn: 'How a Member benefits himself and the store',
        bodyAr:
          'حساب كامل يحفظ طلباتك ويفتح عروض الأعضاء. أول شراء ناجح يرقّيك لمشترٍ ويبني علاقتك بالمتجر — وكل عضو نشط يقوّي مجتمع المتجر.',
        bodyEn:
          'A full account keeps your orders and unlocks member offers. Your first successful purchase can promote you to Buyer and deepen your tie to the store — every active member strengthens the community.',
      },
    ],
  },
};

export const GUIDE_ROLES: Role[] = [
  'owner',
  'admin',
  'moderator',
  'support',
  'seller',
  'buyer',
  'member',
];
