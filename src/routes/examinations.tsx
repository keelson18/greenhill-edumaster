import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, FileDown, Plus, Save, Trophy, Printer } from "lucide-react";
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
  EXAMS,
  GRADES,
  SUBJECTS,
  SCHOOL,
  marksFor,
  cbcLevel,
  CBC_LABEL,
  type CbcLevel,
  type Grade,
} from "@/lib/edumaster-data";

export const Route = createFileRoute("/examinations")({
  head: () => ({
    meta: [
      { title: "Examinations & CBC Marks Entry | EduMaster" },
      {
        name: "description",
        content:
          "Compile CBC exams, enter marks with live totals, rank results and generate competency-based report cards for PP1 to Grade 9 learners.",
      },
      { property: "og:title", content: "Examinations & CBC Marks Entry | EduMaster" },
      {
        property: "og:description",
        content: "Marks entry, ranking, AI exam compiler and CBC report cards in one module.",
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
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${levelClass[l]}`} title={CBC_LABEL[l]}>
      {l}
    </span>
  );
}

function ExamsPage() {
  const [grade, setGrade] = useState<Grade>("Grade 7");
  const [rows, setRows] = useState(() => marksFor("Grade 7"));

  const changeGrade = (g: Grade) => {
    setGrade(g);
    setRows(marksFor(g));
  };

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
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, marks: { ...r.marks, [subject]: v } } : r)),
    );
  };

  const top = computed.ranked[0];

  return (
    <AppLayout
      title="Examinations"
      subtitle="Compile assessments, capture marks and publish CBC report cards."
      actions={
        <Button onClick={() => toast.info("New examination wizard opened")}>
          <Plus className="mr-1.5 size-4" /> New examination
        </Button>
      }
    >
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
            <CardContent className="px-0">
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
                  {EXAMS.map((e) => (
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
                        <Badge variant={e.status === "Active" ? "default" : "secondary"} className="rounded-full">
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
              const done = [100, 92, 78, 64, 55, 40, 25][i] ?? 50;
              return (
                <Card key={s}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{s}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress value={done} className="h-2" />
                    <p className="text-xs text-muted-foreground">{done}% of streams submitted</p>
                    <Badge variant="secondary" className="rounded-full text-[11px]">
                      {done === 100 ? "Moderated" : "Awaiting entry"}
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
                <CardTitle className="text-base">Marks Entry — Term 2 Mid-Term Assessment</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Class mean: <span className="font-semibold text-foreground">{classMean}%</span> ·{" "}
                  {computed.withTotals.length} learners
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={grade} onValueChange={(v) => changeGrade(v as Grade)}>
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
                <Button onClick={() => toast.success("Marks saved and submitted for moderation")}>
                  <Save className="mr-1.5 size-4" /> Save marks
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
                            className="h-9 w-16 text-center"
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
              { label: "Class mean", value: `${classMean}%` },
              { label: "Top learner", value: top?.name ?? "—" },
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
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-4 text-primary" /> {grade} Ranking
              </CardTitle>
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
          <AiCompiler />
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
                  <Label>Grade</Label>
                  <Select value={grade} onValueChange={(v) => changeGrade(v as Grade)}>
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
                <Button className="w-full" onClick={() => toast.success("Single report card generated")}>
                  <Printer className="mr-1.5 size-4" /> Generate single
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => toast.success(`Bulk report cards queued for ${grade}`)}
                >
                  <FileDown className="mr-1.5 size-4" /> Generate bulk ({computed.withTotals.length})
                </Button>
              </CardContent>
            </Card>

            {top && (
              <Card className="overflow-hidden">
                <div className="bg-primary px-6 py-5 text-primary-foreground">
                  <p className="text-lg font-semibold">{SCHOOL.name}</p>
                  <p className="text-xs opacity-80">
                    CBC Learner Progress Report · {SCHOOL.term}
                  </p>
                </div>
                <CardContent className="space-y-4 p-6">
                  <div className="grid gap-2 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Learner</p>
                      <p className="font-medium">{top.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Adm / Grade</p>
                      <p className="font-medium">
                        {top.adm} · {grade}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Position</p>
                      <p className="font-medium">1 out of {computed.ranked.length}</p>
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
                        const m = top.marks[s];
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
                      {top.name.split(" ")[0]} demonstrates strong competency across most learning
                      areas with a mean of {top.pct}%. Keep nurturing enquiry and collaboration
                      skills next term.
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

function AiCompiler() {
  const [generated, setGenerated] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" /> AI Exam Compiler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select defaultValue="Grade 7">
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
              <Select defaultValue="Mathematics">
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
              <Select defaultValue="Moderate">
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
              <Label>Number of questions</Label>
              <Input type="number" defaultValue={30} min={5} max={100} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Topics / strands</Label>
            <Textarea
              rows={3}
              defaultValue="Fractions, Decimals, Measurement (Area & Perimeter), Data Handling"
            />
          </div>
          <div className="space-y-2">
            <Label>Output options</Label>
            {["Question paper (PDF)", "Marking scheme", "Answer sheets"].map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <Checkbox defaultChecked /> {o}
              </label>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={() => {
              setGenerated(true);
              toast.success("Exam paper compiled");
            }}
          >
            <Sparkles className="mr-1.5 size-4" /> Generate exam
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {!generated ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Configure the paper and click generate to preview questions here.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-border p-4">
                <p className="font-semibold">Grade 7 · Mathematics · Term 2 CAT</p>
                <p className="text-xs text-muted-foreground">
                  30 questions · Moderate · Duration 1 hr 30 min
                </p>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                <li>Express 3/8 as a decimal and as a percentage. (3 marks)</li>
                <li>
                  A farm in Kiambu measures 42 m by 28 m. Calculate its perimeter and area. (4 marks)
                </li>
                <li>
                  A shopkeeper sold goods worth KES 12,480 in a week. Find the daily average. (3 marks)
                </li>
                <li>Arrange 0.45, 2/5, 48% in ascending order. (3 marks)</li>
                <li>
                  The table shows learners per stream. Draw a bar graph and state the mode. (5 marks)
                </li>
              </ol>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => toast.success("PDF downloaded")}>
                  <FileDown className="mr-1.5 size-4" /> Download PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("Marking scheme ready")}>
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
