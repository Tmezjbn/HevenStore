-- Username change cooldown (anti-spam / seller-URL churn).
-- First change free when username_changed_at IS NULL; then 14 days between renames.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_username_change_cooldown()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  IF OLD.username_changed_at IS NOT NULL
     AND OLD.username_changed_at > now() - interval '14 days' THEN
    RAISE EXCEPTION 'USERNAME_COOLDOWN'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.username_changed_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_username_cooldown ON public.profiles;
CREATE TRIGGER trg_profiles_username_cooldown
  BEFORE UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_username_change_cooldown();
