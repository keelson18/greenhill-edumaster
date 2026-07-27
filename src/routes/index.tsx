import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  UserCog,
  Wallet,
  CalendarCheck,
  FileText,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  KES,
  SCHOOL,
  kpisFor,
  feeTrendFor,
  genderSplit,
  weeklyAttendanceFor,
  performanceForTerm,
  recentPayments,
  notifications,
  upcomingEvents,
} from "@/lib/edumaster-data";
import { useTerm } from "@/lib/term-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduMaster Dashboard | Greenhill Academy CBC School System" },
      {
        name: "description",
        content:
          "EduMaster dashboard for Greenhill Academy: track enrolment, CBC performance, fee collection in KES and attendance across PP1 to Grade 9.",
      },
      { property: "og:title", content: "EduMaster Dashboard | Greenhill Academy" },
      {
        property: "og:description",
        content:
          "Live KPIs for students, staff, fees collected and CBC mean score across PP1 to Grade 9.",
      },
    ],
  }),
  component: Dashboard,
});


const PIE_COLORS = ["var(--chart-1)", "var(--chart-3)"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
};

function Dashboard() {
  const { term, termId } = useTerm();
  const navigate = useNavigate();

  const kpis = useMemo(() => kpisFor(termId), [termId]);
  const fees = useMemo(() => feeTrendFor(termId), [termId]);
  const attendance = useMemo(() => weeklyAttendanceFor(termId), [termId]);
  const performance = useMemo(() => performanceForTerm(termId), [termId]);

  const KPI = [
    { label: "Total Students", value: kpis.totalStudents.toLocaleString(), delta: `Enrolled in ${term.label}`, icon: Users },
    { label: "Teaching Staff", value: String(kpis.staff), delta: "3 on leave", icon: UserCog },
    { label: "Fees Collected", value: KES(kpis.collected), delta: `${KES(kpis.outstanding)} outstanding`, icon: Wallet },
    { label: "Avg. Attendance", value: `${kpis.attendance}%`, delta: `${term.window}`, icon: CalendarCheck },
    { label: "Active Exams", value: String(kpis.activeExams), delta: `${kpis.marksEntered}% marks entered`, icon: FileText },
    { label: "School Mean Score", value: `${kpis.meanScore}%`, delta: kpis.meanScore >= 65 ? "Meeting Expectation" : "Approaching Expectation", icon: TrendingUp },
  ];

  const downloadTermReport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Term", term.label],
      ["Students", String(kpis.totalStudents)],
      ["Staff", String(kpis.staff)],
      ["Fees collected (KES)", String(Math.round(kpis.collected))],
      ["Fees outstanding (KES)", String(Math.round(kpis.outstanding))],
      ["Attendance (%)", String(kpis.attendance)],
      ["Mean score (%)", String(kpis.meanScore)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `edumaster-${term.id}-summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${term.label} report downloaded`);
  };

  return (
    <AppLayout
      title={`Good morning, ${SCHOOL.principal}`}
      subtitle={`Greenhill Academy performance for ${term.label} (${term.window}).`}
      actions={
        <>
          <Button variant="outline" onClick={downloadTermReport}>
            Download term report
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>Quick actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{term.label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/examinations" })}>
                Enter exam marks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/examinations" })}>
                Generate report cards
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/students" })}>
                Admit a learner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/fees" })}>
                Record fee payment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={downloadTermReport}>Export term summary</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      {/* AI insight */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-accent/60 p-4 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-accent-foreground">AI Insight</p>
          <p className="text-sm text-muted-foreground">
            Grade 7A shows a 12% drop in Mathematics compared to Term 1. 14 learners moved from
            Meeting Expectation to Approaching Expectation — remedial grouping is recommended before
            the mid-term CAT.
          </p>
        </div>
        <Button variant="outline" className="shrink-0 bg-card">
          View analysis <ArrowUpRight className="ml-1 size-4" />
        </Button>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KPI.map((k) => (
          <Card key={k.label} className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <k.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>
                <p className="truncate text-2xl font-semibold tracking-tight">{k.value}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{k.delta}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fee Collection — {term.label} (KES millions)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fees} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="collected" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} name="Collected" />
                <Line type="monotone" dataKey="outstanding" stroke="var(--chart-5)" strokeWidth={2.5} strokeDasharray="5 4" dot={false} name="Outstanding" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Enrolment by Gender</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderSplit} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                  {genderSplit.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Attendance</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendance} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="present" fill="var(--chart-1)" radius={[6, 6, 0, 0]} name="Present" />
                <Bar dataKey="absent" fill="var(--chart-3)" radius={[6, 6, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Academic Performance by Grade (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="grade" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[40, 100]} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="previous" stroke="var(--chart-4)" strokeWidth={2.5} dot={false} name={`Previous (${performance[0].previousLabel})`} />
                <Line type="monotone" dataKey="current" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} name={`Current (${performance[0].currentLabel})`} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Fee Payments</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.date}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.grade}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-full">{p.method}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.ref}</TableCell>
                    <TableCell className="text-right font-semibold">{KES(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.map((n) => (
                <div key={n.title} className="flex gap-3">
                  <span
                    className={
                      "mt-1.5 size-2 shrink-0 rounded-full " +
                      (n.tone === "warn" ? "bg-warning" : n.tone === "ok" ? "bg-success" : "bg-info")
                    }
                  />
                  <div>
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.map((e) => (
                <div key={e.title} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                  <div className="flex flex-col items-center rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
                    <span className="text-xs font-semibold">{e.date.split(", ")[1]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.tag}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
