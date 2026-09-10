-- Owners must manage product galleries (insert/update/delete).
DROP POLICY IF EXISTS "product_images_insert" ON public.product_images;
CREATE POLICY "product_images_insert" ON public.product_images FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND (
      p.seller_id = auth.uid() OR
      p.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','moderator'))
    )
  )
);

DROP POLICY IF EXISTS "product_images_delete" ON public.product_images;
CREATE POLICY "product_images_delete" ON public.product_images FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND (
      p.seller_id = auth.uid() OR
      p.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','moderator'))
    )
  )
);

DROP POLICY IF EXISTS "product_images_update" ON public.product_images;
CREATE POLICY "product_images_update" ON public.product_images FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND (
      p.seller_id = auth.uid() OR
      p.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','moderator'))
    )
  )
);
