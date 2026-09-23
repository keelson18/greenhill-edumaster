-- 1. Exam publication state (additive, defaults keep existing exams unpublished)
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.exam_is_published(_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.exams e WHERE e.id = _exam_id AND e.is_published);
$$;

REVOKE ALL ON FUNCTION public.exam_is_published(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exam_is_published(uuid) TO authenticated, service_role;

-- 2. Families only ever see published results
DROP POLICY IF EXISTS "Family can read their marks" ON public.marks;
CREATE POLICY "Family can read their marks" ON public.marks
  FOR SELECT TO authenticated
  USING (public.can_view_student(auth.uid(), student_id) AND public.exam_is_published(exam_id));

DROP POLICY IF EXISTS exams_read_family ON public.exams;
CREATE POLICY exams_read_family ON public.exams
  FOR SELECT TO authenticated
  USING (
    is_published
    AND EXISTS (
      SELECT 1 FROM public.marks m
      WHERE m.exam_id = exams.id AND public.can_view_student(auth.uid(), m.student_id)
    )
  );

-- 3. Only administrators may change publication, and it is stamped server-side
CREATE OR REPLACE FUNCTION public.guard_exam_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_published IS DISTINCT FROM OLD.is_published THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only an administrator can publish or withdraw results';
    END IF;
    IF NEW.is_published THEN
      NEW.published_at = now();
      NEW.published_by = COALESCE(auth.uid(), NEW.published_by);
    ELSE
      NEW.published_at = NULL;
      NEW.published_by = NULL;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS exams_publication_guard ON public.exams;
CREATE TRIGGER exams_publication_guard
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.guard_exam_publication();

-- 4. Published marks are frozen until results are withdrawn
CREATE OR REPLACE FUNCTION public.enforce_term_open_for_marks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _exam_id uuid;
BEGIN
  _exam_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.exam_id ELSE NEW.exam_id END;

  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF EXISTS(SELECT 1 FROM public.exams e JOIN public.terms t ON t.id=e.term_id WHERE e.id=OLD.exam_id AND t.is_locked) THEN
      RAISE EXCEPTION 'TERM_LOCKED: marks for a locked term cannot be modified' USING ERRCODE='check_violation';
    END IF;
    IF EXISTS(SELECT 1 FROM public.exams e WHERE e.id=OLD.exam_id AND e.is_published) THEN
      RAISE EXCEPTION 'RESULTS_PUBLISHED: withdraw the published results before changing marks' USING ERRCODE='check_violation';
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE','INSERT') THEN
    IF EXISTS(SELECT 1 FROM public.exams e JOIN public.terms t ON t.id=e.term_id WHERE e.id=_exam_id AND t.is_locked) THEN
      RAISE EXCEPTION 'TERM_LOCKED: marks for a locked term cannot be modified' USING ERRCODE='check_violation';
    END IF;
    IF EXISTS(SELECT 1 FROM public.exams e WHERE e.id=_exam_id AND e.is_published) THEN
      RAISE EXCEPTION 'RESULTS_PUBLISHED: withdraw the published results before changing marks' USING ERRCODE='check_violation';
    END IF;
  END IF;

  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

-- 5. Atomic, re-authorised role replacement
CREATE OR REPLACE FUNCTION public.replace_user_role(_target_id uuid, _role app_role)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _actor uuid := auth.uid();
        _before text;
        _held_super boolean;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT public.is_admin(_actor) THEN RAISE EXCEPTION 'You do not have permission to manage users.'; END IF;
  IF _target_id = _actor THEN RAISE EXCEPTION 'You cannot change your own role.'; END IF;

  -- Serialise competing role changes for this user.
  PERFORM pg_advisory_xact_lock(hashtextextended(_target_id::text, 0));

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target_id AND role='super_admin')
    INTO _held_super;
  IF (_role = 'super_admin' OR _held_super) AND NOT public.is_super_admin(_actor) THEN
    RAISE EXCEPTION 'Only a Super Admin can grant or remove the Super Admin role.';
  END IF;

  SELECT COALESCE(string_agg(role::text, ', ' ORDER BY role::text), 'none')
    INTO _before FROM public.user_roles WHERE user_id=_target_id;

  DELETE FROM public.user_roles WHERE user_id=_target_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_id, _role);

  RETURN _before;
END; $$;

REVOKE ALL ON FUNCTION public.replace_user_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_user_role(uuid, app_role) TO authenticated, service_role;

-- 6. Audit trail is written only by the trusted server writer
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- 7. Profiles are created by the signup trigger only
REVOKE INSERT ON public.profiles FROM authenticated;
