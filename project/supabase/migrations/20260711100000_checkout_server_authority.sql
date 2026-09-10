-- ============================================================
-- CHECKOUT SERVER AUTHORITY (Phase 1 of audit roadmap)
--
-- Closes: forged paid orders, client-set totals/prices/discounts,
-- unenforced coupon limits, no stock decrement, shared-key delivery.
--
-- 1) product_keys: one-time key pool (one row = one sellable unit).
--    products.stock becomes DERIVED (= unclaimed keys) once a product
--    uses keys; manual stock still works for key-less products.
-- 2) create_pending_order(): the ONLY way clients create orders.
--    Recomputes prices/totals/discounts from live data.
-- 3) finalize_paid_order(): the ONLY way orders become paid.
--    Called by the Polar webhook (service role). Verifies amount,
--    claims keys atomically, records coupon usage.
-- 4) Direct client INSERT/UPDATE/DELETE on orders / order_items /
--    coupon_usages is revoked.
--
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1) One-time key pool
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content text NOT NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_keys_available
  ON public.product_keys(product_id) WHERE claimed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_keys_order_item
  ON public.product_keys(order_item_id);

ALTER TABLE public.product_keys ENABLE ROW LEVEL SECURITY;

-- Staff or the product's seller manage the pool. Buyers never read it
-- directly — delivery goes through get_order_fulfillment().
DROP POLICY IF EXISTS "product_keys_staff_all" ON public.product_keys;
CREATE POLICY "product_keys_staff_all" ON public.product_keys
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','moderator'))
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','moderator'))
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  );

-- Stock mirrors the unclaimed key count whenever the pool changes.
-- Once a product uses keys, stock is key-driven (deleting every key
-- sets stock to 0 — re-set it manually if you stop using keys).
CREATE OR REPLACE FUNCTION public.sync_stock_from_keys()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE public.products
  SET stock = (SELECT count(*) FROM public.product_keys WHERE product_id = pid AND claimed_at IS NULL),
      updated_at = now()
  WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_product_keys_sync_stock ON public.product_keys;
CREATE TRIGGER on_product_keys_sync_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.product_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_stock_from_keys();

-- ------------------------------------------------------------
-- 2) Server-side order creation
-- ------------------------------------------------------------
-- Legacy flow attached coupon_usages to PENDING orders; the plain FK
-- would block deleting those orders when a checkout restarts.
ALTER TABLE public.coupon_usages
  DROP CONSTRAINT IF EXISTS coupon_usages_order_id_fkey;
ALTER TABLE public.coupon_usages
  ADD CONSTRAINT coupon_usages_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- p_items: [{"product_id": "...", "quantity": 2}, ...]
-- Raises token exceptions the client maps to localized messages:
--   EMPTY_CART / CART_TOO_LARGE / INVALID_ITEM / PRODUCT_UNAVAILABLE /
--   OUT_OF_STOCK / COUPON_INVALID / COUPON_EXPIRED / COUPON_LIMIT /
--   COUPON_MIN / COUPON_USED
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
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'CART_TOO_LARGE';
  END IF;

  -- Pass 1: validate every line against the live catalog and price it.
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
      RAISE EXCEPTION 'INVALID_ITEM'; -- duplicate line
    END IF;
    v_seen := v_seen || v_pid;

    SELECT id, price, stock, status INTO v_product
    FROM public.products WHERE id = v_pid;
    IF NOT FOUND OR v_product.status <> 'active' THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
    END IF;

    -- Availability: unclaimed keys for keyed products, manual stock otherwise.
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

  -- Coupon: validated and priced server-side.
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
    -- Per-user: one PAID use each (pre-payment legacy rows don't block).
    IF EXISTS (
      SELECT 1 FROM public.coupon_usages cu
      JOIN public.orders o ON o.id = cu.order_id
      WHERE cu.coupon_id = v_coupon.id AND cu.user_id = v_user AND o.status = 'paid'
    ) THEN
      RAISE EXCEPTION 'COUPON_USED';
    END IF;

    v_discount := CASE v_coupon.discount_type
      WHEN 'percentage' THEN round(v_subtotal * v_coupon.discount_value / 100, 2)
      ELSE LEAST(v_coupon.discount_value, v_subtotal)
    END;
  END IF;

  v_total := GREATEST(0, round(v_subtotal - v_discount, 2));

  -- One active checkout per user: replace any stale pending orders.
  DELETE FROM public.orders WHERE user_id = v_user AND status = 'pending';

  INSERT INTO public.orders (user_id, status, total, currency, coupon_id, discount_amount)
  VALUES (v_user, 'pending', v_total, 'USD', v_coupon.id, v_discount)
  RETURNING id INTO v_order_id;

  -- Pass 2: line items at live prices.
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

-- ------------------------------------------------------------
-- 3) Server-side payment finalization (webhook / service role only)
-- ------------------------------------------------------------
-- p_paid_cents: amount Polar reports as paid (null = skip the check,
-- e.g. events that don't carry an amount).
-- Returns: 'paid' | 'already_paid' | 'not_found' | 'amount_mismatch'
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

  -- Claim one-time keys per line. SKIP LOCKED makes concurrent
  -- finalizations race-safe: each paid order gets distinct keys.
  FOR v_item IN
    SELECT id, product_id, quantity FROM public.order_items WHERE order_id = p_order_id
  LOOP
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

    IF v_claimed < v_item.quantity
       AND EXISTS (SELECT 1 FROM public.product_keys WHERE product_id = v_item.product_id) THEN
      v_shortfall := true;
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

-- ------------------------------------------------------------
-- 4) Fulfillment RPC now returns claimed keys per line
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_order_fulfillment(uuid);
CREATE FUNCTION public.get_order_fulfillment(p_order_id uuid)
RETURNS TABLE (
  product_id uuid,
  name text,
  name_ar text,
  product_type text,
  quantity int,
  content text,
  keys text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF caller_role IN ('owner', 'admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = p_order_id AND o.status = 'paid'
    ) THEN
      RETURN;
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.user_id = auth.uid() AND o.status = 'paid'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.name_ar, p.product_type, oi.quantity, s.content,
    (SELECT string_agg(k.content, E'\n' ORDER BY k.claimed_at, k.id)
     FROM public.product_keys k WHERE k.order_item_id = oi.id)
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.product_secrets s ON s.product_id = p.id
  WHERE oi.order_id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_fulfillment(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_order_fulfillment(uuid) FROM anon;

-- ------------------------------------------------------------
-- 5) Close the client write paths the RPCs replace
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own_pending" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_own_pending" ON public.orders;
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_own_pending" ON public.order_items;
DROP POLICY IF EXISTS "coupon_usages_insert" ON public.coupon_usages;
