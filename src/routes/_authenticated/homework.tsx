import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { listHomework, saveHomework, deleteHomework } from "@/lib/api/operations.functions";
import { listSubjects } from "@/lib/api/school.functions";
import { formatDate } from "@/lib/domain/grading";
import { GRADE_LEVELS } from "@/config/app.config";
import { useAuth } from "@/lib/auth-context";
import type { HomeworkDTO } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/homework")({
  head: () => ({
    meta: [
      { title: "Homework | EduMaster" },
      {
        name: "description",
        content: "Assignments issued to KG1–Basic 9 classes, with due dates and status.",
      },
      { property: "og:title", content: "Homework | EduMaster" },
      { property: "og:description", content: "Assignments issued, due and closed." },
    ],
  }),
  component: HomeworkPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function HomeworkPage() {
  const { isAdmin, hasRole } = useAuth();
  const canWrite = isAdmin || hasRole("teacher");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [classFilter, setClassFilter] = useState("all");
  const [form, setForm] = useState({
    title: "",
    classLevel: GRADE_LEVELS[6] as string,
    subjectId: "",
    description: "",
    dueOn: today(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["homework"],
    queryFn: () => listHomework(),
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: () => listSubjects() });

  const rows = useMemo(
    () => (data ?? []).filter((h) => classFilter === "all" || h.classLevel === classFilter),
    [data, classFilter],
  );

  const save = useMutation({
    mutationFn: () =>
      saveHomework({
        data: {
          title: form.title,
          classLevel: form.classLevel as (typeof GRADE_LEVELS)[number],
          subjectId: form.subjectId,
          description: form.description,
          assignedOn: today(),
          dueOn: form.dueOn,
          status: "Open" as const,
        },
      }),
    onSuccess: () => {
      toast.success("Assignment published");
      setOpen(false);
      setForm((f) => ({ ...f, title: "", description: "" }));
      void queryClient.invalidateQueries({ queryKey: ["homework"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteHomework({ data: { id } }),
    onSuccess: () => {
      toast.success("Assignment removed");
      void queryClient.invalidateQueries({ queryKey: ["homework"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    const overdue = list.filter((h) => h.status !== "Closed" && h.dueOn < today()).length;
    return [
      { label: "Assignments", value: String(list.length) },
      { label: "Open", value: String(list.filter((h) => h.status === "Open").length) },
      { label: "Overdue", value: String(overdue) },
      { label: "Closed", value: String(list.filter((h) => h.status === "Closed").length) },
    ];
  }, [data]);

  return (
    <AppLayout
      title="Homework"
      subtitle="Assignments issued, due and closed across the school."
      actions={
        canWrite ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hw-title">Title</Label>
                  <Input
                    id="hw-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Class</Label>
                    <Select
                      value={form.classLevel}
                      onValueChange={(v) => setForm((f) => ({ ...f, classLevel: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject</Label>
                    <Select
                      value={form.subjectId}
                      onValueChange={(v) => setForm((f) => ({ ...f, subjectId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {(subjects ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hw-due">Due</Label>
                    <Input
                      id="hw-due"
                      type="date"
                      value={form.dueOn}
                      onChange={(e) => setForm((f) => ({ ...f, dueOn: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hw-desc">Instructions</Label>
                  <Textarea
                    id="hw-desc"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || form.title.trim().length < 3}
                >
                  {save.isPending ? "Publishing…" : "Publish assignment"}
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
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="mb-4 w-48" aria-label="Filter by class">
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
          <DataTable<HomeworkDTO>
            rows={rows}
            isLoading={isLoading}
            error={error}
            rowKey={(r) => r.id}
            emptyMessage="No assignments for this class yet."
            columns={[
              {
                key: "title",
                header: "Assignment",
                render: (r) => (
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{r.description}</p>
                  </div>
                ),
              },
              { key: "class", header: "Class", render: (r) => r.classLevel },
              { key: "subject", header: "Subject", render: (r) => r.subjectName ?? "—" },
              { key: "assigned", header: "Assigned", render: (r) => formatDate(r.assignedOn) },
              { key: "due", header: "Due", render: (r) => formatDate(r.dueOn) },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <Badge
                    variant={
                      r.status === "Closed"
                        ? "outline"
                        : r.dueOn < today()
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {r.status === "Closed" ? "Closed" : r.dueOn < today() ? "Overdue" : "Open"}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (r) =>
                  canWrite ? (
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}>
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
