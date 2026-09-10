-- Allow owners to read all orders (policy previously omitted 'owner').
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin', 'moderator')
    )
  );
