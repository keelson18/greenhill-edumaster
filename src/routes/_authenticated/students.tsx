import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Pencil, FileDown } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, StatCards, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GRADE_LEVELS,
  PAGINATION,
  type GradeLevel,
} from "@/config/app.config";
import {
  createStudent,
  deleteStudent,
  listStudents,
  updateStudent,
} from "@/lib/api/school.functions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/domain/grading";
import { studentInputSchema } from "@/lib/validation/schemas";
import type { StudentDTO } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";
import { StudentDialog, EMPTY_FORM, STATUSES, toForm, type FormState } from "@/components/students/StudentDialog";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Learner Management | EduMaster Ghana" },
      {
        name: "description",
        content:
          "Admit, search and manage learners from KG1 to Basic 9 with GES IDs, guardian contacts, Ghana Post GPS addresses and term fee billing in Ghana Cedis.",
      },
      { property: "og:title", content: "Learner Management | EduMaster Ghana" },
      {
        property: "og:description",
        content: "Learner records with GES IDs, guardian contacts and fee billing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const { isAdmin, hasRole } = useAuth();
  const canEdit = isAdmin || hasRole("teacher");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<StudentDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const query = useQuery({
    queryKey: ["students", { search, grade, status, page }],
    queryFn: () =>
      listStudents({
        data: {
          page,
          pageSize: PAGINATION.defaultPageSize,
          search: search || undefined,
          grade: grade === "all" ? undefined : (grade as GradeLevel),
          status: status === "all" ? undefined : (status as (typeof STATUSES)[number]),
        },
      }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    queryClient.invalidateQueries({ queryKey: ["enrolment-by-grade"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (input: { form: FormState; id: string | null }) => {
      const parsed = studentInputSchema.parse({
        ...input.form,
        region: input.form.region || undefined,
        district: input.form.district || undefined,
        town: input.form.town || undefined,
        feeBilled: Number(input.form.feeBilled || 0),
      });
      return input.id
        ? updateStudent({ data: { ...parsed, id: input.id } })
        : createStudent({ data: parsed });
    },
    onSuccess: (_data, vars) => {
      invalidate();
      setDialogOpen(false);
      setEditing(null);
      toast.success(vars.id ? "Learner updated" : "Learner admitted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteStudent({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Learner removed from the roll");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const result = query.data;
  const rows = result?.items ?? [];

  const stats = useMemo(
    () => [
      { label: "Learners matching", value: formatNumber(result?.total ?? 0), hint: "Current filter" },
      {
        label: "Active on this page",
        value: formatNumber(rows.filter((r) => r.status === "Active").length),
        hint: `Page ${result?.page ?? 1} of ${result?.pageCount ?? 1}`,
      },
      {
        label: "Term billing on page",
        value: formatCurrency(rows.reduce((sum, r) => sum + r.feeBilled, 0)),
        hint: "Sum of fees billed",
      },
      {
        label: "Classes covered",
        value: String(new Set(rows.map((r) => r.gradeLevel)).size),
        hint: "KG1 – Basic 9",
      },
    ],
    [result, rows],
  );

  const exportCsv = () => {
    const header = [
      "Full name",
      "Admission no",
      "GES ID",
      "Class",
      "Stream",
      "Gender",
      "Guardian",
      "Phone",
      "Status",
      "Fee billed",
    ];
    const csv = [
      header,
      ...rows.map((r) => [
        r.fullName,
        r.admissionNo,
        r.gesId,
        r.gradeLevel,
        r.stream,
        r.gender,
        r.guardianName,
        r.guardianPhone,
        r.status,
        String(r.feeBilled),
      ]),
    ]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `edumaster-learners-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Learner list exported");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (student: StudentDTO) => {
    setEditing(student);
    setForm(toForm(student));
    setDialogOpen(true);
  };

  const columns: ReadonlyArray<Column<StudentDTO>> = [
    {
      key: "name",
      header: "Learner",
      render: (r) => (
        <div>
          <p className="font-medium">{r.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {r.admissionNo} · GES {r.gesId}
          </p>
        </div>
      ),
    },
    { key: "class", header: "Class", render: (r) => `${r.gradeLevel} ${r.stream}` },
    {
      key: "guardian",
      header: "Guardian",
      render: (r) => (
        <div>
          <p>{r.guardianName}</p>
          <p className="text-xs text-muted-foreground">{r.guardianPhone}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (r) => (
        <span className="text-muted-foreground">
          {[r.town, r.district, r.region].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    { key: "fee", header: "Fee billed", render: (r) => formatCurrency(r.feeBilled) },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={r.status === "Active" ? "secondary" : "outline"}>{r.status}</Badge>
      ),
    },
    {
      key: "admitted",
      header: "Admitted",
      render: (r) => <span className="text-muted-foreground">{formatDate(r.admittedOn)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) =>
        canEdit ? (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label="Edit learner" onClick={() => openEdit(r)}>
              <Pencil className="size-4" />
            </Button>
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove learner"
                onClick={() => {
                  if (window.confirm(`Remove ${r.fullName} from the roll?`)) {
                    removeMutation.mutate(r.id);
                  }
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <AppLayout
      title="Learners"
      subtitle="Admissions, guardian contacts and term fee billing for KG1 to Basic 9."
      actions={
        <>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <FileDown className="mr-1.5 size-4" /> Export page
          </Button>
          {canEdit && (
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 size-4" /> Admit learner
            </Button>
          )}
        </>
      }
    >
      <StatCards stats={stats} />

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, admission number or GES ID"
                className="pl-9"
                aria-label="Search learners"
              />
            </div>
            <Select
              value={grade}
              onValueChange={(v) => {
                setGrade(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]" aria-label="Filter by class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {GRADE_LEVELS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            rows={rows}
            columns={columns}
            isLoading={query.isLoading}
            error={query.error}
            rowKey={(r) => r.id}
            emptyMessage="No learners match these filters."
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Page {result?.page ?? 1} of {result?.pageCount ?? 1} · {formatNumber(result?.total ?? 0)}{" "}
              learners
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(result?.page ?? 1) <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={(result?.page ?? 1) >= (result?.pageCount ?? 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <StudentDialog
        dialogOpen={dialogOpen} setDialogOpen={setDialogOpen}
        editing={editing} form={form} setForm={setForm}
        saving={saveMutation.isPending}
        onSave={() => saveMutation.mutate({ form, id: editing?.id ?? null })}
      />
    </AppLayout>
  );
}
