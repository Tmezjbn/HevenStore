-- ============================================================
-- SEC-M5: avatars upload = staff/seller only (UI already gated;
--         storage must match so buyers can't bypass).
-- SEC-M2: coupons.discount_value CHECK (>0; % <= 100).
-- FUNC-7: reject pending totals under Polar's $0.50 minimum
--         so we never create orphan pending orders Polar rejects.
-- Idempotent.
-- ============================================================

-- --- SEC-M5 ---
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

DROP POLICY IF EXISTS "avatars_staff_insert" ON storage.objects;
CREATE POLICY "avatars_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'moderator', 'seller')
  );

DROP POLICY IF EXISTS "avatars_staff_update" ON storage.objects;
CREATE POLICY "avatars_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'moderator', 'seller')
  );

DROP POLICY IF EXISTS "avatars_staff_delete" ON storage.objects;
CREATE POLICY "avatars_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'moderator', 'seller')
  );

-- --- SEC-M2 ---
-- Soft-fix existing bad rows so ADD CONSTRAINT can succeed.
UPDATE public.coupons
SET discount_value = 100
WHERE discount_type = 'percentage' AND discount_value > 100;

UPDATE public.coupons
SET discount_value = 0.01
WHERE discount_value IS NULL OR discount_value <= 0;

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_value_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_discount_value_check
  CHECK (
    discount_value > 0
    AND (discount_type <> 'percentage' OR discount_value <= 100)
  );

-- --- FUNC-7: create_pending_order rejects sub-$0.50 ---
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

  -- Polar min charge is $0.50 — refuse before inserting a dead pending row.
  IF v_total < 0.50 THEN
    RAISE EXCEPTION 'AMOUNT_TOO_LOW';
  END IF;

  UPDATE public.orders
  SET status = 'cancelled', updated_at = now()
  WHERE user_id = v_user AND status = 'pending' AND polar_checkout_id IS NOT NULL;
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
