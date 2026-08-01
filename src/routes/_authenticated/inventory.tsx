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
import {
  listInventory,
  saveInventoryItem,
  deleteInventoryItem,
} from "@/lib/api/operations.functions";
import { formatCurrency } from "@/lib/domain/grading";
import { useAuth } from "@/lib/auth-context";
import type { InventoryItemDTO } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory | EduMaster" },
      {
        name: "description",
        content: "School assets, consumables and stock levels valued in Ghana cedis.",
      },
      { property: "og:title", content: "Inventory | EduMaster" },
      { property: "og:description", content: "Assets, consumables and stock levels in cedis." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "General",
    quantity: "0",
    unitCost: "0",
    location: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => listInventory(),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((i) =>
      [i.name, i.category, i.location].some((v) => v.toLowerCase().includes(term)),
    );
  }, [data, search]);

  const save = useMutation({
    mutationFn: () =>
      saveInventoryItem({
        data: {
          name: form.name,
          category: form.category,
          quantity: Number(form.quantity) || 0,
          unitCost: Number(form.unitCost) || 0,
          location: form.location,
          condition: "Good" as const,
        },
      }),
    onSuccess: () => {
      toast.success("Item added to the register");
      setOpen(false);
      setForm({ name: "", category: "General", quantity: "0", unitCost: "0", location: "" });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteInventoryItem({ data: { id } }),
    onSuccess: () => {
      toast.success("Item removed");
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    const value = list.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    return [
      { label: "Line items", value: String(list.length) },
      { label: "Asset value", value: formatCurrency(value) },
      { label: "Low stock (<10)", value: String(list.filter((i) => i.quantity < 10).length) },
      {
        label: "Needs repair",
        value: String(list.filter((i) => i.condition === "Needs repair").length),
      },
    ];
  }, [data]);

  return (
    <AppLayout
      title="Inventory"
      subtitle="Assets, consumables and stock levels valued in cedis."
      actions={
        isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add an inventory item</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["name", "Item name", "text"],
                    ["category", "Category", "text"],
                    ["quantity", "Quantity", "number"],
                    ["unitCost", "Unit cost (₵)", "number"],
                    ["location", "Location", "text"],
                  ] as const
                ).map(([key, label, type]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`inv-${key}`}>{label}</Label>
                    <Input
                      id={`inv-${key}`}
                      type={type}
                      value={form[key]}
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
                  {save.isPending ? "Saving…" : "Add item"}
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
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="mb-4 max-w-sm"
            aria-label="Search inventory"
          />
          <DataTable<InventoryItemDTO>
            rows={rows}
            isLoading={isLoading}
            error={error}
            rowKey={(i) => i.id}
            emptyMessage="No inventory items match this search."
            columns={[
              { key: "name", header: "Item", render: (i) => i.name },
              { key: "cat", header: "Category", render: (i) => i.category },
              { key: "qty", header: "Quantity", render: (i) => i.quantity },
              { key: "cost", header: "Unit cost", render: (i) => formatCurrency(i.unitCost) },
              {
                key: "value",
                header: "Value",
                render: (i) => formatCurrency(i.quantity * i.unitCost),
              },
              { key: "loc", header: "Location", render: (i) => i.location || "—" },
              {
                key: "cond",
                header: "Condition",
                render: (i) => (
                  <Badge variant={i.condition === "Good" ? "secondary" : "destructive"}>
                    {i.condition}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (i) =>
                  isAdmin ? (
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(i.id)}>
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
