-- ============================================================
-- SECURE ROLE MANAGEMENT
-- 1) Block self role escalation: a user cannot change their own
--    (or anyone's) role via a direct profiles UPDATE unless they
--    are already admin/owner.
-- 2) set_user_role(): the only sanctioned way to change roles from
--    the app. Caller must be admin/owner. Owner role can only be
--    granted/revoked by an owner.
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================

-- Helper: role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 1) Trigger: reject role changes made by non-admins (covers the
--    "update own profile" RLS path, closing self-escalation).
CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- No JWT (service role / SQL editor / triggers like buyer promotion) is allowed.
    IF auth.uid() IS NOT NULL THEN
      SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
      IF caller_role NOT IN ('owner','admin') THEN
        RAISE EXCEPTION 'Only admins can change roles';
      END IF;
      IF (NEW.role = 'owner' OR OLD.role = 'owner') AND caller_role <> 'owner' THEN
        RAISE EXCEPTION 'Only an owner can grant or revoke the owner role';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_role_change ON public.profiles;
CREATE TRIGGER guard_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_role_change();

-- 2) RPC used by the app's Dashboard > Users page.
CREATE OR REPLACE FUNCTION public.set_user_role(target_user uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  target_role text;
BEGIN
  IF new_role NOT IN ('owner','admin','moderator','seller','buyer','member') THEN
    RAISE EXCEPTION 'Invalid role %', new_role;
  END IF;

  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = target_user;
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF (new_role = 'owner' OR target_role = 'owner') AND caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can grant or revoke the owner role';
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM anon;

-- 3) Bootstrap your first owner (run once, replace the email):
--    UPDATE public.profiles SET role = 'owner' WHERE email = 'you@example.com';
