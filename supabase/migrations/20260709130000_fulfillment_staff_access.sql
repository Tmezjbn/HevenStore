-- Allow staff (owner/admin/moderator) to read fulfillment for any paid order.
-- Buyers still only see their own paid orders.
CREATE OR REPLACE FUNCTION public.get_order_fulfillment(p_order_id uuid)
RETURNS TABLE (
  product_id uuid,
  name text,
  name_ar text,
  product_type text,
  quantity int,
  content text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF caller_role IN ('owner', 'admin', 'moderator') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = p_order_id AND o.status = 'paid'
    ) THEN
      RETURN;
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.user_id = auth.uid() AND o.status = 'paid'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.name_ar, p.product_type, oi.quantity, s.content
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.product_secrets s ON s.product_id = p.id
  WHERE oi.order_id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_fulfillment(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_order_fulfillment(uuid) FROM anon;
