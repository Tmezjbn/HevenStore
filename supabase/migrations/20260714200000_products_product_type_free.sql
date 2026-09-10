-- Allow custom product_type values beyond account/gift_card/code/other.
-- Catalog labels for customs live in site_settings.product_types_json (app).

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_product_type_check;
