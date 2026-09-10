-- Public seller card (no email). Used on product detail + /seller/:id
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
    AND p.role = 'seller'
    AND p.is_active = true
    AND p.show_seller_name = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_public(uuid) TO anon, authenticated;

-- Sellers cannot turn off their own profile show_seller_name (owner/admin can).
CREATE OR REPLACE FUNCTION public.profiles_seller_visibility_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  IF NEW.show_seller_name IS NOT DISTINCT FROM OLD.show_seller_name THEN
    RETURN NEW;
  END IF;
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
    NEW.show_seller_name := OLD.show_seller_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_seller_visibility_guard ON public.profiles;
CREATE TRIGGER profiles_seller_visibility_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_seller_visibility_guard();

-- Sellers cannot hide seller name on their own products (owner/admin/moderator can).
CREATE OR REPLACE FUNCTION public.products_seller_visibility_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role = 'seller' THEN
    NEW.show_seller_name := true;
    NEW.seller_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_seller_visibility_guard ON public.products;
CREATE TRIGGER products_seller_visibility_guard
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_seller_visibility_guard();
