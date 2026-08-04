import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, StatCards } from "@/components/DataTable";
import { listPayroll, runPayroll, markPayrollPaid } from "@/lib/api/operations.functions";
import { formatCurrency } from "@/lib/domain/grading";
import { useAuth } from "@/lib/auth-context";
import type { PayrollEntryDTO } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll & HR | EduMaster" },
      {
        name: "description",
        content: "Monthly staff payroll with SSNIT and income tax deductions in Ghana cedis.",
      },
      { property: "og:title", content: "Payroll & HR | EduMaster" },
      { property: "og:description", content: "Staff salaries, SSNIT and income tax in cedis." },
    ],
  }),
  component: PayrollPage,
});

const currentPeriod = () => new Date().toISOString().slice(0, 7);

function PayrollPage() {
  const { isAdmin, hasRole, session } = useAuth();
  const canRun = isAdmin || hasRole("accountant");
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod());

  const { data, isLoading, error } = useQuery({
    queryKey: ["payroll", period],
    queryFn: () => listPayroll({ data: { period } }),
    enabled: Boolean(session),
  });

  const run = useMutation({
    mutationFn: () => runPayroll({ data: { period } }),
    onSuccess: () => {
      toast.success(`Payroll generated for ${period}`);
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pay = useMutation({
    mutationFn: () => markPayrollPaid({ data: { period } }),
    onSuccess: () => {
      toast.success("Payroll marked as paid");
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    return [
      { label: "Staff on payroll", value: String(list.length) },
      { label: "Gross", value: formatCurrency(list.reduce((s, e) => s + e.grossPay, 0)) },
      {
        label: "Deductions",
        value: formatCurrency(list.reduce((s, e) => s + e.ssnit + e.incomeTax, 0)),
      },
      { label: "Net pay", value: formatCurrency(list.reduce((s, e) => s + e.netPay, 0)) },
    ];
  }, [data]);

  const pending = (data ?? []).some((e) => e.status !== "Paid");

  return (
    <AppLayout
      title="Payroll & HR"
      subtitle="Monthly staff salaries with SSNIT and income tax deductions."
      actions={
        canRun ? (
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="period" className="text-xs">
                Month
              </Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value || currentPeriod())}
                className="w-40"
              />
            </div>
            <Button variant="outline" onClick={() => run.mutate()} disabled={run.isPending}>
              {run.isPending ? "Running…" : "Run payroll"}
            </Button>
            <Button onClick={() => pay.mutate()} disabled={pay.isPending || !pending}>
              {pay.isPending ? "Saving…" : "Mark paid"}
            </Button>
          </div>
        ) : null
      }
    >
      <StatCards stats={stats} />
      <Card>
        <CardContent className="p-5">
          <DataTable<PayrollEntryDTO>
            rows={data}
            isLoading={isLoading}
            error={error}
            rowKey={(e) => e.id}
            emptyMessage={`No payroll has been generated for ${period}. Run payroll to create it.`}
            columns={[
              {
                key: "staff",
                header: "Staff",
                render: (e) => (
                  <div>
                    <p className="font-medium">{e.staffName}</p>
                    <p className="text-xs text-muted-foreground">{e.staffNo}</p>
                  </div>
                ),
              },
              { key: "gross", header: "Gross", render: (e) => formatCurrency(e.grossPay) },
              { key: "ssnit", header: "SSNIT", render: (e) => formatCurrency(e.ssnit) },
              { key: "tax", header: "Income tax", render: (e) => formatCurrency(e.incomeTax) },
              { key: "net", header: "Net pay", render: (e) => formatCurrency(e.netPay) },
              {
                key: "status",
                header: "Status",
                render: (e) => (
                  <Badge variant={e.status === "Paid" ? "secondary" : "outline"}>{e.status}</Badge>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
