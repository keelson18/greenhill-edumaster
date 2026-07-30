-- ============================================================
-- EduMaster core schema
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'parent');
CREATE TYPE public.term_status AS ENUM ('Closed', 'Current', 'Upcoming');
CREATE TYPE public.exam_status AS ENUM ('Draft', 'Active', 'Marking', 'Completed');
CREATE TYPE public.student_status AS ENUM ('Active', 'Suspended', 'Transferred');
CREATE TYPE public.gender AS ENUM ('Male', 'Female');

-- shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------- profiles ----------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- roles ----------------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'teacher')
  );
$$;

CREATE POLICY "profiles_select_self_or_staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- new user -> profile (+ admin for the very first account)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'teacher'::public.app_role END)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------- terms ----------------
CREATE TABLE public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  short_label text NOT NULL,
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status public.term_status NOT NULL DEFAULT 'Upcoming',
  is_locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on > starts_on)
);
CREATE INDEX idx_terms_year ON public.terms(year, starts_on);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms TO authenticated;
GRANT ALL ON public.terms TO service_role;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER terms_updated_at BEFORE UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "terms_select_staff" ON public.terms
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "terms_write_admin" ON public.terms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------- subjects ----------------
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_select_staff" ON public.subjects
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "subjects_write_admin" ON public.subjects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------- students ----------------
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no text NOT NULL UNIQUE,
  nemis_no text NOT NULL UNIQUE,
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 2 AND 120),
  grade_level text NOT NULL,
  stream text NOT NULL DEFAULT 'A',
  gender public.gender NOT NULL,
  guardian_name text NOT NULL,
  guardian_phone text NOT NULL CHECK (guardian_phone ~ '^\+?[0-9 ]{9,15}$'),
  date_of_birth date,
  county text,
  status public.student_status NOT NULL DEFAULT 'Active',
  admitted_on date NOT NULL DEFAULT CURRENT_DATE,
  fee_billed numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee_billed >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_students_grade ON public.students(grade_level, full_name);
CREATE INDEX idx_students_status ON public.students(status);
CREATE INDEX idx_students_search ON public.students USING gin (to_tsvector('simple', full_name || ' ' || admission_no || ' ' || nemis_no));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "students_select_staff" ON public.students
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "students_insert_staff" ON public.students
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "students_update_staff" ON public.students
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "students_delete_admin" ON public.students
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ---------------- exams ----------------
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 3 AND 140),
  grade_scope text NOT NULL DEFAULT 'PP1 – Grade 9',
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status public.exam_status NOT NULL DEFAULT 'Draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on),
  UNIQUE (term_id, name)
);
CREATE INDEX idx_exams_term ON public.exams(term_id, starts_on);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "exams_select_staff" ON public.exams
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "exams_insert_staff" ON public.exams
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "exams_update_staff" ON public.exams
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "exams_delete_admin" ON public.exams
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ---------------- marks ----------------
CREATE TABLE public.marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  entered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id, subject_id)
);
CREATE INDEX idx_marks_exam_student ON public.marks(exam_id, student_id);
CREATE INDEX idx_marks_student ON public.marks(student_id);
CREATE INDEX idx_marks_subject ON public.marks(subject_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marks TO authenticated;
GRANT ALL ON public.marks TO service_role;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER marks_updated_at BEFORE UPDATE ON public.marks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "marks_select_staff" ON public.marks
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "marks_insert_staff" ON public.marks
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "marks_update_staff" ON public.marks
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "marks_delete_admin" ON public.marks
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Term locking is enforced in the database, not only in the UI.
CREATE OR REPLACE FUNCTION public.enforce_term_open_for_marks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked boolean;
  target_exam uuid := COALESCE(NEW.exam_id, OLD.exam_id);
BEGIN
  SELECT t.is_locked INTO locked
  FROM public.exams e JOIN public.terms t ON t.id = e.term_id
  WHERE e.id = target_exam;

  IF locked THEN
    RAISE EXCEPTION 'TERM_LOCKED: marks for a locked term cannot be modified'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER marks_term_lock_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.marks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_term_open_for_marks();

-- ---------------- fee payments ----------------
CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'M-Pesa',
  reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fee_payments_student ON public.fee_payments(student_id);
CREATE INDEX idx_fee_payments_term ON public.fee_payments(term_id, paid_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payments TO authenticated;
GRANT ALL ON public.fee_payments TO service_role;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_payments_select_staff" ON public.fee_payments
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "fee_payments_insert_staff" ON public.fee_payments
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "fee_payments_write_admin" ON public.fee_payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Seed data: Greenhill Academy
-- ============================================================

INSERT INTO public.terms (code, label, short_label, year, starts_on, ends_on, status, is_locked) VALUES
  ('2025-t3', 'Term 3, 2025', 'T3 ''25', 2025, '2025-09-01', '2025-11-28', 'Closed',   true),
  ('2026-t1', 'Term 1, 2026', 'T1 ''26', 2026, '2026-01-06', '2026-04-10', 'Closed',   true),
  ('2026-t2', 'Term 2, 2026', 'T2 ''26', 2026, '2026-05-04', '2026-08-07', 'Current',  false),
  ('2026-t3', 'Term 3, 2026', 'T3 ''26', 2026, '2026-09-07', '2026-11-27', 'Upcoming', false);

INSERT INTO public.subjects (code, name, sort_order) VALUES
  ('MAT', 'Mathematics', 1),
  ('ENG', 'English', 2),
  ('KIS', 'Kiswahili', 3),
  ('SCI', 'Integrated Science', 4),
  ('SST', 'Social Studies', 5),
  ('CRE', 'CRE', 6),
  ('ART', 'Creative Arts', 7);

-- 847 learners, deterministic from the row index
INSERT INTO public.students
  (admission_no, nemis_no, full_name, grade_level, stream, gender, guardian_name, guardian_phone,
   date_of_birth, county, status, admitted_on, fee_billed)
SELECT
  'GHA/' || (1000 + i) || '/' || (2020 + (i % 6)),
  (20000000 + i * 37)::text,
  (ARRAY['Brian','Kevin','Collins','Dennis','Elvis','Felix','Gideon','Hillary','Isaac','John','Achieng','Beatrice','Cynthia','Damaris','Esther','Faith','Grace','Hellen','Irene','Joy'])[1 + (i * 7) % 20]
    || ' ' ||
  (ARRAY['Kamau','Otieno','Wanjiru','Kiptoo','Mwangi','Njoroge','Chebet','Omondi','Wafula','Muthoni','Kirui','Atieno','Barasa','Cheruiyot','Gitonga','Kilonzo','Mutiso','Owino','Nyambura','Rotich'])[1 + (i * 11) % 20]
    || ' ' ||
  (ARRAY['Karanja','Maina','Njeri','Onyango','Waweru','Simiyu','Wekesa','Auma','Ndungu','Kilonzo'])[1 + (i * 13) % 10],
  (ARRAY['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'])[1 + (i % 11)],
  (ARRAY['A','B','C'])[1 + (i % 3)],
  (CASE WHEN i % 2 = 0 THEN 'Female' ELSE 'Male' END)::public.gender,
  (ARRAY['Mercy','Peter','Rose','Samuel','Joy','Victor','Grace','Timothy'])[1 + (i * 5) % 8]
    || ' ' ||
  (ARRAY['Kamau','Otieno','Wanjiru','Kiptoo','Mwangi','Njoroge','Chebet','Omondi'])[1 + (i * 3) % 8],
  '+2547' || lpad(((i * 918273) % 100000000)::text, 8, '0'),
  make_date(2010 + (i % 9), 1 + (i % 12), 1 + (i % 27)),
  (ARRAY['Nairobi','Kiambu','Nakuru','Kisumu','Machakos','Uasin Gishu','Kakamega'])[1 + (i % 7)],
  (CASE WHEN i % 211 = 0 THEN 'Transferred' WHEN i % 307 = 0 THEN 'Suspended' ELSE 'Active' END)::public.student_status,
  make_date(2020 + (i % 6), 1, 10 + (i % 15)),
  12000 + (i % 6) * 3500
FROM generate_series(0, 846) AS i;

-- Exams for the current and previous terms
INSERT INTO public.exams (term_id, name, grade_scope, starts_on, ends_on, status)
SELECT t.id, x.name, x.grade_scope, t.starts_on + x.offset_start, t.starts_on + x.offset_end,
       (CASE WHEN t.status = 'Current' THEN x.current_status ELSE 'Completed' END)::public.exam_status
FROM public.terms t
CROSS JOIN (VALUES
  ('Opener CAT', 'PP1 – Grade 9', 8, 11, 'Completed'),
  ('Mid-Term Assessment', 'Grade 4 – Grade 9', 30, 34, 'Active'),
  ('Lower Primary Literacy Check', 'PP1 – Grade 3', 55, 56, 'Marking'),
  ('End-Term Examination', 'PP1 – Grade 9', 75, 79, 'Draft')
) AS x(name, grade_scope, offset_start, offset_end, current_status)
WHERE t.status <> 'Upcoming';

-- Fee payments for the current term
INSERT INTO public.fee_payments (student_id, term_id, amount, method, reference, paid_at)
SELECT s.id,
       (SELECT id FROM public.terms WHERE code = '2026-t2'),
       round(s.fee_billed * (0.4 + ((hashtext(s.admission_no) & 255) / 255.0) * 0.6), 2),
       (ARRAY['M-Pesa','Bank','Cash'])[1 + (abs(hashtext(s.admission_no)) % 3)],
       'RJK' || abs(hashtext(s.admission_no)) % 100000,
       now() - ((abs(hashtext(s.admission_no)) % 60) || ' days')::interval
FROM public.students s
WHERE s.status = 'Active';