-- Round-2 audit: replace the forgeable full_name='deleted' anonymize marker
-- with a real column.
--
-- 1) profiles.anonymized_at timestamptz — set by claim_due_account_deletions
--    when identity is wiped. hard-delete-user, admin_send_notification, and
--    the staff pickers check this column instead of the display name
--    (a user could self-write full_name='deleted' to fake the marker).
-- 2) claim_due_account_deletions re-emitted: the UPDATE only wipes rows with
--    anonymized_at IS NULL (no re-stamp on retry), but the function still
--    returns every due id — a row whose deleteUser call failed stays
--    anonymized+scheduled and must be re-claimed so the edge fn retries the
--    auth delete instead of orphaning the auth user forever.
-- 3) guard_profile_account_status + force_member_role_on_insert re-emit the
--    latest bodies + anonymized_at protection (non-staff writes can't set or
--    clear it; inserts can't carry it).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, backfill keyed on the old marker,
-- CREATE OR REPLACE for all functions.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

-- Backfill: rows already wiped by the old marker keep their wipe timestamp.
UPDATE public.profiles
SET anonymized_at = COALESCE(updated_at, created_at, now())
WHERE full_name = 'deleted'
  AND anonymized_at IS NULL;

-- ------------------------------------------------------------
-- claim_due_account_deletions: stamp anonymized_at, skip done rows.
-- Re-emits the profile_usernames body verbatim + the two changes.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_due_account_deletions()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  WITH due AS (
    SELECT id
    FROM public.profiles
    WHERE deletion_scheduled_at IS NOT NULL
      AND deletion_scheduled_at <= now()
      -- Never auto-purge the sole owner path by role accident: still honor schedule,
      -- but skip active owners who somehow got a schedule without approve flow.
      AND role IS DISTINCT FROM 'owner'
    FOR UPDATE SKIP LOCKED
  ),
  upd AS (
    UPDATE public.profiles p
    SET
      full_name = 'deleted',
      email = null,
      avatar_url = null,
      username = null,
      is_active = false,
      anonymized_at = now(),
      updated_at = now()
    FROM due
    WHERE p.id = due.id
      -- Already anonymized rows keep deletion_scheduled_at — don't re-wipe,
      -- but DO still return them below so deleteUser failures get retried.
      AND p.anonymized_at IS NULL
    RETURNING p.id
  )
  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO v_ids FROM due;

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_account_deletions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_due_account_deletions() TO service_role;

-- ------------------------------------------------------------
-- admin_send_notification: exclude anonymized accounts via the column.
-- Re-emits the admin_send_notification body verbatim + the filter change.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_send_notification(
  p_title text,
  p_body text DEFAULT NULL,
  p_title_ar text DEFAULT NULL,
  p_body_ar text DEFAULT NULL,
  p_type text DEFAULT 'info',
  p_user_ids uuid[] DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_type text;
  v_title text;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_title := nullif(btrim(p_title), '');
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'TITLE_REQUIRED';
  END IF;

  v_type := coalesce(nullif(btrim(p_type), ''), 'info');
  IF v_type NOT IN ('info', 'order', 'review', 'discount', 'message', 'system') THEN
    RAISE EXCEPTION 'INVALID_TYPE';
  END IF;

  IF p_user_ids IS NOT NULL AND cardinality(p_user_ids) > 500 THEN
    RAISE EXCEPTION 'TOO_MANY_TARGETS';
  END IF;

  IF p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    INSERT INTO public.notifications (user_id, type, title, title_ar, body, body_ar)
    SELECT p.id, v_type, v_title, nullif(btrim(p_title_ar), ''), nullif(btrim(p_body), ''), nullif(btrim(p_body_ar), '')
    FROM public.profiles p
    WHERE p.anonymized_at IS NULL;
  ELSE
    INSERT INTO public.notifications (user_id, type, title, title_ar, body, body_ar)
    SELECT DISTINCT p.id, v_type, v_title, nullif(btrim(p_title_ar), ''), nullif(btrim(p_body), ''), nullif(btrim(p_body_ar), '')
    FROM public.profiles p
    WHERE p.id = ANY (p_user_ids)
      AND p.anonymized_at IS NULL;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_send_notification(text, text, text, text, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(text, text, text, text, text, uuid[]) TO authenticated;

-- ------------------------------------------------------------
-- guard_profile_account_status: anonymized_at is staff/system-owned —
-- non-staff writes restore it (can't fake or clear the marker).
-- Re-emits the seller_listing_review body verbatim + one restore line.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Service role / SQL editor (no JWT): allow staff RPCs to set status.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Privileged RPC paths mark the transaction (expired-disable self-clear).
  IF current_setting('app.profile_guard_bypass', true) = '1' THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IN ('owner', 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.is_active := OLD.is_active;
  NEW.deletion_scheduled_at := OLD.deletion_scheduled_at;
  NEW.disabled_until := OLD.disabled_until;
  NEW.staff_notes := OLD.staff_notes;
  NEW.listing_review_override := OLD.listing_review_override;
  NEW.anonymized_at := OLD.anonymized_at;
  IF NEW.id = auth.uid() THEN
    NEW.support_standing := OLD.support_standing;
  END IF;
  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    NEW.username_changed_at := OLD.username_changed_at;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- restore_account: an anonymized profile has no identity left to restore
-- (email/username wiped) — refuse instead of resurrecting a ghost row that
-- stays invisible to pickers while looking active.
-- Re-emits the admin_user_access body verbatim + the guard.
-- ------------------------------------------------------------
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

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND anonymized_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'ALREADY_ANONYMIZED';
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

REVOKE ALL ON FUNCTION public.restore_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_account(uuid) TO authenticated;

-- ------------------------------------------------------------
-- force_member_role_on_insert: a client INSERT can't carry a forged
-- anonymized_at either. Re-emits the seller_listing_review body
-- verbatim + the one defaulting line.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.force_member_role_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.role := 'member';
    NEW.listing_review_override := 'default';
    NEW.anonymized_at := null;
  END IF;
  RETURN NEW;
END;
$$;
