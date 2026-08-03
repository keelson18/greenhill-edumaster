CREATE TYPE public.audit_action AS ENUM (
  'role_assigned','user_suspended','user_reinstated','user_deleted','user_updated','term_locked','term_unlocked'
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text NOT NULL DEFAULT '',
  actor_email text,
  action public.audit_action NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_label text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_action_idx ON public.audit_logs (action);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_id);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_insert_admin ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));