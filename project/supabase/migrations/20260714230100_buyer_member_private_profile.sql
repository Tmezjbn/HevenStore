-- Buyer/member: no public profile card; no avatar_url persistence.
DROP FUNCTION IF EXISTS public.get_seller_public(text);
CREATE OR REPLACE FUNCTION public.get_seller_public(p_key text)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  username text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.username, p.role::text
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.role IN ('owner', 'admin', 'moderator', 'seller')
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

-- Strip / block avatar for buyer & member (UI + storage already staff-only).
CREATE OR REPLACE FUNCTION public.profiles_avatar_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('buyer', 'member') THEN
    NEW.avatar_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_avatar_role_guard ON public.profiles;
CREATE TRIGGER profiles_avatar_role_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_avatar_role_guard();

-- Clear any leftover buyer/member avatars
UPDATE public.profiles
SET avatar_url = NULL
WHERE role IN ('buyer', 'member') AND avatar_url IS NOT NULL;
