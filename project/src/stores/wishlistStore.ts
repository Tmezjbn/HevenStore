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
            next.every((n, i) => n.id === state.items[i].id && n.price === state.items[i].price)
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
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
