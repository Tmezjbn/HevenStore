-- Owner: immediately soft-purge a user already scheduled for deletion.
-- Sets deletion_scheduled_at = now() so the next purge cron hard-deletes auth.users.

CREATE OR REPLACE FUNCTION public.admin_purge_user_now(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_target public.profiles%ROWTYPE;
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

  SELECT * INTO v_target FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_target.role = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_DELETE_OWNER';
  END IF;
  IF v_target.deletion_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'NOT_SCHEDULED';
  END IF;

  UPDATE public.profiles
  SET
    full_name = 'deleted',
    email = null,
    avatar_url = null,
    username = null,
    is_active = false,
    deletion_scheduled_at = now(),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_purge_user_now(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_user_now(uuid) TO authenticated;
