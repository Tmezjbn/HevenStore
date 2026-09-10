-- Optional hex tint for product card aura (daisyUI currentColor / custom override).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS aura_color text;

COMMENT ON COLUMN public.products.aura_color IS
  'Optional #RRGGBB tint for storefront aura; null = preset palette colors.';
