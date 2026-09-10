-- Owner may set created_by NULL ("None"): shared product — any staff may delete when lock ON.
-- Null no longer forced to owner on insert/update.

CREATE OR REPLACE FUNCTION public.products_created_by_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_role text;
  target_role text;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  actor_role := public.current_user_role();

  IF TG_OP = 'INSERT' THEN
    IF actor_role = 'owner' THEN
      -- NULL = shared / no author; otherwise must be staff
      IF NEW.created_by IS NOT NULL AND NEW.created_by <> actor THEN
        SELECT role INTO target_role FROM public.profiles WHERE id = NEW.created_by;
        IF target_role IS NULL OR target_role NOT IN ('owner', 'admin', 'moderator') THEN
          RAISE EXCEPTION 'created_by must be an owner, admin, or moderator';
        END IF;
      END IF;
    ELSE
      NEW.created_by := actor;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    IF actor_role <> 'owner' THEN
      NEW.created_by := OLD.created_by;
    ELSIF NEW.created_by IS NOT NULL THEN
      SELECT role INTO target_role FROM public.profiles WHERE id = NEW.created_by;
      IF target_role IS NULL OR target_role NOT IN ('owner', 'admin', 'moderator') THEN
        RAISE EXCEPTION 'created_by must be an owner, admin, or moderator';
      END IF;
    END IF;
    -- owner may set NULL (shared)
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (
    CASE
      WHEN public.product_author_lock_enabled() THEN
        (
          created_by = auth.uid()
          OR (
            created_by IS NULL
            AND public.current_user_role() IN ('owner', 'admin', 'moderator')
          )
        )
      ELSE
        (
          (
            auth.uid() = seller_id
            AND NOT EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = created_by AND role IN ('owner', 'admin', 'moderator')
            )
          )
          OR public.current_user_role() IN ('owner', 'admin')
          OR (
            public.current_user_role() = 'moderator'
            AND NOT EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = created_by AND role IN ('owner', 'admin')
            )
          )
        )
    END
  );
