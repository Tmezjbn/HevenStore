-- ============================================================
-- FUNC-5: re-check coupon expiry at finalize (don't bookkeep
--          usage for an expired coupon after payment).
-- FUNC-8: increment products.sales_count by qty on paid.
-- Also: STOCK_SHORTFALL note no longer mentions refunds
--       (owner policy: no in-site refunds).
-- Idempotent.
-- ============================================================

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
  v_stock_short boolean := false;
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
      SET stock = stock - v_item.quantity, updated_at = now()
      WHERE id = v_item.product_id AND stock >= v_item.quantity;
      IF NOT FOUND THEN
        v_stock_short := true;
        UPDATE public.products
        SET stock = 0, updated_at = now()
        WHERE id = v_item.product_id AND stock < v_item.quantity;
      END IF;
    END IF;

    -- FUNC-8: popular sort uses sales_count
    UPDATE public.products
    SET sales_count = COALESCE(sales_count, 0) + v_item.quantity,
        updated_at = now()
    WHERE id = v_item.product_id;
  END LOOP;

  -- ponytail: shortfall keeps the order paid and flags it for manual
  -- delivery — rare race vs create_pending_order. No auto-refund (owner).
  IF v_shortfall THEN
    UPDATE public.orders
    SET notes = concat_ws(E'\n', notes, 'KEY_SHORTFALL: not enough unclaimed keys — deliver manually'),
        updated_at = now()
    WHERE id = p_order_id;
  END IF;
  IF v_stock_short THEN
    UPDATE public.orders
    SET notes = concat_ws(E'\n', notes, 'STOCK_SHORTFALL: paid past available stock — deliver manually'),
        updated_at = now()
    WHERE id = p_order_id;
  END IF;

  IF v_order.coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE id = v_order.coupon_id FOR UPDATE;
    IF FOUND THEN
      IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
        -- FUNC-5: expired between pending and pay — keep payment, skip usage bookkeeping.
        UPDATE public.orders
        SET notes = concat_ws(E'\n', notes, 'COUPON_EXPIRED: expired at finalize — discount already on order total'),
            updated_at = now()
        WHERE id = p_order_id;
      ELSIF v_coupon.max_uses IS NULL OR v_coupon.uses_count < v_coupon.max_uses THEN
        v_apply_coupon := true;
      ELSE
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
