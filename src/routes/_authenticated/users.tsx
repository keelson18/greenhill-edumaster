import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, Trash2, Pencil, UserCheck, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, StatCards, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type AppRole } from "@/config/app.config";
import {
  assignRole,
  createUser,
  deleteUser,
  listUsers,
  setUserSuspended,
  updateUserProfile,
} from "@/lib/api/users.functions";
import { formatDate, formatNumber } from "@/lib/domain/grading";
import type { ManagedUserDTO } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "User & Role Management | EduMaster Ghana" },
      {
        name: "description",
        content:
          "Administer staff accounts for EduMaster: assign roles from Super Admin to Librarian, suspend accounts and keep contact details current.",
      },
      { property: "og:title", content: "User & Role Management | EduMaster Ghana" },
      {
        property: "og:description",
        content: "Assign roles, suspend accounts and manage staff access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

const EMPTY_NEW_USER = {
  fullName: "",
  email: "",
  password: "",
  role: "teacher" as AppRole,
};

function UsersPage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ManagedUserDTO | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);

  const query = useQuery({
    queryKey: ["managed-users"],
    queryFn: () => listUsers(),
    enabled: isAdmin,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["managed-users"] });

  const createMutation = useMutation({
    mutationFn: (input: typeof EMPTY_NEW_USER) => createUser({ data: input }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setNewUser(EMPTY_NEW_USER);
      toast.success("Account created");
    },
    onError: (error: Error) => toast.error(error.message),
  });


  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: AppRole }) => assignRole({ data: input }),
    onSuccess: (result) => {
      invalidate();
      toast.success(`Role set to ${ROLE_LABELS[result.role]}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const suspendMutation = useMutation({
    mutationFn: (input: { userId: string; suspended: boolean }) =>
      setUserSuspended({ data: input }),
    onSuccess: (result) => {
      invalidate();
      toast.success(result.suspended ? "Account suspended" : "Account reinstated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const profileMutation = useMutation({
    mutationFn: (input: { userId: string; fullName: string; phone: string }) =>
      updateUserProfile({ data: input }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("User details saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser({ data: { userId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Account deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const users = query.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(term) ||
        (u.email ?? "").toLowerCase().includes(term) ||
        u.roles.some((r) => ROLE_LABELS[r].toLowerCase().includes(term)),
    );
  }, [users, search]);

  const stats = [
    { label: "Accounts", value: formatNumber(users.length), hint: "All registered users" },
    {
      label: "Active",
      value: formatNumber(users.filter((u) => !u.isSuspended).length),
      hint: "Can sign in",
    },
    {
      label: "Suspended",
      value: formatNumber(users.filter((u) => u.isSuspended).length),
      hint: "Access blocked",
    },
    {
      label: "Administrators",
      value: formatNumber(
        users.filter((u) => u.roles.some((r) => r === "admin" || r === "super_admin")).length,
      ),
      hint: "Super Admin & Admin",
    },
  ];

  const columns: ReadonlyArray<Column<ManagedUserDTO>> = [
    {
      key: "user",
      header: "User",
      render: (u) => (
        <div>
          <p className="font-medium">{u.fullName || "Unnamed user"}</p>
          <p className="text-xs text-muted-foreground">{u.email ?? "No email"}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (u) => <span className="text-muted-foreground">{u.phone || "—"}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <Select
          value={u.roles[0] ?? "staff"}
          onValueChange={(role) => roleMutation.mutate({ userId: u.id, role: role as AppRole })}
          disabled={roleMutation.isPending || u.id === user?.id}
        >
          <SelectTrigger className="h-9 w-[170px]" aria-label={`Role for ${u.fullName}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <Badge variant={u.isSuspended ? "outline" : "secondary"}>
          {u.isSuspended ? "Suspended" : "Active"}
        </Badge>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (u) => <span className="text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (u) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit user"
            onClick={() => {
              setEditing(u);
              setFullName(u.fullName);
              setPhone(u.phone ?? "");
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={u.isSuspended ? "Reinstate account" : "Suspend account"}
            disabled={u.id === user?.id || suspendMutation.isPending}
            onClick={() => suspendMutation.mutate({ userId: u.id, suspended: !u.isSuspended })}
          >
            {u.isSuspended ? (
              <UserCheck className="size-4 text-success" />
            ) : (
              <UserX className="size-4 text-warning" />
            )}
          </Button>
          {user?.isSuperAdmin && u.id !== user.id && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Delete account"
              onClick={() => {
                if (window.confirm(`Permanently delete ${u.fullName || u.email}?`)) {
                  deleteMutation.mutate(u.id);
                }
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <AppLayout title="User management" subtitle="Administrator access is required.">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ShieldCheck className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Only Super Admins and Admins can manage user accounts and roles.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="User management"
      subtitle="Assign roles, suspend access and keep staff contact details current."
      actions={
        user?.isSuperAdmin ? (
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-1.5 size-4" aria-hidden /> Add user
          </Button>
        ) : undefined
      }
    >
      <StatCards stats={stats} />

      <Card>
        <CardContent className="p-5">
          <div className="relative mb-4 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or role"
              className="pl-9"
              aria-label="Search users"
            />
          </div>

          <DataTable
            rows={filtered}
            columns={columns}
            isLoading={query.isLoading}
            error={query.error}
            rowKey={(u) => u.id}
            emptyMessage="No user accounts match this search."
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r} className="rounded-xl border border-border/70 p-3">
              <p className="text-sm font-medium">{ROLE_LABELS[r]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Create a staff account and grant it a role. The person can sign in immediately with
              the password you set here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full name</Label>
              <Input
                value={newUser.fullName}
                onChange={(e) => setNewUser((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Ama Mensah"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                placeholder="ama.mensah@school.edu.gh"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Temporary password</Label>
              <Input
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(role) => setNewUser((p) => ({ ...p, role: role as AppRole }))}
              >
                <SelectTrigger aria-label="Role for the new account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate(newUser)}
            >
              {createMutation.isPending ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update the display name and contact phone for this account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233 24 512 3390"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={profileMutation.isPending || !editing}
              onClick={() =>
                editing && profileMutation.mutate({ userId: editing.id, fullName, phone })
              }
            >
              {profileMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
