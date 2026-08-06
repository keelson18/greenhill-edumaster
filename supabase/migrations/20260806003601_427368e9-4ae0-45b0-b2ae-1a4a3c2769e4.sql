
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS students_user_id_key ON public.students(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'Guardian',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, guardian_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_guardians TO authenticated;
GRANT ALL ON public.student_guardians TO service_role;

ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage guardian links" ON public.student_guardians
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Guardians read their own links" ON public.student_guardians
  FOR SELECT TO authenticated
  USING (guardian_id = auth.uid());

CREATE TRIGGER student_guardians_updated
  BEFORE UPDATE ON public.student_guardians
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.can_view_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = _student_id AND s.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.student_guardians g
    WHERE g.student_id = _student_id AND g.guardian_id = _user_id
  );
$$;

CREATE POLICY "Family can read their student record" ON public.students
  FOR SELECT TO authenticated
  USING (public.can_view_student(auth.uid(), id));

CREATE POLICY "Family can read their marks" ON public.marks
  FOR SELECT TO authenticated
  USING (public.can_view_student(auth.uid(), student_id));

CREATE POLICY "Family can read their attendance" ON public.student_attendance
  FOR SELECT TO authenticated
  USING (public.can_view_student(auth.uid(), student_id));

CREATE POLICY "Family can read their fee payments" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (public.can_view_student(auth.uid(), student_id));
