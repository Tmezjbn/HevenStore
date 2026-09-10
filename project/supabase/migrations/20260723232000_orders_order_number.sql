-- Human-readable order codes (UUID PK unchanged).
--
-- Strategy (race-safe):
--   - Global SEQUENCE public.orders_order_number_seq (nextval is atomic).
--   - BEFORE INSERT trigger assigns once:
--       ORD-YYYYMMDD-########  (UTC date from created_at/now + 8-digit global seq).
--   - Sequence does NOT reset daily; the date prefix is for humans, uniqueness
--     comes from the sequence. Concurrent inserts cannot collide.
--   - Backfill: setval past existing max suffix, then nextval per NULL row
--     (created_at,id order). UPDATE of order_number after set is rejected.

CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number text;

-- Advance sequence past any existing suffix, then allocate via nextval
-- (avoids colliding with already-numbered rows on re-run / partial backfill).
DO $$
DECLARE
  v_max bigint;
  r record;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(substring(order_number FROM '([0-9]{8})$'), '')::bigint),
    0
  )
  INTO v_max
  FROM public.orders
  WHERE order_number IS NOT NULL;

  IF v_max < 1 THEN
    PERFORM setval('public.orders_order_number_seq', 1, false);
  ELSE
    PERFORM setval('public.orders_order_number_seq', v_max, true);
  END IF;

  FOR r IN
    SELECT id, created_at
    FROM public.orders
    WHERE order_number IS NULL
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    UPDATE public.orders
    SET order_number =
      'ORD-'
      || to_char((COALESCE(r.created_at, now()) AT TIME ZONE 'UTC'), 'YYYYMMDD')
      || '-'
      || lpad(nextval('public.orders_order_number_seq')::text, 8, '0')
    WHERE id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE public.orders
  ALTER COLUMN order_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_uidx
  ON public.orders (order_number);

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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_assign_order_number ON public.orders;
CREATE TRIGGER orders_assign_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_assign_order_number();

CREATE OR REPLACE FUNCTION public.orders_freeze_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.order_number IS NOT NULL AND NEW.order_number IS DISTINCT FROM OLD.order_number THEN
    RAISE EXCEPTION 'ORDER_NUMBER_LOCKED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_freeze_order_number ON public.orders;
CREATE TRIGGER orders_freeze_order_number
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_freeze_order_number();

-- Seller sales ledger: return + search by order_number.
DROP FUNCTION IF EXISTS public.list_seller_sales(int, int, text);
CREATE FUNCTION public.list_seller_sales(
  p_limit int DEFAULT 40,
  p_offset int DEFAULT 0,
  p_q text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
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
      OR o.id::text ILIKE '%' || q || '%'
      OR p.name ILIKE '%' || q || '%'
      OR COALESCE(p.name_ar, '') ILIKE '%' || q || '%'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_seller_sales(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.count_seller_sales(text) FROM anon;

-- Owner internal log (user-visible store/dashboard change).
INSERT INTO public.owner_changelog_entries (
  entry_date, title_ar, title_en, summary_ar, summary_en,
  body_ar, body_en, lesson_json, update_scale, sort_order
)
SELECT
  '2026-07-23'::date,
  'أرقام طلبات واضحة للزبائن والفريق',
  'Readable order numbers for shoppers and staff',
  'كل طلب صار له رقم قصير سهل القراءة والنسخ والبحث، بدل المعرّف الطويل فقط.',
  'Every order now has a short readable number for display, copy, and search—not only the long technical ID.',
  '',
  '',
  '{
    "what_ar": "أضفنا رقم طلب واضح يظهر في صفحة نجاح الدفع وطلبات المشتري والبائع ولوحة الفريق. يمكن البحث بهذا الرقم. المعرّف التقني الطويل يبقى للنظام والدعم عند الحاجة.",
    "what_en": "We added a clear order number on checkout success, buyer and seller order lists, and the staff dashboard. You can search by that number. The long technical ID stays for the system and support when needed.",
    "why_ar": "معرّفات طويلة صعبة على الزبون والدعم عند المتابعة أو الإلغاء. رقم قصير يقلل الأخطاء ويسهّل المحادثة.",
    "why_en": "Long IDs are hard for shoppers and support when following up or cancelling. A short number cuts mistakes and makes chat easier.",
    "how_ar": "تلقائي بعد التحديث — افتح طلباتي أو الطلبات في اللوحة؛ الرقم يظهر كنص قصير مثل ORD-20260723-00000001. ابحث بنفس الرقم.",
    "how_en": "Automatic after deploy — open My Orders or Orders in the dashboard; the number shows as short text like ORD-20260723-00000001. Search with that same number.",
    "benefits_ar": "تواصل أوضح مع الزبائن، بحث أسرع، وتأكيد إلغاء/حذف أسهل بدون لصق معرّفات طويلة.",
    "benefits_en": "Clearer customer talk, faster search, and easier cancel/delete confirm without pasting long IDs."
  }'::jsonb,
  'small',
  1784938200000
WHERE NOT EXISTS (
  SELECT 1 FROM public.owner_changelog_entries e
  WHERE e.title_en = 'Readable order numbers for shoppers and staff'
);
