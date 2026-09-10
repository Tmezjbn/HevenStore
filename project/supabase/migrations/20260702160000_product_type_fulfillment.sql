-- ============================================================
-- PRODUCT TYPE + FULFILLMENT INFO
-- 1) products.product_type: account / gift_card / code / other
-- 2) product_secrets: the private "Product Information" (account
--    credentials, gift card number, activation code...). Kept in a
--    separate table because the products table is publicly readable.
--    Only staff can manage it; buyers receive it via the
--    get_order_fulfillment() RPC after their order is paid.
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'other'
  CHECK (product_type IN ('account','gift_card','code','other'));

CREATE TABLE IF NOT EXISTS public.product_secrets (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  content text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_secrets ENABLE ROW LEVEL SECURITY;

-- Staff (or the product's seller) manage secrets.
DROP POLICY IF EXISTS "product_secrets_staff_all" ON public.product_secrets;
CREATE POLICY "product_secrets_staff_all" ON public.product_secrets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','moderator'))
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','moderator'))
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  );

-- Buyer-facing delivery: returns each item of a PAID order that belongs
-- to the caller, together with its secret content (if any).
CREATE OR REPLACE FUNCTION public.get_order_fulfillment(p_order_id uuid)
RETURNS TABLE (
  product_id uuid,
  name text,
  name_ar text,
  product_type text,
  quantity int,
  content text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.user_id = auth.uid() AND o.status = 'paid'
  ) THEN
    RETURN; -- not the buyer's paid order: return nothing
  END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.name_ar, p.product_type, oi.quantity, s.content
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.product_secrets s ON s.product_id = p.id
  WHERE oi.order_id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_fulfillment(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_order_fulfillment(uuid) FROM anon;
