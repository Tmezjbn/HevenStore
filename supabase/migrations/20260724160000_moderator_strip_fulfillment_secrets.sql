-- SEC-1: Moderators must not read/mutate fulfillment secrets.
-- product_keys / product_secrets stay owner+admin staff, plus seller-owns-product.
-- support is NOT granted. Claimed-key lock + service-role finalize paths unchanged.
-- Idempotent.

DROP POLICY IF EXISTS "product_keys_staff_all" ON public.product_keys;
CREATE POLICY "product_keys_staff_all" ON public.product_keys
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  );

DROP POLICY IF EXISTS "product_secrets_staff_all" ON public.product_secrets;
CREATE POLICY "product_secrets_staff_all" ON public.product_secrets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  );
