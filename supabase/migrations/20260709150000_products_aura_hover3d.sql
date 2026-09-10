-- Product storefront effects for Website Builder.
-- aura_style: none | default | dual | rainbow | holo | gold | silver | glow
-- hover_3d: daisyUI hover-3d tilt on product image

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS aura_style text NOT NULL DEFAULT 'none'
    CHECK (aura_style IN ('none', 'default', 'dual', 'rainbow', 'holo', 'gold', 'silver', 'glow'));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hover_3d boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_aura_style
  ON public.products(aura_style) WHERE aura_style <> 'none';
