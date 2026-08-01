import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assignRoleSchema,
  suspendUserSchema,
  updateUserSchema,
  uuidSchema,
} from "@/lib/validation/schemas";
import type { AppRole } from "@/config/app.config";
import type { ManagedUserDTO } from "@/lib/api/types";

/**
 * User management. Every function re-checks the caller is an administrator
 * against the database (never against client state) before acting.
 */

async function assertAdmin(context: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
}) {
  const { data } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (!data) throw new Error("You do not have permission to manage users.");
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

    const { error: clearError } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (clearError) throw new Error(`Unable to update the role: ${clearError.message}`);

    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(`Unable to assign the role: ${error.message}`);
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(`Unable to delete the account: ${error.message}`);
    return { userId: data.userId };
  });
