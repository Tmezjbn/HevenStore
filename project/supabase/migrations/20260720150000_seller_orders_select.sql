-- Sellers may read orders (and their own line items) when a product they sell is on the order.
-- No UPDATE — sales ledger only. Secrets stay via get_order_fulfillment (buyer/owner/admin).

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
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = orders.id
        AND p.seller_id = auth.uid()
    )
  );

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
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = order_items.product_id
        AND p.seller_id = auth.uid()
    )
  );
