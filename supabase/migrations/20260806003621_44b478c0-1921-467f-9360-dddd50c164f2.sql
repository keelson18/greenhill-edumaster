REVOKE ALL ON FUNCTION public.can_view_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_student(uuid, uuid) TO authenticated, service_role;