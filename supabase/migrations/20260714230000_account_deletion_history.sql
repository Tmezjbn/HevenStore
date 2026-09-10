-- Immutable archive of hard-deleted accounts (profile + orders snapshot).
-- Written by edge functions (service role). Owner-only SELECT.

CREATE TABLE IF NOT EXISTS public.account_deletion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  former_user_id uuid NOT NULL,
  email text,
  full_name text,
  username text,
  role text,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  orders_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by uuid
);

CREATE INDEX IF NOT EXISTS account_deletion_history_deleted_at_idx
  ON public.account_deletion_history (deleted_at DESC);

CREATE INDEX IF NOT EXISTS account_deletion_history_former_user_idx
  ON public.account_deletion_history (former_user_id);

ALTER TABLE public.account_deletion_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_deletion_history_owner_select ON public.account_deletion_history;
CREATE POLICY account_deletion_history_owner_select
  ON public.account_deletion_history
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'owner');

-- No INSERT/UPDATE/DELETE for authenticated — service role only.
REVOKE ALL ON TABLE public.account_deletion_history FROM PUBLIC;
GRANT SELECT ON TABLE public.account_deletion_history TO authenticated;
GRANT ALL ON TABLE public.account_deletion_history TO service_role;
