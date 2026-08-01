import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/AppLayout";
import { StatCards } from "@/components/DataTable";
import { listTimetable } from "@/lib/api/operations.functions";
import { GRADE_LEVELS } from "@/config/app.config";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable | EduMaster" },
      {
        name: "description",
        content: "Weekly lesson schedule across KG1 to Basic 9 classes, by period and teacher.",
      },
      { property: "og:title", content: "Timetable | EduMaster" },
      { property: "og:description", content: "Weekly lesson schedule by class and period." },
    ],
  }),
  component: TimetablePage,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

function TimetablePage() {
  const [classLevel, setClassLevel] = useState<string>(GRADE_LEVELS[6]);

  const { data, isLoading } = useQuery({
    queryKey: ["timetable", classLevel],
    queryFn: () => listTimetable({ data: { classLevel } }),
  });

  const periods = useMemo(() => {
    const map = new Map<number, { startsAt: string; endsAt: string }>();
    for (const slot of data ?? []) {
      if (!map.has(slot.period)) map.set(slot.period, { startsAt: slot.startsAt, endsAt: slot.endsAt });
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [data]);

  const cell = (day: string, period: number) =>
    (data ?? []).find((s) => s.dayOfWeek === day && s.period === period);

  const stats = [
    { label: "Class", value: classLevel },
    { label: "Lessons scheduled", value: String((data ?? []).length) },
    { label: "Periods per day", value: String(periods.length) },
    { label: "Teaching days", value: String(DAYS.length) },
  ];

  return (
    <AppLayout title="Timetable" subtitle="Weekly lesson schedule by class and period.">
      <StatCards stats={stats} />
      <Card>
        <CardContent className="p-5">
          <Select value={classLevel} onValueChange={setClassLevel}>
            <SelectTrigger className="mb-4 w-48" aria-label="Select class">
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

          {isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading timetable…</p>
          ) : periods.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No lessons have been scheduled for {classLevel} yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Time</th>
                    {DAYS.map((d) => (
                      <th key={d} className="py-2 pr-4 font-medium">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map(([period, window]) => (
                    <tr key={period} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                        {window.startsAt.slice(0, 5)} – {window.endsAt.slice(0, 5)}
                      </td>
                      {DAYS.map((d) => {
                        const slot = cell(d, period);
                        return (
                          <td key={d} className="py-3 pr-4">
                            {slot ? (
                              <div>
                                <p className="font-medium">{slot.subjectName ?? "—"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {slot.staffName ?? "Unassigned"}
                                  {slot.room ? ` · ${slot.room}` : ""}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
