-- Categories / themes / site_settings writes: owner only.
-- set_user_role: owner only (admins may view users but not change roles).

CREATE OR REPLACE FUNCTION public.set_user_role(target_user uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  target_role text;
BEGIN
  IF new_role NOT IN ('owner','admin','moderator','seller','buyer','member') THEN
    RAISE EXCEPTION 'Invalid role %', new_role;
  END IF;

  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can change roles';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = target_user;
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user;
END;
$$;

DROP POLICY IF EXISTS "categories_insert_staff" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_admin_mod" ON public.categories;
CREATE POLICY "categories_insert_owner" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'owner');

DROP POLICY IF EXISTS "categories_update_staff" ON public.categories;
DROP POLICY IF EXISTS "categories_update_admin_mod" ON public.categories;
CREATE POLICY "categories_update_owner" ON public.categories
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'owner')
  WITH CHECK (public.current_user_role() = 'owner');

DROP POLICY IF EXISTS "categories_delete_staff" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
CREATE POLICY "categories_delete_owner" ON public.categories
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'owner');

DROP POLICY IF EXISTS "themes_insert_admin" ON public.themes;
CREATE POLICY "themes_insert_owner" ON public.themes
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'owner');

DROP POLICY IF EXISTS "themes_update_admin" ON public.themes;
CREATE POLICY "themes_update_owner" ON public.themes
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'owner')
  WITH CHECK (public.current_user_role() = 'owner');

DROP POLICY IF EXISTS "themes_delete_admin" ON public.themes;
CREATE POLICY "themes_delete_owner" ON public.themes
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'owner');

DROP POLICY IF EXISTS "site_settings_insert_staff" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_insert_admin" ON public.site_settings;
CREATE POLICY "site_settings_insert_owner" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'owner');

DROP POLICY IF EXISTS "site_settings_update_staff" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
CREATE POLICY "site_settings_update_owner" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'owner')
  WITH CHECK (public.current_user_role() = 'owner');

DROP POLICY IF EXISTS "site_settings_delete_staff" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_delete_admin" ON public.site_settings;
CREATE POLICY "site_settings_delete_owner" ON public.site_settings
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'owner');
