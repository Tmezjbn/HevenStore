-- ============================================================
-- Mirror profiles.role into auth.users.raw_app_meta_data.role
-- so the role is visible in Dashboard > Authentication > Users
-- (open a user -> "App Metadata" / raw_app_meta_data JSON).
-- Editing still happens in public.profiles (Table Editor or the
-- app's own Dashboard > Users page); this trigger keeps auth in sync.
-- Idempotent, safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_role_to_auth_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_sync ON public.profiles;
CREATE TRIGGER on_profile_role_sync
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_auth_metadata();

-- Backfill existing users once
UPDATE auth.users u
SET raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE p.id = u.id;
