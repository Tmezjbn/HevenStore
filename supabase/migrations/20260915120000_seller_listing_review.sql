-- ============================================================
-- Seller listing review: global toggle + per-seller override,
-- pending/rejected statuses, server-side enforcement trigger,
-- owner/admin review RPC.
--
-- Public catalog stays untouched: products_select_active only
-- exposes status='active', so pending_review/rejected listings
-- are invisible to buyers with zero policy churn.
--
-- Idempotent: safe to re-run; guards against manual live drift.
-- ============================================================

-- ------------------------------------------------------------
-- 1) products.status domain: + 'pending_review', 'rejected'.
--    Drop any CHECK whose def pins the status domain (drift-safe),
--    then add the canonical constraint.
-- ------------------------------------------------------------
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
DO $$
DECLARE
  r record;
BEGIN
  -- Drop ANY single-column CHECK on products.status, whatever its name or
  -- status list (drift-safe: an old 'active','inactive'-only def would
  -- silently break pending_review writes if it survived alongside ours).
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'products'
      AND c.contype = 'c'
      AND a.attname = 'status'
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('active', 'inactive', 'draft', 'pending_review', 'rejected'));

-- ------------------------------------------------------------
-- 2) Global toggle: site_settings.seller_listing_review ('1'/'0').
--    Default OFF — applying this migration changes nothing until
--    the owner enables it.
-- ------------------------------------------------------------
INSERT INTO public.site_settings (key, value)
VALUES ('seller_listing_review', '0')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 3) Per-seller override on profiles:
--    'default' = follow global, 'always' = require, 'never' = exempt.
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS listing_review_override text NOT NULL DEFAULT 'default';
ALTER TABLE public.profiles
  ALTER COLUMN listing_review_override SET DEFAULT 'default';
UPDATE public.profiles
  SET listing_review_override = 'default'
  WHERE listing_review_override IS NULL;
ALTER TABLE public.profiles
  ALTER COLUMN listing_review_override SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_listing_review_override_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_listing_review_override_check
      CHECK (listing_review_override IN ('default', 'always', 'never'));
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 4) Review metadata on products + partial index for the queue.
-- ------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_reviewed_by_fkey'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS products_pending_review_idx
  ON public.products (created_at)
  WHERE status = 'pending_review';

-- ------------------------------------------------------------
-- 5) seller_needs_listing_review: STABLE, read-only, minimal-privilege.
--    never -> false, always -> true, default -> global toggle.
--    Sellers may call it (drives their editor notice); it only
--    reads the seller's override + the one settings row.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seller_needs_listing_review(p_seller uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_global text;
BEGIN
  IF p_seller IS NULL THEN
    RETURN false;
  END IF;
  -- Self or staff only: the override mode is not public info.
  IF p_seller IS DISTINCT FROM auth.uid()
     AND COALESCE(public.current_user_role(), '') NOT IN ('owner', 'admin') THEN
    RETURN false;
  END IF;
  SELECT listing_review_override INTO v_mode
  FROM public.profiles
  WHERE id = p_seller;
  IF v_mode = 'always' THEN
    RETURN true;
  END IF;
  IF v_mode = 'never' THEN
    RETURN false;
  END IF;
  SELECT value INTO v_global
  FROM public.site_settings
  WHERE key = 'seller_listing_review';
  RETURN COALESCE(v_global, '0') IN ('1', 'true', 'on', 'yes');
END;
$$;

REVOKE ALL ON FUNCTION public.seller_needs_listing_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_needs_listing_review(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 6) Enforcement trigger. Runs for caller-role 'seller' only, when
--    seller_needs_listing_review(caller) is true:
--    - INSERT: status='active' is coerced to 'pending_review';
--      review metadata is always cleared (no self-stamping).
--    - UPDATE: review metadata is restored from OLD (anti-forge);
--      a row landing on status='active' is re-pended only when
--      seller-visible content actually changed — the jsonb diff
--      excludes internal columns (stock, rating, review_count,
--      sales_count, updated_at, review_*) so sync_stock_from_keys,
--      rating recalculation, and sales bumps never delist a live
--      product. New columns default to "content" (fail closed).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.products_seller_listing_review_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_internal text[] := ARRAY[
    'stock', 'rating', 'review_count', 'sales_count', 'updated_at',
    'review_note', 'reviewed_by', 'reviewed_at'
  ];
BEGIN
  -- Service paths (no JWT): finalize_paid_order, seeds, SQL editor.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'seller' THEN
    RETURN NEW;
  END IF;

  -- Review metadata is staff-owned on EVERY seller write, gated or not —
  -- otherwise an ungated seller could forge reviewed_by/note, and the
  -- forged row would persist once the gate turns on.
  IF TG_OP = 'INSERT' THEN
    NEW.review_note := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  ELSE
    NEW.review_note := OLD.review_note;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
  END IF;

  IF NOT public.seller_needs_listing_review(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      NEW.status := 'pending_review';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.status = 'active'
     AND (to_jsonb(NEW) - v_internal) IS DISTINCT FROM (to_jsonb(OLD) - v_internal) THEN
    NEW.status := 'pending_review';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_seller_listing_review_guard ON public.products;
CREATE TRIGGER products_seller_listing_review_guard
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_seller_listing_review_guard();

-- ------------------------------------------------------------
-- 7) Extend guard_profile_account_status: sellers must not
--    self-write listing_review_override via profiles_update_own.
--    Re-emits the round-6 body verbatim + one restore line.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Service role / SQL editor (no JWT): allow staff RPCs to set status.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Privileged RPC paths mark the transaction (expired-disable self-clear).
  IF current_setting('app.profile_guard_bypass', true) = '1' THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IN ('owner', 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.is_active := OLD.is_active;
  NEW.deletion_scheduled_at := OLD.deletion_scheduled_at;
  NEW.disabled_until := OLD.disabled_until;
  NEW.staff_notes := OLD.staff_notes;
  NEW.listing_review_override := OLD.listing_review_override;
  IF NEW.id = auth.uid() THEN
    NEW.support_standing := OLD.support_standing;
  END IF;
  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    NEW.username_changed_at := OLD.username_changed_at;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 8) set_listing_review_override: owner/admin set a seller's mode.
--    Self-check inside the body (definer bypasses RLS).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_listing_review_override(p_user_id uuid, p_mode text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(public.current_user_role(), 'none') NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('default', 'always', 'never') THEN
    RAISE EXCEPTION 'invalid mode';
  END IF;
  UPDATE public.profiles
  SET listing_review_override = p_mode
  WHERE id = p_user_id AND role = 'seller';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'seller not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_listing_review_override(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_listing_review_override(uuid, text) TO authenticated;

-- ------------------------------------------------------------
-- 9) review_product_listing: owner/admin approve or reject a
--    pending listing; notifies the seller bilingually.
--    Caller role verified in-body — definer bypasses RLS.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_product_listing(
  p_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller uuid;
  v_status text;
  v_name text;
BEGIN
  -- Definer bypasses RLS: verify the caller role in-body. COALESCE turns a
  -- profile-less JWT (NULL role) into a fail-closed 'none'.
  IF COALESCE(public.current_user_role(), 'none') NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF p_approve IS NULL THEN
    RAISE EXCEPTION 'approve flag required';
  END IF;
  IF NOT p_approve AND NULLIF(btrim(COALESCE(p_note, '')), '') IS NULL THEN
    RAISE EXCEPTION 'rejection reason required';
  END IF;

  SELECT seller_id, status, name INTO v_seller, v_status, v_name
  FROM public.products
  WHERE id = p_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product not found';
  END IF;
  IF v_status <> 'pending_review' THEN
    RAISE EXCEPTION 'listing is not pending review';
  END IF;

  UPDATE public.products
  SET status = CASE WHEN p_approve THEN 'active' ELSE 'rejected' END,
      review_note = CASE WHEN p_approve THEN NULL ELSE btrim(p_note) END,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_id;

  IF v_seller IS NOT NULL THEN
    PERFORM public.notify_users(
      ARRAY[v_seller],
      'listing_review',
      CASE WHEN p_approve THEN 'Listing approved' ELSE 'Listing rejected' END,
      CASE WHEN p_approve THEN 'تمت الموافقة على المنتج' ELSE 'تم رفض المنتج' END,
      CASE WHEN p_approve
        THEN format('Your listing "%s" is now live in the store.', v_name)
        ELSE format('Your listing "%s" was rejected: %s', v_name, btrim(p_note))
      END,
      CASE WHEN p_approve
        THEN format('تمت الموافقة على «%s» وأصبح ظاهرًا في المتجر.', v_name)
        ELSE format('تم رفض «%s»: %s', v_name, btrim(p_note))
      END,
      jsonb_build_object('product_id', p_id, 'approved', p_approve)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_product_listing(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_product_listing(uuid, boolean, text) TO authenticated;

-- ------------------------------------------------------------
-- 10) force_member_role_on_insert: a client-side profile INSERT
--     could otherwise carry listing_review_override='never' that
--     survives a later promotion to seller. Re-emits the access-
--     control body verbatim + the one defaulting line.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.force_member_role_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.role := 'member';
    NEW.listing_review_override := 'default';
  END IF;
  RETURN NEW;
END;
$$;
