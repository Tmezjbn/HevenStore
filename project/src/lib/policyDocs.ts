/** Bilingual privacy / terms docs stored as site_settings JSON. */

export interface PolicySection {
  title_ar: string;
  title_en: string;
  body_ar: string[];
  body_en: string[];
}

export interface PolicyDocData {
  updated_ar: string;
  updated_en: string;
  short_bullets_ar: string[];
  short_bullets_en: string[];
  sections: PolicySection[];
}

export const DEFAULT_PRIVACY_POLICY: PolicyDocData = {
  updated_ar: 'آخر تحديث: يوليو 2026',
  updated_en: 'Last updated: July 2026',
  short_bullets_ar: [
    'نجمع بيانات الحساب والطلب لتسليم المفاتيح والاشتراكات الرقمية.',
    'تحليلات Databuddy تعمل فقط بعد موافقتك — الرفض يوقف Databuddy فقط (الخطوط والخدمات الأخرى تبقى).',
    'لا نبيع بياناتك لجهات إعلانية خارجية.',
    'بيانات الدفع تُعالَج عبر مزوّد الدفع؛ لا نخزّن أرقام البطاقات كاملة لدينا.',
  ],
  short_bullets_en: [
    'We collect account and order data to deliver digital keys and subscriptions.',
    'Databuddy analytics run only after you accept — decline stops Databuddy only (fonts and other site services stay on).',
    'We do not sell your personal data to third-party advertisers.',
    'Payments are processed by our payment provider; we do not store full card numbers.',
  ],
  sections: [
    {
      title_ar: '1. من نحن',
      title_en: '1. Who we are',
      body_ar: [
        'HEVEN.FUN متجر ترفيه رقمي يبيع ألعاباً واشتراكات وبطاقات هدايا ومفاتيح رقمية. توضح هذه السياسة كيف نتعامل مع معلوماتك عند التصفح أو الشراء أو إنشاء حساب.',
      ],
      body_en: [
        'HEVEN.FUN is a digital entertainment storefront for games, subscriptions, gift cards, and digital keys. This policy explains how we handle information when you browse, buy, or create an account.',
      ],
    },
    {
      title_ar: '2. ما نجمعه',
      title_en: '2. What we collect',
      body_ar: [
        'بيانات الحساب: البريد الإلكتروني والاسم وبيانات الملف إن قدّمتها.',
        'بيانات الطلب: المنتجات والكميات والأسعار وحالة التسليم وسجل الطلبات المرتبطة بحسابك.',
        'بيانات تقنية محدودة: نوع الجهاز/المتصفح وعنوان IP تقريبي لأمان الموقع ومنع الإساءة.',
        'بيانات الاستخدام التحليلية فقط إذا وافقت على التحليلات في بانر الخصوصية أو من التفضيلات.',
      ],
      body_en: [
        'Account data: email, name, and profile details you provide.',
        'Order data: products, quantities, prices, fulfillment status, and order history tied to your account.',
        'Limited technical data: device/browser type and approximate IP for security and abuse prevention.',
        'Analytics usage data only if you accept analytics via the privacy banner or Preferences.',
      ],
    },
    {
      title_ar: '3. كيف نستخدم البيانات',
      title_en: '3. How we use data',
      body_ar: [
        'لتسليم المنتجات الرقمية (مفاتيح، رموز، تفعيل اشتراك) ودعم ما بعد الشراء.',
        'لتشغيل الحساب والسلة والمفضلة والإشعارات داخل المنصة.',
        'لتحسين المتجر والأداء عند تفعيل التحليلات بموافقتك.',
        'للامتثال للقانون ومكافحة الاحتيال وإساءة استخدام المخزون أو الحسابات.',
      ],
      body_en: [
        'To deliver digital products (keys, codes, subscription activation) and provide post-purchase support.',
        'To run your account, cart, wishlist, and in-app notifications.',
        'To improve the storefront and performance when analytics are enabled with your consent.',
        'To comply with law and fight fraud, stock abuse, or account misuse.',
      ],
    },
    {
      title_ar: '4. التحليلات والكوكيز',
      title_en: '4. Analytics and cookies',
      body_ar: [
        'نستخدم Databuddy لفهم الزيارات والأخطاء والأداء. رفض التحليلات يمنع تحميل Databuddy فقط — خطوط CoolLabs وباقي البنية التحتية للموقع لا تُوقَف.',
        'يمكنك قبول أو رفض تحليلات Databuddy من بانر الخصوصية. إن رفضت، يمكنك القبول لاحقاً من التفضيلات. المسجّلون يمكنهم التبديل من التفضيلات في أي وقت.',
      ],
      body_en: [
        'We use Databuddy to understand visits, errors, and performance. Declining analytics blocks Databuddy only — CoolLabs fonts and other site infrastructure keep loading.',
        'You can accept or decline Databuddy from the privacy banner. If you decline, you can accept later from Preferences. Signed-in users can change the toggle in Preferences anytime.',
      ],
    },
    {
      title_ar: '5. المدفوعات والأطراف الثالثة',
      title_en: '5. Payments and third parties',
      body_ar: [
        'الدفع يتم عبر مزوّد دفع خارجي آمن. يخضعون لسياساتهم الخاصة بحماية بيانات الدفع.',
        'قد نشارك بيانات لازمة فقط لإتمام الطلب أو التسليم أو الدعم مع مزوّدي البنية (استضافة، بريد، تخزين).',
      ],
      body_en: [
        'Checkout is handled by a secure external payment provider under their own policies.',
        'We share only what is needed to complete orders, delivery, or support with infrastructure providers (hosting, email, storage).',
      ],
    },
    {
      title_ar: '6. الاحتفاظ والأمان',
      title_en: '6. Retention and security',
      body_ar: [
        'نحتفظ بسجلات الطلبات والحساب طالما لزم لخدمة العملاء والالتزامات القانونية.',
        'نطبق إجراءات تقنية وتنظيمية معقولة لحماية البيانات، لكن لا توجد شبكة آمنة 100%.',
      ],
      body_en: [
        'We keep account and order records as needed for support and legal obligations.',
        'We apply reasonable technical and organizational safeguards; no online service is perfectly secure.',
      ],
    },
    {
      title_ar: '7. حقوقك',
      title_en: '7. Your rights',
      body_ar: [
        'يمكنك طلب الوصول أو تصحيح أو حذف بيانات الحساب حيث يسمح القانون، عبر التواصل معنا من إعدادات الموقع أو البريد المعروض.',
        'يمكنك إغلاق الحساب وفق إجراءات المنصة؛ قد تبقى سجلات معاملات لأغراض قانونية.',
      ],
      body_en: [
        'Where law allows, you may request access, correction, or deletion of account data via the store contact email.',
        'You may close your account per platform process; transaction records may be retained where required.',
      ],
    },
    {
      title_ar: '8. التواصل',
      title_en: '8. Contact',
      body_ar: ['لأسئلة الخصوصية استخدم بريد التواصل في إعدادات المتجر أو صفحة من نحن.'],
      body_en: ['For privacy questions, use the contact email in site settings or the About page.'],
    },
  ],
};

export const DEFAULT_TERMS_POLICY: PolicyDocData = {
  updated_ar: 'آخر تحديث: يوليو 2026',
  updated_en: 'Last updated: July 2026',
  short_bullets_ar: [
    'المنتجات رقمية: مفاتيح ورموز واشتراكات — التسليم إلكتروني بعد الدفع الناجح.',
    'الأسعار والمخزون قد يتغيران؛ الطلب يُؤكَّد عند إتمام الدفع وتوفر المخزون.',
    'بعد تسليم المفتاح أو الرمز، المبيعات نهائية عادة إلا في حالات عطل منصتنا أو منتج غير صالح أثبتناه.',
    'ممنوع الاحتيال وإساءة استخدام الحساب وإعادة البيع غير المسموح بها.',
  ],
  short_bullets_en: [
    'Products are digital: keys, codes, and subscriptions — delivered electronically after successful payment.',
    'Prices and stock can change; an order is confirmed when payment clears and stock is available.',
    'After a key or code is delivered, sales are generally final unless our platform fault or a verified invalid product.',
    'Fraud, abusive accounts, or unauthorized resale is prohibited.',
  ],
  sections: [
    {
      title_ar: '1. القبول',
      title_en: '1. Acceptance',
      body_ar: ['باستخدامك HEVEN.FUN فإنك توافق على هذه الشروط. إن لم توافق، لا تستخدم المتجر.'],
      body_en: ['By using HEVEN.FUN you agree to these terms. If you do not agree, do not use the store.'],
    },
    {
      title_ar: '2. الحساب',
      title_en: '2. Accounts',
      body_ar: [
        'أنت مسؤول عن سرية بيانات الدخول ونشاط حسابك.',
        'يجب تقديم معلومات صحيحة. نحتفظ بحق تعليق الحسابات عند الاشتباه بالاحتيال أو إساءة الاستخدام.',
      ],
      body_en: [
        'You are responsible for keeping login credentials confidential and for activity on your account.',
        'Provide accurate information. We may suspend accounts suspected of fraud or abuse.',
      ],
    },
    {
      title_ar: '3. المنتجات الرقمية',
      title_en: '3. Digital products',
      body_ar: [
        'نبيع منتجات رقمية (مفاتيح ألعاب، بطاقات، اشتراكات، وما شابه). المحتوى النهائي يخضع لشروط الناشر أو المنصة الخارجية أيضاً.',
        'التسليم يتم عبر لوحة الحساب أو البريد أو آلية العرض داخل الطلب بعد تأكيد الدفع.',
      ],
      body_en: [
        'We sell digital goods (game keys, gift cards, subscriptions, and similar). Publishers or external platforms may impose additional terms on redeemed content.',
        'Delivery happens via your account dashboard, email, or the order view after payment confirmation.',
      ],
    },
    {
      title_ar: '4. الطلبات والدفع',
      title_en: '4. Orders and payment',
      body_ar: [
        'عرض السعر لا يضمن التوفر حتى يكتمل الدفع ويُخصَم المخزون بنجاح.',
        'قد نلغي أو نعدّل طلباً عند خطأ تسعير واضح أو فشل التحقق من الدفع أو نفاد المخزون بعد محاولة الشراء.',
      ],
      body_en: [
        'A listed price does not guarantee availability until payment succeeds and stock is reserved.',
        'We may cancel or adjust an order for clear pricing errors, failed payment verification, or stock exhaustion after a purchase attempt.',
      ],
    },
    {
      title_ar: '5. الاسترجاع والاستبدال',
      title_en: '5. Refunds and replacements',
      body_ar: [
        'بسبب طبيعة المنتجات الرقمية، لا يُقبل الإرجاع بعد كشف المفتاح أو الرمز أو تفعيل الاشتراك، إلا إذا: (أ) فشل التسليم بسبب عطل لدينا، أو (ب) أثبتنا أن المنتج غير صالح للاستخدام دون خطأ منك.',
        'قدّم بلاغ الدعم مع رقم الطلب خلال مدة معقولة لمعالجة الحالات المشمولة.',
      ],
      body_en: [
        'Because products are digital, returns are not accepted after a key/code is revealed or a subscription is activated, except when: (a) delivery failed due to our platform fault, or (b) we verify the product is unusable through no fault of yours.',
        'Contact support with your order ID within a reasonable time for covered cases.',
      ],
    },
    {
      title_ar: '6. الاستخدام المقبول',
      title_en: '6. Acceptable use',
      body_ar: [
        'يُحظر محاولة اختراق الموقع أو إساءة واجهات البرمجة أو التلاعب بالمخزون أو إنشاء طلبات وهمية.',
        'لا تستخدم المتجر بما يخالف قوانين بلدك أو شروط الناشر للمنتج المشترى.',
      ],
      body_en: [
        'Do not attack the site, abuse APIs, manipulate stock, or place fraudulent orders.',
        'Do not use the store in violation of your local law or the publisher’s terms for redeemed products.',
      ],
    },
    {
      title_ar: '7. إخلاء المسؤولية',
      title_en: '7. Disclaimer',
      body_ar: [
        'نقدّم المتجر «كما هو». لا نضمن عدم انقطاع الخدمة. لسنا مسؤولين عن خسائر ناتجة عن سوء استخدام المفتاح أو تأخير منصات خارجية أو قرارات حظر من الناشر بعد التسليم الصحيح.',
      ],
      body_en: [
        'The storefront is provided “as is.” We do not guarantee uninterrupted service. We are not liable for losses from key misuse, third-party platform delays, or publisher bans after correct delivery.',
      ],
    },
    {
      title_ar: '8. التغييرات',
      title_en: '8. Changes',
      body_ar: ['قد نحدّث هذه الشروط. استمرار الاستخدام بعد النشر يعني قبول النسخة المحدّثة.'],
      body_en: ['We may update these terms. Continued use after publication means you accept the updated version.'],
    },
  ],
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function normalizeSection(raw: unknown): PolicySection | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    title_ar: typeof o.title_ar === 'string' ? o.title_ar : '',
    title_en: typeof o.title_en === 'string' ? o.title_en : '',
    body_ar: asStringArray(o.body_ar),
    body_en: asStringArray(o.body_en),
  };
}

export function parsePolicyDoc(raw: string, fallback: PolicyDocData): PolicyDocData {
  if (!raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return fallback;
    const o = parsed as Record<string, unknown>;
    const sectionsRaw = Array.isArray(o.sections) ? o.sections : [];
    const sections = sectionsRaw
      .map(normalizeSection)
      .filter((s): s is PolicySection => Boolean(s));
    if (sections.length === 0) return fallback;
    return {
      updated_ar: typeof o.updated_ar === 'string' ? o.updated_ar : fallback.updated_ar,
      updated_en: typeof o.updated_en === 'string' ? o.updated_en : fallback.updated_en,
      short_bullets_ar: asStringArray(o.short_bullets_ar).length
        ? asStringArray(o.short_bullets_ar)
        : fallback.short_bullets_ar,
      short_bullets_en: asStringArray(o.short_bullets_en).length
        ? asStringArray(o.short_bullets_en)
        : fallback.short_bullets_en,
      sections,
    };
  } catch {
    return fallback;
  }
}

/** Textarea helper: paragraphs separated by blank lines. */
export function joinParagraphs(lines: string[]): string {
  return lines.join('\n\n');
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function joinBullets(lines: string[]): string {
  return lines.join('\n');
}

export function splitBullets(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}
