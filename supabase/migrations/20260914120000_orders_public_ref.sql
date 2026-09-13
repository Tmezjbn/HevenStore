-- Split order refs: internal sequential order_number (staff-only) +
-- public_ref (customer-facing, unguessable).
--
--   order_number = ORD-YYYYMMDD-######## (sequential, internal/support)
--   public_ref   = ORD-YYYYMMDD-XXXXXXXX (random, UNIQUE, frozen)
--
-- Alphabet: Crockford-style minus 0/O/1/I/L/U — unambiguous when read
-- aloud or copied by hand. Generator never emits adjacent repeated
-- characters. Server-side only: the BEFORE INSERT trigger always
-- generates public_ref — client-supplied values are overwritten.
-- orders.id stays the real PK for Polar/webhooks/deep links.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS public_ref text;

-- Candidate generator with collision retry. p_ts supplies the UTC date
-- prefix (row's created_at) so backfilled orders keep their own date.
CREATE OR REPLACE FUNCTION public.orders_new_public_ref(p_ts timestamptz DEFAULT now())
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  -- 30 chars: digits 2-9 + letters minus I, L, O, U
  c_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_date text := to_char((COALESCE(p_ts, now()) AT TIME ZONE 'UTC'), 'YYYYMMDD');
  v_ref text;
  v_ch text;
  i int;
  attempt int;
BEGIN
  FOR attempt IN 1..32 LOOP
    v_ref := '';
    FOR i IN 1..8 LOOP
      v_ch := substr(c_alphabet, 1 + floor(random() * length(c_alphabet))::int, 1);
      WHILE v_ch = substr(v_ref, length(v_ref), 1) LOOP
        v_ch := substr(c_alphabet, 1 + floor(random() * length(c_alphabet))::int, 1);
      END LOOP;
      v_ref := v_ref || v_ch;
    END LOOP;
    v_ref := 'ORD-' || v_date || '-' || v_ref;
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE public_ref = v_ref) THEN
      RETURN v_ref;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'PUBLIC_REF_EXHAUSTED';
END;
$$;

REVOKE ALL ON FUNCTION public.orders_new_public_ref(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orders_new_public_ref(timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.orders_new_public_ref(timestamptz) FROM authenticated;

-- Extend the existing BEFORE INSERT assign trigger to also fill
-- public_ref. Unconditional generate: the column is server-owned.
CREATE OR REPLACE FUNCTION public.orders_assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    NEW.order_number :=
      'ORD-'
      || to_char((COALESCE(NEW.created_at, now()) AT TIME ZONE 'UTC'), 'YYYYMMDD')
      || '-'
      || lpad(nextval('public.orders_order_number_seq')::text, 8, '0');
  END IF;
  NEW.public_ref := public.orders_new_public_ref(NEW.created_at);
  RETURN NEW;
END;
$$;

-- Backfill existing orders (NULLs only — idempotent re-run).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, created_at
    FROM public.orders
    WHERE public_ref IS NULL
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    UPDATE public.orders
    SET public_ref = public.orders_new_public_ref(COALESCE(r.created_at, now()))
    WHERE id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE public.orders
  ALTER COLUMN public_ref SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_public_ref_uidx
  ON public.orders (public_ref);

-- Freeze public_ref alongside order_number (both immutable post-insert).
CREATE OR REPLACE FUNCTION public.orders_freeze_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.order_number IS NOT NULL AND NEW.order_number IS DISTINCT FROM OLD.order_number THEN
    RAISE EXCEPTION 'ORDER_NUMBER_LOCKED';
  END IF;
  IF OLD.public_ref IS NOT NULL AND NEW.public_ref IS DISTINCT FROM OLD.public_ref THEN
    RAISE EXCEPTION 'PUBLIC_REF_LOCKED';
  END IF;
  RETURN NEW;
END;
$$;

-- Seller sales ledger: return public_ref and match it in search —
-- a customer quotes whichever ref they see.
DROP FUNCTION IF EXISTS public.list_seller_sales(int, int, text);
CREATE FUNCTION public.list_seller_sales(
  p_limit int DEFAULT 40,
  p_offset int DEFAULT 0,
  p_q text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
  public_ref text,
  created_at timestamptz,
  status text,
  line_total numeric,
  quantity int,
  product_id uuid,
  product_name text,
  product_name_ar text,
  product_slug text,
  thumbnail_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim int := GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
  off int := GREATEST(0, COALESCE(p_offset, 0));
  q text := NULLIF(btrim(COALESCE(p_q, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  IF public.current_user_role() IS DISTINCT FROM 'seller' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.public_ref,
    o.created_at,
    o.status::text,
    oi.total_price,
    oi.quantity,
    p.id,
    p.name,
    p.name_ar,
    p.slug,
    p.thumbnail_url
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  WHERE p.seller_id = auth.uid()
    AND o.status = 'paid'
    AND (
      q IS NULL
      OR o.order_number ILIKE '%' || q || '%'
      OR o.public_ref ILIKE '%' || q || '%'
      OR o.id::text ILIKE '%' || q || '%'
      OR p.name ILIKE '%' || q || '%'
      OR COALESCE(p.name_ar, '') ILIKE '%' || q || '%'
    )
  ORDER BY o.created_at DESC, oi.id
  LIMIT lim OFFSET off;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_seller_sales(int, int, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_seller_sales(int, int, text) FROM anon;

CREATE OR REPLACE FUNCTION public.count_seller_sales(p_q text DEFAULT NULL)
RETURNS TABLE (sale_count bigint, revenue numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := NULLIF(btrim(COALESCE(p_q, '')), '');
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() IS DISTINCT FROM 'seller' THEN
    sale_count := 0;
    revenue := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    count(*)::bigint,
    COALESCE(sum(oi.total_price), 0)::numeric
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  WHERE p.seller_id = auth.uid()
    AND o.status = 'paid'
    AND (
      q IS NULL
      OR o.order_number ILIKE '%' || q || '%'
      OR o.public_ref ILIKE '%' || q || '%'
      OR o.id::text ILIKE '%' || q || '%'
      OR p.name ILIKE '%' || q || '%'
      OR COALESCE(p.name_ar, '') ILIKE '%' || q || '%'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_seller_sales(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.count_seller_sales(text) FROM anon;
