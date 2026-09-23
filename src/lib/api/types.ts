import type { AppRole, GradeLevel } from "@/config/app.config";

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
  /** Ghana Education Service learner identifier. */
  gesId: string;
  gradeLevel: GradeLevel;
  stream: string;
  gender: "Male" | "Female";
  guardianName: string;
  guardianPhone: string;
  dateOfBirth: string | null;
  region: string | null;
  district: string | null;
  town: string | null;
  ghanaPostGps: string | null;
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
  isPublished: boolean;
  publishedAt: string | null;
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
  phone: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
  isSuspended: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isFinance: boolean;
}

/* ------------------------------ Operations ------------------------------ */

export interface StaffDTO {
  id: string;
  staffNo: string;
  fullName: string;
  jobTitle: string;
  department: string;
  subject: string | null;
  phone: string;
  email: string | null;
  status: string;
  monthlySalary: number;
  hiredOn: string;
}

export interface TimetableSlotDTO {
  id: string;
  dayOfWeek: string;
  period: number;
  startsAt: string;
  endsAt: string;
  classLevel: string;
  subjectName: string | null;
  staffName: string | null;
  room: string | null;
}

export interface HomeworkDTO {
  id: string;
  title: string;
  classLevel: string;
  subjectName: string | null;
  description: string;
  assignedOn: string;
  dueOn: string;
  status: string;
}

export interface BookDTO {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string | null;
  totalCopies: number;
  availableCopies: number;
}

export interface LoanDTO {
  id: string;
  bookTitle: string;
  borrowerName: string;
  borrowedOn: string;
  dueOn: string;
  returnedOn: string | null;
  overdue: boolean;
}

export interface InventoryItemDTO {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitCost: number;
  location: string;
  condition: string;
}

export interface TransportRouteDTO {
  id: string;
  name: string;
  vehicleReg: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  learners: number;
  status: string;
}

export interface PayrollEntryDTO {
  id: string;
  staffName: string;
  staffNo: string;
  period: string;
  grossPay: number;
  ssnit: number;
  incomeTax: number;
  netPay: number;
  status: string;
}

export interface FeeRecordDTO {
  studentId: string;
  fullName: string;
  admissionNo: string;
  gradeLevel: string;
  billed: number;
  paid: number;
  balance: number;
}

export interface FeeSummaryDTO {
  billed: number;
  collected: number;
  outstanding: number;
  payments: number;
  clearedLearners: number;
}

export interface ManagedUserDTO {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roles: AppRole[];
  isSuspended: boolean;
  createdAt: string;
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

export type AuditAction =
  | "role_assigned"
  | "user_suspended"
  | "user_reinstated"
  | "user_deleted"
  | "user_updated"
  | "term_locked"
  | "term_unlocked";

export interface AuditLogDTO {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  entityLabel: string;
  summary: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  title: string;
  body: string;
  category: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** One learner row on the daily attendance sheet. */
export interface StudentAttendanceRowDTO {
  studentId: string;
  fullName: string;
  admissionNo: string;
  classLevel: string;
  stream: string;
  status: "present" | "absent" | "late" | "excused" | null;
  note: string | null;
}

/** One staff row on the daily attendance sheet. */
export interface StaffAttendanceRowDTO {
  staffId: string;
  fullName: string;
  staffNo: string;
  jobTitle: string;
  department: string;
  status: "present" | "absent" | "late" | "excused" | null;
  note: string | null;
}

export interface AttendanceSummaryDTO {
  records: number;
  daysRecorded: number;
  /** Percentage of marked records that were present or late. */
  presentRate: number;
  absentCount: number;
}
