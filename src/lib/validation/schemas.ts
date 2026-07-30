import { z } from "zod";
import { GRADE_LEVELS, PAGINATION, STREAMS } from "@/config/app.config";

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

export const studentQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(80).optional(),
  grade: z.enum(GRADE_LEVELS).optional(),
  status: z.enum(["Active", "Suspended", "Transferred"]).optional(),
});
export type StudentQuery = z.infer<typeof studentQuerySchema>;

export const kenyanPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{9,15}$/, "Enter a valid phone number");

export const studentInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  admissionNo: z.string().trim().min(3).max(40),
  nemisNo: z.string().trim().regex(/^[0-9]{6,15}$/, "NEMIS number must be 6–15 digits"),
  gradeLevel: z.enum(GRADE_LEVELS),
  stream: z.enum(STREAMS),
  gender: z.enum(["Male", "Female"]),
  guardianName: z.string().trim().min(2).max(120),
  guardianPhone: kenyanPhoneSchema,
  dateOfBirth: z.string().date().optional(),
  county: z.string().trim().max(60).optional(),
  feeBilled: z.number().min(0).max(1_000_000).default(0),
});
export type StudentInput = z.infer<typeof studentInputSchema>;

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
