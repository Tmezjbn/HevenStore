-- Adds the owner/admin-curated "featured" flag used by the homepage
-- FEATURED PRODUCTS section. Run in the Supabase SQL editor. Idempotent.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_featured
  ON public.products(is_featured) WHERE is_featured;
