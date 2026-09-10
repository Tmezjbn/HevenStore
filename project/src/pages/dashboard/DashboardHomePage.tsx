import { lazy, Suspense } from 'react';
import { useAuthStore } from '../../stores/authStore';
// PERF-2: defer role-home / ledger / listings CSS off storefront main chunk.
void import('../../styles/dashboard-role-surfaces.css');

// Role homes split so recharts (owner/admin) never load for buyer/seller/mod.
const OwnerDashboardHome = lazy(() => import('../../components/dashboard/OwnerDashboardHome'));
const AdminDashboardHome = lazy(() => import('../../components/dashboard/AdminDashboardHome'));
const ModeratorDashboardHome = lazy(() => import('../../components/dashboard/ModeratorDashboardHome'));
const SupportDashboardHome = lazy(() => import('../../components/dashboard/SupportDashboardHome'));
const SellerDashboardHome = lazy(() => import('../../components/dashboard/SellerDashboardHome'));
const BuyerDashboardHome = lazy(() => import('../../components/dashboard/BuyerDashboardHome'));

function HomeFallback() {
  return (
    <div className="flex justify-center py-16" role="status" aria-busy="true">
      <span className="loading loading-spinner loading-md text-primary" aria-hidden />
    </div>
  );
}

export default function DashboardHomePage() {
  const role = useAuthStore((s) => s.profile?.role) || 'member';

  if (role === 'owner') {
    return (
      <Suspense fallback={<HomeFallback />}>
        <OwnerDashboardHome />
      </Suspense>
    );
  }
  if (role === 'admin') {
    return (
      <Suspense fallback={<HomeFallback />}>
        <AdminDashboardHome />
      </Suspense>
    );
  }
  if (role === 'moderator') {
    return (
      <Suspense fallback={<HomeFallback />}>
        <ModeratorDashboardHome />
      </Suspense>
    );
  }
  if (role === 'support') {
    return (
      <Suspense fallback={<HomeFallback />}>
        <SupportDashboardHome />
      </Suspense>
    );
  }
  if (role === 'seller') {
    return (
      <Suspense fallback={<HomeFallback />}>
        <SellerDashboardHome />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<HomeFallback />}>
      <BuyerDashboardHome />
    </Suspense>
  );
}
