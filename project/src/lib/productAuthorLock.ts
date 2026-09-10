import type { Role } from '../types';

/** UI mirror of products_delete RLS when product_author_lock is on/off. */
export function canDeleteProductByAuthor(opts: {
  lockOn: boolean;
  userId: string | undefined | null;
  role: Role | string | undefined | null;
  createdBy: string | null | undefined;
  /** Role of created_by profile — needed so owner cannot delete another owner’s product in UI. */
  createdByRole?: Role | string | null;
  /** When set, seller may delete listings on their stall even if author lock attributes elsewhere. */
  sellerId?: string | null;
}): boolean {
  const uid = opts.userId ?? undefined;
  if (!uid) return false;
  // Moderators no longer manage catalog products.
  if (opts.role === 'moderator') return false;
  const staff = opts.role === 'owner' || opts.role === 'admin';
  if (opts.role === 'seller' && opts.sellerId === uid) return true;
  if (opts.lockOn) {
    if (opts.createdBy === uid) return true;
    if (!opts.createdBy) return staff;
    // Owner override: admin/seller/etc — not another owner
    if (opts.role === 'owner') {
      if (opts.createdByRole == null) return true;
      return opts.createdByRole !== 'owner';
    }
    return false;
  }
  if (opts.role === 'owner' || opts.role === 'admin') return true;
  if (opts.role === 'seller') return !opts.createdBy || opts.createdBy === uid;
  return false;
}

/**
 * Who may change "Added by" (created_by):
 * - attributed → only that author
 * - None → only original adder (added_by); legacy null added_by → owner
 */
export function canEditProductAuthor(opts: {
  userId: string | undefined | null;
  role: Role | string | undefined | null;
  createdBy: string | null | undefined;
  addedBy: string | null | undefined;
}): boolean {
  const uid = opts.userId ?? undefined;
  if (!uid) return false;
  if (opts.createdBy) return opts.createdBy === uid;
  if (opts.addedBy) return opts.addedBy === uid;
  return opts.role === 'owner';
}
