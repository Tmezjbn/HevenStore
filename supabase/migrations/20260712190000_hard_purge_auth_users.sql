-- Hard-delete readiness: keep commerce rows, drop auth.users link on purge.
-- claim_due_account_deletions() soft-anonymizes due profiles and returns ids
-- for the purge-deleted-accounts edge function (auth.admin.deleteUser).

-- ========== FK: orders keep history ==========
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ========== FK: reviews go with the user ==========
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========== FK: coupon usage rows keep max_uses history ==========
ALTER TABLE public.coupon_usages ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.coupon_usages DROP CONSTRAINT IF EXISTS coupon_usages_user_id_fkey;
ALTER TABLE public.coupon_usages
  ADD CONSTRAINT coupon_usages_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ========== FK: catalog staff refs (nullable already) ==========
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_seller_id_fkey;
ALTER TABLE public.products
  ADD CONSTRAINT products_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_created_by_fkey;
ALTER TABLE public.products
  ADD CONSTRAINT products_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_created_by_fkey;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_created_by_fkey;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_updated_by_fkey;
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.themes DROP CONSTRAINT IF EXISTS themes_created_by_fkey;
ALTER TABLE public.themes
  ADD CONSTRAINT themes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_created_by_fkey;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Soft-anonymize due accounts; return ids for auth hard-delete.
CREATE OR REPLACE FUNCTION public.claim_due_account_deletions()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  WITH due AS (
    SELECT id
    FROM public.profiles
    WHERE deletion_scheduled_at IS NOT NULL
      AND deletion_scheduled_at <= now()
      -- Never auto-purge the sole owner path by role accident: still honor schedule,
      -- but skip active owners who somehow got a schedule without approve flow.
      AND role IS DISTINCT FROM 'owner'
    FOR UPDATE SKIP LOCKED
  ),
  upd AS (
    UPDATE public.profiles p
    SET
      full_name = 'deleted',
      email = null,
      avatar_url = null,
      is_active = false,
      updated_at = now()
    FROM due
    WHERE p.id = due.id
    RETURNING p.id
  )
  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO v_ids FROM upd;

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_account_deletions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_due_account_deletions() TO service_role;

-- Backward-compatible soft-only entry (count). Prefer edge fn for hard-delete.
CREATE OR REPLACE FUNCTION public.purge_due_account_deletions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN coalesce(cardinality(public.claim_due_account_deletions()), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.purge_due_account_deletions() FROM PUBLIC;
