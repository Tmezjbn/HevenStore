-- Per-category "aura dual" highlight toggle, managed by the owner from
-- the dashboard Categories page. Idempotent.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS aura_dual boolean NOT NULL DEFAULT false;
