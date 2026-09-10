-- Support / live-chat tickets: role, standing, threads, escalate/reject,
-- moderator loses product writes, review staff reply/delete, owner log.
-- Idempotent.

-- ============================================================
-- 1) Role: support
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner','admin','moderator','support','seller','buyer','member'));

CREATE OR REPLACE FUNCTION public.set_user_role(target_user uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  target_role text;
BEGIN
  IF new_role NOT IN ('owner','admin','moderator','support','seller','buyer','member') THEN
    RAISE EXCEPTION 'Invalid role %', new_role;
  END IF;

  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can change roles';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = target_user;
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user;
END;
$$;

-- Standing + staff observe notes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS support_standing int NOT NULL DEFAULT 100;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_notes text;

COMMENT ON COLUMN public.profiles.support_standing IS
  'Support agent standing (default 100). Escalation reject −15; ≤40 = restricted (no escalate until reset).';

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.current_user_role() IN ('owner', 'admin', 'moderator', 'support')
  );

-- ============================================================
-- 2) Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','claimed','escalated','resolved','closed')),
  queue text NOT NULL DEFAULT 'general'
    CHECK (queue IN ('general','seller')),
  escalate_reason text,
  reject_reason text,
  rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_queue ON public.support_tickets(queue, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_seller ON public.support_tickets(seller_id)
  WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee ON public.support_tickets(assignee_id)
  WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_msg ON public.support_tickets(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
  ON public.support_messages(ticket_id, created_at);

CREATE TABLE IF NOT EXISTS public.support_standing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  delta int NOT NULL,
  standing_after int NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_standing_events_agent
  ON public.support_standing_events(agent_id, created_at DESC);

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS staff_reply text;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS staff_reply_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS staff_reply_at timestamptz;

-- ============================================================
-- 3) Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.support_standing_restricted(p_standing int)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_standing, 100) <= 40;
$$;

CREATE OR REPLACE FUNCTION public.notify_users(
  p_user_ids uuid[],
  p_type text,
  p_title text,
  p_title_ar text,
  p_body text,
  p_body_ar text,
  p_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF p_user_ids IS NULL THEN
    RETURN;
  END IF;
  FOREACH uid IN ARRAY p_user_ids LOOP
    IF uid IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO public.notifications (user_id, type, title, title_ar, body, body_ar, data)
    VALUES (
      uid,
      COALESCE(NULLIF(p_type, ''), 'message'),
      p_title,
      p_title_ar,
      p_body,
      p_body_ar,
      p_data
    );
  END LOOP;
END;
$$;

-- Internal helper only (PERFORM from other SECURITY DEFINER RPCs).
-- No auth.uid() guard: JWT uid stays set during those PERFORM calls and would
-- break claim/escalate/post notifications. REVOKE is the hard gate.
REVOKE ALL ON FUNCTION public.notify_users(uuid[], text, text, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.support_role_ids(p_roles text[])
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  FROM public.profiles
  WHERE role = ANY (p_roles)
    AND is_active = true;
$$;

-- Internal helper only — never GRANT to authenticated.
REVOKE ALL ON FUNCTION public.support_role_ids(text[])
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4) RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.open_support_ticket(
  p_subject text,
  p_body text,
  p_seller_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
  v_subject text := trim(COALESCE(p_subject, ''));
  v_body text := trim(COALESCE(p_body, ''));
  v_queue text := 'general';
  tid uuid;
  notify_ids uuid[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF char_length(v_subject) < 2 OR char_length(v_subject) > 160 THEN
    RAISE EXCEPTION 'Invalid subject';
  END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 4000 THEN
    RAISE EXCEPTION 'Invalid message';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  IF v_role IS NULL OR v_role NOT IN ('member','buyer','seller','moderator','support','admin','owner') THEN
    RAISE EXCEPTION 'Cannot open ticket';
  END IF;

  IF p_seller_id IS NOT NULL THEN
    v_queue := 'seller';
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      JOIN public.products p ON p.id = oi.product_id
      WHERE o.user_id = uid
        AND o.status = 'paid'
        AND p.seller_id = p_seller_id
    ) THEN
      RAISE EXCEPTION 'Not a buyer of this seller';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = p_seller_id AND role = 'seller'
    ) THEN
      RAISE EXCEPTION 'Seller not found';
    END IF;
  END IF;

  IF p_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  INSERT INTO public.support_tickets (
    created_by, seller_id, order_id, subject, status, queue
  ) VALUES (
    uid, p_seller_id, p_order_id, v_subject, 'open', v_queue
  )
  RETURNING id INTO tid;

  INSERT INTO public.support_messages (ticket_id, sender_id, body)
  VALUES (tid, uid, v_body);

  notify_ids := public.support_role_ids(ARRAY['support']);
  IF v_queue = 'seller' AND p_seller_id IS NOT NULL THEN
    notify_ids := array_append(notify_ids, p_seller_id);
  END IF;

  PERFORM public.notify_users(
    notify_ids,
    'message',
    CASE WHEN v_queue = 'seller' THEN 'New seller support ticket' ELSE 'New support ticket' END,
    CASE WHEN v_queue = 'seller' THEN 'تذكرة دعم بائع جديدة' ELSE 'تذكرة دعم جديدة' END,
    v_subject,
    v_subject,
    jsonb_build_object('ticket_id', tid, 'queue', v_queue)
  );

  RETURN tid;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_support_ticket(p_ticket_id uuid)
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
  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  IF v_role IS NULL OR v_role NOT IN ('support', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Cannot claim';
  END IF;

  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF t.status NOT IN ('open') THEN
    RAISE EXCEPTION 'Ticket not open';
  END IF;
  IF t.assignee_id IS NOT NULL THEN
    RAISE EXCEPTION 'Already claimed';
  END IF;

  UPDATE public.support_tickets
  SET status = 'claimed', assignee_id = uid, updated_at = now(), reject_reason = NULL
  WHERE id = p_ticket_id;

  PERFORM public.notify_users(
    ARRAY[t.created_by],
    'message',
    'Ticket claimed',
    'تم استلام التذكرة',
    t.subject,
    t.subject,
    jsonb_build_object('ticket_id', p_ticket_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.escalate_support_ticket(p_ticket_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
  v_standing int;
  t public.support_tickets%ROWTYPE;
  v_reason text := trim(COALESCE(p_reason, ''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT role, support_standing INTO v_role, v_standing
  FROM public.profiles WHERE id = uid;
  IF v_role IS DISTINCT FROM 'support' THEN
    RAISE EXCEPTION 'Only support can escalate';
  END IF;
  IF public.support_standing_restricted(v_standing) THEN
    RAISE EXCEPTION 'Escalation restricted';
  END IF;

  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF t.status NOT IN ('open', 'claimed') THEN
    RAISE EXCEPTION 'Cannot escalate';
  END IF;
  IF t.assignee_id IS NOT NULL AND t.assignee_id <> uid THEN
    RAISE EXCEPTION 'Not your ticket';
  END IF;

  UPDATE public.support_tickets
  SET
    status = 'escalated',
    assignee_id = COALESCE(assignee_id, uid),
    escalate_reason = NULLIF(v_reason, ''),
    reject_reason = NULL,
    updated_at = now()
  WHERE id = p_ticket_id;

  PERFORM public.notify_users(
    public.support_role_ids(ARRAY['moderator', 'admin', 'owner']),
    'message',
    'Ticket escalated',
    'تذكرة مُصعَّدة',
    t.subject,
    t.subject,
    jsonb_build_object('ticket_id', p_ticket_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_support_escalation(p_ticket_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
  t public.support_tickets%ROWTYPE;
  v_reason text := trim(COALESCE(p_reason, ''));
  agent uuid;
  new_standing int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF char_length(v_reason) < 2 OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Reject reason required';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  IF v_role IS NULL OR v_role NOT IN ('moderator', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Cannot reject escalation';
  END IF;

  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF t.status IS DISTINCT FROM 'escalated' THEN
    RAISE EXCEPTION 'Not escalated';
  END IF;

  agent := COALESCE(t.assignee_id, t.created_by);

  UPDATE public.support_tickets
  SET
    status = 'open',
    assignee_id = NULL,
    reject_reason = v_reason,
    rejected_by = uid,
    escalate_reason = NULL,
    updated_at = now()
  WHERE id = p_ticket_id;

  -- Penalty only when a support agent owned the escalation
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = agent AND role = 'support') THEN
    UPDATE public.profiles
    SET support_standing = GREATEST(0, support_standing - 15), updated_at = now()
    WHERE id = agent
    RETURNING support_standing INTO new_standing;

    INSERT INTO public.support_standing_events (agent_id, actor_id, ticket_id, delta, standing_after, reason)
    VALUES (agent, uid, p_ticket_id, -15, new_standing, v_reason);

    PERFORM public.notify_users(
      ARRAY[agent],
      'message',
      CASE
        WHEN public.support_standing_restricted(new_standing)
          THEN 'Escalation rejected — standing restricted'
        ELSE 'Escalation rejected'
      END,
      CASE
        WHEN public.support_standing_restricted(new_standing)
          THEN 'رُفض التصعيد — تقييد التصعيد'
        ELSE 'رُفض التصعيد'
      END,
      v_reason,
      v_reason,
      jsonb_build_object('ticket_id', p_ticket_id, 'standing', new_standing)
    );
  END IF;

  PERFORM public.notify_users(
    public.support_role_ids(ARRAY['support']),
    'message',
    'Escalation returned to Support',
    'التصعيد عاد لطابور الدعم',
    t.subject || ' — ' || v_reason,
    t.subject || ' — ' || v_reason,
    jsonb_build_object('ticket_id', p_ticket_id)
  );
END;
$$;

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
  IF p_status NOT IN ('resolved', 'closed', 'open', 'claimed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF v_role IN ('owner', 'admin', 'moderator', 'support') THEN
    NULL;
  ELSIF v_role = 'seller' AND t.seller_id = uid THEN
    NULL;
  ELSIF t.created_by = uid AND p_status IN ('resolved', 'closed') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.support_tickets
  SET status = p_status, updated_at = now()
  WHERE id = p_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_support_message(p_ticket_id uuid, p_body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
  t public.support_tickets%ROWTYPE;
  v_body text := trim(COALESCE(p_body, ''));
  mid uuid;
  notify_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 4000 THEN
    RAISE EXCEPTION 'Invalid message';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF t.status IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'Ticket closed';
  END IF;

  IF t.created_by = uid
     OR (v_role = 'seller' AND t.seller_id = uid)
     OR v_role IN ('support', 'moderator', 'admin', 'owner') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Optional reply on non-escalated: allowed for mod+; support always
  INSERT INTO public.support_messages (ticket_id, sender_id, body)
  VALUES (p_ticket_id, uid, v_body)
  RETURNING id INTO mid;

  UPDATE public.support_tickets
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_ticket_id;

  IF uid <> t.created_by THEN
    notify_ids := array_append(notify_ids, t.created_by);
  END IF;
  IF t.assignee_id IS NOT NULL AND t.assignee_id <> uid THEN
    notify_ids := array_append(notify_ids, t.assignee_id);
  END IF;
  IF t.seller_id IS NOT NULL AND t.seller_id <> uid AND t.queue = 'seller' THEN
    notify_ids := array_append(notify_ids, t.seller_id);
  END IF;

  PERFORM public.notify_users(
    notify_ids,
    'message',
    'New support message',
    'رسالة دعم جديدة',
    left(v_body, 120),
    left(v_body, 120),
    jsonb_build_object('ticket_id', p_ticket_id)
  );

  RETURN mid;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.set_staff_notes(p_user_id uuid, p_notes text)
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
  UPDATE public.profiles
  SET staff_notes = NULLIF(trim(COALESCE(p_notes, '')), ''), updated_at = now()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_reply_review(p_review_id uuid, p_reply text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
  v_reply text := trim(COALESCE(p_reply, ''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  IF v_role IS NULL OR v_role NOT IN ('moderator', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF char_length(v_reply) > 2000 THEN
    RAISE EXCEPTION 'Reply too long';
  END IF;

  UPDATE public.reviews
  SET
    staff_reply = NULLIF(v_reply, ''),
    staff_reply_by = CASE WHEN v_reply = '' THEN NULL ELSE uid END,
    staff_reply_at = CASE WHEN v_reply = '' THEN NULL ELSE now() END
  WHERE id = p_review_id;
END;
$$;

-- ============================================================
-- 5) RLS tickets / messages / standing events
-- ============================================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_standing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_select" ON public.support_tickets;
CREATE POLICY "support_tickets_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR (seller_id = auth.uid() AND queue = 'seller')
    OR public.current_user_role() IN ('support', 'moderator', 'admin', 'owner')
  );

-- Mutations go through SECURITY DEFINER RPCs (no direct client INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "support_tickets_no_client_write" ON public.support_tickets;
-- intentionally no INSERT/UPDATE/DELETE policies for authenticated

DROP POLICY IF EXISTS "support_messages_select" ON public.support_messages;
CREATE POLICY "support_messages_select" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.created_by = auth.uid()
          OR (t.seller_id = auth.uid() AND t.queue = 'seller')
          OR public.current_user_role() IN ('support', 'moderator', 'admin', 'owner')
        )
    )
  );

DROP POLICY IF EXISTS "support_standing_events_select" ON public.support_standing_events;
CREATE POLICY "support_standing_events_select" ON public.support_standing_events
  FOR SELECT TO authenticated
  USING (
    agent_id = auth.uid()
    OR public.current_user_role() IN ('owner', 'admin')
  );

GRANT EXECUTE ON FUNCTION public.open_support_ticket(text, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_support_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_support_ticket(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_support_escalation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_support_ticket_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_support_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_support_standing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_notes(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_reply_review(uuid, text) TO authenticated;

-- ============================================================
-- 6) Moderator: no product management
-- ============================================================
DROP POLICY IF EXISTS "products_select_active" ON public.products;
CREATE POLICY "products_select_active" ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    OR auth.uid() = seller_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'seller'
      )
      AND (seller_id IS NULL OR seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = seller_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = seller_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (
    (
      public.current_user_role() = 'seller'
      AND seller_id = auth.uid()
    )
    OR CASE
      WHEN public.product_author_lock_enabled() THEN
        (
          created_by = auth.uid()
          OR (
            created_by IS NULL
            AND public.current_user_role() IN ('owner', 'admin')
          )
          OR (
            public.current_user_role() = 'owner'
            AND NOT EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = created_by
                AND p.role = 'owner'
                AND p.id <> auth.uid()
            )
          )
        )
      ELSE
        (
          (
            auth.uid() = seller_id
            AND NOT EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = created_by AND role IN ('owner', 'admin')
            )
          )
          OR public.current_user_role() IN ('owner', 'admin')
        )
    END
  );

DROP POLICY IF EXISTS "product_images_insert" ON public.product_images;
CREATE POLICY "product_images_insert" ON public.product_images
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (
        p.seller_id = auth.uid()
        OR p.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "product_images_delete" ON public.product_images;
CREATE POLICY "product_images_delete" ON public.product_images
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (
        p.seller_id = auth.uid()
        OR p.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "product_images_update" ON public.product_images;
CREATE POLICY "product_images_update" ON public.product_images
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (
        p.seller_id = auth.uid()
        OR p.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "product_images_staff_insert" ON storage.objects;
CREATE POLICY "product_images_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'seller')
  );

DROP POLICY IF EXISTS "product_images_staff_update" ON storage.objects;
CREATE POLICY "product_images_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'seller')
  );

DROP POLICY IF EXISTS "product_images_staff_delete" ON storage.objects;
CREATE POLICY "product_images_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin', 'seller')
  );

DROP POLICY IF EXISTS "site_media_staff_insert" ON storage.objects;
CREATE POLICY "site_media_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "site_media_staff_update" ON storage.objects;
CREATE POLICY "site_media_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'site-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "site_media_staff_delete" ON storage.objects;
CREATE POLICY "site_media_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'site-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.current_user_role() IN ('owner', 'admin')
  );

-- Reviews: staff delete + reply via RPC (no broad UPDATE)
DROP POLICY IF EXISTS "reviews_delete" ON public.reviews;
CREATE POLICY "reviews_delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.current_user_role() IN ('owner', 'admin', 'moderator')
  );

-- ============================================================
-- 7) Owner internal log
-- ============================================================
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-23'::date,
  'دعم مباشر وتذاكر داخل اللوحة',
  'Live support tickets in the dashboard',
  'رتبة دعم جديدة للدردشة المباشرة، تذاكر يدّعيها الفريق ويتصاعد المهم منها، قناة بائعين، ومشرفون يركّزون على التصعيد والتقييمات بدل المنتجات.',
  'A new Support role for live chat, tickets the team can claim and escalate when needed, a Sellers channel, and moderators focused on escalations and reviews—not products.',
  '',
  '',
  '{
    "what_ar": "أضفنا رتبة «الدعم» لدردشة التذاكر من لوحة التحكم (الدعم). الفريق يأخذ التذكرة، يرد بالمحادثة، ويرفع الحالات المهمة. فيه قناة بائعين لمشتري ذلك البائع، وصندوق بائعين يظهر لفريق الدعم. المشرف لم يعد يدير المنتجات — يتعامل مع التذاكر المصعّدة ومراجعة التقييمات. لكل وكيل دعم مستوى ثقة يبدأ من ١٠٠؛ رفض التصعيد غير المناسب يخصم ١٥، وإذا وصل ٤٠ أو أقل يتوقف عن التصعيد حتى يعيد المالك أو الأدمن الضبط.",
    "what_en": "We added a Support staff role for live chat tickets in the dashboard (Support). Agents claim a ticket, chat with the customer, and escalate important cases. Sellers get a channel for buyers of their shop, and Support sees a Sellers bin. Moderators no longer manage products — they handle escalated tickets and review moderation. Each support agent starts with a trust score of 100; a rejected escalation drops it by 15, and at 40 or below they cannot escalate until an owner or admin resets it.",
    "why_ar": "الدعم لازم يعيش داخل المتجر بصلاحيات واضحة: رد سريع للحالات العادية، وتصعيد منظّم لما يحتاج رتب أعلى — مو رسائل مشتتة خارج اللوحة.",
    "why_en": "Help should live inside the store with clear roles: fast replies for everyday cases, and orderly handoff when something needs a higher rank — not scattered messages outside the dashboard.",
    "how_ar": "لوحة التحكم ← الدعم. امنح رتبة دعم من المستخدمون. الوكيل يأخذ التذكرة ويرد؛ الحالات المهمة تُرفع، والرتب الأعلى تقدر ترفض التصعيد غير المناسب. قناة البائع لمشتريه فقط. راجع مستوى ثقة الدعم من المستخدمون عند الحاجة وأعد الضبط.",
    "how_en": "Dashboard → Support. Grant the Support role from Users. Agents claim and reply; important cases get escalated, and higher ranks can reject a bad escalation. The seller channel is only for that seller’s buyers. Check support trust from Users when needed and reset it.",
    "benefits_ar": "رد أسرع للزبائن، تصعيد أوضح للمهم، بائعون يساعدون مشتريهم، ومشرفون على الشكاوى الحساسة والتقييمات بدل تشتيت المنتجات.",
    "benefits_en": "Faster customer replies, clearer handoff for important cases, sellers helping their own buyers, and moderators on sensitive tickets and reviews instead of product busywork."
  }'::jsonb,
  'big',
  1784851200000
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Live support tickets in the dashboard'
);
