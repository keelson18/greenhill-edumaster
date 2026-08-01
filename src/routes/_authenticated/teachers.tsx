import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, StatCards } from "@/components/DataTable";
import { listStaff, saveStaff, deleteStaff } from "@/lib/api/operations.functions";
import { formatCurrency, formatDate, formatPhone } from "@/lib/domain/grading";
import { useAuth } from "@/lib/auth-context";
import type { StaffDTO } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/teachers")({
  head: () => ({
    meta: [
      { title: "Staff & Teachers | EduMaster" },
      {
        name: "description",
        content:
          "Staff establishment, subject allocation, salaries and employment status for the school.",
      },
      { property: "og:title", content: "Staff & Teachers | EduMaster" },
      {
        property: "og:description",
        content: "Staff establishment, subject allocation and salaries.",
      },
    ],
  }),
  component: StaffPage,
});

const EMPTY = {
  staffNo: "",
  fullName: "",
  jobTitle: "Teacher",
  department: "Academic",
  subject: "",
  phone: "",
  email: "",
  monthlySalary: "0",
};

function StaffPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff"],
    queryFn: () => listStaff(),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((s) =>
      [s.fullName, s.staffNo, s.jobTitle, s.subject ?? ""].some((v) =>
        v.toLowerCase().includes(term),
      ),
    );
  }, [data, search]);

  const save = useMutation({
    mutationFn: () =>
      saveStaff({
        data: {
          staffNo: form.staffNo,
          fullName: form.fullName,
          jobTitle: form.jobTitle,
          department: form.department,
          subject: form.subject,
          phone: form.phone,
          email: form.email,
          status: "Active" as const,
          monthlySalary: Number(form.monthlySalary) || 0,
          hiredOn: "",
        },
      }),
    onSuccess: () => {
      toast.success("Staff member saved");
      setOpen(false);
      setForm({ ...EMPTY });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteStaff({ data: { id } }),
    onSuccess: () => {
      toast.success("Staff member removed");
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    const teaching = list.filter((s) => s.department === "Academic").length;
    const payroll = list.reduce((sum, s) => sum + s.monthlySalary, 0);
    return [
      { label: "Staff on record", value: String(list.length) },
      { label: "Teaching staff", value: String(teaching) },
      { label: "On leave", value: String(list.filter((s) => s.status === "On leave").length) },
      { label: "Monthly salary bill", value: formatCurrency(payroll) },
    ];
  }, [data]);

  return (
    <AppLayout
      title="Staff & Teachers"
      subtitle="Establishment, subject allocation and employment status."
      actions={
        isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add staff member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New staff member</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["staffNo", "Staff number"],
                    ["fullName", "Full name"],
                    ["jobTitle", "Job title"],
                    ["department", "Department"],
                    ["subject", "Subject"],
                    ["phone", "Phone (+233…)"],
                    ["email", "Email"],
                    ["monthlySalary", "Monthly salary (₵)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || !form.fullName || !form.staffNo}
                >
                  {save.isPending ? "Saving…" : "Save staff member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null
      }
    >
      <StatCards stats={stats} />
      <Card>
        <CardContent className="p-5">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, staff number or subject…"
            className="mb-4 max-w-sm"
            aria-label="Search staff"
          />
          <DataTable<StaffDTO>
            rows={rows}
            isLoading={isLoading}
            error={error}
            rowKey={(r) => r.id}
            emptyMessage="No staff records match this search."
            columns={[
              { key: "no", header: "Staff no", render: (r) => r.staffNo },
              {
                key: "name",
                header: "Name",
                render: (r) => (
                  <div>
                    <p className="font-medium">{r.fullName}</p>
                    <p className="text-xs text-muted-foreground">{r.jobTitle}</p>
                  </div>
                ),
              },
              { key: "subject", header: "Subject", render: (r) => r.subject ?? "—" },
              { key: "phone", header: "Phone", render: (r) => formatPhone(r.phone) },
              { key: "hired", header: "Hired", render: (r) => formatDate(r.hiredOn) },
              {
                key: "salary",
                header: "Salary",
                render: (r) => formatCurrency(r.monthlySalary),
              },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <Badge variant={r.status === "Active" ? "secondary" : "outline"}>
                    {r.status}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (r) =>
                  isAdmin ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove.mutate(r.id)}
                      disabled={remove.isPending}
                    >
                      Remove
                    </Button>
                  ) : null,
              },
            ]}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
