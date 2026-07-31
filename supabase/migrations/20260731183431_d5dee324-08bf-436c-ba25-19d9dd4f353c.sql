-- 1. Learner identity: Ghana fields
ALTER TABLE public.students RENAME COLUMN nemis_no TO ges_id;
ALTER TABLE public.students RENAME COLUMN county TO region;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS town text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS ghana_post_gps text;

-- 2. Ghana class ladder
UPDATE public.students SET grade_level = CASE grade_level
  WHEN 'PP1' THEN 'KG1'
  WHEN 'PP2' THEN 'KG2'
  WHEN 'Grade 1' THEN 'Basic 1'
  WHEN 'Grade 2' THEN 'Basic 2'
  WHEN 'Grade 3' THEN 'Basic 3'
  WHEN 'Grade 4' THEN 'Basic 4'
  WHEN 'Grade 5' THEN 'Basic 5'
  WHEN 'Grade 6' THEN 'Basic 6'
  WHEN 'Grade 7' THEN 'Basic 7'
  WHEN 'Grade 8' THEN 'Basic 8'
  WHEN 'Grade 9' THEN 'Basic 9'
  ELSE grade_level END;

UPDATE public.exams SET grade_scope = 'KG1 – Basic 9' WHERE grade_scope = 'PP1 – Grade 9';
ALTER TABLE public.exams ALTER COLUMN grade_scope SET DEFAULT 'KG1 – Basic 9';

-- 3. Ghana three-term calendar labelling
UPDATE public.terms SET
  label = year || ' Term ' || right(code, 1),
  short_label = 'T' || right(code, 1) || ' ' || year;

-- 4. Ghana contact + address data
UPDATE public.students SET
  guardian_phone = '+233 ' || lpad(((abs(hashtext(id::text)) % 90) + 20)::text, 2, '0')
                   || ' ' || lpad((abs(hashtext(id::text || 'a')) % 1000)::text, 3, '0')
                   || ' ' || lpad((abs(hashtext(id::text || 'b')) % 10000)::text, 4, '0'),
  region = (ARRAY['Greater Accra','Ashanti','Central','Eastern','Western','Northern','Volta','Bono','Upper East','Upper West'])[(abs(hashtext(id::text || 'r')) % 10) + 1],
  district = (ARRAY['Accra Metropolitan','Tema West','Kumasi Metropolitan','Cape Coast Metropolitan','New Juaben South','Sekondi-Takoradi','Tamale Metropolitan','Ho Municipal','Sunyani Municipal','Bolgatanga Municipal'])[(abs(hashtext(id::text || 'd')) % 10) + 1],
  town = (ARRAY['Accra','Tema','Kumasi','Cape Coast','Koforidua','Takoradi','Tamale','Ho','Sunyani','Bolgatanga'])[(abs(hashtext(id::text || 't')) % 10) + 1],
  ghana_post_gps = (ARRAY['GA','AK','CR','ER','WR','NR','VR','BR','UE','UW'])[(abs(hashtext(id::text || 'g')) % 10) + 1]
                   || '-' || lpad((abs(hashtext(id::text || 'p')) % 1000)::text, 3, '0')
                   || '-' || lpad((abs(hashtext(id::text || 'q')) % 10000)::text, 4, '0');

-- 5. Expanded role set (new enum, swap in place)
CREATE TYPE public.app_role_new AS ENUM (
  'super_admin','admin','teacher','student','parent','accountant','librarian','staff'
);

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_staff(uuid) CASCADE;

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role_new USING role::text::public.app_role_new;

DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- 6. Account suspension
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- 7. Authorization helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = _role AND p.is_suspended = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role IN ('super_admin','admin') AND p.is_suspended = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role IN ('super_admin','admin','teacher','accountant','librarian','staff')
      AND p.is_suspended = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_finance(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role IN ('super_admin','admin','accountant')
      AND p.is_suspended = false
  );
$$;

-- 8. Signup trigger: first account is super admin, later accounts are staff
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
          NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'super_admin'::public.app_role ELSE 'staff'::public.app_role END)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Refresh policies for the new role model
DROP POLICY IF EXISTS exams_delete_admin ON public.exams;
DROP POLICY IF EXISTS exams_insert_staff ON public.exams;
DROP POLICY IF EXISTS exams_select_staff ON public.exams;
DROP POLICY IF EXISTS exams_update_staff ON public.exams;
CREATE POLICY exams_select ON public.exams FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY exams_insert ON public.exams FOR INSERT TO authenticated
  WITH CHECK ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher')) AND created_by = auth.uid());
CREATE POLICY exams_update ON public.exams FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY exams_delete ON public.exams FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS marks_delete_admin ON public.marks;
DROP POLICY IF EXISTS marks_insert_staff ON public.marks;
DROP POLICY IF EXISTS marks_select_staff ON public.marks;
DROP POLICY IF EXISTS marks_update_staff ON public.marks;
CREATE POLICY marks_select ON public.marks FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY marks_insert ON public.marks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY marks_update ON public.marks FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY marks_delete ON public.marks FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS students_delete_admin ON public.students;
DROP POLICY IF EXISTS students_insert_staff ON public.students;
DROP POLICY IF EXISTS students_select_staff ON public.students;
DROP POLICY IF EXISTS students_update_staff ON public.students;
CREATE POLICY students_select ON public.students FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY students_insert ON public.students FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY students_update ON public.students FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY students_delete ON public.students FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS fee_payments_insert_staff ON public.fee_payments;
DROP POLICY IF EXISTS fee_payments_select_staff ON public.fee_payments;
DROP POLICY IF EXISTS fee_payments_write_admin ON public.fee_payments;
CREATE POLICY fee_payments_select ON public.fee_payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY fee_payments_insert ON public.fee_payments FOR INSERT TO authenticated WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY fee_payments_update ON public.fee_payments FOR UPDATE TO authenticated
  USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY fee_payments_delete ON public.fee_payments FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS terms_write_admin ON public.terms;
CREATE POLICY terms_write_admin ON public.terms FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS subjects_write_admin ON public.subjects;
CREATE POLICY subjects_write_admin ON public.subjects FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 10. Profiles + roles administration
DROP POLICY IF EXISTS profiles_select_self_or_staff ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS user_roles_select_self_or_admin ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY user_roles_insert_admin ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY user_roles_delete_admin ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) AND user_id <> auth.uid());
GRANT INSERT, DELETE ON public.user_roles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;