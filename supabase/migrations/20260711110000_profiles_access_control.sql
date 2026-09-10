-- ============================================================
-- PROFILES ACCESS CONTROL (Phase 2 of audit roadmap)
--
-- 1) Role is locked at INSERT: guard_role_change only covered UPDATE,
--    so a crafted self-insert could claim role='owner' before the
--    legitimate profile row existed. Any client-side insert is forced
--    to 'member' (RLS already restricts inserts to auth.uid() = id;
--    service role / SQL editor have auth.uid() NULL and are untouched).
-- 2) profiles SELECT tightened: own row or staff. Every logged-in user
--    could previously read all emails/roles. Public seller cards keep
--    working via the existing get_seller_public() SECURITY DEFINER RPC,
--    and role checks inside other tables' RLS policies query the
--    caller's own row, which stays readable.
--
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================

-- 1) Force default role on client-side inserts.
CREATE OR REPLACE FUNCTION public.force_member_role_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.role := 'member';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS force_member_role_on_insert ON public.profiles;
CREATE TRIGGER force_member_role_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.force_member_role_on_insert();

-- 2) Own row or staff only. current_user_role() is SECURITY DEFINER
--    (from secure_role_management), which avoids the infinite-recursion
--    error a profiles policy gets when it subqueries profiles directly.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.current_user_role() IN ('owner', 'admin', 'moderator')
  );
