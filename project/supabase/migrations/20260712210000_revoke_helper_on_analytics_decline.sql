-- Helper badge: award on analytics accept, revoke on decline.
-- Trigger is SECURITY DEFINER so revoke works despite staff-only DELETE RLS.

CREATE OR REPLACE FUNCTION public.award_helper_badge_on_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge uuid;
BEGIN
  SELECT id INTO v_badge FROM public.badges WHERE slug = 'helper' LIMIT 1;
  IF v_badge IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.analytics_consent = 'accepted'
     AND (OLD.analytics_consent IS DISTINCT FROM 'accepted') THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (NEW.id, v_badge)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.analytics_consent IS DISTINCT FROM 'accepted'
     AND OLD.analytics_consent = 'accepted' THEN
    DELETE FROM public.user_badges
    WHERE user_id = NEW.id AND badge_id = v_badge;
  END IF;

  RETURN NEW;
END;
$$;
