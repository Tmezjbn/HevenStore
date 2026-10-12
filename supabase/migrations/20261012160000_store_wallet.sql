-- ============================================================
-- Store wallet: non-withdrawable store credit, topped up via NOWPayments.
--
-- Invariants (HANDOFF #15):
--  * Clients only SELECT own rows. Every balance move is a SECURITY DEFINER
--    RPC or the signature-verified nowpayments-webhook (service_role).
--  * wallet_ledger is append-only (RLS + trigger). Balance = sum of ledger.
--  * Paying an order from the wallet debits + finalizes through the SAME
--    finalize_paid_order the Polar webhook uses, in ONE transaction.
-- Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_usd numeric(12,2) NOT NULL CHECK (amount_usd > 0),
  credited_usd numeric(12,2),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'finished', 'partially_paid', 'failed', 'expired')),
  provider text NOT NULL DEFAULT 'nowpayments',
  provider_invoice_id text,
  provider_payment_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_user ON public.wallet_topups (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount <> 0),
  kind text NOT NULL CHECK (kind IN ('topup', 'purchase', 'refund', 'adjust')),
  note text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  topup_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON public.wallet_ledger (user_id, created_at DESC);

-- Receipt of how an order was paid (null = legacy / Polar).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;

-- ------------------------------------------------------------
-- 2) RLS: owner reads own rows, owner/admin read all, NO client writes
-- ------------------------------------------------------------
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallets_select ON public.wallets;
CREATE POLICY wallets_select ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS wallet_ledger_select ON public.wallet_ledger;
CREATE POLICY wallet_ledger_select ON public.wallet_ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS wallet_topups_select ON public.wallet_topups;
CREATE POLICY wallet_topups_select ON public.wallet_topups FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('owner', 'admin'));

-- Belt and braces on top of "no write policy": strip table privileges too.
REVOKE ALL ON public.wallets, public.wallet_ledger, public.wallet_topups FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wallets, public.wallet_ledger, public.wallet_topups FROM authenticated;
GRANT SELECT ON public.wallets, public.wallet_ledger, public.wallet_topups TO authenticated;

-- ------------------------------------------------------------
-- 3) Ledger is append-only for JWT callers
--    Allowed: service/SQL-editor (auth.uid() NULL), and FK cascade actions
--    (orders delete -> order_id SET NULL; user delete -> rows cascade).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wallet_ledger_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  -- Referential actions run one trigger level deeper than the user statement.
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    IF NEW.order_id IS NULL
       AND (to_jsonb(NEW) - 'order_id') = (to_jsonb(OLD) - 'order_id') THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'WALLET_LEDGER_APPEND_ONLY';
END;
$$;
REVOKE ALL ON FUNCTION public.wallet_ledger_append_only() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wallet_ledger_append_only ON public.wallet_ledger;
CREATE TRIGGER wallet_ledger_append_only
  BEFORE UPDATE OR DELETE ON public.wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION public.wallet_ledger_append_only();

-- ------------------------------------------------------------
-- 4) site_settings defaults + DB guard on limits
-- ------------------------------------------------------------
INSERT INTO public.site_settings (key, value) VALUES
  ('wallet_enabled', 'false'),
  ('wallet_topup_min_usd', '5'),
  ('wallet_topup_max_usd', '500')
ON CONFLICT (key) DO NOTHING;

-- AFTER (constraint) trigger so a batched upsert of min+max is judged on the
-- final state, not row by row.
CREATE OR REPLACE FUNCTION public.guard_wallet_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_raw text;
  v_max_raw text;
  v_min numeric;
  v_max numeric;
BEGIN
  IF NEW.key NOT IN ('wallet_enabled', 'wallet_topup_min_usd', 'wallet_topup_max_usd') THEN
    RETURN NULL;
  END IF;
  IF NEW.key = 'wallet_enabled' AND coalesce(NEW.value, '') NOT IN ('true', 'false') THEN
    RAISE EXCEPTION 'WALLET_SETTINGS_INVALID: wallet_enabled must be true or false';
  END IF;

  SELECT value INTO v_min_raw FROM public.site_settings WHERE key = 'wallet_topup_min_usd';
  SELECT value INTO v_max_raw FROM public.site_settings WHERE key = 'wallet_topup_max_usd';
  v_min_raw := coalesce(v_min_raw, '5');
  v_max_raw := coalesce(v_max_raw, '500');
  IF v_min_raw !~ '^[0-9]+(\.[0-9]{1,2})?$' OR v_max_raw !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
    RAISE EXCEPTION 'WALLET_SETTINGS_INVALID: top-up limits must be numbers';
  END IF;
  v_min := v_min_raw::numeric;
  v_max := v_max_raw::numeric;
  IF v_min < 1 OR v_max > 10000 OR v_min > v_max THEN
    RAISE EXCEPTION 'WALLET_SETTINGS_INVALID: need 1 <= min <= max <= 10000';
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_wallet_settings() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS site_settings_guard_wallet ON public.site_settings;
CREATE CONSTRAINT TRIGGER site_settings_guard_wallet
  AFTER INSERT OR UPDATE ON public.site_settings
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_settings();

-- Internal: read a wallet setting with a default (not exposed).
CREATE OR REPLACE FUNCTION public.wallet_setting(p_key text, p_default text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT value FROM public.site_settings WHERE key = p_key), p_default);
$$;
REVOKE ALL ON FUNCTION public.wallet_setting(text, text) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 5) my_wallet_balance()
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_wallet_balance()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT balance FROM public.wallets WHERE user_id = auth.uid()), 0);
$$;
REVOKE ALL ON FUNCTION public.my_wallet_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_wallet_balance() TO authenticated;

-- ------------------------------------------------------------
-- 6) create_wallet_topup(amount) -> topup id (pending)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_wallet_topup(p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_amount numeric(12,2);
  v_min numeric;
  v_max numeric;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  PERFORM public.check_rpc_rate('create_wallet_topup', 5, 60);

  IF public.wallet_setting('wallet_enabled', 'false') <> 'true' THEN
    RAISE EXCEPTION 'WALLET_DISABLED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND is_active = false) THEN
    RAISE EXCEPTION 'ACCOUNT_UNAVAILABLE';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'TOPUP_TOO_LOW';
  END IF;
  v_amount := round(p_amount, 2);
  v_min := public.wallet_setting('wallet_topup_min_usd', '5')::numeric;
  v_max := public.wallet_setting('wallet_topup_max_usd', '500')::numeric;
  IF v_amount < v_min THEN
    RAISE EXCEPTION 'TOPUP_TOO_LOW';
  END IF;
  IF v_amount > v_max THEN
    RAISE EXCEPTION 'TOPUP_TOO_HIGH';
  END IF;

  IF (SELECT count(*) FROM public.wallet_topups
      WHERE user_id = v_user AND status = 'pending'
        AND created_at > now() - interval '1 hour') >= 3 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;

  INSERT INTO public.wallet_topups (user_id, amount_usd)
  VALUES (v_user, v_amount)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_wallet_topup(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_wallet_topup(numeric) TO authenticated;

-- ------------------------------------------------------------
-- 7) credit_wallet_topup — webhook only (service_role)
--    finished       -> credit amount_usd in full (minus anything already credited)
--    partially_paid -> credit min(received, amount_usd) when a trusted USD
--                      figure is supplied; NULL = status only (staff reconcile
--                      with admin_adjust_wallet)
--    failed/expired -> status only, and only while still pending
--    Monotone + idempotent: replays never credit twice.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_wallet_topup(
  p_topup_id uuid,
  p_payment_id text,
  p_status text,
  p_received_usd numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_top public.wallet_topups%ROWTYPE;
  v_credited numeric(12,2);
  v_target numeric(12,2);
  v_delta numeric(12,2) := 0;
  v_new_status text;
  v_balance numeric(12,2);
BEGIN
  IF p_status NOT IN ('finished', 'partially_paid', 'failed', 'expired') THEN
    RAISE EXCEPTION 'BAD_TOPUP_STATUS';
  END IF;

  SELECT * INTO v_top FROM public.wallet_topups WHERE id = p_topup_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'not_found');
  END IF;
  IF v_top.status = 'finished' THEN
    RETURN jsonb_build_object('result', 'noop', 'status', 'finished');
  END IF;

  v_credited := coalesce(v_top.credited_usd, 0);
  v_new_status := v_top.status;

  IF p_status = 'finished' THEN
    v_target := v_top.amount_usd;
    v_new_status := 'finished';
  ELSIF p_status = 'partially_paid' THEN
    v_new_status := 'partially_paid';
    IF p_received_usd IS NOT NULL AND p_received_usd > 0 THEN
      v_target := least(round(p_received_usd, 2), v_top.amount_usd);
    END IF;
  ELSE
    -- failed / expired never downgrade a top-up that already received money.
    IF v_top.status = 'pending' THEN
      v_new_status := p_status;
    END IF;
  END IF;

  IF v_target IS NOT NULL AND v_target > v_credited THEN
    v_delta := v_target - v_credited;
  END IF;

  IF v_delta > 0 THEN
    INSERT INTO public.wallets AS w (user_id, balance, updated_at)
    VALUES (v_top.user_id, v_delta, now())
    ON CONFLICT (user_id) DO UPDATE
      SET balance = w.balance + EXCLUDED.balance, updated_at = now()
    RETURNING w.balance INTO v_balance;

    INSERT INTO public.wallet_ledger (user_id, amount, kind, note, topup_id)
    VALUES (v_top.user_id, v_delta, 'topup', 'NOWPayments top-up', v_top.id);
  END IF;

  UPDATE public.wallet_topups
  SET status = v_new_status,
      credited_usd = CASE WHEN v_delta > 0 THEN v_credited + v_delta ELSE credited_usd END,
      provider_payment_id = coalesce(provider_payment_id, nullif(p_payment_id, '')),
      updated_at = now()
  WHERE id = v_top.id;

  RETURN jsonb_build_object(
    'result', CASE WHEN v_delta > 0 THEN 'credited' ELSE 'status_only' END,
    'status', v_new_status,
    'credited', v_delta,
    'balance', v_balance
  );
END;
$$;
REVOKE ALL ON FUNCTION public.credit_wallet_topup(uuid, text, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_topup(uuid, text, text, numeric) TO service_role;

-- ------------------------------------------------------------
-- 8) pay_order_with_wallet(order) — debit + finalize in ONE transaction
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_order_with_wallet(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_balance numeric(12,2);
  v_result text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  PERFORM public.check_rpc_rate('pay_order_with_wallet', 10, 60);

  IF public.wallet_setting('wallet_enabled', 'false') <> 'true' THEN
    RAISE EXCEPTION 'WALLET_DISABLED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND is_active = false) THEN
    RAISE EXCEPTION 'ACCOUNT_UNAVAILABLE';
  END IF;

  -- Lock order first, then wallet (same order everywhere: no deadlock).
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.user_id <> v_user OR v_order.status <> 'pending' OR v_order.total <= 0 THEN
    RAISE EXCEPTION 'ORDER_NOT_PAYABLE';
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND OR v_balance < v_order.total THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  UPDATE public.wallets
  SET balance = balance - v_order.total, updated_at = now()
  WHERE user_id = v_user
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_ledger (user_id, amount, kind, note, order_id, created_by)
  VALUES (v_user, -v_order.total, 'purchase', 'Order ' || coalesce(v_order.order_number, v_order.id::text), v_order.id, v_user);

  UPDATE public.orders SET payment_method = 'wallet', updated_at = now() WHERE id = v_order.id;

  -- finalize_paid_order is the webhook's path; its guards (paid transition,
  -- claimed keys, listing review) treat any JWT caller as a browser. This is
  -- trusted server code after all authz above, so drop the JWT identity for
  -- the rest of THIS transaction (is_local = true) and run it as a service path.
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);

  v_result := public.finalize_paid_order(v_order.id, round(v_order.total * 100)::bigint);
  -- 'paid' includes the accepted KEY_SHORTFALL/STOCK_SHORTFALL notes (no auto-refund).
  -- Anything else aborts the whole transaction, restoring the balance.
  IF v_result IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'ORDER_NOT_PAYABLE';
  END IF;

  RETURN jsonb_build_object('order_id', v_order.id, 'status', 'paid', 'balance', v_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.pay_order_with_wallet(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_order_with_wallet(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 9) admin_adjust_wallet(user, amount, note) -> new balance
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_note text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_amount numeric(12,2);
  v_note text := btrim(coalesce(p_note, ''));
  v_balance numeric(12,2);
BEGIN
  IF v_actor IS NULL OR public.current_user_role() NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  -- Admins can't mint credit for themselves; only the owner may touch their own wallet.
  IF p_user_id = v_actor AND public.current_user_role() <> 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  PERFORM public.check_rpc_rate('admin_adjust_wallet', 30, 60);

  IF p_amount IS NULL OR abs(p_amount) > 10000 THEN
    RAISE EXCEPTION 'ADJUST_AMOUNT_INVALID';
  END IF;
  v_amount := round(p_amount, 2);
  IF v_amount = 0 THEN
    RAISE EXCEPTION 'ADJUST_AMOUNT_INVALID';
  END IF;
  IF char_length(v_note) < 3 OR char_length(v_note) > 300 THEN
    RAISE EXCEPTION 'ADJUST_NOTE_REQUIRED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_balance + v_amount < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  UPDATE public.wallets
  SET balance = balance + v_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_ledger (user_id, amount, kind, note, created_by)
  VALUES (p_user_id, v_amount, 'adjust', v_note, v_actor);

  RETURN v_balance;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) TO authenticated;
