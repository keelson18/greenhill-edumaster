CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE TABLE public.student_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attended_on date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Accra')::date,
  class_level text NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  note text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, attended_on)
);

CREATE INDEX student_attendance_date_idx ON public.student_attendance (attended_on, class_level);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_attendance TO authenticated;
GRANT ALL ON public.student_attendance TO service_role;

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view student attendance"
  ON public.student_attendance FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Teachers and admins can record student attendance"
  ON public.student_attendance FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers and admins can correct student attendance"
  ON public.student_attendance FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can delete student attendance"
  ON public.student_attendance FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER student_attendance_updated
  BEFORE UPDATE ON public.student_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  attended_on date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Accra')::date,
  status public.attendance_status NOT NULL DEFAULT 'present',
  note text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, attended_on)
);

CREATE INDEX staff_attendance_date_idx ON public.staff_attendance (attended_on);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_attendance TO authenticated;
GRANT ALL ON public.staff_attendance TO service_role;

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view staff attendance"
  ON public.staff_attendance FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins can record staff attendance"
  ON public.staff_attendance FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can correct staff attendance"
  ON public.staff_attendance FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete staff attendance"
  ON public.staff_attendance FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER staff_attendance_updated
  BEFORE UPDATE ON public.staff_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();