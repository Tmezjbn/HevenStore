-- Allow buyers to reuse a single pending order at checkout instead of
-- creating a new row on every click. Run in Supabase SQL editor. Idempotent.

DROP POLICY IF EXISTS "orders_update_own_pending" ON public.orders;
CREATE POLICY "orders_update_own_pending" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "orders_delete_own_pending" ON public.orders;
CREATE POLICY "orders_delete_own_pending" ON public.orders
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "order_items_delete_own_pending" ON public.order_items;
CREATE POLICY "order_items_delete_own_pending" ON public.order_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status = 'pending'
    )
  );
