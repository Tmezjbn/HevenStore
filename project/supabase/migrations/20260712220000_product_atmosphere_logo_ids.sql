-- Optional per-product atmosphere game-icon override (null/empty = site default).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS atmosphere_logo_ids text[];

COMMENT ON COLUMN public.products.atmosphere_logo_ids IS
  'Catalog logo ids for PDP atmosphere; null/empty uses site_settings default logoIds.';
