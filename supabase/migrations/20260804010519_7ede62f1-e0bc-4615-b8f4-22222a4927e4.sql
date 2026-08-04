-- New signups get NO role by default; an admin must grant access explicitly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE is_first boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
          NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;

  -- Only bootstrap the very first account. Everyone else stays role-less
  -- until an administrator assigns a role via the admin flow.
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Allow admins to correct an existing role assignment in place.
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
CREATE POLICY "user_roles_update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

GRANT UPDATE ON public.user_roles TO authenticated;

-- Audit trail must stay immutable: block UPDATE/DELETE at the privilege level too.
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM authenticated, anon;