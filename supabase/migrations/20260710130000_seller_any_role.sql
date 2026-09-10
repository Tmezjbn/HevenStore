-- Product "seller" can be any profile (attribution only — does not change role).
CREATE OR REPLACE FUNCTION public.get_seller_public(p_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = p_id
    AND p.is_active = true;
$$;
