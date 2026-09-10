-- Owner may delete admin/mod/seller/shared products while author lock is ON.
-- Still cannot delete another owner's attributed products.

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (
    CASE
      WHEN public.product_author_lock_enabled() THEN
        (
          created_by = auth.uid()
          OR (
            created_by IS NULL
            AND public.current_user_role() IN ('owner', 'admin', 'moderator')
          )
          OR (
            public.current_user_role() = 'owner'
            AND NOT EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = created_by
                AND p.role = 'owner'
                AND p.id <> auth.uid()
            )
          )
        )
      ELSE
        (
          (
            auth.uid() = seller_id
            AND NOT EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = created_by AND role IN ('owner', 'admin', 'moderator')
            )
          )
          OR public.current_user_role() IN ('owner', 'admin')
          OR (
            public.current_user_role() = 'moderator'
            AND NOT EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = created_by AND role IN ('owner', 'admin')
            )
          )
        )
    END
  );
