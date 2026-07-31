/**
 * Single source of truth for tenant-configurable application constants.
 *
 * Anything a deployment might reasonably want to change lives here (and can be
 * overridden with build-time `VITE_*` environment variables) so that no
 * component ever hardcodes a school name, a page size, or a grading band.
 *
 * Locale target: Ghana — GHS (₵), en-GH, Africa/Accra, DD/MM/YYYY.
 */

const env = import.meta.env;

export const SCHOOL_PROFILE = {
  name: env.VITE_SCHOOL_NAME ?? "Greenhill Academy",
  motto: env.VITE_SCHOOL_MOTTO ?? "Knowledge · Character · Service",
  principal: env.VITE_SCHOOL_PRINCIPAL ?? "Mr. Kwame Mensah",
  country: "Ghana",
  currency: "GHS",
  currencySymbol: "₵",
  locale: env.VITE_LOCALE ?? "en-GH",
  timeZone: "Africa/Accra",
  dialCode: "+233",
  region: env.VITE_SCHOOL_REGION ?? "Greater Accra",
  district: env.VITE_SCHOOL_DISTRICT ?? "Accra Metropolitan",
  town: env.VITE_SCHOOL_TOWN ?? "Accra",
  ghanaPostGps: env.VITE_SCHOOL_GPS ?? "GA-183-4471",
} as const;

export const APP_META = {
  name: "EduMaster",
  tagline: "Basic school management for Ghanaian schools",
} as const;

/** Ghana basic-education ladder (KG1 → Basic 9 / JHS 3). */
export const GRADE_LEVELS = [
  "KG1",
  "KG2",
  "Basic 1",
  "Basic 2",
  "Basic 3",
  "Basic 4",
  "Basic 5",
  "Basic 6",
  "Basic 7",
  "Basic 8",
  "Basic 9",
] as const;

export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const GRADE_SCOPE_LABEL = "KG1 – Basic 9";

export const STREAMS = ["A", "B", "C"] as const;

/** The 16 administrative regions of Ghana. */
export const GHANA_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
] as const;
export type GhanaRegion = (typeof GHANA_REGIONS)[number];

/** GES standards-based proficiency levels, highest to lowest. */
export type PerfLevel = "HP" | "P" | "AP" | "D";

export const PERF_BANDS: ReadonlyArray<{
  level: PerfLevel;
  label: string;
  min: number;
}> = [
  { level: "HP", label: "Highly Proficient", min: 80 },
  { level: "P", label: "Proficient", min: 65 },
  { level: "AP", label: "Approaching Proficiency", min: 50 },
  { level: "D", label: "Developing", min: 0 },
];

export const PAGINATION = {
  defaultPageSize: Number(env.VITE_DEFAULT_PAGE_SIZE ?? 25),
  maxPageSize: 100,
  markSheetSize: 40,
} as const;

export const QUERY_DEFAULTS = {
  /** Reference data (terms, subjects) changes rarely. */
  referenceStaleTimeMs: 5 * 60 * 1000,
  /** Operational data (marks, students) should feel live. */
  operationalStaleTimeMs: 30 * 1000,
} as const;

export const ROLES = [
  "super_admin",
  "admin",
  "teacher",
  "student",
  "parent",
  "accountant",
  "librarian",
  "staff",
] as const;
export type AppRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  accountant: "Accountant / Bursar",
  librarian: "Librarian",
  staff: "Staff",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Full control including user management.",
  admin: "Runs the school: learners, exams, finance and operations.",
  teacher: "Teaches classes, records marks and sets homework.",
  student: "Sees their own results, timetable and fees.",
  parent: "Follows their child's performance, attendance and fees.",
  accountant: "Manages fees, collections and payroll.",
  librarian: "Manages the library catalogue and lending.",
  staff: "General staff access to school information.",
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<AppRole, string> = {
  super_admin: "/dashboard",
  admin: "/dashboard",
  teacher: "/dashboard",
  student: "/dashboard",
  parent: "/dashboard",
  accountant: "/fees",
  librarian: "/library",
  staff: "/dashboard",
};
