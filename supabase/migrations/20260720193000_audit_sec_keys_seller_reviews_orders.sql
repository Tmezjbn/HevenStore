-- ============================================================
-- Audit Phase 1–2: SEC-1 / SEC-2 / SEC-3 / SEC-4
--
-- 1) Claimed product_keys immutable except service_role (no resell/rewrite).
-- 2) Sellers may only INSERT products as themselves (seller_id bind).
-- 3) Reviews are insert/delete only — no UPDATE (blocks product_id retarget
--    + is_verified_purchase forgery). UI already forbids edits.
-- 4) Drop staff orders UPDATE — money transitions go via RPCs / webhook.
--
-- Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- SEC-1: claimed keys locked
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_claimed_product_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Same pattern as guard_order_paid_transition: JWT callers have auth.uid();
  -- service_role / table-owner paths used by finalize_paid_order do not.
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.claimed_at IS NOT NULL THEN
      RAISE EXCEPTION 'CLAIMED_KEY_LOCKED';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: once claimed, no content / reassignment / unclaim via client JWT.
  IF OLD.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'CLAIMED_KEY_LOCKED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_keys_guard_claimed ON public.product_keys;
CREATE TRIGGER product_keys_guard_claimed
  BEFORE UPDATE OR DELETE ON public.product_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_claimed_product_key();

-- ------------------------------------------------------------
-- SEC-2: seller_id bind on INSERT (defense in depth; trigger also forces it)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'moderator')
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'seller'
      )
      AND (seller_id IS NULL OR seller_id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- SEC-3: reviews immutable after insert (delete + re-post still allowed)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;

-- ------------------------------------------------------------
-- SEC-4: no direct client/staff UPDATE on orders
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "orders_update" ON public.orders;
