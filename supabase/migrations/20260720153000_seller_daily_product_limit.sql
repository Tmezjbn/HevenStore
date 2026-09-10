-- Owner-adjustable daily cap on how many products a seller may create (UTC day).
-- Default 3. Setting 0 = unlimited.

INSERT INTO public.site_settings (key, value)
VALUES ('seller_daily_product_limit', '3')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seller_daily_product_limit()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    LEAST(
      100,
      COALESCE(
        (
          SELECT NULLIF(regexp_replace(trim(value), '[^0-9]', '', 'g'), '')::integer
          FROM public.site_settings
          WHERE key = 'seller_daily_product_limit'
          LIMIT 1
        ),
        3
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.seller_daily_product_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_daily_product_limit() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.products_seller_daily_limit_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim integer;
  used integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.current_user_role() IS DISTINCT FROM 'seller' THEN
    RETURN NEW;
  END IF;

  lim := public.seller_daily_product_limit();
  IF lim = 0 THEN
    RETURN NEW; -- unlimited
  END IF;

  SELECT count(*)::integer INTO used
  FROM public.products p
  WHERE p.seller_id = auth.uid()
    AND p.created_at >= (timezone('utc', now()))::date;

  IF used >= lim THEN
    RAISE EXCEPTION 'seller_daily_product_limit'
      USING ERRCODE = 'P0001',
            HINT = format('limit=%s used=%s', lim, used);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_seller_daily_limit_guard ON public.products;
CREATE TRIGGER products_seller_daily_limit_guard
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_seller_daily_limit_guard();
