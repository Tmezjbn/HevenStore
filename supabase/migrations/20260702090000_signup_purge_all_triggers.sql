-- ============================================================
-- SIGNUP HARD RESET v2 — run this ONE file in the Supabase SQL editor.
-- ============================================================
-- The previous reset dropped the trigger by its known name
-- (on_auth_user_created). If any OTHER custom trigger exists on
-- auth.users (created manually, by an older migration run, or with a
-- different name), signup still fails with
-- "Database error saving new user". This migration finds and drops
-- EVERY custom (non-internal) trigger on auth.users dynamically, so
-- no name can survive. It also re-asserts the client-side profile
-- path. Idempotent; safe to re-run.

-- 1) Drop ALL custom triggers on auth.users, whatever they are named.
DO $$
DECLARE
  trg record;
BEGIN
  FOR trg IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trg.tgname);
    RAISE NOTICE 'Dropped trigger % on auth.users', trg.tgname;
  END LOOP;
END $$;

-- 2) Drop known trigger functions left behind.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3) Profiles: optional columns must not block inserts.
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;

-- 4) RLS: signed-in user can insert/read/update their own row.
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

-- 5) Client fallback RPC (used after signup and on first login).
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

-- 6) VERIFY (result must be ZERO rows — if any row appears, signup is
--    still at risk; copy the name to the developer):
SELECT tgname AS remaining_custom_trigger
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND NOT tgisinternal;
