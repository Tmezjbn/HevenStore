import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import AdminProductsPage from './AdminProductsPage';
import OwnerProductsPage from './OwnerProductsPage';
import SellerProductsPage from './SellerProductsPage';

export default function ProductsPage() {
  const role = useAuthStore((s) => s.profile?.role);
  if (role === 'seller') return <SellerProductsPage />;
  if (role === 'owner') return <OwnerProductsPage />;
  if (role === 'admin') return <AdminProductsPage />;
  // Moderators (and others) no longer manage staff catalog — soft landing if URL hit.
  return <Navigate to="/dashboard" replace />;
}
