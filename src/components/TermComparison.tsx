import { useMemo, useState } from "react";
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
import { compareTerms, previousTermId, TERMS } from "@/lib/edumaster-data";
import { useTerm } from "@/lib/term-context";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
};

function DeltaChip({ improved, text }: { improved: boolean; text: string }) {
  const flat = text.startsWith("0") || text.startsWith("+0 ") || text === "0";
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
 * Side-by-side comparison of two academic terms: headline KPIs plus
 * per-grade academic performance. Defaults to "previous term vs active term".
 */
export function TermComparison({ className }: { className?: string }) {
  const { termId } = useTerm();
  const [baseId, setBaseId] = useState(() => previousTermId(termId));
  const [targetId, setTargetId] = useState(termId);

  const comparison = useMemo(() => compareTerms(baseId, targetId), [baseId, targetId]);
  const { baseTerm, targetTerm, metrics, grades } = comparison;

  const sameTerm = baseId === targetId;

  const exportComparison = () => {
    const header = ["Metric", baseTerm.label, targetTerm.label, "Change"];
    const rows = metrics.map((m) => [
      m.definition.label,
      m.definition.format(m.base),
      m.definition.format(m.target),
      `${m.delta >= 0 ? "+" : ""}${Math.round(m.deltaPct * 10) / 10}%`,
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
    a.download = `edumaster-${baseTerm.id}-vs-${targetTerm.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Comparison exported: ${baseTerm.short} vs ${targetTerm.short}`);
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Term-to-term comparison</CardTitle>
          <p className="text-sm text-muted-foreground">
            {sameTerm
              ? "Pick two different terms to see improvements."
              : `${comparison.improvedGrades} grades improved · ${comparison.declinedGrades} declined · mean ${
                  comparison.meanDelta >= 0 ? "+" : ""
                }${comparison.meanDelta} pts`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TermPicker value={baseId} onChange={setBaseId} label="Baseline term" />
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <TermPicker value={targetId} onChange={setTargetId} label="Comparison term" />
          <Button variant="outline" size="sm" onClick={exportComparison} disabled={sameTerm}>
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
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((m) => (
                <div
                  key={m.definition.key}
                  className="rounded-xl border border-border/70 p-4 transition-shadow hover:shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {m.definition.label}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="truncate text-lg font-semibold">
                      {m.definition.format(m.target)}
                    </span>
                    <DeltaChip
                      improved={m.improved}
                      text={`${m.deltaPct >= 0 ? "+" : ""}${Math.round(m.deltaPct * 10) / 10}%`}
                    />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {baseTerm.short}: {m.definition.format(m.base)}
                  </p>
                </div>
              ))}
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grades} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="grade" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="base" name={baseTerm.short} fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="target" name={targetTerm.short} fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
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
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[150px] rounded-full bg-card" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {TERMS.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
