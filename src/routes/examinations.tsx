import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, FileDown, Plus, Save, Trophy, Printer, Lock } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  GRADES,
  SUBJECTS,
  SCHOOL,
  examsFor,
  marksForTerm,
  cbcLevel,
  CBC_LABEL,
  type Exam,
  type CbcLevel,
  type Grade,
} from "@/lib/edumaster-data";
import { useTerm } from "@/lib/term-context";
import { TermSelect } from "@/components/TermSelect";
import { TermLockBar } from "@/components/TermLockBar";

export const Route = createFileRoute("/examinations")({
  head: () => ({
    meta: [
      { title: "Examinations & CBC Marks Entry | EduMaster" },
      {
        name: "description",
        content:
          "Compile CBC exams per academic term, enter marks with live totals, rank results and generate competency-based report cards for PP1 to Grade 9 learners.",
      },
      { property: "og:title", content: "Examinations & CBC Marks Entry | EduMaster" },
      {
        property: "og:description",
        content: "Term-based marks entry, ranking, AI exam compiler and CBC report cards.",
      },
    ],
  }),
  component: ExamsPage,
});

const levelClass: Record<CbcLevel, string> = {
  EE: "bg-success/15 text-success border-success/30",
  ME: "bg-primary/10 text-primary border-primary/25",
  AE: "bg-warning/20 text-warning border-warning/40",
  BE: "bg-destructive/10 text-destructive border-destructive/30",
};

function LevelBadge({ pct }: { pct: number }) {
  const l = cbcLevel(pct);
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${levelClass[l]}`}
      title={CBC_LABEL[l]}
    >
      {l}
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
  const locked = isLocked();
  const [grade, setGrade] = useState<Grade>("Grade 7");
  const [rows, setRows] = useState(() => marksForTerm("Grade 7", termId));
  const [saved, setSaved] = useState(true);
  const [extraExams, setExtraExams] = useState<Exam[]>([]);
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);

  // Reload marks whenever the term or grade changes.
  useEffect(() => {
    setRows(marksForTerm(grade, termId));
    setSaved(true);
    setReportStudentId(null);
    setExtraExams([]);
  }, [grade, termId]);

  const exams = useMemo(() => [...extraExams, ...examsFor(termId)], [extraExams, termId]);

  const computed = useMemo(() => {
    const withTotals = rows.map((r) => {
      const total = SUBJECTS.reduce((s, sub) => s + (r.marks[sub] ?? 0), 0);
      const pct = Math.round((total / (SUBJECTS.length * 100)) * 1000) / 10;
      return { ...r, total, pct };
    });
    const ranked = [...withTotals].sort((a, b) => b.total - a.total);
    return { withTotals, ranked };
  }, [rows]);

  const classMean =
    computed.withTotals.length
      ? Math.round(
          (computed.withTotals.reduce((s, r) => s + r.pct, 0) / computed.withTotals.length) * 10,
        ) / 10
      : 0;

  const setMark = (studentId: string, subject: string, value: string) => {
    if (locked) {
      toast.error(`${term.label} is locked — reopen the term to edit marks`);
      return;
    }
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    setSaved(false);
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, marks: { ...r.marks, [subject]: v } } : r)),
    );
  };

  const reportLearner =
    computed.ranked.find((r) => r.studentId === reportStudentId) ?? computed.ranked[0];
  const reportPosition = reportLearner
    ? computed.ranked.findIndex((r) => r.studentId === reportLearner.studentId) + 1
    : 0;

  const exportRanking = () => {
    const header = ["Position", "Learner", "Adm", ...SUBJECTS, "Total", "%", "CBC"];
    const body = computed.ranked.map((r, i) => [
      i + 1,
      r.name,
      r.adm,
      ...SUBJECTS.map((s) => r.marks[s]),
      r.total,
      r.pct,
      cbcLevel(r.pct),
    ]);
    downloadFile(
      `${grade.replace(/\s/g, "-")}-${term.id}-ranking.csv`,
      [header, ...body].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n"),
    );
    toast.success(`${grade} ranking exported for ${term.label}`);
  };

  const exportBulkReports = () => {
    const lines = computed.ranked.map(
      (r, i) =>
        `${SCHOOL.name} | ${term.label} | ${grade}\n${r.name} (${r.adm}) — Position ${i + 1} of ${computed.ranked.length}\n` +
        SUBJECTS.map((s) => `  ${s}: ${r.marks[s]} (${cbcLevel(r.marks[s])})`).join("\n") +
        `\n  Mean: ${r.pct}% (${CBC_LABEL[cbcLevel(r.pct)]})\n`,
    );
    downloadFile(
      `${grade.replace(/\s/g, "-")}-${term.id}-report-cards.txt`,
      lines.join("\n"),
      "text/plain;charset=utf-8",
    );
    toast.success(`${computed.ranked.length} ${term.label} report cards generated for ${grade}`);
  };

  return (
    <AppLayout
      title="Examinations"
      subtitle={`Compile assessments, capture marks and publish CBC report cards for ${term.label}.`}
      actions={
        <NewExamDialog
          disabled={locked}
          termLabel={term.label}
          onCreate={(exam) => {
            setExtraExams((p) => [exam, ...p]);
            toast.success(`${exam.name} created for ${term.label}`);
          }}
        />
      }
    >
      <TermLockBar className="mb-4" />

      <Tabs defaultValue="exams" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted p-1">
          <TabsTrigger value="exams">Examinations</TabsTrigger>
          <TabsTrigger value="compilation">Marks Compilation</TabsTrigger>
          <TabsTrigger value="entry">Marks Entry</TabsTrigger>
          <TabsTrigger value="results">Results &amp; Ranking</TabsTrigger>
          <TabsTrigger value="ai">AI Exam Compiler</TabsTrigger>
          <TabsTrigger value="reports">Report Cards</TabsTrigger>
        </TabsList>

        {/* Examinations list */}
        <TabsContent value="exams">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
              <CardTitle className="text-base">{term.label} examinations</CardTitle>
              <TermSelect />
            </CardHeader>
            <CardContent className="overflow-x-auto px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Examination</TableHead>
                    <TableHead>Grades</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Marks entered</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.term}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.grades}</TableCell>
                      <TableCell>{e.subjects}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.start} – {e.end}
                      </TableCell>
                      <TableCell className="w-48">
                        <Progress value={e.entered} className="h-2" />
                        <span className="text-xs text-muted-foreground">{e.entered}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={e.status === "Active" ? "default" : "secondary"}
                          className="rounded-full"
                        >
                          {e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compilation */}
        <TabsContent value="compilation">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {SUBJECTS.map((s, i) => {
              const base = [100, 92, 78, 64, 55, 40, 25][i] ?? 50;
              const done =
                term.status === "Upcoming" ? 0 : term.status === "Closed" ? 100 : base;
              return (
                <Card key={s}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{s}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress value={done} className="h-2" />
                    <p className="text-xs text-muted-foreground">{done}% of streams submitted</p>
                    <Badge variant="secondary" className="rounded-full text-[11px]">
                      {done === 100 ? "Moderated" : done === 0 ? "Not started" : "Awaiting entry"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Marks entry */}
        <TabsContent value="entry">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Marks Entry — {term.label}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Class mean: <span className="font-semibold text-foreground">{classMean}%</span> ·{" "}
                  {computed.withTotals.length} learners ·{" "}
                  {locked ? "Locked (read-only)" : saved ? "All changes saved" : "Unsaved changes"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TermSelect />
                <Select value={grade} onValueChange={(v) => setGrade(v as Grade)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={saved || locked}
                  title={locked ? `${term.label} is locked` : undefined}
                  onClick={() => {
                    if (locked) return;
                    setSaved(true);
                    toast.success(`${grade} marks saved for ${term.label}`);
                  }}
                >
                  {locked ? (
                    <>
                      <Lock className="mr-1.5 size-4" /> Locked
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 size-4" /> {saved ? "Saved" : "Save marks"}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Learner</TableHead>
                    {SUBJECTS.map((s) => (
                      <TableHead key={s} className="text-center text-[11px]">
                        {s}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-center">CBC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {computed.withTotals.map((r) => (
                    <TableRow key={r.studentId}>
                      <TableCell>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.adm}</p>
                      </TableCell>
                      {SUBJECTS.map((s) => (
                        <TableCell key={s} className="p-1 text-center">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={r.marks[s]}
                            onChange={(e) => setMark(r.studentId, s, e.target.value)}
                            disabled={locked}
                            aria-label={`${s} mark for ${r.name}`}
                            className="h-9 w-16 text-center disabled:opacity-100 disabled:bg-muted"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{r.total}</TableCell>
                      <TableCell className="text-right">{r.pct}%</TableCell>
                      <TableCell className="text-center">
                        <LevelBadge pct={r.pct} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results & ranking */}
        <TabsContent value="results">
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            {[
              { label: `Class mean (${term.short})`, value: `${classMean}%` },
              { label: "Top learner", value: computed.ranked[0]?.name ?? "—" },
              {
                label: "Below Expectation",
                value: String(computed.withTotals.filter((r) => cbcLevel(r.pct) === "BE").length),
              },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <p className="truncate text-xl font-semibold">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-4 text-primary" /> {grade} Ranking — {term.label}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={grade} onValueChange={(v) => setGrade(v as Grade)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportRanking}>
                  <FileDown className="mr-1.5 size-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Learner</TableHead>
                    {SUBJECTS.map((s) => (
                      <TableHead key={s} className="text-center text-[11px]">
                        {s.slice(0, 4)}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-center">CBC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {computed.ranked.map((r, i) => (
                    <TableRow key={r.studentId}>
                      <TableCell className="font-semibold">{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      {SUBJECTS.map((s) => (
                        <TableCell key={s} className="text-center text-sm">
                          {r.marks[s]}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{r.total}</TableCell>
                      <TableCell className="text-right">{r.pct}%</TableCell>
                      <TableCell className="text-center">
                        <LevelBadge pct={r.pct} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI compiler */}
        <TabsContent value="ai">
          <AiCompiler termLabel={term.label} />
        </TabsContent>

        {/* Report cards */}
        <TabsContent value="reports">
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Generate report cards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Term</Label>
                  <TermSelect className="w-full rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Label>Grade</Label>
                  <Select value={grade} onValueChange={(v) => setGrade(v as Grade)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Learner</Label>
                  <Select
                    value={reportLearner?.studentId ?? ""}
                    onValueChange={setReportStudentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select learner" />
                    </SelectTrigger>
                    <SelectContent>
                      {computed.ranked.map((r) => (
                        <SelectItem key={r.studentId} value={r.studentId}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                    toast.success(`${reportLearner?.name} · ${term.label} report card ready to print`);
                  }}
                >
                  <Printer className="mr-1.5 size-4" /> Print single
                </Button>
                <Button variant="outline" className="w-full" onClick={exportBulkReports}>
                  <FileDown className="mr-1.5 size-4" /> Generate bulk ({computed.withTotals.length})
                </Button>
              </CardContent>
            </Card>

            {reportLearner && (
              <Card className="overflow-hidden">
                <div className="bg-primary px-6 py-5 text-primary-foreground">
                  <p className="text-lg font-semibold">{SCHOOL.name}</p>
                  <p className="text-xs opacity-80">
                    CBC Learner Progress Report · {term.label} · {term.window}
                  </p>
                  {locked && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[11px] font-semibold">
                      <Lock className="size-3" aria-hidden /> Published · locked record
                    </span>
                  )}
                </div>
                <CardContent className="space-y-4 p-6">
                  <div className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Learner</p>
                      <p className="font-medium">{reportLearner.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Adm / Grade</p>
                      <p className="font-medium">
                        {reportLearner.adm} · {grade}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Position</p>
                      <p className="font-medium">
                        {reportPosition} out of {computed.ranked.length}
                      </p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Learning Area</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-center">Level</TableHead>
                        <TableHead>Teacher remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SUBJECTS.map((s) => {
                        const m = reportLearner.marks[s];
                        const l = cbcLevel(m);
                        return (
                          <TableRow key={s}>
                            <TableCell className="font-medium">{s}</TableCell>
                            <TableCell className="text-right">{m}</TableCell>
                            <TableCell className="text-center">
                              <LevelBadge pct={m} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {CBC_LABEL[l]}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="rounded-xl bg-muted p-4 text-sm">
                    <p className="font-semibold">Class teacher's comment</p>
                    <p className="text-muted-foreground">
                      {reportLearner.name.split(" ")[0]} finished {term.label} with a mean of{" "}
                      {reportLearner.pct}% ({CBC_LABEL[cbcLevel(reportLearner.pct)]}), ranked{" "}
                      {reportPosition} out of {computed.ranked.length} in {grade}. Keep nurturing
                      enquiry and collaboration skills next term.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function NewExamDialog({
  termLabel,
  onCreate,
  disabled = false,
}: {
  termLabel: string;
  onCreate: (exam: Exam) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [grades, setGrades] = useState("PP1 – Grade 9");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give the examination a name");
      return;
    }
    onCreate({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      term: termLabel,
      grades,
      subjects: SUBJECTS.length,
      start: start || "TBD",
      end: end || "TBD",
      status: "Draft",
      entered: 0,
    });
    setName("");
    setStart("");
    setEnd("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} title={disabled ? `${termLabel} is locked` : undefined}>
          <Plus className="mr-1.5 size-4" /> New examination
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New examination</DialogTitle>
          <DialogDescription>This assessment will be created under {termLabel}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="exam-name">Examination name</Label>
            <Input
              id="exam-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. End-Term Examination"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-grades">Grades</Label>
            <Input id="exam-grades" value={grades} onChange={(e) => setGrades(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exam-start">Start</Label>
              <Input id="exam-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-end">End</Label>
              <Input id="exam-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create examination</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const QUESTION_BANK: Record<string, string[]> = {
  Mathematics: [
    "Express 3/8 as a decimal and as a percentage. (3 marks)",
    "A farm in Kiambu measures 42 m by 28 m. Calculate its perimeter and area. (4 marks)",
    "A shopkeeper sold goods worth KES 12,480 in a week. Find the daily average. (3 marks)",
    "Arrange 0.45, 2/5, 48% in ascending order. (3 marks)",
    "The table shows learners per stream. Draw a bar graph and state the mode. (5 marks)",
    "Find the volume of a cuboid 12 cm by 8 cm by 5 cm. (3 marks)",
  ],
  English: [
    "Rewrite in the passive voice: 'The teacher marked the books.' (2 marks)",
    "Give the plural of: child, knife, sheep, hero. (4 marks)",
    "Write a composition on 'A Day at the Market' (100 words). (10 marks)",
    "Identify the adverbs in the passage below. (4 marks)",
    "Punctuate the sentence correctly. (3 marks)",
    "Use the idiom 'to bury the hatchet' in a sentence. (2 marks)",
  ],
  Kiswahili: [
    "Andika sentensi hii katika wakati uliopita. (2 alama)",
    "Eleza maana ya methali: 'Haraka haraka haina baraka.' (3 alama)",
    "Taja vitenzi vitatu katika kifungu hiki. (3 alama)",
    "Andika insha kuhusu 'Umuhimu wa Elimu'. (10 alama)",
    "Tunga sentensi ukitumia neno 'shwari'. (2 alama)",
    "Bainisha nomino katika sentensi ifuatayo. (3 alama)",
  ],
};

function AiCompiler({ termLabel }: { termLabel: string }) {
  const [grade, setGrade] = useState<string>("Grade 7");
  const [subject, setSubject] = useState<string>("Mathematics");
  const [difficulty, setDifficulty] = useState("Moderate");
  const [count, setCount] = useState(30);
  const [topics, setTopics] = useState(
    "Fractions, Decimals, Measurement (Area & Perimeter), Data Handling",
  );
  const [outputs, setOutputs] = useState<string[]>([
    "Question paper (PDF)",
    "Marking scheme",
    "Answer sheets",
  ]);
  const [paper, setPaper] = useState<null | { questions: string[] }>(null);
  const [busy, setBusy] = useState(false);

  const toggleOutput = (o: string, on: boolean) =>
    setOutputs((prev) => (on ? [...new Set([...prev, o])] : prev.filter((x) => x !== o)));

  const generate = () => {
    setBusy(true);
    const bank = QUESTION_BANK[subject] ?? QUESTION_BANK.Mathematics;
    const topicList = topics
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const questions = Array.from({ length: Math.min(8, Math.max(3, Math.round(count / 5))) }, (_, i) =>
      i < bank.length
        ? bank[i]
        : `Question on ${topicList[i % Math.max(1, topicList.length)] ?? subject}: solve and show your working. (4 marks)`,
    );
    window.setTimeout(() => {
      setPaper({ questions });
      setBusy(false);
      toast.success(`${subject} paper compiled for ${grade} · ${termLabel}`);
    }, 600);
  };

  const downloadPaper = (kind: "paper" | "scheme") => {
    if (!paper) return;
    const body =
      kind === "paper"
        ? paper.questions.map((q, i) => `${i + 1}. ${q}`).join("\n\n")
        : paper.questions
            .map((q, i) => `${i + 1}. ${q}\n   Answer: award marks for correct method and final answer.`)
            .join("\n\n");
    downloadFile(
      `${grade.replace(/\s/g, "-")}-${subject}-${kind}.txt`,
      `${SCHOOL.name}\n${grade} · ${subject} · ${termLabel}\n${count} questions · ${difficulty}\n\n${body}\n`,
      "text/plain;charset=utf-8",
    );
    toast.success(kind === "paper" ? "Question paper downloaded" : "Marking scheme downloaded");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" /> AI Exam Compiler · {termLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Easy", "Moderate", "Challenging", "Mixed"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-count">Number of questions</Label>
              <Input
                id="q-count"
                type="number"
                value={count}
                min={5}
                max={100}
                onChange={(e) =>
                  setCount(Math.max(5, Math.min(100, Number(e.target.value) || 5)))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topics">Topics / strands</Label>
            <Textarea id="topics" rows={3} value={topics} onChange={(e) => setTopics(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Output options</Label>
            {["Question paper (PDF)", "Marking scheme", "Answer sheets"].map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={outputs.includes(o)}
                  onCheckedChange={(v) => toggleOutput(o, v === true)}
                />{" "}
                {o}
              </label>
            ))}
          </div>
          <Button className="w-full" disabled={busy} onClick={generate}>
            <Sparkles className="mr-1.5 size-4" /> {busy ? "Compiling…" : "Generate exam"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {!paper ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Configure the paper and click generate to preview questions here.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-border p-4">
                <p className="font-semibold">
                  {grade} · {subject} · {termLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {count} questions · {difficulty} · Duration 1 hr 30 min
                </p>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                {paper.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => downloadPaper("paper")}>
                  <FileDown className="mr-1.5 size-4" /> Download paper
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!outputs.includes("Marking scheme")}
                  onClick={() => downloadPaper("scheme")}
                >
                  Marking scheme
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
