import { z } from "zod";
import { GHANA_REGIONS, GRADE_LEVELS, PAGINATION, ROLES, STREAMS } from "@/config/app.config";

/**
 * Shared request schemas. Every server function validates its input with one
 * of these, so validation rules live in exactly one place and are reused by
 * client-side forms.
 */

export const uuidSchema = z.string().uuid();

export const termCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-t[1-3]$/, "Invalid term code");

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(PAGINATION.maxPageSize).default(PAGINATION.defaultPageSize),
});

export const searchQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(80).optional(),
});

export const studentQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(80).optional(),
  grade: z.enum(GRADE_LEVELS).optional(),
  status: z.enum(["Active", "Suspended", "Transferred"]).optional(),
});
export type StudentQuery = z.infer<typeof studentQuerySchema>;

/** Ghana mobile numbers: +233 XX XXX XXXX, 0XXXXXXXXX or 233XXXXXXXXX. */
export const ghanaPhoneSchema = z
  .string()
  .trim()
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    const local = digits.startsWith("233") ? digits.slice(3) : digits.replace(/^0/, "");
    return local.length === 9;
  }, "Enter a valid Ghana phone number, e.g. +233 24 512 3390");

/** Ghana Post GPS digital address, e.g. GA-183-4471. */
export const ghanaPostGpsSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/, "Use the Ghana Post GPS format, e.g. GA-183-4471");

/** GES learner identifier. */
export const gesIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{6,20}$/, "GES ID must be 6–20 letters, digits or dashes");

export const studentInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  admissionNo: z.string().trim().min(3).max(40),
  gesId: gesIdSchema,
  gradeLevel: z.enum(GRADE_LEVELS),
  stream: z.enum(STREAMS),
  gender: z.enum(["Male", "Female"]),
  guardianName: z.string().trim().min(2).max(120),
  guardianPhone: ghanaPhoneSchema,
  dateOfBirth: z.string().date().optional().or(z.literal("")),
  region: z.enum(GHANA_REGIONS).optional(),
  district: z.string().trim().max(80).optional(),
  town: z.string().trim().max(80).optional(),
  ghanaPostGps: ghanaPostGpsSchema.optional().or(z.literal("")),
  status: z.enum(["Active", "Suspended", "Transferred"]).default("Active"),
  feeBilled: z.number().min(0).max(1_000_000).default(0),
});
export type StudentInput = z.infer<typeof studentInputSchema>;

export const studentUpdateSchema = studentInputSchema.partial().extend({ id: uuidSchema });

export const examInputSchema = z
  .object({
    termCode: termCodeSchema,
    name: z.string().trim().min(3).max(140),
    gradeScope: z.string().trim().min(2).max(60),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    message: "End date must be on or after the start date",
    path: ["endsOn"],
  });
export type ExamInput = z.infer<typeof examInputSchema>;

export const markEntrySchema = z.object({
  studentId: uuidSchema,
  subjectId: uuidSchema,
  score: z.number().min(0).max(100),
});

export const saveMarksSchema = z.object({
  examId: uuidSchema,
  entries: z.array(markEntrySchema).min(1).max(2000),
});

export const termLockSchema = z.object({
  termCode: termCodeSchema,
  locked: z.boolean(),
});

export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Passwords cannot exceed 72 characters"),
});

export const signUpSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
});

export const roleSchema = z.enum(ROLES);

export const assignRoleSchema = z.object({
  userId: uuidSchema,
  role: roleSchema,
});

export const suspendUserSchema = z.object({
  userId: uuidSchema,
  suspended: z.boolean(),
});

export const updateUserSchema = z.object({
  userId: uuidSchema,
  fullName: z.string().trim().min(2).max(120),
  phone: ghanaPhoneSchema.optional().or(z.literal("")),
});

export const createUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  fullName: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(72),
  role: roleSchema,
});

/* ------------------------------- Operations ------------------------------ */

export const staffInputSchema = z.object({
  staffNo: z.string().trim().min(2).max(30),
  fullName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().min(2).max(80),
  department: z.string().trim().min(2).max(60),
  subject: z.string().trim().max(80).optional().or(z.literal("")),
  phone: ghanaPhoneSchema,
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  status: z.enum(["Active", "On leave", "Exited"]).default("Active"),
  monthlySalary: z.number().min(0).max(500_000).default(0),
  hiredOn: z.string().date().optional().or(z.literal("")),
});
export type StaffInput = z.infer<typeof staffInputSchema>;

export const homeworkInputSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    classLevel: z.enum(GRADE_LEVELS),
    subjectId: uuidSchema.optional().or(z.literal("")),
    description: z.string().trim().max(1000).default(""),
    assignedOn: z.string().date(),
    dueOn: z.string().date(),
    status: z.enum(["Open", "Closed", "Overdue"]).default("Open"),
  })
  .refine((v) => v.dueOn >= v.assignedOn, {
    message: "The due date must be on or after the assigned date",
    path: ["dueOn"],
  });
export type HomeworkInput = z.infer<typeof homeworkInputSchema>;

export const bookInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  author: z.string().trim().max(120).default(""),
  category: z.string().trim().min(2).max(60).default("General"),
  isbn: z.string().trim().max(30).optional().or(z.literal("")),
  totalCopies: z.number().int().min(0).max(10_000),
  availableCopies: z.number().int().min(0).max(10_000),
});
export type BookInput = z.infer<typeof bookInputSchema>;

export const inventoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60).default("General"),
  quantity: z.number().int().min(0).max(1_000_000),
  unitCost: z.number().min(0).max(1_000_000),
  location: z.string().trim().max(120).default(""),
  condition: z.enum(["Good", "Fair", "Needs repair", "Written off"]).default("Good"),
});
export type InventoryInput = z.infer<typeof inventoryInputSchema>;

export const routeInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  vehicleReg: z.string().trim().min(3).max(20),
  driverName: z.string().trim().min(2).max(120),
  driverPhone: ghanaPhoneSchema,
  capacity: z.number().int().min(0).max(200),
  learners: z.number().int().min(0).max(200),
  status: z.enum(["Active", "Service due", "Off road"]).default("Active"),
});
export type RouteInput = z.infer<typeof routeInputSchema>;

export const timetableInputSchema = z.object({
  dayOfWeek: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  period: z.number().int().min(1).max(10),
  startsAt: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  endsAt: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  classLevel: z.enum(GRADE_LEVELS),
  subjectId: uuidSchema.optional().or(z.literal("")),
  staffId: uuidSchema.optional().or(z.literal("")),
  room: z.string().trim().max(40).optional().or(z.literal("")),
});
export type TimetableInput = z.infer<typeof timetableInputSchema>;

export const feePaymentSchema = z.object({
  studentId: uuidSchema,
  termCode: termCodeSchema,
  amount: z.number().min(1).max(1_000_000),
  method: z.enum(["Mobile Money", "Bank transfer", "Cash", "Cheque"]).default("Mobile Money"),
  reference: z.string().trim().max(60).optional().or(z.literal("")),
});
export type FeePaymentInput = z.infer<typeof feePaymentSchema>;

export const payrollRunSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
});

export const AUDIT_ACTIONS = [
  "role_assigned",
  "user_suspended",
  "user_reinstated",
  "user_deleted",
  "user_updated",
  "term_locked",
  "term_unlocked",
] as const;

export const auditQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(80).optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  entityType: z.enum(["user", "term"]).optional(),
  /** Inclusive ISO date bounds, e.g. "2026-07-01". */
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;
