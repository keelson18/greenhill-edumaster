import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ROLE_HOME, type AppRole } from "@/config/app.config";

/**
 * Declarative access control for a page section or a single control.
 *
 * Purely a presentation guard — every server function re-checks permissions
 * against the database, so hiding UI here is convenience, never security.
 */
export function RoleGuard({
  roles,
  children,
  fallback,
}: {
  /** Roles allowed through. Empty means any signed-in user. */
  roles?: readonly AppRole[];
  children: ReactNode;
  /** Rendered instead of `children` when access is denied. Defaults to nothing. */
  fallback?: ReactNode;
}) {
  const { user, profileLoading } = useAuth();
  if (profileLoading) return null;
  if (!roles || roles.length === 0) return <>{children}</>;
  const allowed = (user?.roles ?? []).some((r) => roles.includes(r));
  return <>{allowed ? children : (fallback ?? null)}</>;
}

/** Full-page "you don't have access" panel used by the layout-level guard. */
export function ForbiddenPanel({ area }: { area?: string }) {
  const { user } = useAuth();
  const home = ROLE_HOME[user?.primaryRole ?? "staff"];
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-6" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold">You don&apos;t have access to this page</h2>
      <p className="text-sm text-muted-foreground">
        {area ? `${area} is restricted to other roles at this school.` : "This area is restricted."}{" "}
        Ask an administrator if you believe you should have access.
      </p>
      <Button asChild>
        <Link to={home}>Back to my workspace</Link>
      </Button>
    </div>
  );
}
