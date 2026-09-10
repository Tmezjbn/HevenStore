import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Review } from '../types';

export const REVIEW_COLS =
  'id, product_id, user_id, rating, comment, is_verified_purchase, created_at, staff_reply, staff_reply_by, staff_reply_at';

export const COMMENT_MAX = 1000;
const LIST_CAP = 50;

type AuthorRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  role: string | null;
};

export type ReviewWithAuthor = Review & {
  author?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    role: string | null;
  };
};

function clampRating(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function sanitizeComment(raw: string | null | undefined): string | null {
  const t = String(raw ?? '').trim().slice(0, COMMENT_MAX);
  return t.length ? t : null;
}

async function attachAuthors(rows: Review[]): Promise<ReviewWithAuthor[]> {
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  if (!ids.length) return rows;

  const { data } = await supabase.rpc('get_review_authors_public', { p_ids: ids });
  const map = new Map<string, AuthorRow>();
  for (const row of (data ?? []) as AuthorRow[]) {
    if (row?.id) map.set(row.id, row);
  }

  return rows.map((r) => {
    const a = map.get(r.user_id);
    return a
      ? {
          ...r,
          author: {
            full_name: a.full_name,
            avatar_url: a.avatar_url,
            username: a.username,
            role: a.role,
          },
        }
      : { ...r, author: undefined };
  });
}

async function fetchReviews(productId: string): Promise<ReviewWithAuthor[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLS)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(LIST_CAP);
  if (error) throw error;
  return attachAuthors((data ?? []) as Review[]);
}

async function fetchOwnReview(
  productId: string,
  userId: string,
): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLS)
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Review | null) ?? null;
}

async function fetchCanReview(productId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_items!inner(product_id)')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .eq('order_items.product_id', productId)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export function useProductReviews(productId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  const listKey = ['reviews', productId] as const;
  const ownKey = ['reviews', productId, 'own', userId] as const;
  const canKey = ['reviews', productId, 'can', userId] as const;

  const list = useQuery({
    queryKey: listKey,
    enabled: Boolean(productId),
    queryFn: () => fetchReviews(productId as string),
    staleTime: 1000 * 60,
  });

  const own = useQuery({
    queryKey: ownKey,
    enabled: Boolean(productId && userId),
    queryFn: () => fetchOwnReview(productId as string, userId as string),
    staleTime: 1000 * 60,
  });

  const canReview = useQuery({
    queryKey: canKey,
    enabled: Boolean(productId && userId),
    queryFn: () => fetchCanReview(productId as string, userId as string),
    staleTime: 1000 * 60 * 2,
  });

  const invalidateAll = async (slug?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    if (slug) await queryClient.invalidateQueries({ queryKey: ['product', slug] });
  };

  const save = useMutation({
    mutationFn: async (input: { rating: number; comment: string }) => {
      if (!productId || !userId) throw new Error('Not signed in');
      // One review per product — no edits (unique user_id+product_id).
      const rating = clampRating(input.rating);
      const comment = sanitizeComment(input.comment);
      const { error } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: userId,
        rating,
        comment,
        is_verified_purchase: true,
      });
      if (error) throw error;
    },
  });

  const remove = useMutation({
    mutationFn: async (reviewId: string) => {
      if (!userId) throw new Error('Not signed in');
      // Own delete or staff (RLS allows mod/admin/owner without user_id match).
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (error) throw error;
    },
  });

  const staffReply = useMutation({
    mutationFn: async (input: { reviewId: string; reply: string }) => {
      const { error } = await supabase.rpc('staff_reply_review', {
        p_review_id: input.reviewId,
        p_reply: input.reply,
      });
      if (error) throw error;
    },
  });

  return {
    reviews: list.data ?? [],
    isLoading: list.isLoading,
    ownReview: own.data ?? null,
    canReview: canReview.data === true,
    canReviewLoading: canReview.isLoading,
    save,
    remove,
    staffReply,
    invalidateAll,
  };
}
