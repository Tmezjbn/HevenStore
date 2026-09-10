-- Per-account appearance + analytics consent (synced from client when signed in).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS analytics_consent text
    CHECK (analytics_consent IS NULL OR analytics_consent IN ('accepted', 'declined')),
  ADD COLUMN IF NOT EXISTS preferred_skin text,
  ADD COLUMN IF NOT EXISTS preferred_mode text
    CHECK (preferred_mode IS NULL OR preferred_mode IN ('dark', 'light'));

COMMENT ON COLUMN public.profiles.analytics_consent IS 'accepted | declined; null = undecided';
COMMENT ON COLUMN public.profiles.preferred_skin IS 'User-chosen skin id (vault, aurora, …)';
COMMENT ON COLUMN public.profiles.preferred_mode IS 'dark | light';
