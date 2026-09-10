-- SEC-4: rate-limit support ticket open + message post (reuse check_rpc_rate).
-- Buckets: open 5/60s (6th → RATE_LIMITED per launch audit); post 20/60s (chatty threads, still spam-capped).

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

  PERFORM public.check_rpc_rate('open_support_ticket', 5, 60);

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

  PERFORM public.check_rpc_rate('post_support_message', 20, 60);

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

REVOKE ALL ON FUNCTION public.open_support_ticket(text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_support_ticket(text, text, uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.post_support_message(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_support_message(uuid, text) TO authenticated;
