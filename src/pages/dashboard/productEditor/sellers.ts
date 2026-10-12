import { ROLE_INFO } from '../../../lib/roles';
import { Role } from '../../../types';
import { SellerPick, SellerSort } from './types';

export const ROLE_SORT_ORDER = ROLE_INFO.map((r) => r.id);

export function sellerDisplayName(s: SellerPick): string {
  return s.full_name?.trim() || s.email || s.id.slice(0, 8);
}

export function filterAndSortSellers(
  list: SellerPick[],
  query: string,
  roleFilter: string,
  sort: SellerSort,
): SellerPick[] {
  const q = query.trim().toLowerCase();
  let next = list.filter((s) => {
    if (roleFilter && s.role !== roleFilter) return false;
    if (!q) return true;
    const hay = `${s.full_name || ''} ${s.email || ''} ${s.role || ''}`.toLowerCase();
    return hay.includes(q);
  });
  next = [...next].sort((a, b) => {
    if (sort === 'role') {
      const ai = ROLE_SORT_ORDER.indexOf(a.role as Role);
      const bi = ROLE_SORT_ORDER.indexOf(b.role as Role);
      const aRank = ai === -1 ? 99 : ai;
      const bRank = bi === -1 ? 99 : bi;
      if (aRank !== bRank) return aRank - bRank;
    }
    return sellerDisplayName(a).localeCompare(sellerDisplayName(b), undefined, { sensitivity: 'base' });
  });
  return next;
}
