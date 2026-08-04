import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Wallet, FileText, TrendingUp, GraduationCap, Receipt } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TermComparison } from "@/components/TermComparison";
import { TermLockBar } from "@/components/TermLockBar";
import {
  getDashboardStats,
  getGradePerformance,
  getEnrolmentByGrade,
} from "@/lib/api/school.functions";
import { formatCurrency, formatNumber } from "@/lib/domain/grading";
import { SCHOOL_PROFILE } from "@/config/app.config";
import { useTerm } from "@/lib/term-context";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "School Dashboard | EduMaster Ghana" },
      {
        name: "description",
        content:
          "Live enrolment, fee collection in Ghana Cedis, examinations and mean performance across KG1 to Basic 9 for the selected academic term.",
      },
      { property: "og:title", content: "School Dashboard | EduMaster Ghana" },
      {
        property: "og:description",
        content: "Enrolment, fees in GHS, examinations and mean performance per term.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
};

function Dashboard() {
  const { term, termId } = useTerm();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const signedIn = Boolean(session);
  const enabled = Boolean(termId) && signedIn;

  const statsQuery = useQuery({
    queryKey: ["dashboard-stats", termId],
    queryFn: () => getDashboardStats({ data: { termCode: termId } }),
    enabled,
  });
  const performanceQuery = useQuery({
    queryKey: ["grade-performance", termId],
    queryFn: () => getGradePerformance({ data: { termCode: termId } }),
    enabled,
  });
  const enrolmentQuery = useQuery({
    queryKey: ["enrolment-by-grade"],
    queryFn: () => getEnrolmentByGrade(),
    enabled: signedIn,
  });

  const stats = statsQuery.data;

  const kpis = useMemo(
    () => [
      {
        label: "Learners on roll",
        value: stats ? formatNumber(stats.learners) : "—",
        hint: stats ? `${formatNumber(stats.activeLearners)} active` : "Loading…",
        icon: Users,
      },
      {
        label: "Fees billed",
        value: stats ? formatCurrency(stats.feesBilled) : "—",
        hint: term.label,
        icon: Receipt,
      },
      {
        label: "Fees collected",
        value: stats ? formatCurrency(stats.feesCollected) : "—",
        hint: stats ? `${formatCurrency(stats.feesOutstanding)} outstanding` : "Loading…",
        icon: Wallet,
      },
      {
        label: "Examinations",
        value: stats ? formatNumber(stats.examCount) : "—",
        hint: stats ? `${formatNumber(stats.marksCount)} marks recorded` : "Loading…",
        icon: FileText,
      },
      {
        label: "Mean score",
        value: stats ? `${stats.meanScore}%` : "—",
        hint: stats && stats.meanScore >= 65 ? "Proficient" : "Approaching proficiency",
        icon: TrendingUp,
      },
      {
        label: "Classes reporting",
        value: performanceQuery.data ? String(performanceQuery.data.length) : "—",
        hint: "Classes with marks this term",
        icon: GraduationCap,
      },
    ],
    [stats, term.label, performanceQuery.data],
  );

  const downloadTermReport = () => {
    if (!stats) return;
    const rows = [
      ["Metric", "Value"],
      ["Term", term.label],
      ["Learners", String(stats.learners)],
      ["Active learners", String(stats.activeLearners)],
      [`Fees billed (${SCHOOL_PROFILE.currency})`, String(Math.round(stats.feesBilled))],
      [`Fees collected (${SCHOOL_PROFILE.currency})`, String(Math.round(stats.feesCollected))],
      [`Fees outstanding (${SCHOOL_PROFILE.currency})`, String(Math.round(stats.feesOutstanding))],
      ["Examinations", String(stats.examCount)],
      ["Marks recorded", String(stats.marksCount)],
      ["Mean score (%)", String(stats.meanScore)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `edumaster-${termId}-summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${term.label} summary downloaded`);
  };

  const performance = performanceQuery.data ?? [];
  const enrolment = enrolmentQuery.data ?? [];

  return (
    <AppLayout
      title={`Welcome, ${user?.fullName ?? "there"}`}
      subtitle={`${SCHOOL_PROFILE.name} — ${term.label} (${term.window}).`}
      actions={
        <>
          <Button variant="outline" onClick={downloadTermReport} disabled={!stats}>
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
              <DropdownMenuItem onClick={() => navigate({ to: "/students" })}>
                Admit a learner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/fees" })}>
                Record fee payment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={downloadTermReport} disabled={!stats}>
                Export term summary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      <TermLockBar className="mb-6" />

      {statsQuery.error && (
        <p className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {(statsQuery.error as Error).message}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <Card
            key={k.label}
            className="border-border/70 shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <k.icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>
                <p className="truncate text-2xl font-semibold tracking-tight">{k.value}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{k.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TermComparison className="mb-6" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mean score by class — {term.short}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {performance.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No marks recorded for this term yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="grade" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="mean" name="Mean %" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active enrolment by class</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {enrolment.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No learners on roll yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrolment} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="grade" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Bar
                    dataKey="learners"
                    name="Learners"
                    fill="var(--chart-3)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
