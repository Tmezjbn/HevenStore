-- Owner-adjustable grace days before soft-purge (default 30).
-- Daily cleanup: enable pg_cron then run supabase/cron/purge_due_account_deletions.sql

INSERT INTO public.site_settings (key, value)
VALUES ('account_deletion_grace_days', '30')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.review_account_deletion(p_request_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_req public.account_deletion_requests%ROWTYPE;
  v_grace int := 30;
  v_raw text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_req FROM public.account_deletion_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF p_approve THEN
    SELECT value INTO v_raw
    FROM public.site_settings
    WHERE key = 'account_deletion_grace_days';
    IF v_raw IS NOT NULL AND v_raw ~ '^[0-9]+$' THEN
      -- Clamp 1..3650 so bad UI input cannot schedule forever / immediate purge.
      v_grace := GREATEST(1, LEAST(3650, v_raw::int));
    END IF;

    UPDATE public.account_deletion_requests
    SET status = 'approved', reviewed_at = now(), reviewed_by = v_uid
    WHERE id = p_request_id;

    UPDATE public.profiles
    SET is_active = false,
        deletion_scheduled_at = now() + make_interval(days => v_grace),
        updated_at = now()
    WHERE id = v_req.user_id;
  ELSE
    UPDATE public.account_deletion_requests
    SET status = 'rejected', reviewed_at = now(), reviewed_by = v_uid
    WHERE id = p_request_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_account_deletion(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_account_deletion(uuid, boolean) TO authenticated;
