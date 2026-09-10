-- Restrict store-wide order access to owner and admin only.
-- Buyers/members still see their own orders via auth.uid() = user_id (checkout, home).
-- Moderators and sellers no longer get all-orders SELECT/UPDATE.

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Staff fulfillment RPC: owner/admin only (buyers still own-order only).
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

  IF caller_role IN ('owner', 'admin') THEN
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

-- order_items staff SELECT: owner/admin only (buyers still own-order via join).
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (
          o.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('owner', 'admin')
          )
        )
    )
  );
