GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;

CREATE POLICY "subjects_read_staff" ON public.subjects
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));