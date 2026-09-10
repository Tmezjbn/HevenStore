-- Up to 3 showcase embeds × (with ads / without ads) + default slot/variant.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_embeds jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.video_embeds IS
  'Showcase embeds: { slots: [{withAds,withoutAds}×3], defaultSlot, defaultVariant }. video_url stays denormalized default.';
