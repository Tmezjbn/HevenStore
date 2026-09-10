import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, Users, BarChart3, Bell, Settings,
  Palette, Globe, ShoppingBag, Ticket, LogOut, Menu, ScrollText,
  User, BookOpen, Award, UserX, Headphones,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { roleLabel } from '../lib/roles';
import BrandLogo from '../components/ui/BrandLogo';
import RouteLoadingScreen from '../components/ui/RouteLoadingScreen';
import UserAvatar from '../components/ui/UserAvatar';
import ProfileBadgeStrip from '../components/ui/ProfileBadgeStrip';
import ErrorBoundary from '../components/ErrorBoundary';
import AccountSwitch from '../components/dashboard/AccountSwitch';

const DRAWER_ID = 'dashboard-drawer';

function closeDrawer() {
  const el = document.getElementById(DRAWER_ID) as HTMLInputElement | null;
  if (el) el.checked = false;
}

export default function DashboardLayout() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const { t, lang } = useI18n();
  const location = useLocation();
  usePageMeta({ title: t('لوحة التحكم', 'Dashboard'), noindex: true });

  // Wait for the session to restore before deciding — otherwise a page
  // refresh kicks logged-in users back to the login screen.
  const onAnalytics = location.pathname.startsWith('/dashboard/analytics');
  const holdLabel = onAnalytics
    ? t('جارٍ تحميل التحليلات', 'Loading analytics')
    : loading
      ? t('جارٍ فتح لوحة التحكم', 'Opening dashboard')
      : t('جارٍ تحميل حسابك', 'Loading your account');

  if (loading) {
    return <RouteLoadingScreen label={holdLabel} />;
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  // Role is unknown until the profile row loads — hold the screen instead
  // of guessing, so staff aren't bounced off admin pages on refresh.
  if (!profile) {
    return <RouteLoadingScreen label={holdLabel} />;
  }

  const allLinks = [
    { icon: LayoutDashboard, label: 'لوحة التحكم', labelEn: 'Dashboard', href: '/dashboard', roles: ['owner', 'admin', 'moderator', 'support', 'seller', 'buyer', 'member'] },
    { icon: User, label: 'ملفي الشخصي', labelEn: 'My Profile', href: '/dashboard/profile', roles: ['owner', 'admin', 'moderator', 'support', 'seller', 'buyer', 'member'] },
    { icon: Award, label: 'شاراتي', labelEn: 'My Badges', href: '/dashboard/my-badges', roles: ['moderator', 'support', 'seller', 'buyer', 'member'] },
    { icon: BookOpen, label: 'الأدلة', labelEn: 'Guides', href: '/dashboard/guides', roles: ['owner', 'admin', 'moderator', 'support', 'seller', 'buyer', 'member'] },
    { icon: BarChart3, label: 'التحليلات', labelEn: 'Analytics', href: '/dashboard/analytics', roles: ['owner', 'admin'] },
    { icon: Package, label: 'المنتجات', labelEn: 'Products', href: '/dashboard/products', roles: ['owner', 'admin'] },
    { icon: Package, label: 'عروضي', labelEn: 'My listings', href: '/dashboard/products', roles: ['seller'] },
    { icon: Tag, label: 'التصنيفات', labelEn: 'Categories', href: '/dashboard/categories', roles: ['owner'] },
    { icon: ShoppingBag, label: 'الطلبات', labelEn: 'Orders', href: '/dashboard/orders', roles: ['owner', 'admin'] },
    { icon: ShoppingBag, label: 'مبيعاتي', labelEn: 'My sales', href: '/dashboard/orders', roles: ['seller'] },
    { icon: ShoppingBag, label: 'طلباتي الشخصية', labelEn: 'My Orders', href: '/dashboard/orders', roles: ['buyer', 'member', 'moderator', 'support'] },
    { icon: Headphones, label: 'الدعم', labelEn: 'Support', href: '/dashboard/support', roles: ['owner', 'admin', 'moderator', 'support', 'seller', 'buyer', 'member'] },
    { icon: Ticket, label: 'الكوبونات', labelEn: 'Coupons', href: '/dashboard/coupons', roles: ['owner', 'admin'] },
    { icon: Award, label: 'الشارات', labelEn: 'Badges', href: '/dashboard/badges', roles: ['owner', 'admin'] },
    { icon: Users, label: 'المستخدمون', labelEn: 'Users', href: '/dashboard/users', roles: ['owner', 'admin'] },
    { icon: UserX, label: 'طلبات الحذف', labelEn: 'Deletion requests', href: '/dashboard/deletion-requests', roles: ['owner'] },
    { icon: Bell, label: 'الإشعارات', labelEn: 'Notifications', href: '/dashboard/notifications', roles: ['owner', 'admin', 'moderator', 'support', 'seller', 'buyer', 'member'] },
    { icon: Palette, label: 'الثيمات', labelEn: 'Themes', href: '/dashboard/themes', roles: ['owner'] },
    { icon: Globe, label: 'منشئ الموقع', labelEn: 'Website Builder', href: '/dashboard/builder', roles: ['owner'] },
    { icon: Settings, label: 'الإعدادات', labelEn: 'Settings', href: '/dashboard/settings', roles: ['owner'] },
    { icon: ScrollText, label: 'سجلات التحديث', labelEn: 'Changelogs', href: '/dashboard/changelogs', roles: ['owner'] },
  ];

  const userRole = profile?.role || 'member';
  const visibleLinks = allLinks.filter((l) => l.roles.includes(userRole));

  // Route guard: the same role map that filters the sidebar also blocks
  // direct URL access (RLS still protects the data underneath).
  // Nested paths (e.g. /dashboard/products/:slug/edit) inherit the parent link roles.
  const routeRoles = allLinks
    .filter((l) =>
      l.href === '/dashboard'
        ? location.pathname === '/dashboard'
        : location.pathname === l.href || location.pathname.startsWith(`${l.href}/`),
    )
    .flatMap((l) => l.roles);
  if (routeRoles.length > 0 && !routeRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  const linkMatches = (href: string) =>
    href === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname === href || location.pathname.startsWith(`${href}/`);

  const activeLink = visibleLinks.find((l) => linkMatches(l.href));
  const pageTitle = activeLink
    ? t(activeLink.label, activeLink.labelEn)
    : t('لوحة التحكم', 'Dashboard');

  // Trail for nested routes (e.g. Products → Edit) — skip on bare /dashboard.
  const crumbs: { to?: string; label: string }[] = [
    { to: '/dashboard', label: t('لوحة التحكم', 'Dashboard') },
  ];
  if (location.pathname !== '/dashboard') {
    const section = visibleLinks.find(
      (l) =>
        l.href !== '/dashboard' &&
        (location.pathname === l.href || location.pathname.startsWith(`${l.href}/`)),
    );
    if (section) {
      const isLeaf = location.pathname === section.href;
      crumbs.push({
        to: isLeaf ? undefined : section.href,
        label: t(section.label, section.labelEn),
      });
    }
    if (/\/products\/new\/?$/.test(location.pathname)) {
      crumbs.push({ label: t('منتج جديد', 'New product') });
    } else if (/\/products\/[^/]+\/edit\/?$/.test(location.pathname)) {
      crumbs.push({ label: t('تعديل', 'Edit') });
    }
  }
  const showCrumbs = crumbs.length > 1;

  const sidebar = (
    <>
      <div className="p-4 border-b border-base-300">
        <BrandLogo />
      </div>
      <ul className="menu p-3 flex-1 gap-1">
        {visibleLinks.map((link) => {
          const on = linkMatches(link.href);
          return (
            <li key={`${link.href}-${link.labelEn}`}>
              <Link
                to={link.href}
                onClick={closeDrawer}
                className={on ? 'menu-active' : undefined}
                aria-current={on ? 'page' : undefined}
              >
                <link.icon size={16} />
                {t(link.label, link.labelEn)}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="px-3 pb-2">
        <Link
          to="/store"
          onClick={closeDrawer}
          className="flex items-center gap-2.5 min-h-11 w-full rounded-lg px-3 text-base font-semibold tracking-tight text-base-content hover:bg-base-300 motion-safe:transition-colors"
        >
          <ShoppingBag size={18} className="shrink-0 opacity-80" aria-hidden />
          {t('متابعة التسوق', 'Continue shopping')}
        </Link>
      </div>
      <div className="p-3 border-t border-base-300">
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-base-300/50">
          <Link
            to="/dashboard/profile"
            onClick={closeDrawer}
            className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-90"
          >
            <UserAvatar
              name={profile?.full_name}
              email={user?.email}
              avatarUrl={profile?.avatar_url}
              sizeClass="w-10 shrink-0"
            />
            <div className="flex-1 min-w-0 text-start overflow-visible">
              <p className="text-sm font-semibold truncate tracking-tight leading-snug text-base-content">
                {profile?.full_name || t('المستخدم', 'User')}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm text-base-content/60 leading-none whitespace-nowrap">
                  {roleLabel(userRole, lang)}
                </span>
                <ProfileBadgeStrip
                  userId={profile?.id}
                  visible={profile?.show_badges !== false}
                  size={12}
                  inline
                  className="gap-1"
                />
              </div>
            </div>
          </Link>
          <AccountSwitch onDone={closeDrawer} />
          <button type="button" onClick={signOut} className="btn btn-ghost btn-square btn-sm text-error" aria-label={t('تسجيل الخروج', 'Sign out')}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="drawer lg:drawer-open min-h-screen bg-base-100">
      <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        <div className="dash-chrome-bar lg:hidden">
          <div className="dash-chrome-bar__rail">
            <label
              htmlFor={DRAWER_ID}
              className="btn btn-ghost btn-square min-h-11 min-w-11 dash-chrome-menu"
              aria-label={t('القائمة', 'Menu')}
            >
              <Menu size={20} aria-hidden />
            </label>
          </div>
          <div className="dash-chrome-bar__center">
            <div key={pageTitle} className="dash-chrome-title-wrap">
              <h1 className="dash-chrome-title truncate">{pageTitle}</h1>
            </div>
          </div>
          <div className="dash-chrome-bar__rail" aria-hidden />
        </div>
        <header className="dash-chrome-header hidden lg:flex">
          <div key={pageTitle} className="dash-chrome-title-wrap dash-chrome-title-wrap--start">
            <h1 className="dash-chrome-title">{pageTitle}</h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {showCrumbs && (
            <nav className="breadcrumbs text-sm mb-4 text-base-content/70" aria-label={t('مسار الصفحة', 'Breadcrumb')}>
              <ul>
                {crumbs.map((c, i) => (
                  <li key={`${c.label}-${i}`}>
                    {c.to ? (
                      <Link to={c.to} className="link link-hover">
                        {c.label}
                      </Link>
                    ) : (
                      <span className="text-base-content font-medium" aria-current="page">
                        {c.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <div className="drawer-side z-40">
        <label htmlFor={DRAWER_ID} className="drawer-overlay lg:hidden" aria-label={t('إغلاق', 'Close')} />
        <aside className="bg-base-200 border-e border-base-300 w-64 min-h-full flex flex-col">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
