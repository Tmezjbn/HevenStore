-- Default storefront rating = 5 until real reviews exist.
-- Owner-editable rating_seed; displayed rating = seed when review_count=0, else AVG(reviews).
-- Also fix DELETE path (was INSERT/UPDATE only).

ALTER TABLE public.products
  ALTER COLUMN rating SET DEFAULT 5;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating_seed numeric(3,2) NOT NULL DEFAULT 5
    CHECK (rating_seed >= 1 AND rating_seed <= 5);

UPDATE public.products
SET
  rating_seed = 5,
  rating = 5
WHERE review_count = 0
  AND (rating IS NULL OR rating = 0);

CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
  n int;
  avg_r numeric;
  seed numeric;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);

  SELECT COUNT(*)::int, AVG(rating)
  INTO n, avg_r
  FROM public.reviews
  WHERE product_id = pid;

  SELECT rating_seed INTO seed FROM public.products WHERE id = pid;

  UPDATE public.products SET
    rating = CASE WHEN n = 0 THEN COALESCE(seed, 5) ELSE ROUND(avg_r::numeric, 2) END,
    review_count = n
  WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();
