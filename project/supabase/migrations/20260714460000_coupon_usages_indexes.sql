-- SCAL-1 follow-up: speed coupon usage admin / COUPON_USED checks.
CREATE INDEX IF NOT EXISTS coupon_usages_coupon_id_idx
  ON public.coupon_usages (coupon_id);

CREATE INDEX IF NOT EXISTS coupon_usages_user_coupon_idx
  ON public.coupon_usages (user_id, coupon_id);
