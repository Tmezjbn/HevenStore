-- SEC-M7: soft rate limits on anon/auth abuse surfaces.
-- ponytail: in-DB sliding window; upgrade = edge/WAF + Redis if traffic grows.

CREATE TABLE IF NOT EXISTS public.rpc_rate_buckets (
  bucket_key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  hit_count int NOT NULL DEFAULT 0
);

ALTER TABLE public.rpc_rate_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rpc_rate_actor()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers json;
  v_ip text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN 'uid:' || auth.uid()::text;
  END IF;
  BEGIN
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;
  IF v_headers IS NOT NULL THEN
    v_ip := coalesce(
      nullif(v_headers->>'cf-connecting-ip', ''),
      nullif(split_part(v_headers->>'x-forwarded-for', ',', 1), ''),
      nullif(v_headers->>'x-real-ip', '')
    );
  END IF;
  RETURN 'ip:' || coalesce(nullif(trim(v_ip), ''), 'unknown');
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_rate_actor() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.check_rpc_rate(
  p_action text,
  p_limit int,
  p_window_secs int DEFAULT 60
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := p_action || ':' || public.rpc_rate_actor();
  v_now timestamptz := clock_timestamp();
  v_start timestamptz;
  v_count int;
BEGIN
  IF p_limit < 1 OR p_window_secs < 1 THEN
    RETURN;
  END IF;

  INSERT INTO public.rpc_rate_buckets AS b (bucket_key, window_start, hit_count)
  VALUES (v_key, v_now, 1)
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    window_start = CASE
      WHEN b.window_start <= v_now - make_interval(secs => p_window_secs) THEN v_now
      ELSE b.window_start
    END,
    hit_count = CASE
      WHEN b.window_start <= v_now - make_interval(secs => p_window_secs) THEN 1
      ELSE b.hit_count + 1
    END
  RETURNING window_start, hit_count INTO v_start, v_count;

  IF v_count > p_limit THEN
    RAISE EXCEPTION 'RATE_LIMITED'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rpc_rate(text, int, int) FROM PUBLIC;

-- username_taken: 30 / min / actor
CREATE OR REPLACE FUNCTION public.username_taken(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.check_rpc_rate('username_taken', 30, 60);
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = lower(trim(p_username))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.username_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.username_taken(text) TO anon, authenticated;

-- resolve_login_email: 15 / min / actor (enumeration / spray)
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_login text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  PERFORM public.check_rpc_rate('resolve_login_email', 15, 60);
  SELECT p.email INTO v_email
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.email IS NOT NULL
    AND (
      lower(p.email) = lower(trim(p_login))
      OR p.username = lower(trim(p_login))
    )
  LIMIT 1;
  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

-- create_pending_order: 10 / min / user (latest body + rate check)
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
