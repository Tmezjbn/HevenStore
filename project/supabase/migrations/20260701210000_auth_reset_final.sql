-- ============================================================
-- AUTHORITATIVE AUTH RESET. Run ONLY this file. Ignore all earlier signup patches.
-- ============================================================
-- Why: "Database error saving new user" (500) persisted through every trigger
-- variant, including a fault-tolerant EXCEPTION WHEN OTHERS trigger that cannot
-- throw. Conclusion: the custom trigger on auth.users must be removed entirely so
-- Supabase Auth inserts a user with ZERO custom code in the path. Profiles are
-- then created 100% client-side (upsert) with an RPC fallback.
-- This migration is idempotent and safe to re-run.

-- 1) Remove ALL custom objects that touched the signup path.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2) Ensure profiles has sane, non-blocking defaults (no NOT NULL on optional cols).
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;

-- 3) RLS policies: the signed-in user can insert / read / update THEIR OWN row.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4) Client fallback RPC (used after signup and on first login).
CREATE OR REPLACE FUNCTION public.ensure_own_profile(p_full_name text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (auth.uid(), v_email, COALESCE(NULLIF(p_full_name, ''), ''))
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    updated_at = now();
END;
$$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.ensure_own_profile(text) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
