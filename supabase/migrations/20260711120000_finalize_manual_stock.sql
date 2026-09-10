-- ============================================================
-- FINALIZE: DECREMENT MANUAL STOCK (Phase 3 of audit roadmap)
--
-- Phase 1 made stock authoritative for key-pool products (derived from
-- unclaimed keys). Products WITHOUT keys still used a manual stock
-- number that never decreased on purchase. This replaces
-- finalize_paid_order so non-keyed products lose stock atomically when
-- the order is paid (floored at 0). Keyed products are unchanged —
-- their stock is synced by the product_keys trigger.
--
-- Run in the Supabase SQL editor AFTER 20260711100000. Idempotent.
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
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF v_order.status = 'paid' THEN
    RETURN 'already_paid'; -- idempotent: webhooks may fire more than once
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
      -- Key-pool product: claim keys. SKIP LOCKED makes concurrent
      -- finalizations race-safe; the sync trigger updates stock.
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
      -- Manual-stock product: atomic decrement, floored at 0.
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
