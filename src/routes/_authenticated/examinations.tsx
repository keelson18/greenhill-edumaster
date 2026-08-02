import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus, Printer, Save, Trophy, Lock } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TermSelect } from "@/components/TermSelect";
import { TermLockBar } from "@/components/TermLockBar";
import {
  GRADE_LEVELS,
  GRADE_SCOPE_LABEL,
  SCHOOL_PROFILE,
  type GradeLevel,
  type PerfLevel,
} from "@/config/app.config";
import {
  createExam,
  getMarkSheet,
  listExams,
  listSubjects,
  saveMarks,
} from "@/lib/api/school.functions";
import { formatDate, mean, perfLabel, perfLevel } from "@/lib/domain/grading";
import { useTerm } from "@/lib/term-context";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/examinations")({
  head: () => ({
    meta: [
      { title: "Examinations & Marks Entry | EduMaster Ghana" },
      {
        name: "description",
        content:
          "Create termly examinations, enter marks with live totals and performance bands, rank learners and print terminal report cards for KG1 to Basic 9.",
      },
      { property: "og:title", content: "Examinations & Marks Entry | EduMaster Ghana" },
      {
        property: "og:description",
        content: "Termly marks entry, ranking and printable report cards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExamsPage,
});

const levelClass: Record<PerfLevel, string> = {
  HP: "bg-success/15 text-success border-success/30",
  P: "bg-primary/10 text-primary border-primary/25",
  AP: "bg-warning/20 text-warning border-warning/40",
  D: "bg-destructive/10 text-destructive border-destructive/30",
};

function LevelBadge({ pct }: { pct: number }) {
  const level = perfLevel(pct);
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${levelClass[level]}`}
      title={perfLabel(level)}
    >
      {level}
    </span>
  );
}

function downloadFile(name: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ExamsPage() {
  const { term, termId, isLocked } = useTerm();
  const { isAdmin, hasRole } = useAuth();
  const canEdit = isAdmin || hasRole("teacher");
  const locked = isLocked();
  const queryClient = useQueryClient();

  const [grade, setGrade] = useState<GradeLevel>("Basic 7");
  const [examId, setExamId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, number>>>({});
  const [dirty, setDirty] = useState(false);
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);
  const [newExamOpen, setNewExamOpen] = useState(false);

  const examsQuery = useQuery({
    queryKey: ["exams", termId],
    queryFn: () => listExams({ data: { termCode: termId } }),
    enabled: Boolean(termId),
  });
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: () => listSubjects() });

  const exams = examsQuery.data ?? [];
  const activeExamId = examId && exams.some((e) => e.id === examId) ? examId : exams[0]?.id ?? null;
  const activeExam = exams.find((e) => e.id === activeExamId) ?? null;

  const sheetQuery = useQuery({
    queryKey: ["marksheet", activeExamId, grade],
    queryFn: () => getMarkSheet({ data: { examId: activeExamId!, grade } }),
    enabled: Boolean(activeExamId),
  });

  // Reset local edits whenever the source sheet changes.
  useEffect(() => {
    setDraft({});
    setDirty(false);
    setReportStudentId(null);
  }, [activeExamId, grade, termId]);

  const subjects = sheetQuery.data?.subjects ?? subjectsQuery.data ?? [];
  const sheetRows = sheetQuery.data?.rows ?? [];

  const scoreOf = (studentId: string, subjectId: string) =>
    draft[studentId]?.[subjectId] ??
    sheetRows.find((r) => r.studentId === studentId)?.scores[subjectId] ??
    null;

  const computed = useMemo(() => {
    const withTotals = sheetRows.map((row) => {
      const scores = subjects.map((s) => scoreOf(row.studentId, s.id) ?? 0);
      const entered = subjects.filter((s) => scoreOf(row.studentId, s.id) !== null).length;
      const total = scores.reduce((a, b) => a + b, 0);
      const pct = subjects.length
        ? Math.round((total / (subjects.length * 100)) * 1000) / 10
        : 0;
      return { ...row, total, pct, entered };
    });
    const ranked = [...withTotals].sort((a, b) => b.total - a.total);
    return { withTotals, ranked };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetRows, subjects, draft]);

  const classMean = mean(computed.withTotals.map((r) => r.pct));
  const completion = subjects.length && sheetRows.length
    ? Math.round(
        (computed.withTotals.reduce((s, r) => s + r.entered, 0) /
          (subjects.length * sheetRows.length)) *
          100,
      )
    : 0;

  const setMark = (studentId: string, subjectId: string, value: string) => {
    if (locked) {
      toast.error(`${term.label} is closed — reopen the term to edit marks`);
      return;
    }
    const numeric = value === "" ? 0 : Math.max(0, Math.min(100, Number(value)));
    if (Number.isNaN(numeric)) return;
    setDraft((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [subjectId]: numeric },
    }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const entries = Object.entries(draft).flatMap(([studentId, scores]) =>
        Object.entries(scores).map(([subjectId, score]) => ({ studentId, subjectId, score })),
      );
      if (!activeExamId || entries.length === 0) {
        throw new Error("There are no changes to save.");
      }
      return saveMarks({ data: { examId: activeExamId, entries } });
    },
    onSuccess: (result) => {
      setDraft({});
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["marksheet"] });
      queryClient.invalidateQueries({ queryKey: ["exams", termId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["grade-performance"] });
      toast.success(`${result.saved} marks saved for ${grade}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const exportRanking = () => {
    const header = ["Position", "Learner", "Admission no", "Total", "Percentage", "Band"];
    const rows = computed.ranked.map((r, i) => [
      String(i + 1),
      r.fullName,
      r.admissionNo,
      String(r.total),
      `${r.pct}%`,
      perfLevel(r.pct),
    ]);
    downloadFile(
      `edumaster-${termId}-${grade.replace(/\s+/g, "-").toLowerCase()}-ranking.csv`,
      [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n"),
    );
    toast.success("Ranking exported");
  };

  const reportRow = computed.withTotals.find((r) => r.studentId === reportStudentId) ?? null;

  return (
    <AppLayout
      title="Examinations"
      subtitle={`Marks entry, ranking and report cards for ${term.label}.`}
      actions={
        <>
          <TermSelect />
          {canEdit && (
            <Button onClick={() => setNewExamOpen(true)} disabled={locked}>
              <Plus className="mr-1.5 size-4" /> New examination
            </Button>
          )}
        </>
      }
    >
      <TermLockBar className="mb-6" />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Examination</Label>
            <Select
              value={activeExamId ?? ""}
              onValueChange={setExamId}
              disabled={exams.length === 0}
            >
              <SelectTrigger className="w-[260px]" aria-label="Select examination">
                <SelectValue placeholder="No examinations this term" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Class</Label>
            <Select value={grade} onValueChange={(v) => setGrade(v as GradeLevel)}>
              <SelectTrigger className="w-[160px]" aria-label="Select class">
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
          {activeExam && (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <Badge variant="secondary">{activeExam.status}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(activeExam.startsOn)} – {formatDate(activeExam.endsOn)} ·{" "}
                {activeExam.marksEntered} marks recorded
              </span>
            </div>
          )}
          {locked && (
            <Badge variant="outline" className="gap-1 pb-1 text-muted-foreground">
              <Lock className="size-3" aria-hidden /> Term closed
            </Badge>
          )}
        </CardContent>
      </Card>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No examinations exist for {term.label} yet.
            {canEdit && !locked && " Create one to begin entering marks."}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="entry">
          <TabsList>
            <TabsTrigger value="entry">Marks entry</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="reports">Report cards</TabsTrigger>
          </TabsList>

          <TabsContent value="entry" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">
                    {grade} · {activeExam?.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Class mean {classMean}% · {completion}% of the sheet completed
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={completion} className="w-32" />
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={!canEdit || locked || !dirty || saveMutation.isPending}
                  >
                    <Save className="mr-1.5 size-4" />
                    {saveMutation.isPending ? "Saving…" : dirty ? "Save marks" : "Saved"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {sheetQuery.isLoading ? (
                  <p className="py-14 text-center text-sm text-muted-foreground">Loading sheet…</p>
                ) : sheetRows.length === 0 ? (
                  <p className="py-14 text-center text-sm text-muted-foreground">
                    No active learners in {grade}.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Learner</TableHead>
                        {subjects.map((s) => (
                          <TableHead key={s.id} className="text-center">
                            {s.code}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-center">Band</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computed.withTotals.map((row) => (
                        <TableRow key={row.studentId}>
                          <TableCell>
                            <p className="font-medium">{row.fullName}</p>
                            <p className="text-xs text-muted-foreground">{row.admissionNo}</p>
                          </TableCell>
                          {subjects.map((s) => (
                            <TableCell key={s.id} className="text-center">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                inputMode="numeric"
                                aria-label={`${s.name} score for ${row.fullName}`}
                                className="h-9 w-16 text-center"
                                disabled={locked || !canEdit}
                                value={scoreOf(row.studentId, s.id) ?? ""}
                                onChange={(e) => setMark(row.studentId, s.id, e.target.value)}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-medium">{row.total}</TableCell>
                          <TableCell className="text-right">{row.pct}%</TableCell>
                          <TableCell className="text-center">
                            <LevelBadge pct={row.pct} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranking" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Position list — {grade}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ranked on total marks across {subjects.length} subjects.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={exportRanking}
                  disabled={computed.ranked.length === 0}
                >
                  <FileDown className="mr-1.5 size-4" /> Export ranking
                </Button>
              </CardHeader>
              <CardContent>
                {computed.ranked.length === 0 ? (
                  <p className="py-14 text-center text-sm text-muted-foreground">
                    No learners to rank yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Pos</TableHead>
                        <TableHead>Learner</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-center">Band</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computed.ranked.map((row, index) => (
                        <TableRow key={row.studentId}>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 font-medium">
                              {index < 3 && (
                                <Trophy className="size-3.5 text-warning" aria-hidden />
                              )}
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{row.fullName}</p>
                            <p className="text-xs text-muted-foreground">{row.admissionNo}</p>
                          </TableCell>
                          <TableCell className="text-right font-medium">{row.total}</TableCell>
                          <TableCell className="text-right">{row.pct}%</TableCell>
                          <TableCell className="text-center">
                            <LevelBadge pct={row.pct} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Terminal report card</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {term.label} · {GRADE_SCOPE_LABEL}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={reportStudentId ?? ""} onValueChange={setReportStudentId}>
                    <SelectTrigger className="w-[220px]" aria-label="Select learner">
                      <SelectValue placeholder="Choose a learner" />
                    </SelectTrigger>
                    <SelectContent>
                      {computed.withTotals.map((r) => (
                        <SelectItem key={r.studentId} value={r.studentId}>
                          {r.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    disabled={!reportRow}
                  >
                    <Printer className="mr-1.5 size-4" /> Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!reportRow ? (
                  <p className="py-14 text-center text-sm text-muted-foreground">
                    Select a learner to preview their report card.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border p-6">
                    <div className="mb-4 border-b border-border pb-4 text-center">
                      <h2 className="text-lg font-semibold">{SCHOOL_PROFILE.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {SCHOOL_PROFILE.address ?? "Ghana"} · {term.label}
                      </p>
                    </div>
                    <div className="mb-4 grid gap-2 text-sm sm:grid-cols-3">
                      <p>
                        <span className="text-muted-foreground">Learner:</span>{" "}
                        <strong>{reportRow.fullName}</strong>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Admission no:</span>{" "}
                        {reportRow.admissionNo}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Class:</span> {grade}
                      </p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-center">Band</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjects.map((s) => {
                          const score = scoreOf(reportRow.studentId, s.id) ?? 0;
                          return (
                            <TableRow key={s.id}>
                              <TableCell>{s.name}</TableCell>
                              <TableCell className="text-right">{score}</TableCell>
                              <TableCell className="text-center">
                                <LevelBadge pct={score} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm">
                      <span>
                        Total <strong>{reportRow.total}</strong> · Average{" "}
                        <strong>{reportRow.pct}%</strong>
                      </span>
                      <span className="flex items-center gap-2">
                        Overall band <LevelBadge pct={reportRow.pct} />
                        <span className="text-muted-foreground">
                          {perfLabel(perfLevel(reportRow.pct))}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <NewExamDialog
        open={newExamOpen}
        onOpenChange={setNewExamOpen}
        termCode={termId}
        onCreated={(id) => {
          setExamId(id);
          queryClient.invalidateQueries({ queryKey: ["exams", termId] });
        }}
      />
    </AppLayout>
  );
}

function NewExamDialog({
  open,
  onOpenChange,
  termCode,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termCode: string;
  onCreated: (id: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);

  const mutation = useMutation({
    mutationFn: () =>
      createExam({
        data: { termCode, name, gradeScope: GRADE_SCOPE_LABEL, startsOn, endsOn },
      }),
    onSuccess: (result) => {
      toast.success("Examination created");
      onCreated(result.id);
      onOpenChange(false);
      setName("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New examination</DialogTitle>
          <DialogDescription>
            Creates a draft assessment for the selected term across {GRADE_SCOPE_LABEL}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="End of Term Examination"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Starts on</Label>
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ends on</Label>
              <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || name.length < 3}>
            {mutation.isPending ? "Creating…" : "Create examination"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
