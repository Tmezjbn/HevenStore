-- Owner bulk / targeted in-app notifications.
-- Also fix INSERT policy: owner was missing (only admin/moderator).

DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
CREATE POLICY "notifications_insert_admin" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'admin', 'moderator')
  );

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
    WHERE coalesce(p.full_name, '') IS DISTINCT FROM 'deleted';
  ELSE
    INSERT INTO public.notifications (user_id, type, title, title_ar, body, body_ar)
    SELECT DISTINCT p.id, v_type, v_title, nullif(btrim(p_title_ar), ''), nullif(btrim(p_body), ''), nullif(btrim(p_body_ar), '')
    FROM public.profiles p
    WHERE p.id = ANY (p_user_ids)
      AND coalesce(p.full_name, '') IS DISTINCT FROM 'deleted';
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_send_notification(text, text, text, text, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(text, text, text, text, text, uuid[]) TO authenticated;
