REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_profile_security_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
  IF NOT public.is_admin(auth.uid()) OR OLD.id=auth.uid() THEN RAISE EXCEPTION 'Only an administrator can change another account suspension'; END IF;
  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=OLD.id AND role='super_admin') AND NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Only a Super Admin can suspend a Super Admin'; END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_profile_security_fields() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER profiles_security_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_security_fields();

CREATE OR REPLACE FUNCTION public.can_view_student(_user_id uuid,_student_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=_user_id AND NOT is_suspended) AND (EXISTS(SELECT 1 FROM public.students WHERE id=_student_id AND user_id=_user_id) OR EXISTS(SELECT 1 FROM public.student_guardians WHERE student_id=_student_id AND guardian_id=_user_id));
$$;
CREATE POLICY terms_read_active ON public.terms FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND NOT is_suspended));
CREATE POLICY exams_read_family ON public.exams FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.marks m WHERE m.exam_id=exams.id AND public.can_view_student(auth.uid(),m.student_id)));
CREATE POLICY subjects_read_family ON public.subjects FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.students s WHERE public.can_view_student(auth.uid(),s.id)));

CREATE OR REPLACE FUNCTION public.enforce_term_open_for_marks() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
  IF EXISTS(SELECT 1 FROM public.exams e JOIN public.terms t ON t.id=e.term_id WHERE e.id=OLD.exam_id AND t.is_locked) THEN RAISE EXCEPTION 'TERM_LOCKED: marks for a locked term cannot be modified' USING ERRCODE='check_violation'; END IF;
 END IF;
 IF TG_OP IN ('UPDATE','INSERT') THEN
  IF EXISTS(SELECT 1 FROM public.exams e JOIN public.terms t ON t.id=e.term_id WHERE e.id=NEW.exam_id AND t.is_locked) THEN RAISE EXCEPTION 'TERM_LOCKED: marks for a locked term cannot be modified' USING ERRCODE='check_violation'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;