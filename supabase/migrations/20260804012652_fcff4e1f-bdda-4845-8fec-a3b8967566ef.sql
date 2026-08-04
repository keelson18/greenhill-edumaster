CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = 'super_admin'::public.app_role
      AND p.is_suspended = false
  );
$$;

DROP POLICY IF EXISTS user_roles_insert_admin ON public.user_roles;
CREATE POLICY user_roles_insert_admin ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  AND (role <> 'super_admin'::public.app_role OR public.is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
CREATE POLICY user_roles_update ON public.user_roles
FOR UPDATE TO authenticated
USING (
  is_admin(auth.uid())
  AND (role <> 'super_admin'::public.app_role OR public.is_super_admin(auth.uid()))
)
WITH CHECK (
  is_admin(auth.uid())
  AND (role <> 'super_admin'::public.app_role OR public.is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS user_roles_delete_admin ON public.user_roles;
CREATE POLICY user_roles_delete_admin ON public.user_roles
FOR DELETE TO authenticated
USING (
  is_admin(auth.uid())
  AND user_id <> auth.uid()
  AND (role <> 'super_admin'::public.app_role OR public.is_super_admin(auth.uid()))
);