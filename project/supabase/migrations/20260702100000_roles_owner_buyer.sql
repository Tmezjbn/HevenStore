-- ============================================================
-- ROLES: add 'owner', auto-promote member -> buyer on first paid order.
-- Run in the Supabase SQL editor (project zeupffmhntpkrmjwjrcp). Idempotent.
-- ============================================================

-- 1) Allow 'owner' in the role check. Owner = top role for the store owner;
--    all admin-gated RLS policies are extended to include it below.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner','admin','moderator','seller','buyer','member'));

-- 2) Extend every policy that grants rights to 'admin' so 'owner' gets the
--    same rights. Rewrites policy expressions mechanically.
DO $$
DECLARE
  pol record;
  new_qual text;
  new_check text;
  sql_cmd text;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd AS polcmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual LIKE '%''admin''%' AND qual NOT LIKE '%''owner''%') OR
        (with_check IS NOT NULL AND with_check LIKE '%''admin''%' AND with_check NOT LIKE '%''owner''%')
      )
  LOOP
    new_qual := pol.qual;
    new_check := pol.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := replace(new_qual, '= ''admin''::text', '= ANY (ARRAY[''admin''::text, ''owner''::text])');
      new_qual := replace(new_qual, 'ANY (ARRAY[''admin''::text', 'ANY (ARRAY[''owner''::text, ''admin''::text');
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := replace(new_check, '= ''admin''::text', '= ANY (ARRAY[''admin''::text, ''owner''::text])');
      new_check := replace(new_check, 'ANY (ARRAY[''admin''::text', 'ANY (ARRAY[''owner''::text, ''admin''::text');
    END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);

    sql_cmd := format('CREATE POLICY %I ON %I.%I FOR %s TO %s',
      pol.policyname, pol.schemaname, pol.tablename, pol.polcmd,
      array_to_string(pol.roles, ', '));
    IF new_qual IS NOT NULL THEN
      sql_cmd := sql_cmd || format(' USING (%s)', new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      sql_cmd := sql_cmd || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE sql_cmd;
    RAISE NOTICE 'Extended policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
END $$;

-- 3) Auto-promote: member -> buyer when their order becomes 'paid'.
--    Fires on the orders table (NOT on auth.users), so signup stays untouched.
--    Works today with the built-in checkout and later with Polar webhooks
--    (both end by setting orders.status = 'paid').
CREATE OR REPLACE FUNCTION public.promote_buyer_on_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE public.profiles
    SET role = 'buyer', updated_at = now()
    WHERE id = NEW.user_id AND role = 'member';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_paid_promote_buyer ON public.orders;
CREATE TRIGGER on_order_paid_promote_buyer
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_buyer_on_paid_order();

-- 4) HOW TO SET admin/owner:
--    Supabase Dashboard > Table Editor > profiles > edit the "role" cell
--    for your user to 'owner' (or 'admin'). Roles live in public.profiles,
--    not in the Authentication tab — Supabase Auth has no custom role UI.
--    Example:
--      UPDATE public.profiles SET role = 'owner' WHERE email = 'you@example.com';
