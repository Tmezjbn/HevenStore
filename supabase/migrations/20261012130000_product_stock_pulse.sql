-- Product-list stock pulse computed server-side.
-- The Admin/Owner product pages used to SELECT every product row and sum
-- in the browser; PostgREST caps responses at 1000 rows, so totals were
-- wrong past 1000 products (and the payload grew with the catalog).
-- Idempotent: CREATE OR REPLACE + REVOKE/GRANT.

CREATE OR REPLACE FUNCTION public.product_stock_pulse()
RETURNS TABLE (
  units bigint,
  oos bigint,
  listings bigint,
  pending_review bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(sum(GREATEST(COALESCE(p.stock, 0), 0)), 0)::bigint,
    count(*) FILTER (WHERE p.status = 'active' AND COALESCE(p.stock, 0) <= 0)::bigint,
    count(*)::bigint,
    count(*) FILTER (WHERE p.status = 'pending_review')::bigint
  FROM public.products p;
END;
$$;

REVOKE ALL ON FUNCTION public.product_stock_pulse() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_stock_pulse() TO authenticated;
