-- Product author lock (Dev): when ON (default), only created_by may DELETE the product.
-- Owner may attribute create to self or another owner/admin/moderator; others forced to self.

INSERT INTO public.site_settings (key, value)
VALUES ('product_author_lock', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.product_author_lock_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN lower(trim(value)) IN ('false', '0', 'off', 'no') THEN false
        ELSE true
      END
      FROM public.site_settings
      WHERE key = 'product_author_lock'
      LIMIT 1
    ),
    true
  );
$$;

REVOKE ALL ON FUNCTION public.product_author_lock_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.product_author_lock_enabled() TO anon, authenticated, service_role;

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
  -- service role / SQL editor: leave as-is
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  actor_role := public.current_user_role();

  IF TG_OP = 'INSERT' THEN
    IF actor_role = 'owner' THEN
      IF NEW.created_by IS NULL THEN
        NEW.created_by := actor;
      ELSIF NEW.created_by <> actor THEN
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

  -- UPDATE: only owner may reassign; others keep prior author
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    IF actor_role <> 'owner' THEN
      NEW.created_by := OLD.created_by;
    ELSIF NEW.created_by IS NULL THEN
      NEW.created_by := OLD.created_by;
    ELSE
      SELECT role INTO target_role FROM public.profiles WHERE id = NEW.created_by;
      IF target_role IS NULL OR target_role NOT IN ('owner', 'admin', 'moderator') THEN
        RAISE EXCEPTION 'created_by must be an owner, admin, or moderator';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_created_by_guard ON public.products;
CREATE TRIGGER products_created_by_guard
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_created_by_guard();

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (
    CASE
      WHEN public.product_author_lock_enabled() THEN
        (
          created_by = auth.uid()
          OR (created_by IS NULL AND public.current_user_role() = 'owner')
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
