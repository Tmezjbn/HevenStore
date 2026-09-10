-- Safe display names for review authors (profiles SELECT is own/staff only).
-- Public staff/sellers: name + avatar. Buyers/members: id only (UI shows "Buyer").
CREATE OR REPLACE FUNCTION public.get_review_authors_public(p_ids uuid[])
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
  SELECT
    p.id,
    CASE
      WHEN p.role IN ('owner', 'admin', 'moderator', 'seller')
        THEN p.full_name
      ELSE NULL
    END,
    CASE
      WHEN p.role IN ('owner', 'admin', 'moderator', 'seller')
        THEN p.avatar_url
      ELSE NULL
    END,
    CASE
      WHEN p.role IN ('owner', 'admin', 'moderator', 'seller')
        THEN p.username
      ELSE NULL
    END,
    p.role::text
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.id = ANY (p_ids);
$$;

REVOKE ALL ON FUNCTION public.get_review_authors_public(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review_authors_public(uuid[]) TO anon, authenticated;
