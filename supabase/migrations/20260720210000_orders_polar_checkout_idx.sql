-- OPS-34: webhook looks up orders by polar_checkout_id (idx today only covers polar_order_id).
CREATE INDEX IF NOT EXISTS idx_orders_polar_checkout ON public.orders (polar_checkout_id)
  WHERE polar_checkout_id IS NOT NULL;
