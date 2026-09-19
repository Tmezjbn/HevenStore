import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '../types';
import type { AppliedCoupon } from '../lib/coupons';

interface CartStore {
  items: CartItem[];
  coupon: AppliedCoupon | null;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCoupon: (coupon: AppliedCoupon | null) => void;
  /** Replace snapshots with live rows; drop missing/oos; clamp qty. */
  hydrateFromLive: (live: Product[]) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      setCoupon: (coupon) => set({ coupon }),
      addItem: (product, quantity = 1) => {
        if (product.stock <= 0) return;
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            const nextQty = Math.min(existing.quantity + quantity, product.stock);
            if (nextQty === existing.quantity) return state;
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { product, quantity: nextQty }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { product, quantity: Math.min(quantity, product.stock) }],
          };
        });
      },
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => {
            if (i.product.id !== productId) return i;
            const max = i.product.stock > 0 ? i.product.stock : 0;
            // Stale snapshot may carry stock<=0 — clamp increases only;
            // the user must still be able to lower/remove the qty.
            if (max <= 0) return { ...i, quantity: Math.min(quantity, i.quantity) };
            return { ...i, quantity: Math.min(quantity, max) };
          }),
        }));
      },
      hydrateFromLive: (live) => {
        const byId = new Map(live.map((p) => [p.id, p]));
        set((state) => {
          const next: CartItem[] = [];
          for (const item of state.items) {
            const product = byId.get(item.product.id);
            if (!product || product.stock <= 0) continue;
            next.push({
              product,
              quantity: Math.min(item.quantity, product.stock),
            });
          }
          // Same ids+qty+prices → skip write (avoids loop with React Query).
          if (
            next.length === state.items.length &&
            next.every((n, i) => {
              const o = state.items[i];
              return (
                n.product.id === o.product.id &&
                n.quantity === o.quantity &&
                n.product.price === o.product.price &&
                n.product.stock === o.product.stock &&
                n.product.name === o.product.name &&
                n.product.name_ar === o.product.name_ar &&
                n.product.thumbnail_url === o.product.thumbnail_url &&
                n.product.slug === o.product.slug
              );
            })
          ) {
            return state;
          }
          return { items: next };
        });
      },
      clearCart: () => set({ items: [], coupon: null }),
      total: () => get().items.reduce((acc, i) => acc + i.product.price * i.quantity, 0),
      itemCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
    }),
    {
      name: 'heven-cart',
      version: 1,
      // v0 = full Product snapshots (still accepted). Hydrate on CartPage.
      // Without migrate, zustand discards any stored payload whose version
      // !== 1 — passthrough hands v0 to merge, which field-validates it.
      migrate: (persisted) => persisted as { items: CartItem[]; coupon: AppliedCoupon | null },
      partialize: (state) => ({ items: state.items, coupon: state.coupon }),
      // Persisted JSON is untrusted: a corrupt payload must not crash .reduce/.some.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { items?: unknown; coupon?: unknown };
        const items = Array.isArray(p.items)
          ? p.items.filter(
              (i): i is CartItem =>
                !!i &&
                typeof i.quantity === 'number' &&
                i.quantity > 0 &&
                !!i.product &&
                typeof i.product.id === 'string' &&
                typeof i.product.price === 'number',
            )
          : [];
        const c = p.coupon as AppliedCoupon | null | undefined;
        const coupon =
          c &&
          typeof c === 'object' &&
          typeof c.code === 'string' &&
          (c.discount_type === 'percentage' || c.discount_type === 'fixed') &&
          typeof c.discount_value === 'number' &&
          Number.isFinite(c.discount_value)
            ? c
            : null;
        return { ...current, items, coupon };
      },
    },
  ),
);
