-- Owner can SELECT all products (drafts/hidden too). Was only admin|moderator + active|own.
DROP POLICY IF EXISTS "products_select_active" ON public.products;
CREATE POLICY "products_select_active" ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    OR auth.uid() = seller_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'moderator')
    )
  );

-- Owner can INSERT like admin (was admin|moderator|seller only).
DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'moderator', 'seller')
    )
  );

-- Owner on UPDATE path (parity with admin/moderator).
DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = seller_id
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    auth.uid() = seller_id
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'moderator')
    )
  );
