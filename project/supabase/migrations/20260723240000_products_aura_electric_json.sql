-- Per-product React Bits Electric Border knobs (speed / chaos / thickness).
-- Color stays on products.aura_color; empty object = storefront defaults.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS aura_electric_json jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.aura_electric_json IS
  'Electric aura tune: { speed, chaos, thickness }. Empty {} = defaults. Color via aura_color.';
