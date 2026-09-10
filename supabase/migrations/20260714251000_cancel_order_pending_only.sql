-- Cancel = pending only (paid is not cancellable).
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

  IF v_order.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'NOT_PENDING';
  END IF;

  UPDATE public.orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_order_id;
END;
$$;
