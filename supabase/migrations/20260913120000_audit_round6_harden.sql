-- ============================================================
-- Round-6 audit hardening. Idempotent.
--
--  1) RLS: drop coupon_usages_delete — client must never write money
--     tables; deleting a usage row defeated the per-user coupon check.
--  2) RLS: drop profiles_delete — direct deletes bypass the
--     deletion-request grace/anonymize flow and orphan auth.users.
--  3) profiles guard: also protect support_standing / staff_notes /
--     username_changed_at; add app.profile_guard_bypass flag for
--     privileged RPC paths.
--  4) reviews: strip staff_reply* on client INSERT (forge vector).
--  5) notifications_insert_admin: owner/admin only.
--  6) DROP check_seller_can_add_product — dead, PUBLIC EXECUTE, no auth.
--  7) create_pending_order: COUPON_USED also rejects while the caller
--     holds an in-flight checkout (polar_checkout_id) on the same coupon.
--  8) clear_expired_user_disable: set the bypass flag — the guard was
--     silently reverting the self-clear (expired-disable never lifted).
--  9) Indexes/FKs/constraints (forward-only: NOT VALID where legacy
--     rows may predate the rule).
-- 10) sync_stock_from_keys: per-row → per-statement (bulk-import N+1).
-- 11) Drop dead tables (no src/edge-fn refs): themes, tags,
--     product_tags, campaigns, seller_daily_quota.
-- ============================================================

-- ------------------------------------------------------------
-- 1) money-table write policy that should never have survived
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "coupon_usages_delete" ON public.coupon_usages;

-- ------------------------------------------------------------
-- 2) profile deletes go through the request/purge flow only
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

-- ------------------------------------------------------------
-- 3) profiles guard — extend coverage + privileged-path flag
--    - support_standing: restored only on SELF writes; moderator-driven
--      deductions target another user's row and must keep working.
--    - staff_notes: blanket-restore for non-staff callers.
--    - username_changed_at: restored only when username is untouched, so
--      the cooldown trigger still stamps real renames.
--    - app.profile_guard_bypass: transaction-local flag set only inside
--      privileged RPCs (a REST client cannot combine set_config + UPDATE
--      in one transaction).
-- ------------------------------------------------------------
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

  -- Privileged RPC paths mark the transaction (expired-disable self-clear).
  IF current_setting('app.profile_guard_bypass', true) = '1' THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IN ('owner', 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.is_active := OLD.is_active;
  NEW.deletion_scheduled_at := OLD.deletion_scheduled_at;
  NEW.disabled_until := OLD.disabled_until;
  NEW.staff_notes := OLD.staff_notes;
  IF NEW.id = auth.uid() THEN
    NEW.support_standing := OLD.support_standing;
  END IF;
  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    NEW.username_changed_at := OLD.username_changed_at;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 4) reviews: client INSERTs may not carry staff_reply fields
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reviews_strip_staff_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() IN ('owner', 'admin', 'moderator') THEN
    RETURN NEW;
  END IF;
  NEW.staff_reply := NULL;
  NEW.staff_reply_by := NULL;
  NEW.staff_reply_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_strip_staff_reply ON public.reviews;
CREATE TRIGGER reviews_strip_staff_reply
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_strip_staff_reply();

-- ------------------------------------------------------------
-- 5) notifications INSERT: the owner-only RPC is the intended path;
--    moderator's direct INSERT granted a phishing vector.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
CREATE POLICY "notifications_insert_admin" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'admin')
  );

-- ------------------------------------------------------------
-- 6) dead definer: unrevoked PUBLIC EXECUTE, no auth check, no callers
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.check_seller_can_add_product(uuid);

-- ------------------------------------------------------------
-- 7) create_pending_order — close per-user coupon double-discount.
--    COUPON_USED previously counted only PAID usages: two pending orders
--    by one user could both pay with the same one-per-user coupon
--    (finalize's ON CONFLICT repointed instead of blocking the second).
--    Now also rejects while the caller holds an in-flight checkout on
--    the coupon. Sessionless pending drafts are superseded later in the
--    function and do not block.
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
    ) OR EXISTS (
      SELECT 1 FROM public.orders po
      WHERE po.user_id = v_user AND po.coupon_id = v_coupon.id
        AND po.status = 'pending' AND po.polar_checkout_id IS NOT NULL
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
-- 8) expired-disable self-clear: the guard restores is_active for a
--    member JWT, so the function silently no-opped. Flag marks this
--    transaction as a privileged self-clear path.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clear_expired_user_disable()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.profile_guard_bypass', '1', true);

  UPDATE public.profiles
  SET is_active = true,
      disabled_until = null,
      updated_at = now()
  WHERE id = v_uid
    AND is_active = false
    AND disabled_until IS NOT NULL
    AND disabled_until <= now()
    AND deletion_scheduled_at IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_expired_user_disable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_expired_user_disable() TO authenticated;

-- ------------------------------------------------------------
-- 9a) orders.coupon_id: bare uuid → FK + index (hot pending-seat count)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_coupon_id_fkey'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_coupon_id_fkey
      FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_coupon_id
  ON public.orders (coupon_id) WHERE coupon_id IS NOT NULL;

-- ------------------------------------------------------------
-- 9b) un-indexed FK / lookup columns
-- ------------------------------------------------------------
-- product_keys.product_id: existing index is partial (claimed_at IS NULL);
-- plain product_id probes in create/finalize/delete order can't use it.
CREATE INDEX IF NOT EXISTS idx_product_keys_product_id
  ON public.product_keys (product_id);
-- reviews.user_id: FK ON DELETE CASCADE + "my reviews" lookups.
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order_id
  ON public.coupon_usages (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id
  ON public.support_tickets (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_messages_sender
  ON public.support_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id
  ON public.user_badges (badge_id);

-- ------------------------------------------------------------
-- 9c) uniqueness that should have been unique all along
-- ------------------------------------------------------------
-- Webhook/checkout session must map to at most one order (dupe = double fulfill).
CREATE UNIQUE INDEX IF NOT EXISTS orders_polar_checkout_uidx
  ON public.orders (polar_checkout_id) WHERE polar_checkout_id IS NOT NULL;
-- Lookups are case-insensitive (upper(code) = upper(?)); the plain UNIQUE
-- let 'save10'/'SAVE10' coexist and made matches ambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_upper_uidx
  ON public.coupons ((upper(code)));

-- ------------------------------------------------------------
-- 9d) money/stock CHECKs — forward-only (NOT VALID: legacy rows may
--     predate the rule; new writes are enforced)
-- ------------------------------------------------------------
UPDATE public.products SET stock = 0 WHERE stock < 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_nonneg' AND conrelid = 'public.products'::regclass) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_stock_nonneg CHECK (stock >= 0) NOT VALID;
    ALTER TABLE public.products VALIDATE CONSTRAINT products_stock_nonneg;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_pos' AND conrelid = 'public.order_items'::regclass) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_quantity_pos CHECK (quantity > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_prices_nonneg' AND conrelid = 'public.order_items'::regclass) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_prices_nonneg CHECK (unit_price >= 0 AND total_price >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_amounts_nonneg' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_amounts_nonneg CHECK (total >= 0 AND discount_amount >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_limits_nonneg' AND conrelid = 'public.coupons'::regclass) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_limits_nonneg CHECK (
        (max_uses IS NULL OR max_uses > 0)
        AND uses_count >= 0
        AND (min_order_amount IS NULL OR min_order_amount >= 0)
      ) NOT VALID;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 10) stock sync: one recount per statement instead of per key row
--     (bulk key import previously ran a count-subquery UPDATE per row)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_stock_from_keys()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products p
  SET stock = (
        SELECT count(*) FROM public.product_keys k
        WHERE k.product_id = p.id AND k.claimed_at IS NULL
      ),
      updated_at = now()
  WHERE p.id IN (
    SELECT product_id FROM new_keys
    UNION
    SELECT product_id FROM old_keys
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_product_keys_sync_stock ON public.product_keys;
CREATE TRIGGER on_product_keys_sync_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.product_keys
  REFERENCING NEW TABLE AS new_keys OLD TABLE AS old_keys
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.sync_stock_from_keys();

-- ------------------------------------------------------------
-- 11) dead tables — zero src/edge-fn refs; policies die with the table
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.seller_daily_quota;
DROP TABLE IF EXISTS public.product_tags;
DROP TABLE IF EXISTS public.tags;
DROP TABLE IF EXISTS public.campaigns;
DROP TABLE IF EXISTS public.themes;
