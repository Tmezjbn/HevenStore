-- Shared Product Editor media Resources (embeds + typed URLs).
-- Staff who can edit products may read all; insert own; delete own (owner/admin any).

CREATE TABLE IF NOT EXISTS public.media_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('embed_video', 'embed_image', 'image', 'video_file')),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_resources_url_unique UNIQUE (url)
);

CREATE INDEX IF NOT EXISTS idx_media_resources_created_at
  ON public.media_resources (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_resources_kind
  ON public.media_resources (kind);

ALTER TABLE public.media_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_resources_select_editors" ON public.media_resources;
CREATE POLICY "media_resources_select_editors" ON public.media_resources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'seller')
    )
  );

DROP POLICY IF EXISTS "media_resources_insert_own" ON public.media_resources;
CREATE POLICY "media_resources_insert_own" ON public.media_resources
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'seller')
    )
  );

DROP POLICY IF EXISTS "media_resources_delete" ON public.media_resources;
CREATE POLICY "media_resources_delete" ON public.media_resources
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
