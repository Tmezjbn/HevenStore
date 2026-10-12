-- Staff notes move off public.profiles.
-- profiles SELECT RLS = own row OR staff, so every user could read the notes
-- staff wrote about them (REST: select=staff_notes on their own row).
-- Notes now live in profile_staff_notes, readable by staff only, writable only
-- through set_staff_notes. The old column is emptied and pinned NULL (kept so
-- existing guard triggers that reference it keep compiling).
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.profile_staff_notes (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text NOT NULL CHECK (char_length(notes) BETWEEN 1 AND 2000),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_staff_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_staff_notes_select_staff" ON public.profile_staff_notes;
CREATE POLICY "profile_staff_notes_select_staff" ON public.profile_staff_notes
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('owner', 'admin', 'moderator', 'support'));

REVOKE ALL ON public.profile_staff_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profile_staff_notes TO authenticated;

-- Move existing notes (trimmed, capped).
INSERT INTO public.profile_staff_notes (user_id, notes, updated_at)
SELECT p.id, left(btrim(p.staff_notes), 2000), now()
FROM public.profiles p
WHERE NULLIF(btrim(COALESCE(p.staff_notes, '')), '') IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.profiles SET staff_notes = NULL WHERE staff_notes IS NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_staff_notes_retired;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_staff_notes_retired CHECK (staff_notes IS NULL);

CREATE OR REPLACE FUNCTION public.set_staff_notes(p_user_id uuid, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
  v_target_role text;
  v_notes text := NULLIF(btrim(COALESCE(p_notes, '')), '');
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = uid;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF v_notes IS NOT NULL AND char_length(v_notes) > 2000 THEN
    RAISE EXCEPTION 'Notes too long';
  END IF;
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_target_role = 'owner' AND v_role <> 'owner' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_notes IS NULL THEN
    DELETE FROM public.profile_staff_notes WHERE user_id = p_user_id;
  ELSE
    INSERT INTO public.profile_staff_notes (user_id, notes, updated_by, updated_at)
    VALUES (p_user_id, v_notes, uid, now())
    ON CONFLICT (user_id) DO UPDATE
      SET notes = EXCLUDED.notes, updated_by = EXCLUDED.updated_by, updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_staff_notes(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_staff_notes(uuid, text) TO authenticated;
