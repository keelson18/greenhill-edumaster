import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, FileDown, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getDashboardStats, getGradePerformance } from "@/lib/api/school.functions";
import { formatCurrency, formatNumber } from "@/lib/domain/grading";
import { useTerm } from "@/lib/term-context";
import type { DashboardStats } from "@/lib/api/types";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
};

/** Metrics compared term over term. `higherIsBetter` drives the improve/decline colour. */
const METRICS: ReadonlyArray<{
  key: keyof DashboardStats;
  label: string;
  higherIsBetter: boolean;
  format: (v: number) => string;
}> = [
  { key: "activeLearners", label: "Active learners", higherIsBetter: true, format: formatNumber },
  { key: "feesCollected", label: "Fees collected", higherIsBetter: true, format: formatCurrency },
  {
    key: "feesOutstanding",
    label: "Fees outstanding",
    higherIsBetter: false,
    format: formatCurrency,
  },
  { key: "examCount", label: "Examinations", higherIsBetter: true, format: formatNumber },
  { key: "marksCount", label: "Marks recorded", higherIsBetter: true, format: formatNumber },
  { key: "meanScore", label: "Mean score", higherIsBetter: true, format: (v) => `${v}%` },
];

function DeltaChip({ improved, flat, text }: { improved: boolean; flat: boolean; text: string }) {
  const Icon = flat ? Minus : improved ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        flat
          ? "bg-muted text-muted-foreground"
          : improved
            ? "bg-success/15 text-success"
            : "bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {text}
    </span>
  );
}

/**
 * Side-by-side comparison of two academic terms: headline KPIs plus per-grade
 * performance, both read live from the database.
 */
export function TermComparison({ className }: { className?: string }) {
  const { termId, terms } = useTerm();
  const [baseId, setBaseId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  const activeIndex = terms.findIndex((t) => t.id === termId);
  const defaultBase = terms[Math.max(activeIndex - 1, 0)]?.id ?? termId;
  const base = baseId ?? defaultBase;
  const target = targetId ?? termId;
  const sameTerm = base === target || !base || !target;

  const baseTerm = terms.find((t) => t.id === base);
  const targetTerm = terms.find((t) => t.id === target);

  const results = useQueries({
    queries: [base, target].map((code) => ({
      queryKey: ["term-compare", code],
      queryFn: async () => {
        const [stats, grades] = await Promise.all([
          getDashboardStats({ data: { termCode: code } }),
          getGradePerformance({ data: { termCode: code } }),
        ]);
        return { stats, grades };
      },
      enabled: Boolean(code) && !sameTerm,
      staleTime: 60_000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const baseData = results[0]?.data;
  const targetData = results[1]?.data;

  const metrics = useMemo(() => {
    if (!baseData || !targetData) return [];
    return METRICS.map((m) => {
      const from = Number(baseData.stats[m.key] ?? 0);
      const to = Number(targetData.stats[m.key] ?? 0);
      const delta = to - from;
      const deltaPct = from === 0 ? (to === 0 ? 0 : 100) : (delta / from) * 100;
      return {
        ...m,
        from,
        to,
        deltaPct,
        flat: Math.abs(delta) < 0.001,
        improved: m.higherIsBetter ? delta >= 0 : delta <= 0,
      };
    });
  }, [baseData, targetData]);

  const grades = useMemo(() => {
    if (!baseData || !targetData) return [];
    const keys = [
      ...new Set([
        ...baseData.grades.map((g) => g.grade),
        ...targetData.grades.map((g) => g.grade),
      ]),
    ].sort();
    return keys.map((grade) => {
      const from = baseData.grades.find((g) => g.grade === grade)?.mean ?? 0;
      const to = targetData.grades.find((g) => g.grade === grade)?.mean ?? 0;
      return { grade, base: from, target: to, delta: Math.round((to - from) * 10) / 10 };
    });
  }, [baseData, targetData]);

  const improvedGrades = grades.filter((g) => g.delta > 0).length;
  const declinedGrades = grades.filter((g) => g.delta < 0).length;

  const exportComparison = () => {
    const header = ["Metric", baseTerm?.label ?? base, targetTerm?.label ?? target, "Change"];
    const rows = metrics.map((m) => [
      m.label,
      m.format(m.from),
      m.format(m.to),
      `${m.deltaPct >= 0 ? "+" : ""}${Math.round(m.deltaPct * 10) / 10}%`,
    ]);
    const gradeRows = grades.map((g) => [
      `${g.grade} mean (%)`,
      String(g.base),
      String(g.target),
      `${g.delta >= 0 ? "+" : ""}${g.delta}`,
    ]);
    const csv = [header, ...rows, ...gradeRows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `edumaster-${base}-vs-${target}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Comparison exported");
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Term-to-term comparison</CardTitle>
          <p className="text-sm text-muted-foreground">
            {sameTerm
              ? "Pick two different terms to see improvements."
              : `${improvedGrades} classes improved · ${declinedGrades} declined`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TermPicker value={base} onChange={setBaseId} label="Baseline term" />
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <TermPicker value={target} onChange={setTargetId} label="Comparison term" />
          <Button
            variant="outline"
            size="sm"
            onClick={exportComparison}
            disabled={sameTerm || metrics.length === 0}
          >
            <FileDown className="mr-1.5 size-4" /> Export
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {sameTerm ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Baseline and comparison terms are the same. Choose a different baseline to see
            term-over-term movement.
          </p>
        ) : isLoading || metrics.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading comparison…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((m) => (
                <div
                  key={m.key}
                  className="rounded-xl border border-border/70 p-4 transition-shadow hover:shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="truncate text-lg font-semibold">{m.format(m.to)}</span>
                    <DeltaChip
                      improved={m.improved}
                      flat={m.flat}
                      text={`${m.deltaPct >= 0 ? "+" : ""}${Math.round(m.deltaPct * 10) / 10}%`}
                    />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {baseTerm?.short ?? base}: {m.format(m.from)}
                  </p>
                </div>
              ))}
            </div>

            {grades.length > 0 && (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={grades} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis dataKey="grade" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="base"
                        name={baseTerm?.short ?? base}
                        fill="var(--chart-4)"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="target"
                        name={targetTerm?.short ?? target}
                        fill="var(--chart-1)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-2">
                  {grades.map((g) => (
                    <Badge
                      key={g.grade}
                      variant="outline"
                      className={cn(
                        "rounded-full font-medium",
                        g.delta > 0
                          ? "border-success/40 text-success"
                          : g.delta < 0
                            ? "border-destructive/40 text-destructive"
                            : "text-muted-foreground",
                      )}
                    >
                      {g.grade} {g.delta >= 0 ? "+" : ""}
                      {g.delta}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TermPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const { terms } = useTerm();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[150px] rounded-full bg-card" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {terms.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
