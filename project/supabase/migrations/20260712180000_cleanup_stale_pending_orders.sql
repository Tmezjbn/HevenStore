-- Delete abandoned pending checkouts older than N days (default 7).
-- order_items cascade; coupon_usages.order_id is ON DELETE SET NULL.
-- Run via service role / pg_cron — not granted to authenticated.

CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_orders(p_older_than interval DEFAULT interval '7 days')
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n int := 0;
BEGIN
  IF p_older_than < interval '1 day' THEN
    RAISE EXCEPTION 'MIN_AGE_1_DAY';
  END IF;

  DELETE FROM public.orders
  WHERE status = 'pending'
    AND created_at < now() - p_older_than;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_stale_pending_orders(interval) FROM PUBLIC;
-- Not granted to authenticated — cron / service_role only.
