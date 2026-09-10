-- Storefront product-card body FX (matrix / logo / scan / pulse).
-- Shape: { "style": "none"|"matrix"|"logo"|"scan"|"pulse", "color"?: "#rrggbb", "logoId"?: "fortnite" }

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS card_fx jsonb NOT NULL DEFAULT '{"style":"none"}'::jsonb;

COMMENT ON COLUMN public.products.card_fx IS
  'Card-body FX behind title/meta/price: style none|matrix|logo|scan|pulse; optional color + logoId.';
