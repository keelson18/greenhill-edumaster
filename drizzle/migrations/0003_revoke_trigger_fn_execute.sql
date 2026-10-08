REVOKE EXECUTE ON FUNCTION public.guard_exam_publication() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_term_open_for_marks() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.guard_profile_security_fields() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;