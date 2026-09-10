-- Expose role on public seller card (display only).
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
