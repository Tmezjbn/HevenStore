-- Add electric aura style (React Bits–inspired CSS border).
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'products'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%aura_style%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.products
  ADD CONSTRAINT products_aura_style_check
  CHECK (aura_style IN (
    'none', 'default', 'dual', 'rainbow', 'holo', 'gold', 'silver', 'glow', 'electric'
  ));
