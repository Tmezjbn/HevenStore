-- Pin search_path on username cooldown trigger; catalog composite index.
ALTER FUNCTION public.enforce_username_change_cooldown() SET search_path = public;

CREATE INDEX IF NOT EXISTS products_status_product_type_idx
  ON public.products (status, product_type);
