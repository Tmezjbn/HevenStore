-- ============================================================
-- AUDIT SEC-H1 / SEC-H3 / FUNC-2 / FUNC-4
--
-- 1) Only the service role (webhook → finalize_paid_order) can flip an
--    order to 'paid'. Staff table-editor/API updates could previously
--    bypass finalize: no amount check, no key claim, no stock decrement,
--    while get_order_fulfillment would happily expose secrets.
-- 2) Drop the legacy direct-DELETE policies on orders/order_items —
--    deletes go through delete_order() which restocks manual products.
-- 3) finalize_paid_order manual stock: decrement only when sufficient
--    (concurrent oversell guard); shortfall flags the order like
--    KEY_SHORTFALL instead of silently flooring at 0.
-- 4) Coupons: owner could not manage coupons (policies were admin-only
--    while the dashboard allows owner+admin). Align RLS with the UI.
--
-- Idempotent.
-- ============================================================

-- 1) paid transitions are service-role only
CREATE OR REPLACE FUNCTION public.guard_order_paid_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'PAID_VIA_WEBHOOK_ONLY';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_paid_transition ON public.orders;
CREATE TRIGGER orders_guard_paid_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_order_paid_transition();

-- 2) direct deletes bypass delete_order() restock — kill the legacy policies
DROP POLICY IF EXISTS "orders_delete" ON public.orders;
DROP POLICY IF EXISTS "order_items_delete" ON public.order_items;

-- 3) oversell guard in finalize (replaces 20260712160000 version)
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
      -- FUNC-2: decrement only when stock suffices; concurrent finalizes
      -- can no longer both succeed past zero.
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
  IF v_stock_short THEN
    UPDATE public.orders
    SET notes = concat_ws(E'\n', notes, 'STOCK_SHORTFALL: paid past available stock — deliver manually'),
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

-- 4) coupons: owner + admin manage (matches dashboard roles); staff see inactive too
DROP POLICY IF EXISTS "coupons_select_active" ON public.coupons;
CREATE POLICY "coupons_select_active" ON public.coupons
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    OR public.current_user_role() IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "coupons_insert_admin" ON public.coupons;
CREATE POLICY "coupons_insert_admin" ON public.coupons
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS "coupons_update_admin" ON public.coupons;
CREATE POLICY "coupons_update_admin" ON public.coupons
  FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS "coupons_delete_admin" ON public.coupons;
CREATE POLICY "coupons_delete_admin" ON public.coupons
  FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('owner', 'admin'));
