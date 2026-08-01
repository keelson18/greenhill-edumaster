import { Link, useRouterState } from "@tanstack/react-router";
import {
  GraduationCap,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SCHOOL_PROFILE, ROLE_LABELS } from "@/config/app.config";
import { navFor } from "@/config/nav";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TermSelect } from "@/components/TermSelect";
import { useTerm } from "@/lib/term-context";
import { useAuth } from "@/lib/auth-context";

const SCHOOL = SCHOOL_PROFILE;

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}



export function AppLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { term } = useTerm();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || "Staff member";

  async function handleSignOut() {
    await signOut();
  }


  return (
    <div className="min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:flex lg:translate-x-0",
          open ? "flex translate-x-0" : "hidden -translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight text-sidebar-accent-foreground">
              EduMaster
            </p>
            <p className="text-[11px] text-sidebar-foreground/70">{SCHOOL.name}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {NAV.map((section) => (
            <div key={section.group}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
                {section.group}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = path === item.to;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        {item.label}
                        {active && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mx-3 mb-4 rounded-xl bg-sidebar-accent/70 p-3">
          <p className="text-xs font-semibold text-sidebar-accent-foreground">{term.label}</p>
          <p className="text-[11px] text-sidebar-foreground/70">{term.window} · {term.status}</p>
          <p className="mt-1 text-[11px] text-sidebar-foreground/70">{SCHOOL.motto}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
            <button
              className="rounded-md border border-border p-2 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <Menu className="size-4" />
            </button>
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students, exams, invoices…"
                className="h-9 rounded-full border-border bg-muted/60 pl-9"
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <TermSelect className="hidden sm:flex" />
              <button className="relative rounded-full border border-border bg-card p-2" aria-label="Notifications">
                <Bell className="size-4 text-muted-foreground" />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-left transition-colors hover:bg-muted/60"
                    aria-label="Account menu"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {initialsOf(displayName)}
                    </span>
                    <span className="hidden leading-tight sm:block">
                      <span className="block text-xs font-semibold">{displayName}</span>
                      <span className="block text-[10px] capitalize text-muted-foreground">
                        {user?.roles?.[0] ?? "Staff"}
                      </span>
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate font-normal">
                    <span className="block text-sm font-medium">{displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleSignOut()}>
                    <LogOut className="mr-2 size-4" aria-hidden /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {term.label}
                </Badge>
              </div>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TermSelect className="sm:hidden" />
              {actions}
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
