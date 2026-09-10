-- Break orders ↔ order_items RLS recursion (42P17).
-- Seller visibility still allowed; checks run in SECURITY DEFINER so nested
-- PostgREST embeds (orders → order_items → products) no longer re-enter RLS.

CREATE OR REPLACE FUNCTION public.order_is_visible_to_caller(p_order_id uuid, p_buyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      auth.uid() = p_buyer_id
      OR public.current_user_role() IN ('owner', 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.order_items oi
        JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = p_order_id
          AND p.seller_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.order_item_is_visible_to_caller(p_order_id uuid, p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = p_order_id
          AND (
            o.user_id = auth.uid()
            OR public.current_user_role() IN ('owner', 'admin')
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = p_product_id
          AND p.seller_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.order_is_visible_to_caller(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_is_visible_to_caller(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.order_item_is_visible_to_caller(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_item_is_visible_to_caller(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated
  USING (public.order_is_visible_to_caller(id, user_id));

DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.order_item_is_visible_to_caller(order_id, product_id));
