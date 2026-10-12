import StaffProductsList from './StaffProductsList';
// PERF-2: defer owner-catalog CSS off storefront main chunk (loads with ProductsPage).
void import('../../styles/dashboard-owner-surfaces.css');

export default function OwnerProductsPage() {
  return <StaffProductsList variant="owner" />;
}
