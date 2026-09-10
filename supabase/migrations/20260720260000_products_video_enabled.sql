-- Opt-in showcase video on the storefront. Default off (privacy: third-party embed ads).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_enabled boolean NOT NULL DEFAULT false;

-- Keep existing demos live; new products stay off until staff enables.
UPDATE public.products
SET video_enabled = true
WHERE video_enabled = false
  AND video_url IS NOT NULL
  AND btrim(video_url) <> '';
