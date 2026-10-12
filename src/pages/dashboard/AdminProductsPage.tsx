import StaffProductsList from './StaffProductsList';
// PERF-2: defer admin catalog CSS off storefront main chunk (loads with ProductsPage).
void import('../../styles/admin-catalog.css');

export default function AdminProductsPage() {
  return <StaffProductsList variant="admin" />;
}
