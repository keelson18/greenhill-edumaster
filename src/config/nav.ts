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
  ShieldCheck,
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
    items: [{ to: "/users", label: "User Management", icon: ShieldCheck, roles: ADMINISTRATION }],
  },
];

export function navFor(roles: readonly AppRole[]) {
  const effective = roles.length ? roles : (["staff"] as AppRole[]);
  return NAV_SECTIONS.map((section) => ({
    group: section.group,
    items: section.items.filter((item) => item.roles.some((r) => effective.includes(r))),
  })).filter((section) => section.items.length > 0);
}
