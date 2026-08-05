import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardList,
  CalendarDays,
  CalendarCheck,

  BookOpen,
  Wallet,
  Briefcase,
  Library,
  Boxes,
  Bus,
  ShieldCheck,
  ScrollText,
  Settings,

  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/config/app.config";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Roles allowed to see the entry. Empty means everyone signed in. */
  roles: readonly AppRole[];
}

const ALL: readonly AppRole[] = [
  "super_admin",
  "admin",
  "teacher",
  "student",
  "parent",
  "accountant",
  "librarian",
  "staff",
];

const ADMINISTRATION: readonly AppRole[] = ["super_admin", "admin"];
const ACADEMIC: readonly AppRole[] = ["super_admin", "admin", "teacher"];
const FINANCE: readonly AppRole[] = ["super_admin", "admin", "accountant"];
const LIBRARY: readonly AppRole[] = ["super_admin", "admin", "librarian", "teacher"];
const OPERATIONS: readonly AppRole[] = ["super_admin", "admin", "accountant", "staff"];

export const NAV_SECTIONS: ReadonlyArray<{ group: string; items: readonly NavItem[] }> = [
  {
    group: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL }],
  },
  {
    group: "Academics",
    items: [
      { to: "/students", label: "Students", icon: GraduationCap, roles: ACADEMIC },
      { to: "/examinations", label: "Examinations", icon: ClipboardList, roles: [...ACADEMIC, "student", "parent"] },
      { to: "/teachers", label: "Staff & Teachers", icon: Users, roles: ADMINISTRATION },
      { to: "/timetable", label: "Timetable", icon: CalendarDays, roles: [...ALL] },
      { to: "/homework", label: "Homework", icon: BookOpen, roles: [...ACADEMIC, "student", "parent"] },
      { to: "/attendance", label: "Attendance", icon: CalendarCheck, roles: [...ACADEMIC, "staff"] },
    ],
  },

  {
    group: "Operations",
    items: [
      { to: "/fees", label: "Fees & Finance", icon: Wallet, roles: [...FINANCE, "parent", "student"] },
      { to: "/payroll", label: "Payroll & HR", icon: Briefcase, roles: FINANCE },
      { to: "/library", label: "Library", icon: Library, roles: LIBRARY },
      { to: "/inventory", label: "Inventory", icon: Boxes, roles: OPERATIONS },
      { to: "/transport", label: "Transport", icon: Bus, roles: OPERATIONS },
    ],
  },
  {
    group: "Administration",
    items: [
      { to: "/users", label: "User Management", icon: ShieldCheck, roles: ADMINISTRATION },
      { to: "/audit-log", label: "Audit Log", icon: ScrollText, roles: ADMINISTRATION },
      { to: "/settings", label: "My Settings", icon: Settings, roles: ALL },
    ],
  },
];

export function navFor(roles: readonly AppRole[]) {
  const effective = roles.length ? roles : (["staff"] as AppRole[]);
  return NAV_SECTIONS.map((section) => ({
    group: section.group,
    items: section.items.filter((item) => item.roles.some((r) => effective.includes(r))),
  })).filter((section) => section.items.length > 0);
}

/** Roles permitted on a pathname, or `undefined` when the route is unrestricted. */
export function rolesForPath(pathname: string): readonly AppRole[] | undefined {
  const match = NAV_SECTIONS.flatMap((s) => s.items)
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.roles;
}

/** Human label for a pathname, used in the access-denied message. */
export function labelForPath(pathname: string): string | undefined {
  return NAV_SECTIONS.flatMap((s) => s.items).find((item) => pathname === item.to)?.label;
}

export function canAccess(pathname: string, roles: readonly AppRole[]): boolean {
  const required = rolesForPath(pathname);
  if (!required || required.length === 0) return true;
  return roles.some((r) => required.includes(r));
}

