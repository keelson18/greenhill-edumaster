import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Upload, Download, UserPlus, Mail, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STUDENTS, GRADES, KES, type Student } from "@/lib/edumaster-data";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Student Management | EduMaster Greenhill Academy" },
      {
        name: "description",
        content:
          "Search, filter and manage 847 learners from PP1 to Grade 9 with admission numbers, NEMIS records, guardians and fee balances in KES.",
      },
      { property: "og:title", content: "Student Management | EduMaster" },
      {
        property: "og:description",
        content: "Learner records, NEMIS numbers, guardians and fee balances for PP1 to Grade 9.",
      },
    ],
  }),
  component: StudentsPage,
});

const PAGE = 12;

function StudentsPage() {
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return STUDENTS.filter(
      (s) =>
        (grade === "all" || s.grade === grade) &&
        (!term ||
          s.name.toLowerCase().includes(term) ||
          s.adm.toLowerCase().includes(term) ||
          s.nemis.includes(term)),
    );
  }, [q, grade]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <AppLayout
      title="Student Management"
      subtitle={`${filtered.length.toLocaleString()} learners matching your filters`}
      actions={
        <>
          <Button variant="outline" onClick={() => toast.success("Template downloaded")}>
            <Upload className="mr-1.5 size-4" /> Bulk upload
          </Button>
          <Button variant="outline" onClick={() => toast.success("Exported to CSV")}>
            <Download className="mr-1.5 size-4" /> Export
          </Button>
          <Button onClick={() => toast.info("Admission form opened")}>
            <UserPlus className="mr-1.5 size-4" /> Admit student
          </Button>
        </>
      }
    >
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, admission number or NEMIS…"
              className="pl-9"
            />
          </div>
          <Select
            value={grade}
            onValueChange={(v) => {
              setGrade(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All grades</SelectItem>
              {GRADES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Adm No</TableHead>
                <TableHead>NEMIS</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.adm}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{s.nemis}</TableCell>
                  <TableCell>{s.grade} {s.stream}</TableCell>
                  <TableCell className="text-muted-foreground">{s.gender}</TableCell>
                  <TableCell>
                    <p className="text-sm">{s.guardian}</p>
                    <p className="text-xs text-muted-foreground">{s.guardianPhone}</p>
                  </TableCell>
                  <TableCell className={"text-right font-semibold " + (s.balance > 0 ? "text-destructive" : "text-success")}>
                    {KES(s.balance)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === "Active" ? "secondary" : "outline"} className="rounded-full">
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(s)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {current + 1} of {pages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {selected.grade} {selected.stream} · Admitted {selected.admittedOn}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Personal details
                  </p>
                  <dl className="space-y-2 text-sm">
                    {[
                      ["Admission No", selected.adm],
                      ["NEMIS No", selected.nemis],
                      ["Gender", selected.gender],
                      ["Date of birth", selected.dob],
                      ["County", selected.county],
                      ["Guardian", `${selected.guardian} (${selected.guardianPhone})`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="text-right font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Fee status
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billed</span>
                      <span className="font-medium">{KES(selected.feeBilled)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-medium text-success">{KES(selected.feePaid)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-semibold text-destructive">{KES(selected.balance)}</span>
                    </div>
                  </div>
                  <Badge className="mt-4 rounded-full" variant={selected.balance > 0 ? "destructive" : "secondary"}>
                    {selected.balance > 0 ? "Outstanding" : "Fully paid"}
                  </Badge>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => toast.success(`Reminder sent to ${selected.guardian}`)}>
                  <Mail className="mr-1.5 size-4" /> Send reminder
                </Button>
                <Button onClick={() => toast.info("Report card preview generated")}>
                  <FileText className="mr-1.5 size-4" /> View report card
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
