-- Usernames: unique public handle for login + /seller/:username
-- Signup still requires email; login accepts email OR username.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Normalize: lowercase [a-z0-9_]{3,24}
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (
    username IS NULL
    OR username ~ '^[a-z0-9_]{3,24}$'
  );

-- Backfill unique usernames for rows missing one
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN
    SELECT id, email FROM public.profiles WHERE username IS NULL
  LOOP
    base := lower(regexp_replace(split_part(coalesce(r.email, r.id::text), '@', 1), '[^a-z0-9_]', '', 'g'));
    IF length(base) < 3 THEN
      base := 'user' || substr(replace(r.id::text, '-', ''), 1, 8);
    END IF;
    IF length(base) > 20 THEN
      base := substr(base, 1, 20);
    END IF;
    candidate := base;
    n := 0;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
      n := n + 1;
      candidate := substr(base, 1, 20) || n::text;
    END LOOP;
    UPDATE public.profiles SET username = candidate WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (username)
  WHERE username IS NOT NULL;

-- Public check: is this handle already taken?
CREATE OR REPLACE FUNCTION public.username_taken(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = lower(trim(p_username))
  );
$$;

REVOKE ALL ON FUNCTION public.username_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.username_taken(text) TO anon, authenticated;

-- Resolve email for password login by email or username (anon-callable).
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_login text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.email IS NOT NULL
    AND (
      lower(p.email) = lower(trim(p_login))
      OR p.username = lower(trim(p_login))
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

-- Seller public by uuid string OR username
DROP FUNCTION IF EXISTS public.get_seller_public(uuid);
CREATE OR REPLACE FUNCTION public.get_seller_public(p_key text)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.username
  FROM public.profiles p
  WHERE p.is_active = true
    AND (
      p.username = lower(trim(p_key))
      OR (
        trim(p_key) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND p.id = trim(p_key)::uuid
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_seller_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_public(text) TO anon, authenticated;

-- Profile ensure: optional username on first create / fill-if-null
DROP FUNCTION IF EXISTS public.ensure_own_profile(text);
CREATE OR REPLACE FUNCTION public.ensure_own_profile(
  p_full_name text DEFAULT '',
  p_username text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  v_user := NULLIF(lower(trim(coalesce(p_username, ''))), '');
  IF v_user IS NOT NULL AND v_user !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION 'invalid_username';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    auth.uid(),
    v_email,
    COALESCE(NULLIF(p_full_name, ''), ''),
    v_user
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_own_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_own_profile(text, text) TO authenticated;

-- Soft-delete / purge clears username so slug can be reused
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
      updated_at = now()
    FROM due
    WHERE p.id = due.id
    RETURNING p.id
  )
  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO v_ids FROM upd;

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_account_deletions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_due_account_deletions() TO service_role;
