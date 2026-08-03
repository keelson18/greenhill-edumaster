import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Search, ShieldCheck, Download } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, StatCards, type Column } from "@/components/DataTable";
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
import { listAuditLogs } from "@/lib/api/audit.functions";
import { formatDateTime, formatNumber } from "@/lib/domain/grading";
import type { AuditAction, AuditLogDTO } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

const ACTION_LABELS: Record<AuditAction, string> = {
  role_assigned: "Role changed",
  user_suspended: "Account suspended",
  user_reinstated: "Account reinstated",
  user_deleted: "Account deleted",
  user_updated: "User details updated",
  term_locked: "Term locked",
  term_unlocked: "Term reopened",
};

const DESTRUCTIVE: AuditAction[] = ["user_deleted", "user_suspended"];

export const Route = createFileRoute("/_authenticated/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log | EduMaster Ghana" },
      {
        name: "description",
        content:
          "Immutable record of administrative activity in EduMaster: role changes, account suspensions, deletions and term-lock events, with searchable filters.",
      },
      { property: "og:title", content: "Audit Log | EduMaster Ghana" },
      {
        property: "og:description",
        content: "Search every administrative action taken in your school's EduMaster workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [entityType, setEntityType] = useState<"all" | "user" | "term">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const query = useQuery({
    queryKey: ["audit-logs", { search, action, entityType, from, to, page }],
    queryFn: () =>
      listAuditLogs({
        data: {
          page,
          pageSize,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(action !== "all" ? { action } : {}),
          ...(entityType !== "all" ? { entityType } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
      }),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });

  const result = query.data;
  const rows = result?.items ?? [];

  const columns: ReadonlyArray<Column<AuditLogDTO>> = [
    {
      key: "when",
      header: "When",
      render: (r) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Performed by",
      render: (r) => (
        <div>
          <p className="font-medium">{r.actorName}</p>
          <p className="text-xs text-muted-foreground">{r.actorEmail ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <Badge variant={DESTRUCTIVE.includes(r.action) ? "outline" : "secondary"}>
          {ACTION_LABELS[r.action] ?? r.action}
        </Badge>
      ),
    },
    {
      key: "entity",
      header: "Subject",
      render: (r) => (
        <div>
          <p className="font-medium">{r.entityLabel || "—"}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{r.entityType}</p>
        </div>
      ),
    },
    {
      key: "summary",
      header: "Details",
      render: (r) => <span className="text-muted-foreground">{r.summary}</span>,
    },
  ];

  function exportCsv() {
    const header = ["Timestamp", "Performed by", "Email", "Action", "Subject", "Details"];
    const body = rows.map((r) => [
      formatDateTime(r.createdAt),
      r.actorName,
      r.actorEmail ?? "",
      ACTION_LABELS[r.action] ?? r.action,
      r.entityLabel,
      r.summary,
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `edumaster-audit-log-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isAdmin) {
    return (
      <AppLayout title="Audit log" subtitle="Administrator access is required.">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ShieldCheck className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Only Super Admins and Admins can review the administrative audit trail.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Audit log"
      subtitle="Every role change, suspension, deletion and term-lock event, kept permanently."
      actions={
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-1.5 size-4" aria-hidden /> Export page
        </Button>
      }
    >
      <StatCards
        stats={[
          {
            label: "Matching events",
            value: formatNumber(result?.total ?? 0),
            hint: "Across the current filters",
          },
          {
            label: "On this page",
            value: formatNumber(rows.length),
            hint: `Page ${result?.page ?? 1} of ${result?.pageCount ?? 1}`,
          },
          {
            label: "Role changes",
            value: formatNumber(rows.filter((r) => r.action === "role_assigned").length),
            hint: "Shown on this page",
          },
          {
            label: "Term-lock events",
            value: formatNumber(
              rows.filter((r) => r.action === "term_locked" || r.action === "term_unlocked").length,
            ),
            hint: "Shown on this page",
          },
        ]}
      />

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 grid gap-3 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by person, subject or detail"
                className="pl-9"
                aria-label="Search the audit log"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Action</Label>
              <Select
                value={action}
                onValueChange={(v) => {
                  setAction(v as AuditAction | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Filter by action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Area</Label>
              <Select
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v as "all" | "user" | "term");
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Filter by area">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All areas</SelectItem>
                  <SelectItem value="user">User accounts</SelectItem>
                  <SelectItem value="term">Academic terms</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <DataTable
            rows={rows}
            columns={columns}
            isLoading={query.isLoading}
            error={query.error}
            rowKey={(r) => r.id}
            emptyMessage="No administrative activity matches these filters."
          />

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {result?.page ?? 1} of {result?.pageCount ?? 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={(result?.page ?? 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(result?.page ?? 1) >= (result?.pageCount ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
