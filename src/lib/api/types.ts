import type { GradeLevel } from "@/config/app.config";

/**
 * Data-transfer objects returned by server functions. The UI depends on these
 * shapes only — never on raw database rows — so storage can evolve
 * independently of presentation.
 */

export type TermStatus = "Closed" | "Current" | "Upcoming";
export type ExamStatus = "Draft" | "Active" | "Marking" | "Completed";
export type StudentStatus = "Active" | "Suspended" | "Transferred";

export interface TermDTO {
  /** Stable business key, e.g. `2026-t2`. Used everywhere in the UI. */
  id: string;
  uuid: string;
  label: string;
  short: string;
  year: number;
  startsOn: string;
  endsOn: string;
  /** Human window, e.g. "May – Aug 2026". */
  window: string;
  status: TermStatus;
  isLocked: boolean;
}

export interface SubjectDTO {
  id: string;
  code: string;
  name: string;
}

export interface StudentDTO {
  id: string;
  fullName: string;
  admissionNo: string;
  nemisNo: string;
  gradeLevel: GradeLevel;
  stream: string;
  gender: "Male" | "Female";
  guardianName: string;
  guardianPhone: string;
  dateOfBirth: string | null;
  county: string | null;
  status: StudentStatus;
  admittedOn: string;
  feeBilled: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ExamDTO {
  id: string;
  name: string;
  termCode: string;
  gradeScope: string;
  startsOn: string;
  endsOn: string;
  status: ExamStatus;
  marksEntered: number;
}

export interface MarkSheetRow {
  studentId: string;
  fullName: string;
  admissionNo: string;
  scores: Record<string, number>;
}

export interface MarkSheetDTO {
  examId: string;
  termCode: string;
  locked: boolean;
  subjects: SubjectDTO[];
  rows: MarkSheetRow[];
}

export interface DashboardStats {
  learners: number;
  activeLearners: number;
  feesBilled: number;
  feesCollected: number;
  feesOutstanding: number;
  examCount: number;
  marksCount: number;
  meanScore: number;
}

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string;
  roles: string[];
  isAdmin: boolean;
  isStaff: boolean;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-05-04" + "2026-08-07" → "May – Aug 2026" */
export function describeWindow(startsOn: string, endsOn: string): string {
  const start = new Date(startsOn);
  const end = new Date(endsOn);
  return `${MONTHS[start.getUTCMonth()]} – ${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}
