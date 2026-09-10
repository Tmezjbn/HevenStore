-- ============================================================
-- Audit P1 guards (SEC-1 / SEC-2 / SEC-3 / SEC-4)
-- - Pin search_path on legacy SECURITY DEFINER fns
-- - Drop redundant buyer-promotion trigger
-- - Block non-staff from flipping is_active / deletion_scheduled_at
-- - Re-check coupon max_uses at finalize (global cap)
-- Idempotent. Apply to live DB before relying on these invariants.
-- ============================================================

-- SEC-3: legacy definer functions without search_path
CREATE OR REPLACE FUNCTION public.promote_buyer_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    UPDATE public.profiles
    SET role = 'buyer', updated_at = now()
    WHERE id = NEW.user_id AND role = 'member';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products SET
    rating = (SELECT AVG(rating) FROM public.reviews WHERE product_id = NEW.product_id),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_seller_can_add_product(seller_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_today int;
BEGIN
  SELECT COUNT(*) INTO active_today
  FROM public.products
  WHERE seller_id = seller_uuid
    AND DATE(created_at) = CURRENT_DATE
    AND status != 'inactive';

  RETURN active_today < 3;
END;
$$;

-- SEC-4: keep the newer status-scoped trigger only
DROP TRIGGER IF EXISTS on_order_paid ON public.orders;

-- SEC-1: owner of row cannot self-unban / un-schedule deletion
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

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IN ('owner', 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.is_active := OLD.is_active;
  NEW.deletion_scheduled_at := OLD.deletion_scheduled_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_account_status ON public.profiles;
CREATE TRIGGER profiles_guard_account_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_account_status();

-- SEC-2: re-check max_uses at payment; skip coupon credit past cap (order still paid)
CREATE OR REPLACE FUNCTION public.finalize_paid_order(p_order_id uuid, p_paid_cents bigint DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
  v_claimed int;
  v_shortfall boolean := false;
  v_coupon public.coupons%ROWTYPE;
  v_apply_coupon boolean := false;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF v_order.status = 'paid' THEN
    RETURN 'already_paid';
  END IF;
  IF p_paid_cents IS NOT NULL AND p_paid_cents < round(v_order.total * 100) THEN
    UPDATE public.orders
    SET notes = concat_ws(E'\n', notes,
          'AMOUNT_MISMATCH: paid ' || p_paid_cents || 'c < total ' || round(v_order.total * 100) || 'c'),
        updated_at = now()
    WHERE id = p_order_id;
    RETURN 'amount_mismatch';
  END IF;

  UPDATE public.orders SET status = 'paid', updated_at = now() WHERE id = p_order_id;

  FOR v_item IN
    SELECT id, product_id, quantity FROM public.order_items WHERE order_id = p_order_id
  LOOP
    IF EXISTS (SELECT 1 FROM public.product_keys WHERE product_id = v_item.product_id) THEN
      WITH picked AS (
        SELECT id FROM public.product_keys
        WHERE product_id = v_item.product_id AND claimed_at IS NULL
        ORDER BY created_at, id
        LIMIT v_item.quantity
        FOR UPDATE SKIP LOCKED
      )
      UPDATE public.product_keys k
      SET order_item_id = v_item.id, claimed_at = now()
      FROM picked WHERE k.id = picked.id;
      GET DIAGNOSTICS v_claimed = ROW_COUNT;

      IF v_claimed < v_item.quantity THEN
        v_shortfall := true;
      END IF;
    ELSE
      UPDATE public.products
      SET stock = GREATEST(0, stock - v_item.quantity), updated_at = now()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  -- ponytail: shortfall keeps the order paid and flags it for manual
  -- delivery/refund — the availability check in create_pending_order
  -- makes this a rare race, not a normal path. Upgrade: auto-refund RPC.
  IF v_shortfall THEN
    UPDATE public.orders
    SET notes = concat_ws(E'\n', notes, 'KEY_SHORTFALL: not enough unclaimed keys — deliver manually'),
        updated_at = now()
    WHERE id = p_order_id;
  END IF;

  IF v_order.coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE id = v_order.coupon_id FOR UPDATE;
    IF FOUND THEN
      IF v_coupon.max_uses IS NULL OR v_coupon.uses_count < v_coupon.max_uses THEN
        v_apply_coupon := true;
      ELSE
        -- Cap already reached by concurrent finalizes — keep payment, drop credit bookkeeping.
        UPDATE public.orders
        SET notes = concat_ws(E'\n', notes, 'COUPON_CAP: max_uses reached at finalize — discount already on order total'),
            updated_at = now()
        WHERE id = p_order_id;
      END IF;
    END IF;
  END IF;

  IF v_apply_coupon THEN
    UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = v_order.coupon_id;
    INSERT INTO public.coupon_usages (coupon_id, user_id, order_id)
    VALUES (v_order.coupon_id, v_order.user_id, p_order_id)
    ON CONFLICT (coupon_id, user_id)
    DO UPDATE SET order_id = EXCLUDED.order_id, used_at = now();
  END IF;

  RETURN 'paid';
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_paid_order(uuid, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_paid_order(uuid, bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order(uuid, bigint) TO service_role;
