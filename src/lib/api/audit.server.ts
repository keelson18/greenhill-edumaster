import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Server-only helpers that write the administrative audit trail and fan out
 * notifications. Callers must already have authorised the action — these
 * helpers only record what happened.
 *
 * Recording is best-effort: a logging failure must never roll back or mask a
 * successful administrative action, so failures are logged and swallowed.
 */

export type AuditAction =
  | "role_assigned"
  | "user_suspended"
  | "user_reinstated"
  | "user_deleted"
  | "user_updated"
  | "term_locked"
  | "term_unlocked";

type Client = SupabaseClient<never, never, never>;

interface ActorInfo {
  id: string;
  name: string;
  email: string | null;
}

export async function resolveActor(supabase: Client, userId: string): Promise<ActorInfo> {
  const { data } = await (supabase as never as SupabaseClient)
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return {
    id: userId,
    name: (data?.["full_name"] as string) || "Unknown user",
    email: (data?.["email"] as string) ?? null,
  };
}

export async function recordAudit(
  supabase: Client,
  entry: {
    actor: ActorInfo;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    entityLabel?: string;
    summary: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
) {
  void supabase; // authorisation happens in the caller; writing is server-trusted only
  try {
    const { error } = await (supabaseAdmin as never as SupabaseClient).from("audit_logs").insert({
      actor_id: entry.actor.id,
      actor_name: entry.actor.name,
      actor_email: entry.actor.email,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? "",
      summary: entry.summary,
      metadata: entry.metadata ?? {},
    });
    if (error) console.error("[audit] failed to record entry", error.message);
  } catch (error) {
    console.error("[audit] failed to record entry", error);
  }
}

/** Delivers an in-app notification to each recipient. */
export async function notifyUsers(
  supabase: Client,
  recipients: string[],
  notice: { title: string; body: string; category: string; link?: string },
) {
  const unique = [...new Set(recipients.filter(Boolean))];
  if (unique.length === 0) return;
  void supabase;
  try {
    const { error } = await (supabaseAdmin as never as SupabaseClient).from("notifications").insert(
      unique.map((userId) => ({
        user_id: userId,
        title: notice.title,
        body: notice.body,
        category: notice.category,
        link: notice.link ?? null,
      })),
    );
    if (error) console.error("[notify] failed to deliver", error.message);
  } catch (error) {
    console.error("[notify] failed to deliver", error);
  }
}

/** Every administrator, used for broadcast events such as term locking. */
export async function adminUserIds(supabase: Client): Promise<string[]> {
  const { data } = await (supabase as never as SupabaseClient)
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["super_admin", "admin"]);
  return (data ?? []).map((r) => r["user_id"] as string);
}
