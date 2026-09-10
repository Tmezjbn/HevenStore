-- added_by = who created the row (immutable).
-- created_by = "Added by" attribution / delete lock (nullable = shared).
-- Change attribution: author if set; else only original adder (added_by).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.products
SET added_by = created_by
WHERE added_by IS NULL AND created_by IS NOT NULL;

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
  can_edit boolean;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  actor_role := public.current_user_role();

  IF TG_OP = 'INSERT' THEN
    NEW.added_by := actor;

    IF actor_role = 'owner' THEN
      IF NEW.created_by IS NOT NULL AND NEW.created_by <> actor THEN
        SELECT role INTO target_role FROM public.profiles WHERE id = NEW.created_by;
        IF target_role IS NULL OR target_role NOT IN ('owner', 'admin', 'moderator') THEN
          RAISE EXCEPTION 'created_by must be an owner, admin, or moderator';
        END IF;
      END IF;
    ELSIF actor_role IN ('admin', 'moderator') THEN
      -- Me or None only
      IF NEW.created_by IS NOT NULL AND NEW.created_by <> actor THEN
        RAISE EXCEPTION 'admins and moderators may only set Added by to themselves or none';
      END IF;
    ELSE
      NEW.created_by := actor;
    END IF;
    RETURN NEW;
  END IF;

  -- added_by never changes via client
  NEW.added_by := OLD.added_by;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    can_edit := (
      (OLD.created_by IS NOT NULL AND actor = OLD.created_by)
      OR (
        OLD.created_by IS NULL
        AND (
          actor = OLD.added_by
          OR (OLD.added_by IS NULL AND actor_role = 'owner')
        )
      )
    );

    IF NOT can_edit THEN
      NEW.created_by := OLD.created_by;
    ELSIF NEW.created_by IS NOT NULL THEN
      IF actor_role = 'owner' THEN
        SELECT role INTO target_role FROM public.profiles WHERE id = NEW.created_by;
        IF target_role IS NULL OR target_role NOT IN ('owner', 'admin', 'moderator') THEN
          RAISE EXCEPTION 'created_by must be an owner, admin, or moderator';
        END IF;
      ELSIF NEW.created_by <> actor THEN
        -- admin/mod can only point at self or null
        NEW.created_by := OLD.created_by;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
