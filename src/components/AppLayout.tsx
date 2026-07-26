import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardList,
  CalendarDays,
  BookOpen,
  Wallet,
  Briefcase,
  Library,
  Boxes,
  Bus,
  Search,
  Bell,
  ChevronDown,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SCHOOL } from "@/lib/edumaster-data";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { group: "Overview", items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Academics",
    items: [
      { to: "/students", label: "Students", icon: GraduationCap },
      { to: "/examinations", label: "Examinations", icon: ClipboardList },
      { to: "/teachers", label: "Teachers", icon: Users },
      { to: "/timetable", label: "Timetable", icon: CalendarDays },
      { to: "/homework", label: "Homework", icon: BookOpen },
    ],
  },
  {
    group: "Operations",
    items: [
      { to: "/fees", label: "Fees & Finance", icon: Wallet },
      { to: "/payroll", label: "Payroll & HR", icon: Briefcase },
      { to: "/library", label: "Library", icon: Library },
      { to: "/inventory", label: "Inventory", icon: Boxes },
      { to: "/transport", label: "Transport", icon: Bus },
    ],
  },
] as const;

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
  const [open, setOpen] = useState(false);

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
          <p className="text-xs font-semibold text-sidebar-accent-foreground">{SCHOOL.term}</p>
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
              <button className="relative rounded-full border border-border bg-card p-2" aria-label="Notifications">
                <Bell className="size-4 text-muted-foreground" />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
              </button>
              <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  MK
                </span>
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-xs font-semibold">{SCHOOL.principal}</p>
                  <p className="text-[10px] text-muted-foreground">Principal</p>
                </div>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {SCHOOL.term}
                </Badge>
              </div>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
