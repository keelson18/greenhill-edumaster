import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { auditQuerySchema, uuidSchema } from "@/lib/validation/schemas";
import type { AuditLogDTO, NotificationDTO, PagedResult } from "@/lib/api/types";

/**
 * Read access to the administrative audit trail and to the signed-in user's
 * own notifications. Audit entries are append-only; nothing here can edit or
 * delete them.
 */

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => auditQuerySchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<PagedResult<AuditLogDTO>> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Only administrators can view the audit log.");

    const from = (data.page - 1) * data.pageSize;
    let query = context.supabase
      .from("audit_logs")
      .select(
        "id, actor_id, actor_name, actor_email, action, entity_type, entity_id, entity_label, summary, metadata, created_at",
        { count: "exact" },
      );

    if (data.action) query = query.eq("action", data.action);
    if (data.entityType) query = query.eq("entity_type", data.entityType);
    if (data.from) query = query.gte("created_at", data.from);
    if (data.to) query = query.lte("created_at", `${data.to}T23:59:59.999Z`);
    if (data.search) {
      const term = data.search.replace(/[%,()]/g, " ").trim();
      if (term) {
        query = query.or(
          `actor_name.ilike.%${term}%,actor_email.ilike.%${term}%,entity_label.ilike.%${term}%,summary.ilike.%${term}%`,
        );
      }
    }

    const { data: rows, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);

    if (error) throw new Error(`Unable to load the audit log: ${error.message}`);

    const total = count ?? 0;
    return {
      items: (rows ?? []).map((r) => ({
        id: r.id,
        actorId: r.actor_id,
        actorName: r.actor_name,
        actorEmail: r.actor_email,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        entityLabel: r.entity_label,
        summary: r.summary,
        metadata: (r.metadata ?? {}) as Record<string, string | number | boolean | null>,
        createdAt: r.created_at,
      })),
      total,
      page: data.page,
      pageSize: data.pageSize,
      pageCount: Math.max(1, Math.ceil(total / data.pageSize)),
    };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationDTO[]> => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, title, body, category, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(`Unable to load notifications: ${error.message}`);
    return (data ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      category: n.category,
      link: n.link,
      readAt: n.read_at,
      createdAt: n.created_at,
    }));
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({ id: uuidSchema.parse((input as { id: string })?.id) }))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(`Unable to update the notification: ${error.message}`);
    return { id: data.id };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(`Unable to update notifications: ${error.message}`);
    return { ok: true };
  });
