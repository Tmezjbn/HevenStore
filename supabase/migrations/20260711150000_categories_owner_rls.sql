-- Allow owner to manage categories (dashboard already exposes Categories to owner).
DROP POLICY IF EXISTS "categories_insert_admin_mod" ON public.categories;
CREATE POLICY "categories_insert_staff" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "categories_update_admin_mod" ON public.categories;
CREATE POLICY "categories_update_staff" ON public.categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
CREATE POLICY "categories_delete_staff" ON public.categories
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
