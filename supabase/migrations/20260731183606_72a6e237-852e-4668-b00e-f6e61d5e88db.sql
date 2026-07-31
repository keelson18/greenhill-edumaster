-- Security linter: role helpers must not be callable by anonymous visitors
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_finance(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.term_dashboard_stats(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.term_grade_performance(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.term_dashboard_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.term_grade_performance(text) TO authenticated;

-- ============ STAFF ============
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_no text NOT NULL UNIQUE,
  full_name text NOT NULL,
  job_title text NOT NULL,
  department text NOT NULL DEFAULT 'Academic',
  subject text,
  phone text NOT NULL DEFAULT '',
  email text,
  status text NOT NULL DEFAULT 'Active',
  monthly_salary numeric NOT NULL DEFAULT 0,
  hired_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_select ON public.staff FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY staff_write ON public.staff FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER staff_updated BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TIMETABLE ============
CREATE TABLE public.timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week text NOT NULL,
  period integer NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  class_level text NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_of_week, period, class_level)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_slots TO authenticated;
GRANT ALL ON public.timetable_slots TO service_role;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_select ON public.timetable_slots FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY timetable_write ON public.timetable_slots FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER timetable_updated BEFORE UPDATE ON public.timetable_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ HOMEWORK ============
CREATE TABLE public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  class_level text NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  assigned_on date NOT NULL DEFAULT CURRENT_DATE,
  due_on date NOT NULL,
  status text NOT NULL DEFAULT 'Open',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework TO authenticated;
GRANT ALL ON public.homework TO service_role;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
CREATE POLICY homework_select ON public.homework FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY homework_write ON public.homework FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'));
CREATE TRIGGER homework_updated BEFORE UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LIBRARY ============
CREATE TABLE public.library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  isbn text,
  total_copies integer NOT NULL DEFAULT 1,
  available_copies integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_books TO authenticated;
GRANT ALL ON public.library_books TO service_role;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY books_select ON public.library_books FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY books_write ON public.library_books FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'librarian'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'librarian'));
CREATE TRIGGER books_updated BEFORE UPDATE ON public.library_books FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.library_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  borrower_name text NOT NULL,
  borrowed_on date NOT NULL DEFAULT CURRENT_DATE,
  due_on date NOT NULL,
  returned_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_loans TO authenticated;
GRANT ALL ON public.library_loans TO service_role;
ALTER TABLE public.library_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY loans_select ON public.library_loans FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY loans_write ON public.library_loans FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'librarian'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'librarian'));
CREATE TRIGGER loans_updated BEFORE UPDATE ON public.library_loans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INVENTORY ============
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  quantity integer NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  location text NOT NULL DEFAULT '',
  condition text NOT NULL DEFAULT 'Good',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_select ON public.inventory_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY inventory_write ON public.inventory_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TRANSPORT ============
CREATE TABLE public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vehicle_reg text NOT NULL,
  driver_name text NOT NULL,
  driver_phone text NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 0,
  learners integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_routes TO authenticated;
GRANT ALL ON public.transport_routes TO service_role;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_select ON public.transport_routes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY transport_write ON public.transport_routes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER transport_updated BEFORE UPDATE ON public.transport_routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PAYROLL ============
CREATE TABLE public.payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  period text NOT NULL,
  gross_pay numeric NOT NULL DEFAULT 0,
  ssnit numeric NOT NULL DEFAULT 0,
  income_tax numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_entries TO authenticated;
GRANT ALL ON public.payroll_entries TO service_role;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_select ON public.payroll_entries FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY payroll_write ON public.payroll_entries FOR ALL TO authenticated
  USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));
CREATE TRIGGER payroll_updated BEFORE UPDATE ON public.payroll_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED DATA ============
INSERT INTO public.staff (staff_no, full_name, job_title, department, subject, phone, email, monthly_salary, hired_on) VALUES
('GHA-001','Kwame Mensah','Headteacher','Administration',NULL,'+233 24 512 3390','k.mensah@greenhill.edu.gh',6200,'2016-09-01'),
('GHA-002','Akosua Boateng','Assistant Headteacher','Administration','Mathematics','+233 20 884 1120','a.boateng@greenhill.edu.gh',5100,'2017-01-09'),
('GHA-003','Yaw Owusu','Teacher','Academic','Mathematics','+233 27 441 7782','y.owusu@greenhill.edu.gh',3400,'2019-09-02'),
('GHA-004','Ama Asante','Teacher','Academic','English Language','+233 24 990 2245','a.asante@greenhill.edu.gh',3300,'2018-09-03'),
('GHA-005','Kofi Adjei','Teacher','Academic','Integrated Science','+233 55 218 6690','k.adjei@greenhill.edu.gh',3350,'2020-01-06'),
('GHA-006','Efua Darko','Teacher','Academic','Social Studies','+233 26 771 4408','e.darko@greenhill.edu.gh',3200,'2021-09-06'),
('GHA-007','Nana Appiah','Accountant','Finance',NULL,'+233 24 336 5512','n.appiah@greenhill.edu.gh',4100,'2018-04-02'),
('GHA-008','Adwoa Nyarko','Librarian','Library',NULL,'+233 20 118 9934','a.nyarko@greenhill.edu.gh',2600,'2019-05-13'),
('GHA-009','Kwabena Sarpong','Driver','Transport',NULL,'+233 54 662 3317','k.sarpong@greenhill.edu.gh',2100,'2020-08-17'),
('GHA-010','Abena Frimpong','Teacher','Academic','Ghanaian Language','+233 24 703 8821','a.frimpong@greenhill.edu.gh',3150,'2022-01-10');

INSERT INTO public.library_books (title, author, category, isbn, total_copies, available_copies) VALUES
('Golden English Basic 7','GES Curriculum Unit','Course book','978-9988-0-1121-3',120,64),
('Mathematics for Basic Schools 8','K. Ofori','Course book','978-9988-0-2233-4',110,52),
('Integrated Science Basic 9','A. Mensimah','Course book','978-9988-0-3345-5',105,48),
('The Gab Boys','Cameron Duodu','Ghanaian Literature','978-9988-0-4456-6',40,31),
('Atlas of Ghana','Survey Department','Reference','978-9988-0-5567-7',25,25),
('Twi Reader Basic 3','Ghana Language Board','Ghanaian Language','978-9988-0-6678-8',80,57),
('Anansi Stories Collection','Folk Compilation','Junior Fiction','978-9988-0-7789-9',60,38),
('Our Home Ghana: Social Studies 6','E. Amankwah','Course book','978-9988-0-8891-0',95,60);

INSERT INTO public.inventory_items (name, category, quantity, unit_cost, location, condition) VALUES
('Student desks (dual)','Furniture',420,380,'Classroom block A','Good'),
('Teacher tables','Furniture',36,540,'Staff room','Good'),
('Whiteboards','Teaching aid',28,420,'Classroom blocks','Good'),
('Desktop computers','ICT',24,3800,'ICT laboratory','Good'),
('Science kits','Laboratory',15,1250,'Science laboratory','Fair'),
('Football kits','Sports',8,650,'Sports store','Fair'),
('Generator 15KVA','Utilities',1,28500,'Power house','Good'),
('Water storage tanks','Utilities',4,2100,'Compound','Good');

INSERT INTO public.transport_routes (name, vehicle_reg, driver_name, driver_phone, capacity, learners, status) VALUES
('Madina – Adenta','GT 4421-22','Kwabena Sarpong','+233 54 662 3317',55,52,'Active'),
('Achimota – Dome','GR 1180-21','Yaw Tetteh','+233 24 118 7740','47','44','Active'),
('Tema Community 1','GE 9007-20','Samuel Nartey','+233 20 900 7712',60,58,'Service due'),
('Kasoa – Weija','GW 7713-23','Mavis Adom','+233 27 771 3306',45,38,'Active'),
('East Legon – Spintex','GS 2214-22','Isaac Boadu','+233 55 221 4498',50,41,'Active');

INSERT INTO public.transport_routes (name, vehicle_reg, driver_name, driver_phone, capacity, learners, status)
SELECT 'Lapaz – Abeka','GN 3345-21','Grace Otoo','+233 26 334 5521',40,29,'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.transport_routes WHERE vehicle_reg = 'GN 3345-21');

INSERT INTO public.payroll_entries (staff_id, period, gross_pay, ssnit, income_tax, net_pay, status)
SELECT s.id,
       to_char(CURRENT_DATE, 'YYYY-MM'),
       s.monthly_salary,
       ROUND(s.monthly_salary * 0.055, 2),
       ROUND(s.monthly_salary * 0.125, 2),
       ROUND(s.monthly_salary * 0.82, 2),
       'Paid'
FROM public.staff s;

INSERT INTO public.homework (title, class_level, subject_id, description, assigned_on, due_on, status)
SELECT v.title, v.class_level,
       (SELECT id FROM public.subjects ORDER BY sort_order LIMIT 1 OFFSET v.subject_offset),
       v.description, CURRENT_DATE - v.age, CURRENT_DATE + v.due, v.status
FROM (VALUES
  ('Fractions worksheet 3','Basic 6',0,'Complete exercises 1-15 on equivalent fractions.',3,2,'Open'),
  ('Comprehension: The Gab Boys','Basic 8',1,'Read chapter 4 and answer the five questions.',2,3,'Open'),
  ('Photosynthesis diagram','Basic 7',2,'Draw and label the process of photosynthesis.',5,1,'Open'),
  ('Regions of Ghana map work','Basic 5',3,'Label the 16 regions and their capitals.',7,-1,'Overdue'),
  ('Twi proverbs essay','Basic 9',0,'Write 300 words explaining three Akan proverbs.',10,-3,'Closed')
) AS v(title, class_level, subject_offset, description, age, due, status);

INSERT INTO public.timetable_slots (day_of_week, period, starts_at, ends_at, class_level, subject_id, staff_id, room)
SELECT d.day, p.period,
       (TIME '08:00' + (p.period - 1) * INTERVAL '60 minutes'),
       (TIME '08:00' + p.period * INTERVAL '60 minutes' - INTERVAL '5 minutes'),
       c.class_level,
       (SELECT id FROM public.subjects ORDER BY sort_order LIMIT 1 OFFSET ((p.period + c.idx) % GREATEST(1,(SELECT count(*) FROM public.subjects)))),
       (SELECT id FROM public.staff WHERE department = 'Academic' ORDER BY staff_no LIMIT 1 OFFSET ((p.period + c.idx) % 5)),
       'Room ' || c.idx || p.period
FROM (VALUES ('Monday'),('Tuesday'),('Wednesday'),('Thursday'),('Friday')) AS d(day),
     (VALUES (1),(2),(3),(4),(5),(6)) AS p(period),
     (VALUES ('Basic 7',1),('Basic 8',2),('Basic 9',3)) AS c(class_level, idx);