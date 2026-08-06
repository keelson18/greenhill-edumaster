import type { GradeLevel } from "@/config/app.config";
import type { PerfLevel } from "@/config/app.config";

/** A learner the signed-in user is allowed to follow (their own record or a child). */
export interface LinkedStudentDTO {
  id: string;
  fullName: string;
  admissionNo: string;
  gesId: string;
  gradeLevel: GradeLevel;
  stream: string;
  /** "Self" when the account belongs to the learner, otherwise the family relationship. */
  relationship: string;
}

export interface PortalSubjectScoreDTO {
  subject: string;
  score: number;
}

export interface PortalExamResultDTO {
  examId: string;
  examName: string;
  subjects: PortalSubjectScoreDTO[];
  average: number;
  level: PerfLevel;
}

export interface PortalAttendanceDTO {
  present: number;
  absent: number;
  late: number;
  excused: number;
  recorded: number;
  rate: number;
}

export interface PortalFeesDTO {
  billed: number;
  paid: number;
  balance: number;
  payments: Array<{ id: string; amount: number; method: string; paidAt: string }>;
}

export interface StudentPortalDTO {
  student: LinkedStudentDTO;
  termCode: string;
  results: PortalExamResultDTO[];
  attendance: PortalAttendanceDTO;
  fees: PortalFeesDTO;
}

export interface GuardianLinkDTO {
  id: string;
  studentId: string;
  studentName: string;
  guardianId: string;
  guardianName: string;
  guardianEmail: string | null;
  relationship: string;
}
