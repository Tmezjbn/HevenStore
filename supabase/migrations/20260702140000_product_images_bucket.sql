-- ============================================================
-- PRODUCT-IMAGES storage bucket.
-- Public read; owner/admin/moderator/seller can upload/replace/delete.
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 4194304, ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 4194304,
    allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','image/gif'];

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_staff_insert" ON storage.objects;
CREATE POLICY "product_images_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','moderator','seller')
    )
  );

DROP POLICY IF EXISTS "product_images_staff_update" ON storage.objects;
CREATE POLICY "product_images_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','moderator','seller')
    )
  );

DROP POLICY IF EXISTS "product_images_staff_delete" ON storage.objects;
CREATE POLICY "product_images_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','moderator','seller')
    )
  );
