-- Batch public seller lookup (kills N+1 get_seller_public per catalog card).
-- Same visibility rules as get_seller_public: active staff/seller roles only.
CREATE OR REPLACE FUNCTION public.get_sellers_public(p_ids uuid[])
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
    AND p.id = ANY (p_ids);
$$;

REVOKE ALL ON FUNCTION public.get_sellers_public(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sellers_public(uuid[]) TO anon, authenticated;
