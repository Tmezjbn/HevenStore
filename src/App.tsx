import { lazy, Suspense, useLayoutEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { I18nProvider } from './lib/i18n';
import AppearanceProvider from './components/appearance/AppearanceProvider';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ui/ScrollToTop';
import RouteLoadingScreen from './components/ui/RouteLoadingScreen';
import AppBootGate from './components/ui/AppBootGate';
import DatabuddyAnalytics from './components/analytics/DatabuddyAnalytics';
import AccountPrefsSync from './components/prefs/AccountPrefsSync';
import { useI18n } from './lib/i18n';
import { isSupabaseConfigured } from './lib/supabase';
import { parseUiScale } from './lib/siteSettings';
import { useSiteSettings } from './hooks/useSiteSettings';

// Layouts
import MainLayout from './layouts/MainLayout';

// Hot path: home + catalog stay eager. Everything else splits.
import HomePage from './pages/HomePage';
import GamesPage from './pages/GamesPage';

const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const GiftCardsPage = lazy(() => import('./pages/GiftCardsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const SellerPage = lazy(() => import('./pages/SellerPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.TermsPage })),
);
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Auth + dashboard load on demand — shoppers never pay for admin code.
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const DashboardHomePage = lazy(() => import('./pages/dashboard/DashboardHomePage'));
const AnalyticsPage = lazy(() => import('./pages/dashboard/AnalyticsPage'));
const ProductsPage = lazy(() => import('./pages/dashboard/ProductsPage'));
const ProductEditorPage = lazy(() => import('./pages/dashboard/ProductEditorPage'));
const CategoriesPage = lazy(() => import('./pages/dashboard/CategoriesPage'));
const OrdersPage = lazy(() => import('./pages/dashboard/OrdersPage'));
const CouponsPage = lazy(() => import('./pages/dashboard/CouponsPage'));
const UsersPage = lazy(() => import('./pages/dashboard/UsersPage'));
const NotificationsPage = lazy(() => import('./pages/dashboard/NotificationsPage'));
const ThemesPage = lazy(() => import('./pages/dashboard/ThemesPage'));
const WebsiteBuilderPage = lazy(() => import('./pages/dashboard/WebsiteBuilderPage'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));
const OwnerChangelogsPage = lazy(() => import('./pages/dashboard/OwnerChangelogsPage'));
const ProfilePage = lazy(() => import('./pages/dashboard/ProfilePage'));
const GuidesPage = lazy(() => import('./pages/dashboard/GuidesPage'));
const BadgesPage = lazy(() => import('./pages/dashboard/BadgesPage'));
const MyBadgesPage = lazy(() => import('./pages/dashboard/MyBadgesPage'));
const DeletionRequestsPage = lazy(() => import('./pages/dashboard/DeletionRequestsPage'));
const SupportPage = lazy(() => import('./pages/dashboard/SupportPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function UiScaleSync() {
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();
  const storefront = !pathname.startsWith('/dashboard') && !pathname.startsWith('/auth');
  const scale = storefront ? parseUiScale(settings.ui_scale) : 100;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--ui-scale', `${scale}%`);
    root.dataset.uiScale = String(scale);
    root.dataset.uiScaleScope = storefront ? 'storefront' : 'baseline';
  }, [scale, storefront]);

  return null;
}

function RouteFallback() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  // Product editor: keep dashboard chrome; avoid full-screen loading flash.
  if (/^\/dashboard\/products\/(new|[^/]+\/edit)/.test(pathname)) {
    return (
      <div
        className="flex justify-center items-center py-20"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="loading loading-spinner loading-md text-primary" aria-hidden />
        <span className="sr-only">{t('جارٍ فتح المحرر', 'Opening editor')}</span>
      </div>
    );
  }
  const label = pathname.startsWith('/dashboard/analytics')
    ? t('جارٍ تحميل التحليلات', 'Loading analytics')
    : undefined;
  return <RouteLoadingScreen label={label} />;
}

function MissingEnvScreen() {
  return (
    <div className="min-h-screen bg-[#161616] text-[#ececec] flex items-center justify-center px-4">
      <div className="max-w-lg space-y-3 text-center" role="alert">
        <h1 className="text-2xl font-bold">Deploy config missing</h1>
        <p className="text-sm opacity-80 text-pretty">
          Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> in the host
          environment, then rebuild. Vite bakes these in at build time — a{' '}
          <code className="font-mono text-xs">dist/</code> built without them boots blank.
        </p>
      </div>
    </div>
  );
}

/** Inside data router — required for useBlocker (Website Builder leave-guard). */
function AppRouterShell() {
  return (
    <>
      <ScrollToTop />
      <UiScaleSync />
      <DatabuddyAnalytics />
      <AuthProvider>
        <AccountPrefsSync />
        <AppBootGate>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </AppBootGate>
      </AuthProvider>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <AppRouterShell />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'store', element: <GamesPage /> },
          { path: 'subscriptions', element: <SubscriptionsPage /> },
          { path: 'gift-cards', element: <GiftCardsPage /> },
          { path: 'product/:slug', element: <ProductDetailPage /> },
          { path: 'seller/:id', element: <SellerPage /> },
          { path: 'about', element: <AboutPage /> },
          { path: 'privacy', element: <PrivacyPage /> },
          { path: 'terms', element: <TermsPage /> },
          { path: 'updates', element: <ChangelogPage /> },
          { path: 'changelog', element: <Navigate to="/updates" replace /> },
          { path: 'cart', element: <CartPage /> },
          { path: 'wishlist', element: <WishlistPage /> },
          { path: 'checkout/success', element: <CheckoutSuccessPage /> },
          { path: 'checkout', element: <Navigate to="/cart" replace /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: 'auth/login', element: <LoginPage /> },
      { path: 'auth/register', element: <RegisterPage /> },
      { path: 'auth/forgot-password', element: <ForgotPasswordPage /> },
      { path: 'auth/reset-password', element: <ResetPasswordPage /> },
      {
        path: 'dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardHomePage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'products/new', element: <ProductEditorPage /> },
          { path: 'products/:productSlug/edit', element: <ProductEditorPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'coupons', element: <CouponsPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'themes', element: <ThemesPage /> },
          { path: 'builder', element: <WebsiteBuilderPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'changelogs', element: <OwnerChangelogsPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'guides', element: <GuidesPage /> },
          { path: 'badges', element: <BadgesPage /> },
          { path: 'my-badges', element: <MyBadgesPage /> },
          { path: 'deletion-requests', element: <DeletionRequestsPage /> },
          { path: 'support', element: <SupportPage /> },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);

export default function App() {
  if (!isSupabaseConfigured) {
    return <MissingEnvScreen />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AppearanceProvider>
            <RouterProvider router={router} />
          </AppearanceProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
