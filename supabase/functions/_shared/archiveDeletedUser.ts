import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Snapshot profile + orders (w/ product + fulfillment) before auth.admin.deleteUser. */
export async function archiveDeletedUser(
  admin: SupabaseClient,
  userId: string,
  deletedBy: string | null,
): Promise<void> {
  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!profile) return;

  const { data: orders, error: oErr } = await admin
    .from('orders')
    .select(
      [
        'id, status, total, currency, discount_amount, coupon_id, notes, created_at, updated_at, order_number, public_ref',
        'order_items(',
        'id, product_id, quantity, unit_price, total_price,',
        'products(name, name_ar, slug, product_type, thumbnail_url, description, description_ar, product_secrets(content)),',
        'product_keys(content, details, claimed_at)',
        ')',
      ].join(' '),
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (oErr) throw oErr;

  // Flatten nested secrets/keys into stable fields for the history UI.
  const orders_snapshot = (orders ?? []).map((order) => ({
    ...order,
    order_items: ((order as { order_items?: unknown }).order_items as Array<Record<string, unknown>> | null)?.map(
      (item) => {
        const products = item.products as {
          product_secrets?: { content?: string | null } | { content?: string | null }[] | null;
        } | null;
        const secrets = products?.product_secrets;
        const secretRow = Array.isArray(secrets) ? secrets[0] : secrets;
        const keys = item.product_keys as
          | { content?: string | null; details?: string | null }[]
          | null
          | undefined;
        const keyLines = (keys ?? [])
          .map((k) => k.content?.trim())
          .filter((c): c is string => Boolean(c));
        const key_units = (keys ?? [])
          .map((k) => {
            const content = k.content?.trim();
            if (!content) return null;
            const details = k.details?.trim() ? k.details : null;
            return { content, details };
          })
          .filter((u): u is { content: string; details: string | null } => Boolean(u));
        const rest = { ...item };
        delete (rest as Record<string, unknown>).product_keys;
        const productRest = { ...(products ?? {}) };
        delete (productRest as Record<string, unknown>).product_secrets;
        return {
          ...rest,
          products: products ? productRest : null,
          content: secretRow?.content ?? null,
          keys: keyLines.length ? keyLines.join('\n') : null,
          key_units: key_units.length ? key_units : null,
        };
      },
    ) ?? [],
  }));

  // Idempotent: purge retries / a second hard-delete must not duplicate history.
  const { data: existing } = await admin
    .from('account_deletion_history')
    .select('id')
    .eq('former_user_id', userId)
    .limit(1);
  if (existing?.length) return;

  const { error: iErr } = await admin.from('account_deletion_history').insert({
    former_user_id: userId,
    email: profile.email,
    full_name: profile.full_name,
    username: profile.username ?? null,
    role: profile.role,
    profile_snapshot: profile,
    orders_snapshot,
    deleted_by: deletedBy,
  });
  if (iErr) throw iErr;
}
