import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types';

interface WishlistStore {
  items: Product[];
  toggle: (product: Product) => void;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
  /** Replace with live active products; drop missing. */
  hydrateFromLive: (live: Product[]) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) =>
        set((state) =>
          state.items.some((p) => p.id === product.id)
            ? { items: state.items.filter((p) => p.id !== product.id) }
            : { items: [...state.items, product] },
        ),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((p) => p.id !== productId) })),
      has: (productId) => get().items.some((p) => p.id === productId),
      hydrateFromLive: (live) => {
        const byId = new Map(live.map((p) => [p.id, p]));
        set((state) => {
          const next = state.items
            .map((p) => byId.get(p.id))
            .filter((p): p is Product => Boolean(p));
          if (
            next.length === state.items.length &&
            next.every((n, i) => {
              const o = state.items[i];
              return (
                n.id === o.id &&
                n.price === o.price &&
                n.name === o.name &&
                n.name_ar === o.name_ar &&
                n.thumbnail_url === o.thumbnail_url &&
                n.slug === o.slug &&
                n.stock === o.stock
              );
            })
          ) {
            return state;
          }
          return { items: next };
        });
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: 'heven-wishlist',
      version: 1,
      // Without migrate, zustand discards stored v0 payloads — passthrough
      // hands them to merge, which field-validates the snapshot.
      migrate: (persisted) => persisted as { items: Product[] },
      partialize: (state) => ({ items: state.items }),
      // Persisted JSON is untrusted: a corrupt payload must not crash .some/.map.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { items?: unknown };
        const items = Array.isArray(p.items)
          ? p.items.filter(
              (i): i is Product => !!i && typeof i.id === 'string' && typeof i.price === 'number',
            )
          : [];
        return { ...current, items };
      },
    },
  ),
);
