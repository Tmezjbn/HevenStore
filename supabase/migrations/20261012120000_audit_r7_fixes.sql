-- Audit round 7 (slice S4) fixes. Idempotent: CREATE OR REPLACE / REVOKE+GRANT only.
--
--  1) products_seller_listing_review_guard gated on role='seller' only: a user
--     who still owns products (seller_id = uid) after a role change skipped the
--     review gate AND the review-metadata anti-forge. Gate every non-owner/admin
--     JWT caller instead.
--  2) list_seller_sales / count_seller_sales leaked the sequential, staff-only
--     order_number to sellers (store-wide order volume) and matched searches on
--     it. Sellers now get public_ref in that column; search drops order_number.
--     Also REVOKE from PUBLIC (REVOKE FROM anon alone is a no-op: anon inherits PUBLIC).
--  3) set_support_ticket_status: sellers could reopen/claim tickets; support could
--     rewrite status on an ESCALATED ticket and dodge the reject-penalty flow.
--  4) reset_support_standing: target must be a support agent (no ghost events).
--  5) set_staff_notes: length cap; only an owner may annotate an owner.
--  6) Support RPCs: strip implicit PUBLIC EXECUTE (anon), keep authenticated.

-- ------------------------------------------------------------
-- 1) listing-review guard: every non-owner/admin JWT caller
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.products_seller_listing_review_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_internal text[] := ARRAY[
    'stock', 'rating', 'review_count', 'sales_count', 'updated_at',
    'review_note', 'reviewed_by', 'reviewed_at'
  ];
BEGIN
  -- Service paths (no JWT): finalize_paid_order, seeds, SQL editor.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  -- Staff reviewers (review_product_listing) are the only ungated writers.
  IF v_role IN ('owner', 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.review_note := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  ELSE
    NEW.review_note := OLD.review_note;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
  END IF;

  IF NOT public.seller_needs_listing_review(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      NEW.status := 'pending_review';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'active'
     AND (to_jsonb(NEW) - v_internal) IS DISTINCT FROM (to_jsonb(OLD) - v_internal) THEN
    NEW.status := 'pending_review';
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 2) seller sales ledger: no sequential order_number
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_seller_sales(
  p_limit int DEFAULT 40,
  p_offset int DEFAULT 0,
  p_q text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
  public_ref text,
  created_at timestamptz,
  status text,
  line_total numeric,
  quantity int,
  product_id uuid,
  product_name text,
  product_name_ar text,
  product_slug text,
  thumbnail_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim int := GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
  off int := GREATEST(0, COALESCE(p_offset, 0));
  q text := NULLIF(btrim(COALESCE(p_q, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  IF public.current_user_role() IS DISTINCT FROM 'seller' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.public_ref,          -- order_number column carries the public ref (internal sequence stays staff-only)
    o.public_ref,
    o.created_at,
    o.status::text,
    oi.total_price,
    oi.quantity,
    p.id,
    p.name,
    p.name_ar,
    p.slug,
    p.thumbnail_url
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  WHERE p.seller_id = auth.uid()
    AND o.status = 'paid'
    AND (
      q IS NULL
      OR o.public_ref ILIKE '%' || q || '%'
      OR o.id::text ILIKE '%' || q || '%'
      OR p.name ILIKE '%' || q || '%'
      OR COALESCE(p.name_ar, '') ILIKE '%' || q || '%'
    )
  ORDER BY o.created_at DESC, oi.id
  LIMIT lim OFFSET off;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_seller_sales(p_q text DEFAULT NULL)
RETURNS TABLE (sale_count bigint, revenue numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := NULLIF(btrim(COALESCE(p_q, '')), '');
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() IS DISTINCT FROM 'seller' THEN
    sale_count := 0;
    revenue := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    count(*)::bigint,
    COALESCE(sum(oi.total_price), 0)::numeric
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  WHERE p.seller_id = auth.uid()
    AND o.status = 'paid'
    AND (
      q IS NULL
      OR o.public_ref ILIKE '%' || q || '%'
      OR o.id::text ILIKE '%' || q || '%'
      OR p.name ILIKE '%' || q || '%'
      OR COALESCE(p.name_ar, '') ILIKE '%' || q || '%'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.list_seller_sales(int, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_seller_sales(int, int, text) TO authenticated;
REVOKE ALL ON FUNCTION public.count_seller_sales(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_seller_sales(text) TO authenticated;

-- ------------------------------------------------------------
-- 3) set_support_ticket_status
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_support_ticket_status(p_ticket_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
  t public.support_tickets%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('resolved', 'closed', 'open', 'claimed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF v_role IN ('owner', 'admin', 'moderator') THEN
    NULL;
  ELSIF v_role = 'support' THEN
    -- Escalated tickets belong to moderators; support leaves via reject flow.
    IF t.status = 'escalated' THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  ELSIF v_role = 'seller' AND t.seller_id = uid AND t.queue = 'seller'
        AND p_status IN ('resolved', 'closed') THEN
    NULL;
  ELSIF t.created_by = uid AND p_status IN ('resolved', 'closed') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.support_tickets
  SET status = p_status,
      -- 'claimed' must always have an owner; 'open' means unassigned.
      assignee_id = CASE
        WHEN p_status = 'claimed' THEN COALESCE(assignee_id, uid)
        WHEN p_status = 'open' THEN NULL
        ELSE assignee_id
      END,
      updated_at = now()
  WHERE id = p_ticket_id;
END;
$$;

-- ------------------------------------------------------------
-- 4) reset_support_standing: target must be a support agent
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_support_standing(p_agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_agent_id AND role = 'support') THEN
    RAISE EXCEPTION 'Not a support agent';
  END IF;

  UPDATE public.profiles
  SET support_standing = 100, updated_at = now()
  WHERE id = p_agent_id;

  INSERT INTO public.support_standing_events (agent_id, actor_id, ticket_id, delta, standing_after, reason)
  VALUES (p_agent_id, uid, NULL, 0, 100, 'reset');

  PERFORM public.notify_users(
    ARRAY[p_agent_id],
    'message',
    'Support standing reset',
    'أُعيد ضبط تقييم الدعم',
    'Your escalation standing is standard again.',
    'تقييم التصعيد عاد إلى المستوى العادي.',
    jsonb_build_object('standing', 100)
  );
END;
$$;

-- ------------------------------------------------------------
-- 5) set_staff_notes: cap + owner protection
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_staff_notes(p_user_id uuid, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
  v_target_role text;
  v_notes text := NULLIF(trim(COALESCE(p_notes, '')), '');
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF v_notes IS NOT NULL AND char_length(v_notes) > 2000 THEN
    RAISE EXCEPTION 'Notes too long';
  END IF;
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
  IF v_target_role = 'owner' AND v_role <> 'owner' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.profiles
  SET staff_notes = v_notes, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- ------------------------------------------------------------
-- 6) support RPCs: no implicit PUBLIC/anon EXECUTE
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.claim_support_ticket(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.escalate_support_ticket(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_support_escalation(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_support_ticket_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_support_standing(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_staff_notes(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.staff_reply_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_support_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_support_ticket(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_support_escalation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_support_ticket_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_support_standing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_notes(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_reply_review(uuid, text) TO authenticated;
