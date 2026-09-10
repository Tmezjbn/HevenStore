-- ============================================================
-- AVATARS storage bucket.
-- Everyone can view avatars (public bucket). Only staff roles
-- (owner/admin/moderator/seller) may upload/replace/delete, and
-- only inside their own folder: avatars/{their-user-id}/...
-- Members/buyers keep the first-letter avatar.
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','image/gif'];

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_staff_insert" ON storage.objects;
CREATE POLICY "avatars_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','moderator','seller')
    )
  );

DROP POLICY IF EXISTS "avatars_staff_update" ON storage.objects;
CREATE POLICY "avatars_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','moderator','seller')
    )
  );

DROP POLICY IF EXISTS "avatars_staff_delete" ON storage.objects;
CREATE POLICY "avatars_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','moderator','seller')
    )
  );
