-- Per-product showcase playback. Defaults: autoplay on, volume 25%.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_autoplay boolean NOT NULL DEFAULT true;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_volume smallint NOT NULL DEFAULT 25
    CHECK (video_volume >= 0 AND video_volume <= 100);
