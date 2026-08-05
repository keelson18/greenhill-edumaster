import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
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
import { StatCards } from "@/components/DataTable";
import { useAuth } from "@/lib/auth-context";
import { GRADE_LEVELS } from "@/config/app.config";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/validation/schemas";
import {
  listStaffAttendance,
  listStudentAttendance,
  saveStaffAttendance,
  saveStudentAttendance,
} from "@/lib/api/attendance.functions";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance | EduMaster" },
      {
        name: "description",
        content:
          "Mark and review daily learner and staff attendance for KG1 to Basic 9 classes at your school.",
      },
      { property: "og:title", content: "Attendance | EduMaster" },
      {
        property: "og:description",
        content: "Daily learner and staff attendance registers with instant absence totals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttendancePage,
});

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

const STATUS_TONE: Record<AttendanceStatus, string> = {
  present: "bg-primary/10 text-primary",
  absent: "bg-destructive/10 text-destructive",
  late: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  excused: "bg-muted text-muted-foreground",
};

function today() {
  // Africa/Accra is UTC+0 year-round, so the UTC date is the school's date.
  return new Date().toISOString().slice(0, 10);
}

function AttendancePage() {
  const { session, isAdmin, hasRole } = useAuth();
  const canMarkLearners = isAdmin || hasRole("teacher");
  const [date, setDate] = useState(today());

  return (
    <AppLayout
      title="Attendance"
      subtitle="Daily registers for learners and staff, saved per class and date."
    >
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="attendance-date">Date</Label>
          <Input
            id="attendance-date"
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value || today())}
            className="w-44"
          />
        </div>
      </div>

      <Tabs defaultValue="learners">
        <TabsList className="mb-4">
          <TabsTrigger value="learners">Learners</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="learners">
          <LearnerRegister date={date} canMark={canMarkLearners} enabled={Boolean(session)} />
        </TabsContent>
        <TabsContent value="staff">
          <StaffRegister date={date} canMark={isAdmin} enabled={Boolean(session)} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function StatusPicker({
  value,
  disabled,
  onChange,
}: {
  value: AttendanceStatus;
  disabled: boolean;
  onChange: (next: AttendanceStatus) => void;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(v) => onChange(v as AttendanceStatus)}
    >
      <SelectTrigger className="h-8 w-36" aria-label="Attendance status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ATTENDANCE_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LearnerRegister({
  date,
  canMark,
  enabled,
}: {
  date: string;
  canMark: boolean;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [classLevel, setClassLevel] = useState<string>(GRADE_LEVELS[8]);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["student-attendance", date, classLevel],
    queryFn: () => listStudentAttendance({ data: { date, classLevel } }),
    enabled,
  });

  useEffect(() => {
    if (!data) return;
    setDraft(
      Object.fromEntries(data.map((row) => [row.studentId, row.status ?? "present"])) as Record<
        string,
        AttendanceStatus
      >,
    );
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      saveStudentAttendance({
        data: {
          date,
          classLevel: classLevel as (typeof GRADE_LEVELS)[number],
          entries: (data ?? []).map((row) => ({
            studentId: row.studentId,
            status: draft[row.studentId] ?? "present",
          })),
        },
      }),
    onSuccess: (result) => {
      toast.success(`Attendance saved for ${result.saved} learners.`);
      void queryClient.invalidateQueries({ queryKey: ["student-attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = data ?? [];
  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const row of rows) tally[draft[row.studentId] ?? "present"] += 1;
    return tally;
  }, [rows, draft]);

  const marked = rows.filter((r) => r.status).length;
  const rate = rows.length
    ? Math.round(((counts.present + counts.late) / rows.length) * 1000) / 10
    : 0;

  return (
    <>
      <StatCards
        stats={[
          { label: "Learners on roll", value: String(rows.length) },
          { label: "Present + late", value: `${counts.present + counts.late}` },
          { label: "Absent", value: String(counts.absent) },
          { label: "Attendance rate", value: `${rate}%` },
        ]}
      />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="size-4" aria-hidden /> Class register
            {marked > 0 && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {marked} already recorded
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={classLevel} onValueChange={setClassLevel}>
              <SelectTrigger className="w-40" aria-label="Select class">
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
            <Button
              disabled={!canMark || rows.length === 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Save register
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-primary" aria-label="Loading register" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active learners in {classLevel}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Learner</th>
                  <th className="py-2 pr-4 font-medium">Admission no.</th>
                  <th className="py-2 pr-4 font-medium">Stream</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = draft[row.studentId] ?? "present";
                  return (
                    <tr key={row.studentId} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.fullName}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.admissionNo}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.stream}</td>
                      <td className="py-2 pr-4">
                        {canMark ? (
                          <StatusPicker
                            value={status}
                            disabled={mutation.isPending}
                            onChange={(next) =>
                              setDraft((d) => ({ ...d, [row.studentId]: next }))
                            }
                          />
                        ) : (
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_TONE[status]}`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function StaffRegister({
  date,
  canMark,
  enabled,
}: {
  date: string;
  canMark: boolean;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["staff-attendance", date],
    queryFn: () => listStaffAttendance({ data: { date } }),
    enabled,
  });

  useEffect(() => {
    if (!data) return;
    setDraft(
      Object.fromEntries(data.map((row) => [row.staffId, row.status ?? "present"])) as Record<
        string,
        AttendanceStatus
      >,
    );
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      saveStaffAttendance({
        data: {
          date,
          entries: (data ?? []).map((row) => ({
            staffId: row.staffId,
            status: draft[row.staffId] ?? "present",
          })),
        },
      }),
    onSuccess: (result) => {
      toast.success(`Attendance saved for ${result.saved} staff members.`);
      void queryClient.invalidateQueries({ queryKey: ["staff-attendance"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = data ?? [];
  const absent = rows.filter((r) => (draft[r.staffId] ?? "present") === "absent").length;

  return (
    <>
      <StatCards
        stats={[
          { label: "Staff on roll", value: String(rows.length) },
          { label: "Absent today", value: String(absent) },
          { label: "Date", value: date },
          {
            label: "Recorded",
            value: `${rows.filter((r) => r.status).length}/${rows.length}`,
          },
        ]}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Staff register</CardTitle>
          <Button
            disabled={!canMark || rows.length === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Save register
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-primary" aria-label="Loading register" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active staff records yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Staff member</th>
                  <th className="py-2 pr-4 font-medium">Staff no.</th>
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = draft[row.staffId] ?? "present";
                  return (
                    <tr key={row.staffId} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.fullName}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.staffNo}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.department}</td>
                      <td className="py-2 pr-4">
                        {canMark ? (
                          <StatusPicker
                            value={status}
                            disabled={mutation.isPending}
                            onChange={(next) => setDraft((d) => ({ ...d, [row.staffId]: next }))}
                          />
                        ) : (
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_TONE[status]}`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
