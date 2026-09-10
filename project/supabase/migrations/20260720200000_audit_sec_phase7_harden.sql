-- ============================================================
-- Audit Phase 7 hardening (SEC-6 / SEC-8 / SEC-9 / SEC-10)
--
-- 1) Coupon max_uses: lock row + count pending seats at create.
-- 2) product-images / site-media: bind storage path to auth.uid().
-- 3) notifications: client UPDATE may only flip is_read.
-- 4) coupon_usages SELECT: staff roles (owner/admin/moderator).
--
-- SEC-5 (localStorage sessions): accepted for SPA — CSP hardened elsewhere.
-- SEC-11 rate limits: already in 20260714440000.
-- Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- SEC-6: create_pending_order — coupon FOR UPDATE + pending seats
-- (body = 20260714440000 + coupon seat reservation)
-- ------------------------------------------------------------
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
  v_pending_seats int := 0;
  v_has_coupon boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  PERFORM public.check_rpc_rate('create_pending_order', 10, 60);

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
    LIMIT 1
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'COUPON_INVALID';
    END IF;
    v_has_coupon := true;
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

  IF v_total < 0.50 THEN
    RAISE EXCEPTION 'AMOUNT_TOO_LOW';
  END IF;

  -- Drop caller's prior pending before seat count (own draft must not block self).
  UPDATE public.orders
  SET status = 'cancelled', updated_at = now()
  WHERE user_id = v_user AND status = 'pending' AND polar_checkout_id IS NOT NULL;
  DELETE FROM public.orders
  WHERE user_id = v_user AND status = 'pending' AND polar_checkout_id IS NULL;

  IF v_has_coupon AND v_coupon.max_uses IS NOT NULL THEN
    SELECT count(*)::int INTO v_pending_seats
    FROM public.orders
    WHERE coupon_id = v_coupon.id AND status = 'pending';
    IF v_coupon.uses_count + v_pending_seats >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'COUPON_LIMIT';
    END IF;
  END IF;

  INSERT INTO public.orders (user_id, status, total, currency, coupon_id, discount_amount)
  VALUES (
    v_user,
    'pending',
    v_total,
    'USD',
    CASE WHEN v_has_coupon THEN v_coupon.id ELSE NULL END,
    v_discount
  )
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

-- ------------------------------------------------------------
-- SEC-8: storage path bind
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "product_images_staff_insert" ON storage.objects;
CREATE POLICY "product_images_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'moderator', 'seller')
  );

DROP POLICY IF EXISTS "product_images_staff_update" ON storage.objects;
CREATE POLICY "product_images_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'moderator', 'seller')
  );

DROP POLICY IF EXISTS "product_images_staff_delete" ON storage.objects;
CREATE POLICY "product_images_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'moderator', 'seller')
  );

-- site-media paths: hero/<uid>/… and atmosphere-logos/<uid>/…
DROP POLICY IF EXISTS "site_media_staff_insert" ON storage.objects;
CREATE POLICY "site_media_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'moderator')
  );

DROP POLICY IF EXISTS "site_media_staff_update" ON storage.objects;
CREATE POLICY "site_media_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'site-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'moderator')
  );

DROP POLICY IF EXISTS "site_media_staff_delete" ON storage.objects;
CREATE POLICY "site_media_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'site-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'moderator')
  );

-- ------------------------------------------------------------
-- SEC-9: notifications — only is_read mutable by JWT clients
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_notification_client_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / table-owner paths have no auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.title_ar IS DISTINCT FROM OLD.title_ar
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.body_ar IS DISTINCT FROM OLD.body_ar
     OR NEW.data IS DISTINCT FROM OLD.data
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'NOTIFICATION_READ_ONLY';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_guard_client_update ON public.notifications;
CREATE TRIGGER notifications_guard_client_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_notification_client_update();

-- ------------------------------------------------------------
-- SEC-10: coupon_usages SELECT — own + staff
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "coupon_usages_select" ON public.coupon_usages;
CREATE POLICY "coupon_usages_select" ON public.coupon_usages
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.current_user_role() IN ('owner', 'admin', 'moderator')
  );
