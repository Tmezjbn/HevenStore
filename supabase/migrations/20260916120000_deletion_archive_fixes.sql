-- Round-1 audit: account-deletion archive fixes.
-- 1) admin_purge_user_now anonymized the profile in the same statement that
--    armed deletion — the next purge run then archived an already-wiped
--    profile and identity history was lost forever. It now only arms the
--    schedule; the purge cron archives identity BEFORE
--    claim_due_account_deletions() anonymizes.
-- 2) account_deletion_history.former_user_id had no uniqueness — concurrent
--    archivers could double-insert the same user.

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

  -- Arm only. Identity stays intact so the purge cron can archive it;
  -- claim_due_account_deletions() performs the anonymize step.
  UPDATE public.profiles
  SET
    is_active = false,
    deletion_scheduled_at = now(),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_purge_user_now(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_purge_user_now(uuid) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_history_former_user_uidx
  ON public.account_deletion_history (former_user_id);
