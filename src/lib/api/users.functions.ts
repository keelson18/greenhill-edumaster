import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assignRoleSchema,
  createUserSchema,
  suspendUserSchema,
  updateUserSchema,
  uuidSchema,
} from "@/lib/validation/schemas";
import { adminUserIds, notifyUsers, recordAudit, resolveActor } from "@/lib/api/audit.server";
import { ROLE_LABELS, type AppRole } from "@/config/app.config";
import type { ManagedUserDTO } from "@/lib/api/types";

/**
 * User management. Every function re-checks the caller is an administrator
 * against the database (never against client state) before acting, and writes
 * an audit entry plus notifications once the change succeeds.
 */

type RpcContext = {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
};

async function assertAdmin(context: RpcContext) {
  const { data } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (!data) throw new Error("You do not have permission to manage users.");
}

/** True only for callers who already hold the Super Admin role themselves. */
async function isSuperAdmin(context: RpcContext) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  return Boolean(data);
}

async function describeUser(
  supabase: { from: (t: string) => never },
  userId: string,
): Promise<{ name: string; email: string | null }> {
  const { data } = await (
    supabase as never as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{
              data: { full_name: string; email: string | null } | null;
            }>;
          };
        };
      };
    }
  )
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return { name: data?.full_name || "Unknown user", email: data?.email ?? null };
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUserDTO[]> => {
    await assertAdmin(context as never);

    const [{ data: profiles, error }, { data: roles }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_suspended, created_at")
        .order("created_at", { ascending: false }),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw new Error(`Unable to load users: ${error.message}`);

    const byUser = new Map<string, AppRole[]>();
    for (const r of roles ?? []) {
      byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role as AppRole]);
    }

    return (profiles ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      phone: p.phone,
      roles: byUser.get(p.id) ?? [],
      isSuspended: p.is_suspended,
      createdAt: p.created_at,
    }));
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assignRoleSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ userId: string; role: AppRole }> => {
    await assertAdmin(context as never);

    const { data: previous } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    const { error: clearError } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (clearError) throw new Error(`Unable to update the role: ${clearError.message}`);

    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(`Unable to assign the role: ${error.message}`);

    const actor = await resolveActor(context.supabase as never, context.userId);
    const target = await describeUser(context.supabase as never, data.userId);
    const before = (previous ?? []).map((r) => ROLE_LABELS[r.role as AppRole]).join(", ") || "none";

    await recordAudit(context.supabase as never, {
      actor,
      action: "role_assigned",
      entityType: "user",
      entityId: data.userId,
      entityLabel: target.name,
      summary: `Changed ${target.name}'s role from ${before} to ${ROLE_LABELS[data.role]}`,
      metadata: { from: before, to: data.role },
    });
    await notifyUsers(context.supabase as never, [data.userId], {
      title: "Your role was updated",
      body: `${actor.name} set your role to ${ROLE_LABELS[data.role]}.`,
      category: "role",
      link: "/dashboard",
    });
    return { userId: data.userId, role: data.role };
  });

export const setUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => suspendUserSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ userId: string; suspended: boolean }> => {
    await assertAdmin(context as never);
    if (data.userId === context.userId) throw new Error("You cannot suspend your own account.");

    const { error } = await context.supabase
      .from("profiles")
      .update({ is_suspended: data.suspended })
      .eq("id", data.userId);
    if (error) throw new Error(`Unable to update the account: ${error.message}`);

    const actor = await resolveActor(context.supabase as never, context.userId);
    const target = await describeUser(context.supabase as never, data.userId);

    await recordAudit(context.supabase as never, {
      actor,
      action: data.suspended ? "user_suspended" : "user_reinstated",
      entityType: "user",
      entityId: data.userId,
      entityLabel: target.name,
      summary: `${data.suspended ? "Suspended" : "Reinstated"} the account for ${target.name}`,
      metadata: { email: target.email },
    });

    const admins = await adminUserIds(context.supabase as never);
    await notifyUsers(context.supabase as never, [data.userId, ...admins], {
      title: data.suspended ? "Account suspended" : "Account reinstated",
      body: `${actor.name} ${data.suspended ? "suspended" : "reinstated"} the account for ${target.name}.`,
      category: "account",
      link: "/users",
    });
    return { userId: data.userId, suspended: data.suspended };
  });

export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateUserSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ userId: string }> => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName, phone: data.phone || null })
      .eq("id", data.userId);
    if (error) throw new Error(`Unable to save the user: ${error.message}`);

    const actor = await resolveActor(context.supabase as never, context.userId);
    await recordAudit(context.supabase as never, {
      actor,
      action: "user_updated",
      entityType: "user",
      entityId: data.userId,
      entityLabel: data.fullName,
      summary: `Updated contact details for ${data.fullName}`,
      metadata: { phone: data.phone || null },
    });
    return { userId: data.userId };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    userId: uuidSchema.parse((input as { userId: string })?.userId),
  }))
  .handler(async ({ data, context }): Promise<{ userId: string }> => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Only a Super Admin can delete accounts.");
    if (data.userId === context.userId) throw new Error("You cannot delete your own account.");

    const actor = await resolveActor(context.supabase as never, context.userId);
    const target = await describeUser(context.supabase as never, data.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(`Unable to delete the account: ${error.message}`);

    await recordAudit(context.supabase as never, {
      actor,
      action: "user_deleted",
      entityType: "user",
      entityId: data.userId,
      entityLabel: target.name,
      summary: `Permanently deleted the account for ${target.name}`,
      metadata: { email: target.email },
    });

    const admins = await adminUserIds(context.supabase as never);
    await notifyUsers(context.supabase as never, admins, {
      title: "Account deleted",
      body: `${actor.name} permanently deleted the account for ${target.name}.`,
      category: "account",
      link: "/audit-log",
    });
    return { userId: data.userId };
  });

/**
 * Creates a staff account directly. Super Admin only: it provisions the auth
 * user with a confirmed email, then grants the chosen role.
 */
export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ userId: string }> => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Only a Super Admin can create accounts.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) {
      throw new Error(`Unable to create the account: ${error?.message ?? "unknown error"}`);
    }
    const newUserId = created.user.id;

    await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.fullName, email: data.email })
      .eq("id", newUserId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (roleError) throw new Error(`Account created, but the role failed: ${roleError.message}`);

    const actor = await resolveActor(context.supabase as never, context.userId);
    await recordAudit(context.supabase as never, {
      actor,
      action: "role_assigned",
      entityType: "user",
      entityId: newUserId,
      entityLabel: data.fullName,
      summary: `Created the account for ${data.fullName} as ${ROLE_LABELS[data.role]}`,
      metadata: { email: data.email, to: data.role },
    });
    await notifyUsers(context.supabase as never, [newUserId], {
      title: "Welcome to EduMaster",
      body: `${actor.name} created your account with the ${ROLE_LABELS[data.role]} role.`,
      category: "account",
      link: "/dashboard",
    });
    return { userId: newUserId };
  });
