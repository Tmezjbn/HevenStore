-- Reliable seller sales ledger (avoids fragile nested PostgREST filters).

CREATE OR REPLACE FUNCTION public.list_seller_sales(
  p_limit int DEFAULT 40,
  p_offset int DEFAULT 0,
  p_q text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  created_at timestamptz,
  status text,
  line_total numeric,
  quantity int,
  product_id uuid,
  product_name text,
  product_name_ar text,
  product_slug text,
  thumbnail_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim int := GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
  off int := GREATEST(0, COALESCE(p_offset, 0));
  q text := NULLIF(btrim(COALESCE(p_q, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  IF public.current_user_role() IS DISTINCT FROM 'seller' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.created_at,
    o.status::text,
    oi.total_price,
    oi.quantity,
    p.id,
    p.name,
    p.name_ar,
    p.slug,
    p.thumbnail_url
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  WHERE p.seller_id = auth.uid()
    AND o.status = 'paid'
    AND (
      q IS NULL
      OR o.id::text ILIKE '%' || q || '%'
      OR p.name ILIKE '%' || q || '%'
      OR COALESCE(p.name_ar, '') ILIKE '%' || q || '%'
    )
  ORDER BY o.created_at DESC, oi.id
  LIMIT lim OFFSET off;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_seller_sales(int, int, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_seller_sales(int, int, text) FROM anon;

CREATE OR REPLACE FUNCTION public.count_seller_sales(p_q text DEFAULT NULL)
RETURNS TABLE (sale_count bigint, revenue numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := NULLIF(btrim(COALESCE(p_q, '')), '');
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() IS DISTINCT FROM 'seller' THEN
    sale_count := 0;
    revenue := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    count(*)::bigint,
    COALESCE(sum(oi.total_price), 0)::numeric
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  WHERE p.seller_id = auth.uid()
    AND o.status = 'paid'
    AND (
      q IS NULL
      OR o.id::text ILIKE '%' || q || '%'
      OR p.name ILIKE '%' || q || '%'
      OR COALESCE(p.name_ar, '') ILIKE '%' || q || '%'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_seller_sales(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.count_seller_sales(text) FROM anon;
