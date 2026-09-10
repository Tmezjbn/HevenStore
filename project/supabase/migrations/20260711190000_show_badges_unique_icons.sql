-- Public badge display prefs + unique badge icons.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_badges boolean NOT NULL DEFAULT true;

-- Unique icon key per badge (one visual identity each).
CREATE UNIQUE INDEX IF NOT EXISTS badges_icon_unique ON public.badges (icon);

UPDATE public.badges
SET icon = 'HeartHandshake'
WHERE slug = 'helper'
  AND (icon IS NULL OR trim(icon) = '' OR icon = 'Award');

-- Public badges for a profile (respects show_badges + active account).
CREATE OR REPLACE FUNCTION public.get_profile_public_badges(p_id uuid)
RETURNS TABLE (
  badge_id uuid,
  slug text,
  name_ar text,
  name_en text,
  description_ar text,
  description_en text,
  icon text,
  awarded_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.slug,
    b.name_ar,
    b.name_en,
    b.description_ar,
    b.description_en,
    b.icon,
    ub.awarded_at
  FROM public.profiles p
  JOIN public.user_badges ub ON ub.user_id = p.id
  JOIN public.badges b ON b.id = ub.badge_id
  WHERE p.id = p_id
    AND p.is_active = true
    AND p.show_badges = true
    AND p.deletion_scheduled_at IS NULL
  ORDER BY ub.awarded_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_public_badges(uuid) TO anon, authenticated;
