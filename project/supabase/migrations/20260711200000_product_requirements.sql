-- Public product requirements (label/value pairs) shown on the storefront.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS requirements jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.requirements IS
  'Public [{label, value}, …] specs (e.g. OS). Not fulfillment secrets.';
