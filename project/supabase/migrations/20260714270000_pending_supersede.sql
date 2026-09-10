-- ============================================================
-- AUDIT FUNC-1: never hard-delete a pending order that has a live
-- Polar checkout session. A late payment on that session must still
-- find its order row so finalize_paid_order can deliver — deleting it
-- meant "customer charged, no order, no fulfillment".
--
-- - create_pending_order: sessionless drafts are deleted as before;
--   rows with polar_checkout_id are superseded (status='cancelled')
--   and kept for webhook correlation. A cancelled-then-paid order
--   finalizes normally (items/total intact) — the customer gets goods.
-- - cleanup_stale_pending_orders: same split — delete sessionless,
--   cancel session-linked.
--
-- ponytail: superseded Polar sessions are not expired via the Polar
-- API — paying one still yields a correct paid order, so worst case is
-- a deliberate double purchase, not money loss. Upgrade path: expire
-- superseded sessions from polar-checkout before creating a new one.
-- Idempotent.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_pending_order(p_items jsonb, p_coupon_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_el jsonb;
  v_pid uuid;
  v_qty int;
  v_product record;
  v_available int;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric;
  v_coupon public.coupons%ROWTYPE;
  v_order_id uuid;
  v_seen uuid[] := '{}';
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  -- Soft-deleted / unavailable accounts cannot checkout.
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND is_active = false
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_UNAVAILABLE';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'CART_TOO_LARGE';
  END IF;

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      v_pid := (v_el->>'product_id')::uuid;
      v_qty := (v_el->>'quantity')::int;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END;
    IF v_pid IS NULL OR v_qty IS NULL OR v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;
    IF v_pid = ANY (v_seen) THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;
    v_seen := v_seen || v_pid;

    SELECT id, price, stock, status INTO v_product
    FROM public.products WHERE id = v_pid;
    IF NOT FOUND OR v_product.status <> 'active' THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
    END IF;

    IF EXISTS (SELECT 1 FROM public.product_keys WHERE product_id = v_pid) THEN
      SELECT count(*) INTO v_available
      FROM public.product_keys WHERE product_id = v_pid AND claimed_at IS NULL;
    ELSE
      v_available := v_product.stock;
    END IF;
    IF v_qty > v_available THEN
      RAISE EXCEPTION 'OUT_OF_STOCK';
    END IF;

    v_subtotal := v_subtotal + v_product.price * v_qty;
  END LOOP;

  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE upper(code) = upper(trim(p_coupon_code)) AND is_active = true
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'COUPON_INVALID';
    END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'COUPON_EXPIRED';
    END IF;
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'COUPON_LIMIT';
    END IF;
    IF v_coupon.min_order_amount IS NOT NULL AND v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'COUPON_MIN';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.coupon_usages cu
      JOIN public.orders o ON o.id = cu.order_id
      WHERE cu.coupon_id = v_coupon.id AND cu.user_id = v_user AND o.status = 'paid'
    ) THEN
      RAISE EXCEPTION 'COUPON_USED';
    END IF;
    IF v_coupon.required_badge_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.user_badges
        WHERE user_id = v_user AND badge_id = v_coupon.required_badge_id
      ) THEN
        RAISE EXCEPTION 'COUPON_BADGE';
      END IF;
    END IF;

    v_discount := CASE v_coupon.discount_type
      WHEN 'percentage' THEN round(v_subtotal * v_coupon.discount_value / 100, 2)
      ELSE LEAST(v_coupon.discount_value, v_subtotal)
    END;
  END IF;

  v_total := GREATEST(0, round(v_subtotal - v_discount, 2));

  -- FUNC-1: supersede, never delete, checkouts with a live Polar session.
  UPDATE public.orders
  SET status = 'cancelled', updated_at = now()
  WHERE user_id = v_user AND status = 'pending' AND polar_checkout_id IS NOT NULL;
  -- Sessionless drafts never reached Polar — safe to drop.
  DELETE FROM public.orders
  WHERE user_id = v_user AND status = 'pending' AND polar_checkout_id IS NULL;

  INSERT INTO public.orders (user_id, status, total, currency, coupon_id, discount_amount)
  VALUES (v_user, 'pending', v_total, 'USD', v_coupon.id, v_discount)
  RETURNING id INTO v_order_id;

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_el->>'product_id')::uuid;
    v_qty := (v_el->>'quantity')::int;
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price)
    SELECT v_order_id, p.id, v_qty, p.price, round(p.price * v_qty, 2)
    FROM public.products p WHERE p.id = v_pid;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id, 'total', v_total, 'discount_amount', v_discount);
END;
$$;

REVOKE ALL ON FUNCTION public.create_pending_order(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pending_order(jsonb, text) TO authenticated;

-- Same split for the cron cleanup.
CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_orders(p_older_than interval DEFAULT interval '7 days')
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int := 0;
  v_cancelled int := 0;
BEGIN
  IF p_older_than < interval '1 day' THEN
    RAISE EXCEPTION 'MIN_AGE_1_DAY';
  END IF;

  DELETE FROM public.orders
  WHERE status = 'pending'
    AND polar_checkout_id IS NULL
    AND created_at < now() - p_older_than;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Session-linked rows are kept (cancelled) so a very late webhook
  -- delivery still correlates and finalizes.
  UPDATE public.orders
  SET status = 'cancelled', updated_at = now()
  WHERE status = 'pending'
    AND polar_checkout_id IS NOT NULL
    AND created_at < now() - p_older_than;
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  RETURN v_deleted + v_cancelled;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_stale_pending_orders(interval) FROM PUBLIC;
-- Not granted to authenticated — cron / service_role only.
