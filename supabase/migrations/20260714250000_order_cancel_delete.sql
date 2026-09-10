-- Staff/buyer cancel + staff delete for orders (server-authoritative).
-- Clients must not UPDATE/DELETE orders directly (see check-checkout-authority).

CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ORDER';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_role NOT IN ('owner', 'admin') AND v_order.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN;
  END IF;

  -- Pending checkouts only (paid = use delete / external refund — not cancel).
  IF v_order.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'NOT_PENDING';
  END IF;

  UPDATE public.orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_order public.orders%ROWTYPE;
  v_item record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ORDER';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  -- Paid + manual-stock products: put qty back. Key-pool products keep keys claimed
  -- (claimed_at stays set; order_item_id SET NULL on cascade) so delivered keys aren't resold.
  IF v_order.status = 'paid' THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = p_order_id
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.product_keys pk WHERE pk.product_id = v_item.product_id LIMIT 1
      ) THEN
        UPDATE public.products
        SET stock = stock + v_item.quantity, updated_at = now()
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;
  END IF;

  DELETE FROM public.orders WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_order(uuid) TO authenticated;
