-- Profile soft-delete, badges, badge-gated coupons, Helper badge on analytics accept.

-- ========== Profiles: scheduled deletion ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;

-- ========== Account deletion requests ==========
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_one_pending
  ON public.account_deletion_requests (user_id)
  WHERE status = 'pending';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deletion_req_select" ON public.account_deletion_requests;
CREATE POLICY "deletion_req_select" ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- Writes only via RPCs below.

CREATE OR REPLACE FUNCTION public.request_account_deletion(p_confirm_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT full_name INTO v_name FROM public.profiles WHERE id = v_uid;
  IF v_name IS NULL OR length(trim(v_name)) = 0 THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;
  IF lower(trim(p_confirm_name)) <> lower(trim(v_name)) THEN
    RAISE EXCEPTION 'NAME_MISMATCH';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND deletion_scheduled_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'ALREADY_SCHEDULED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.account_deletion_requests
    WHERE user_id = v_uid AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'ALREADY_PENDING';
  END IF;

  INSERT INTO public.account_deletion_requests (user_id, status)
  VALUES (v_uid, 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_account_deletion(p_request_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_req public.account_deletion_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_req FROM public.account_deletion_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF p_approve THEN
    UPDATE public.account_deletion_requests
    SET status = 'approved', reviewed_at = now(), reviewed_by = v_uid
    WHERE id = p_request_id;
    UPDATE public.profiles
    SET is_active = false,
        deletion_scheduled_at = now() + interval '30 days',
        updated_at = now()
    WHERE id = v_req.user_id;
  ELSE
    UPDATE public.account_deletion_requests
    SET status = 'rejected', reviewed_at = now(), reviewed_by = v_uid
    WHERE id = p_request_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_account_deletion(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_account_deletion(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.profiles
  SET is_active = true,
      deletion_scheduled_at = null,
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE public.account_deletion_requests
  SET status = 'cancelled', reviewed_at = now(), reviewed_by = v_uid
  WHERE user_id = p_user_id AND status IN ('pending', 'approved');
END;
$$;

REVOKE ALL ON FUNCTION public.restore_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_account(uuid) TO authenticated;

-- Soft-purge marker after 30 days (auth.users hard-delete needs service role / cron).
-- ponytail: ceiling = profile stay blocked+anonymized; upgrade = edge cron + auth.admin.deleteUser
CREATE OR REPLACE FUNCTION public.purge_due_account_deletions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n int := 0;
BEGIN
  UPDATE public.profiles
  SET
    full_name = 'deleted',
    email = null,
    avatar_url = null,
    is_active = false,
    updated_at = now()
  WHERE deletion_scheduled_at IS NOT NULL
    AND deletion_scheduled_at <= now()
    AND full_name IS DISTINCT FROM 'deleted';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_due_account_deletions() FROM PUBLIC;
-- Not granted to authenticated — run via service role / scheduled job.

-- ========== Badges ==========
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Award',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS required_badge_id uuid REFERENCES public.badges(id) ON DELETE SET NULL;

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges_select" ON public.badges;
CREATE POLICY "badges_select" ON public.badges FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "badges_write_owner" ON public.badges;
CREATE POLICY "badges_write_owner" ON public.badges
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "user_badges_select" ON public.user_badges;
CREATE POLICY "user_badges_select" ON public.user_badges
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'moderator'))
  );

DROP POLICY IF EXISTS "user_badges_insert_staff" ON public.user_badges;
CREATE POLICY "user_badges_insert_staff" ON public.user_badges
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "user_badges_delete_staff" ON public.user_badges;
CREATE POLICY "user_badges_delete_staff" ON public.user_badges
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

INSERT INTO public.badges (slug, name_ar, name_en, description_ar, description_en, icon)
SELECT 'helper', 'مساعِد', 'Helper!',
  'مُنحت لموافقتك على التحليلات — تساعد على تحسين المتجر.',
  'Awarded when you accept analytics — you help improve the store.',
  'HeartHandshake'
WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE slug = 'helper');

CREATE OR REPLACE FUNCTION public.award_helper_badge_on_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge uuid;
BEGIN
  IF NEW.analytics_consent = 'accepted'
     AND (OLD.analytics_consent IS DISTINCT FROM 'accepted') THEN
    SELECT id INTO v_badge FROM public.badges WHERE slug = 'helper' LIMIT 1;
    IF v_badge IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (NEW.id, v_badge)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_helper_badge ON public.profiles;
CREATE TRIGGER trg_award_helper_badge
  AFTER UPDATE OF analytics_consent ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.award_helper_badge_on_consent();

-- ========== Coupon badge gate in create_pending_order ==========
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

  DELETE FROM public.orders WHERE user_id = v_user AND status = 'pending';

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

-- Avatars: any signed-in user may upload their own
DROP POLICY IF EXISTS "avatars_staff_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_staff_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_staff" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_staff" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_staff" ON storage.objects;

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
