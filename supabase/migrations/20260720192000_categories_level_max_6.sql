-- Allow category nesting up to 6 levels (was 3).

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_level_check;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_level_check CHECK (level >= 1 AND level <= 6);
