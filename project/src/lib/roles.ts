import type { Role } from '../types';

export interface RoleInfo {
  id: Role;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  canAr: string[];
  canEn: string[];
  cannotAr: string[];
  cannotEn: string[];
}

export const ROLE_INFO: RoleInfo[] = [
  {
    id: 'owner',
    labelAr: 'المالك',
    labelEn: 'Owner',
    descAr: 'أعلى رتبة في المتجر. صاحب الموقع وله كامل الصلاحيات.',
    descEn: 'The highest rank in the store. The site owner with full control.',
    canAr: [
      'كل صلاحيات المدير',
      'منح أو سحب رتبة المالك والمدير',
      'إدارة الإعدادات والثيمات ومنشئ الموقع والتصنيفات',
    ],
    canEn: [
      'Everything an Admin can do',
      'Grant or revoke Owner and Admin roles',
      'Manage settings, themes, website builder, and categories',
    ],
    cannotAr: [],
    cannotEn: [],
  },
  {
    id: 'admin',
    labelAr: 'مدير',
    labelEn: 'Admin',
    descAr: 'يشغّل المتجر يومياً: المنتجات والطلبات والمستخدمين والكوبونات والتحليلات.',
    descEn: 'Runs the store day to day: products, orders, users, coupons, and analytics.',
    canAr: [
      'إدارة المنتجات والطلبات والمستخدمين',
      'إدارة الكوبونات والشارات والإشعارات',
      'عرض التحليلات',
    ],
    canEn: [
      'Manage products, orders, and users',
      'Manage coupons, badges, and notifications',
      'View analytics',
    ],
    cannotAr: [],
    cannotEn: [],
  },
  {
    id: 'moderator',
    labelAr: 'مشرف',
    labelEn: 'Moderator',
    descAr: 'يتابع التذاكر المُصعَّدة والتقييمات وملاحظات الفريق — بلا إدارة منتجات.',
    descEn: 'Handles escalated tickets, reviews, and staff notes — not product management.',
    canAr: [
      'صندوق المهم وجميع التذاكر',
      'حذف التقييمات والرد عليها',
      'عرض ملاحظات الفريق (قراءة)',
      'الإشعارات وملفي الشخصي والأدلة',
    ],
    canEn: [
      'Important bin and all tickets',
      'Delete and reply to reviews',
      'View staff notes (read-only)',
      'Notifications, My Profile, and guides',
    ],
    cannotAr: ['إدارة المنتجات أو الرتب أو الإعدادات'],
    cannotEn: ['Manage products, roles, or settings'],
  },
  {
    id: 'support',
    labelAr: 'دعم',
    labelEn: 'Support',
    descAr: 'وكيل دعم: طابور التذاكر، الاستلام، المحادثة، والتصعيد بحذر.',
    descEn: 'Support agent: ticket queue, claim, chat, and careful escalation.',
    canAr: [
      'طابور الدعم وقناة البائعين',
      'استلام تذكرة واحدة والرد',
      'تصعيد للمهم إن لم يكن مقيّداً',
    ],
    canEn: [
      'Support queue and Sellers channel',
      'Claim one ticket and reply',
      'Escalate to Important when not restricted',
    ],
    cannotAr: ['إدارة المنتجات أو الرتب أو الإعدادات', 'رفض التصعيد'],
    cannotEn: ['Manage products, roles, or settings', 'Reject escalations'],
  },
  {
    id: 'seller',
    labelAr: 'بائع',
    labelEn: 'Seller',
    descAr: 'يبيع منتجاته الخاصة داخل المتجر.',
    descEn: 'Sells their own products inside the store.',
    canAr: ['إضافة وتعديل منتجاته', 'طلبات شراء عروضه', 'الإشعارات وملفي الشخصي'],
    canEn: ['Add and edit their own products', 'Orders for their listings', 'Notifications and My Profile'],
    cannotAr: [],
    cannotEn: [],
  },
  {
    id: 'buyer',
    labelAr: 'مشترٍ',
    labelEn: 'Buyer',
    descAr: 'عضو أتم عملية شراء واحدة على الأقل. يُمنح تلقائياً بعد أول طلب مدفوع.',
    descEn: 'A member who completed at least one purchase. Granted automatically after the first paid order.',
    canAr: ['التسوق وإتمام الشراء', 'عرض طلباته وتقييم المنتجات المشتراة'],
    canEn: ['Shop and checkout', 'View their orders and review purchased products'],
    cannotAr: [],
    cannotEn: [],
  },
  {
    id: 'member',
    labelAr: 'عضو',
    labelEn: 'Member',
    descAr: 'الرتبة الافتراضية عند إنشاء الحساب، قبل أول عملية شراء.',
    descEn: 'The default rank on signup, before the first purchase.',
    canAr: ['تصفح المتجر وإضافة منتجات للسلة والمفضلة', 'إتمام الشراء (يترقى لمشترٍ تلقائياً)'],
    canEn: ['Browse, add to cart and wishlist', 'Checkout (auto-upgrades to Buyer)'],
    cannotAr: [],
    cannotEn: [],
  },
];

export function roleLabel(role: string, lang: 'ar' | 'en'): string {
  const info = ROLE_INFO.find((r) => r.id === role);
  if (!info) return role;
  return lang === 'ar' ? info.labelAr : info.labelEn;
}

/** Owner/admin/moderator/support/seller — public /seller card + avatar upload. */
export function canUsePublicProfile(role: string | null | undefined): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'moderator' ||
    role === 'support' ||
    role === 'seller'
  );
}

/** Alias: staff-facing store roles that may change photo. */
export function canChangeAvatar(role: string | null | undefined): boolean {
  return canUsePublicProfile(role);
}
