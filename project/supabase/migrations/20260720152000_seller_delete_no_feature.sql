-- Sellers may delete products on their stall (seller_id).
-- Sellers cannot toggle is_featured (homepage feature is staff-only).

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (
    (
      public.current_user_role() = 'seller'
      AND seller_id = auth.uid()
    )
    OR CASE
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

CREATE OR REPLACE FUNCTION public.products_seller_feature_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() = 'seller' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_featured := false;
    ELSIF NEW.is_featured IS DISTINCT FROM OLD.is_featured THEN
      NEW.is_featured := OLD.is_featured;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_seller_feature_guard ON public.products;
CREATE TRIGGER products_seller_feature_guard
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_seller_feature_guard();
