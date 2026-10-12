-- Wallet ledger notes show the buyer-facing public_ref, never the internal
-- sequential order_number (store-wide order volume is staff-only).

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
  VALUES (v_user, -v_order.total, 'purchase', 'Order ' || coalesce(v_order.public_ref, v_order.id::text), v_order.id, v_user);

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

-- Backfill existing purchase notes (runs without a JWT, so the append-only guard allows it).
UPDATE public.wallet_ledger l
SET note = 'Order ' || o.public_ref
FROM public.orders o
WHERE l.order_id = o.id AND l.kind = 'purchase' AND o.public_ref IS NOT NULL
  AND l.note IS DISTINCT FROM 'Order ' || o.public_ref;
