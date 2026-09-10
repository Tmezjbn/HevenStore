-- Soft product rating: Bayesian pull toward rating_seed (weight 19).
-- seed 5 + one 3★ → 4.90 (not 3.0). Volume of low scores still wins eventually.

CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
  n int;
  sum_r numeric;
  seed numeric;
  prior numeric := 19;
  score numeric;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);

  SELECT COUNT(*)::int, COALESCE(SUM(rating), 0)
  INTO n, sum_r
  FROM public.reviews
  WHERE product_id = pid;

  SELECT rating_seed INTO seed FROM public.products WHERE id = pid;
  seed := COALESCE(seed, 5);

  IF n = 0 THEN
    score := seed;
  ELSE
    score := ROUND((prior * seed + sum_r) / (prior + n), 2);
  END IF;

  UPDATE public.products SET
    rating = score,
    review_count = n
  WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Backfill products that already have reviews.
UPDATE public.products p
SET
  review_count = c.n,
  rating = ROUND((19 * COALESCE(p.rating_seed, 5) + c.sum_r) / (19 + c.n), 2)
FROM (
  SELECT product_id, COUNT(*)::int AS n, SUM(rating)::numeric AS sum_r
  FROM public.reviews
  GROUP BY product_id
) c
WHERE c.product_id = p.id;
