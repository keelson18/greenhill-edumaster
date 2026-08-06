import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, StatCards } from "@/components/DataTable";
import { useAuth } from "@/lib/auth-context";
import { useTerm } from "@/lib/term-context";
import { formatCurrency, formatDate, perfLabel } from "@/lib/domain/grading";
import { listStudents } from "@/lib/api/school.functions";
import { listUsers } from "@/lib/api/users.functions";
import {
  getStudentPortal,
  linkGuardian,
  listGuardianLinks,
  listMyStudents,
  unlinkGuardian,
} from "@/lib/api/portal.functions";
import type { GuardianLinkDTO } from "@/lib/api/portal.types";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Family Portal | EduMaster" },
      {
        name: "description",
        content:
          "Learners and parents follow term results, attendance and fee balances for their own school records.",
      },
      { property: "og:title", content: "Family Portal | EduMaster" },
      {
        property: "og:description",
        content: "Term results, attendance and fee balances for learners and their families.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const { session, isAdmin } = useAuth();
  const { termId, term } = useTerm();
  const [studentId, setStudentId] = useState<string>("");

  const linked = useQuery({
    queryKey: ["portal-students", session?.user.id],
    queryFn: () => listMyStudents(),
    enabled: Boolean(session),
  });

  useEffect(() => {
    const first = linked.data?.[0]?.id;
    if (first && !studentId) setStudentId(first);
  }, [linked.data, studentId]);

  const portal = useQuery({
    queryKey: ["portal", studentId, termId],
    queryFn: () => getStudentPortal({ data: { studentId, termCode: termId } }),
    enabled: Boolean(session && studentId),
  });

  const selected = linked.data?.find((s) => s.id === studentId);

  const stats = useMemo(() => {
    const d = portal.data;
    const best = d?.results.length
      ? Math.max(...d.results.map((r) => r.average))
      : 0;
    return [
      { label: "Exams marked", value: String(d?.results.length ?? 0) },
      { label: "Best average", value: best ? `${best}%` : "—" },
      { label: "Attendance", value: d?.attendance.recorded ? `${d.attendance.rate}%` : "—" },
      { label: "Fee balance", value: formatCurrency(d?.fees.balance ?? 0) },
    ];
  }, [portal.data]);

  return (
    <AppLayout
      title="Family Portal"
      subtitle={`Results, attendance and fees for ${term.label}.`}
      actions={
        (linked.data?.length ?? 0) > 1 ? (
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Choose a learner" />
            </SelectTrigger>
            <SelectContent>
              {(linked.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.fullName} · {s.gradeLevel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null
      }
    >
      {linked.isLoading ? null : (linked.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users2 className="size-6" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold">No learner is linked to your account yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Ask the school office to link your account to a learner. Once linked, results,
              attendance and fee statements appear here every term.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {selected ? (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-base font-semibold">{selected.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.admissionNo} · GES {selected.gesId} · {selected.gradeLevel}
                    {selected.stream}
                  </p>
                </div>
                <Badge variant="secondary">{selected.relationship}</Badge>
              </CardContent>
            </Card>
          ) : null}

          <StatCards stats={stats} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Examination results · {term.short}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-5 pt-0">
              {portal.isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
              ) : (portal.data?.results.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No marks have been published for this term yet.
                </p>
              ) : (
                portal.data?.results.map((result) => (
                  <div key={result.examId} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{result.examName}</p>
                      <Badge>
                        {result.average}% · {perfLabel(result.level)}
                      </Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {result.subjects.map((s) => (
                        <div
                          key={s.subject}
                          className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span>{s.subject}</span>
                          <span className="font-semibold">{s.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance this term</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 p-5 pt-0 text-sm">
                {[
                  ["Present", portal.data?.attendance.present ?? 0],
                  ["Absent", portal.data?.attendance.absent ?? 0],
                  ["Late", portal.data?.attendance.late ?? 0],
                  ["Excused", portal.data?.attendance.excused ?? 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pt-0 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billed</span>
                  <span>{formatCurrency(portal.data?.fees.billed ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid this term</span>
                  <span>{formatCurrency(portal.data?.fees.paid ?? 0)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Balance</span>
                  <span>{formatCurrency(portal.data?.fees.balance ?? 0)}</span>
                </div>
                <div className="space-y-2 pt-2">
                  {(portal.data?.fees.payments ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                    >
                      <span>
                        {formatDate(p.paidAt)} · {p.method}
                      </span>
                      <span className="font-medium">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                  {(portal.data?.fees.payments ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No payments recorded for this term.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {isAdmin ? <FamilyAccessManager /> : null}
    </AppLayout>
  );
}

/** Administrator tool: connect parent accounts to learner records. */
function FamilyAccessManager() {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [guardianId, setGuardianId] = useState("");
  const [relationship, setRelationship] = useState("Guardian");

  const links = useQuery({ queryKey: ["guardian-links"], queryFn: () => listGuardianLinks() });
  const students = useQuery({
    queryKey: ["portal-student-options"],
    queryFn: () => listStudents({ data: { page: 1, pageSize: 100 } }),
  });
  const users = useQuery({ queryKey: ["portal-user-options"], queryFn: () => listUsers() });

  const create = useMutation({
    mutationFn: () => linkGuardian({ data: { studentId, guardianId, relationship } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message ?? "Unable to link the account.");
        return;
      }
      toast.success("Family access granted");
      setStudentId("");
      setGuardianId("");
      void queryClient.invalidateQueries({ queryKey: ["guardian-links"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => unlinkGuardian({ data: { id } }),
    onSuccess: () => {
      toast.success("Family access removed");
      void queryClient.invalidateQueries({ queryKey: ["guardian-links"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Family access (administrators)</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <Tabs defaultValue="links">
          <TabsList>
            <TabsTrigger value="links">Existing links</TabsTrigger>
            <TabsTrigger value="new">Grant access</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="pt-4">
            <DataTable<GuardianLinkDTO>
              rows={links.data}
              isLoading={links.isLoading}
              error={links.error}
              rowKey={(r) => r.id}
              emptyMessage="No parent accounts have been linked to learners yet."
              columns={[
                { key: "student", header: "Learner", render: (r) => r.studentName },
                {
                  key: "guardian",
                  header: "Account",
                  render: (r) => (
                    <div>
                      <p className="font-medium">{r.guardianName}</p>
                      <p className="text-xs text-muted-foreground">{r.guardianEmail ?? "—"}</p>
                    </div>
                  ),
                },
                {
                  key: "relationship",
                  header: "Relationship",
                  render: (r) => <Badge variant="secondary">{r.relationship}</Badge>,
                },
                {
                  key: "actions",
                  header: "",
                  render: (r) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove access for ${r.guardianName}`}
                      onClick={() => remove.mutate(r.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  ),
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="new" className="grid gap-3 pt-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Learner</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select learner" />
                </SelectTrigger>
                <SelectContent>
                  {(students.data?.items ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName} · {s.gradeLevel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={guardianId} onValueChange={setGuardianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {(users.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} · {u.email ?? "no email"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Mother, Father, Guardian"
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!studentId || !guardianId || create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? "Linking…" : "Grant access"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
