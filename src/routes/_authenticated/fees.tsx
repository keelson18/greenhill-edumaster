import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, StatCards } from "@/components/DataTable";
import { listFeeRecords, getFeeSummary, recordFeePayment } from "@/lib/api/finance.functions";
import { formatCurrency } from "@/lib/domain/grading";
import { useTerm } from "@/lib/term-context";
import { useAuth } from "@/lib/auth-context";
import type { FeeRecordDTO } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/fees")({
  head: () => ({
    meta: [
      { title: "Fees & Finance | EduMaster" },
      {
        name: "description",
        content: "Learner billing, mobile money collections and arrears tracking in Ghana cedis.",
      },
      { property: "og:title", content: "Fees & Finance | EduMaster" },
      { property: "og:description", content: "Billing, collections and arrears in Ghana cedis." },
    ],
  }),
  component: FeesPage,
});

const METHODS = ["Mobile Money", "Bank transfer", "Cash", "Cheque"] as const;

function FeesPage() {
  const { isAdmin, hasRole } = useAuth();
  const canPost = isAdmin || hasRole("accountant");
  const { termCode } = useTerm();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<FeeRecordDTO | null>(null);
  const [payment, setPayment] = useState({
    amount: "",
    method: "Mobile Money" as (typeof METHODS)[number],
    reference: "",
  });

  const records = useQuery({
    queryKey: ["fee-records", termCode],
    queryFn: () => listFeeRecords({ data: { termCode } }),
    enabled: Boolean(termCode),
  });
  const summary = useQuery({
    queryKey: ["fee-summary", termCode],
    queryFn: () => getFeeSummary({ data: { termCode } }),
    enabled: Boolean(termCode),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records.data ?? [];
    return (records.data ?? []).filter((r) =>
      [r.fullName, r.admissionNo, r.gradeLevel].some((v) => v.toLowerCase().includes(term)),
    );
  }, [records.data, search]);

  const post = useMutation({
    mutationFn: () =>
      recordFeePayment({
        data: {
          studentId: target!.studentId,
          termCode,
          amount: Number(payment.amount),
          method: payment.method,
          reference: payment.reference,
        },
      }),
    onSuccess: () => {
      toast.success("Payment recorded");
      setTarget(null);
      setPayment({ amount: "", method: "Mobile Money", reference: "" });
      void queryClient.invalidateQueries({ queryKey: ["fee-records"] });
      void queryClient.invalidateQueries({ queryKey: ["fee-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = summary.data;
  const stats = [
    { label: "Billed", value: s ? formatCurrency(s.billed) : "—" },
    { label: "Collected", value: s ? formatCurrency(s.collected) : "—" },
    { label: "Outstanding", value: s ? formatCurrency(s.outstanding) : "—" },
    { label: "Learners cleared", value: s ? String(s.clearedLearners) : "—" },
  ];

  return (
    <AppLayout
      title="Fees & Finance"
      subtitle="Learner billing, collections and arrears for the selected term."
    >
      <StatCards stats={stats} />
      <Card>
        <CardContent className="p-5">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learners by name, admission no or class…"
            className="mb-4 max-w-sm"
            aria-label="Search fee records"
          />
          <DataTable<FeeRecordDTO>
            rows={rows}
            isLoading={records.isLoading}
            error={records.error}
            rowKey={(r) => r.studentId}
            emptyMessage="No learners match this search."
            columns={[
              {
                key: "learner",
                header: "Learner",
                render: (r) => (
                  <div>
                    <p className="font-medium">{r.fullName}</p>
                    <p className="text-xs text-muted-foreground">{r.admissionNo}</p>
                  </div>
                ),
              },
              { key: "class", header: "Class", render: (r) => r.gradeLevel },
              { key: "billed", header: "Billed", render: (r) => formatCurrency(r.billed) },
              { key: "paid", header: "Paid", render: (r) => formatCurrency(r.paid) },
              {
                key: "balance",
                header: "Balance",
                render: (r) => (
                  <Badge variant={r.balance > 0 ? "destructive" : "secondary"}>
                    {formatCurrency(r.balance)}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (r) =>
                  canPost ? (
                    <Button size="sm" variant="ghost" onClick={() => setTarget(r)}>
                      Record payment
                    </Button>
                  ) : null,
              },
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment — {target?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Outstanding balance: {target ? formatCurrency(target.balance) : "—"}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="fee-amount">Amount (₵)</Label>
              <Input
                id="fee-amount"
                type="number"
                min={1}
                value={payment.amount}
                onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select
                value={payment.method}
                onValueChange={(v) =>
                  setPayment((p) => ({ ...p, method: v as (typeof METHODS)[number] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee-ref">Reference</Label>
              <Input
                id="fee-ref"
                value={payment.reference}
                onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))}
                placeholder="MoMo transaction ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => post.mutate()}
              disabled={post.isPending || !(Number(payment.amount) > 0)}
            >
              {post.isPending ? "Posting…" : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
