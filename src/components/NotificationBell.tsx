import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/domain/grading";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/audit.functions";

/**
 * Header bell showing the signed-in user's in-app alerts: term-lock changes,
 * role updates and account suspensions. Polls gently so a staff member sees
 * events raised by another administrator without a refresh.
 */
export function NotificationBell() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const items = query.data ?? [];
  const unread = useMemo(() => items.filter((n) => !n.readAt).length, [items]);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: invalidate,
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-full border border-border bg-card p-2"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="size-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs"
            disabled={unread === 0 || readAll.isPending}
            onClick={() => readAll.mutate()}
          >
            <CheckCheck className="size-3.5" aria-hidden /> Mark all read
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query.isLoading && (
            <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
            </p>
          )}
          {!query.isLoading && items.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              You have no notifications yet.
            </p>
          )}
          {items.map((n) => {
            const body = (
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.readAt ? "bg-transparent" : "bg-primary",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </div>
            );
            return (
              <div
                key={n.id}
                className={cn(
                  "border-b border-border/60 px-3 py-2.5 last:border-0",
                  !n.readAt && "bg-muted/40",
                )}
                onClick={() => !n.readAt && readOne.mutate(n.id)}
              >
                {n.link ? (
                  <Link to={n.link} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
