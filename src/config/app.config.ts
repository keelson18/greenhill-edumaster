/**
 * Single source of truth for tenant-configurable application constants.
 *
 * Anything that a deployment might reasonably want to change lives here (and
 * can be overridden with build-time `VITE_*` environment variables) so that no
 * component ever hardcodes a school name, a page size, or a grading band.
 */

const env = import.meta.env;

export const SCHOOL_PROFILE = {
  name: env.VITE_SCHOOL_NAME ?? "Greenhill Academy",
  motto: env.VITE_SCHOOL_MOTTO ?? "Knowledge · Character · Service",
  principal: env.VITE_SCHOOL_PRINCIPAL ?? "Mrs. Kamau",
  country: "Kenya",
  currency: "KES",
  locale: env.VITE_LOCALE ?? "en-KE",
} as const;

export const APP_META = {
  name: "EduMaster",
  tagline: "CBC school management for Kenyan schools",
} as const;

/** CBC grade ladder supported by the platform (PP1 → Grade 9). */
export const GRADE_LEVELS = [
  "PP1",
  "PP2",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
] as const;

export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const STREAMS = ["A", "B", "C"] as const;

export type CbcLevel = "EE" | "ME" | "AE" | "BE";

/** CBC performance bands. Ordered from highest to lowest. */
export const CBC_BANDS: ReadonlyArray<{
  level: CbcLevel;
  label: string;
  min: number;
}> = [
  { level: "EE", label: "Exceeding Expectation", min: 80 },
  { level: "ME", label: "Meeting Expectation", min: 65 },
  { level: "AE", label: "Approaching Expectation", min: 50 },
  { level: "BE", label: "Below Expectation", min: 0 },
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

export const ROLES = ["admin", "teacher", "parent"] as const;
export type AppRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  parent: "Parent",
};
