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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, StatCards } from "@/components/DataTable";
import { listRoutes, saveRoute, deleteRoute } from "@/lib/api/operations.functions";
import { formatPhone } from "@/lib/domain/grading";
import { useAuth } from "@/lib/auth-context";
import type { TransportRouteDTO } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/transport")({
  head: () => ({
    meta: [
      { title: "Transport | EduMaster" },
      {
        name: "description",
        content: "School bus routes, vehicles, drivers and learners ferried each day.",
      },
      { property: "og:title", content: "Transport | EduMaster" },
      { property: "og:description", content: "Routes, vehicles, drivers and learners ferried." },
    ],
  }),
  component: TransportPage,
});

function TransportPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    vehicleReg: "",
    driverName: "",
    driverPhone: "",
    capacity: "0",
    learners: "0",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["routes"],
    queryFn: () => listRoutes(),
  });

  const save = useMutation({
    mutationFn: () =>
      saveRoute({
        data: {
          name: form.name,
          vehicleReg: form.vehicleReg,
          driverName: form.driverName,
          driverPhone: form.driverPhone,
          capacity: Number(form.capacity) || 0,
          learners: Number(form.learners) || 0,
          status: "Active" as const,
        },
      }),
    onSuccess: () => {
      toast.success("Route added");
      setOpen(false);
      setForm({
        name: "",
        vehicleReg: "",
        driverName: "",
        driverPhone: "",
        capacity: "0",
        learners: "0",
      });
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRoute({ data: { id } }),
    onSuccess: () => {
      toast.success("Route removed");
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    const seats = list.reduce((s, r) => s + r.capacity, 0);
    const riders = list.reduce((s, r) => s + r.learners, 0);
    return [
      { label: "Routes", value: String(list.length) },
      { label: "Learners ferried", value: String(riders) },
      { label: "Seat utilisation", value: seats ? `${Math.round((riders / seats) * 100)}%` : "—" },
      { label: "Service due", value: String(list.filter((r) => r.status !== "Active").length) },
    ];
  }, [data]);

  return (
    <AppLayout
      title="Transport"
      subtitle="Routes, vehicles, drivers and learners ferried."
      actions={
        isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add route</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a transport route</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["name", "Route name", "text"],
                    ["vehicleReg", "Vehicle registration", "text"],
                    ["driverName", "Driver", "text"],
                    ["driverPhone", "Driver phone", "tel"],
                    ["capacity", "Capacity", "number"],
                    ["learners", "Learners", "number"],
                  ] as const
                ).map(([key, label, type]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`rt-${key}`}>{label}</Label>
                    <Input
                      id={`rt-${key}`}
                      type={type}
                      value={form[key]}
                      placeholder={key === "driverPhone" ? "+233 24 000 0000" : undefined}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || form.name.trim().length < 2}
                >
                  {save.isPending ? "Saving…" : "Add route"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null
      }
    >
      <StatCards stats={stats} />
      <Card>
        <CardContent className="p-5">
          <DataTable<TransportRouteDTO>
            rows={data}
            isLoading={isLoading}
            error={error}
            rowKey={(r) => r.id}
            emptyMessage="No transport routes have been set up."
            columns={[
              { key: "name", header: "Route", render: (r) => r.name },
              { key: "veh", header: "Vehicle", render: (r) => r.vehicleReg },
              {
                key: "driver",
                header: "Driver",
                render: (r) => (
                  <div>
                    <p>{r.driverName}</p>
                    <p className="text-xs text-muted-foreground">{formatPhone(r.driverPhone)}</p>
                  </div>
                ),
              },
              {
                key: "load",
                header: "Learners",
                render: (r) => `${r.learners} / ${r.capacity}`,
              },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <Badge variant={r.status === "Active" ? "secondary" : "destructive"}>
                    {r.status}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (r) =>
                  isAdmin ? (
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}>
                      Remove
                    </Button>
                  ) : null,
              },
            ]}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
