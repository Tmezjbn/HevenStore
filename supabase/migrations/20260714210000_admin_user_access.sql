-- Admin disable (temp/indefinite) + schedule permanent deletion from Users page.
-- Temp: is_active=false + disabled_until; expired clears via clear_expired_user_disable().
-- Permanent: same path as approved deletion requests (grace days → purge cron).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled_until timestamptz;

COMMENT ON COLUMN public.profiles.disabled_until IS
  'Temp disable end. NULL + is_active=false = indefinite. Cleared on enable / expiry.';

CREATE OR REPLACE FUNCTION public.guard_profile_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IN ('owner', 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.is_active := OLD.is_active;
  NEW.deletion_scheduled_at := OLD.deletion_scheduled_at;
  NEW.disabled_until := OLD.disabled_until;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_expired_user_disable()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET is_active = true,
      disabled_until = null,
      updated_at = now()
  WHERE id = v_uid
    AND is_active = false
    AND disabled_until IS NOT NULL
    AND disabled_until <= now()
    AND deletion_scheduled_at IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_expired_user_disable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_expired_user_disable() TO authenticated;

-- p_hours: NULL or <=0 = indefinite; 1..8760 = temporary hours
CREATE OR REPLACE FUNCTION public.admin_disable_user(p_user_id uuid, p_hours int DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_target_role text;
  v_hours int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_user_id IS NULL OR p_user_id = v_uid THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_DISABLE_OWNER';
  END IF;
  IF v_role = 'admin' AND v_target_role = 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_hours := p_hours;
  IF v_hours IS NOT NULL AND v_hours > 0 THEN
    v_hours := GREATEST(1, LEAST(8760, v_hours));
    UPDATE public.profiles
    SET is_active = false,
        disabled_until = now() + make_interval(hours => v_hours),
        updated_at = now()
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET is_active = false,
        disabled_until = null,
        updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_disable_user(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_disable_user(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_enable_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_target_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_target_role = 'owner' AND v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.profiles
  SET is_active = true,
      disabled_until = null,
      updated_at = now()
  WHERE id = p_user_id
    AND deletion_scheduled_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND_OR_SCHEDULED';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_enable_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_enable_user(uuid) TO authenticated;

-- Owner-only: schedule permanent purge (grace from site_settings)
CREATE OR REPLACE FUNCTION public.admin_schedule_user_deletion(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_target_role text;
  v_grace int := 30;
  v_raw text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_user_id IS NULL OR p_user_id = v_uid THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_DELETE_OWNER';
  END IF;

  SELECT value INTO v_raw
  FROM public.site_settings
  WHERE key = 'account_deletion_grace_days';
  IF v_raw IS NOT NULL AND v_raw ~ '^[0-9]+$' THEN
    v_grace := GREATEST(1, LEAST(3650, v_raw::int));
  END IF;

  UPDATE public.profiles
  SET is_active = false,
      disabled_until = null,
      deletion_scheduled_at = now() + make_interval(days => v_grace),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_schedule_user_deletion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_schedule_user_deletion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.profiles
  SET is_active = true,
      deletion_scheduled_at = null,
      disabled_until = null,
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE public.account_deletion_requests
  SET status = 'cancelled', reviewed_at = now(), reviewed_by = v_uid
  WHERE user_id = p_user_id AND status IN ('pending', 'approved');
END;
$$;
