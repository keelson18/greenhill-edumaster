import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  attendanceQuerySchema,
  saveStaffAttendanceSchema,
  saveStudentAttendanceSchema,
  type AttendanceStatus,
} from "@/lib/validation/schemas";
import type {
  AttendanceSummaryDTO,
  StaffAttendanceRowDTO,
  StudentAttendanceRowDTO,
} from "@/lib/api/types";

/**
 * Daily attendance for learners and staff.
 *
 * Reads are open to any staff member; writes are re-checked against the
 * database roles (teachers and administrators for learners, administrators
 * only for staff) so client state can never widen access.
 */

type Ctx = {
  supabase: never;
  userId: string;
};

async function assertRole(context: unknown, fn: "is_admin" | "is_staff", message: string) {
  const ctx = context as {
    supabase: { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown }> };
    userId: string;
  };
  const { data } = await ctx.supabase.rpc(fn, { _user_id: ctx.userId });
  if (!data) throw new Error(message);
}

async function assertCanMarkStudents(context: unknown) {
  const ctx = context as {
    supabase: { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown }> };
    userId: string;
  };
  const [{ data: admin }, { data: teacher }] = await Promise.all([
    ctx.supabase.rpc("is_admin", { _user_id: ctx.userId }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "teacher" }),
  ]);
  if (!admin && !teacher) throw new Error("Only teachers and administrators can mark attendance.");
}

export const listStudentAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => attendanceQuerySchema.parse(input))
  .handler(async ({ data, context }): Promise<StudentAttendanceRowDTO[]> => {
    await assertRole(context, "is_staff", "You do not have access to attendance records.");

    let studentQuery = context.supabase
      .from("students")
      .select("id, full_name, admission_no, grade_level, stream")
      .eq("status", "Active")
      .order("full_name");
    if (data.classLevel) studentQuery = studentQuery.eq("grade_level", data.classLevel);

    const [{ data: students, error }, { data: marks }] = await Promise.all([
      studentQuery,
      context.supabase
        .from("student_attendance")
        .select("student_id, status, note")
        .eq("attended_on", data.date),
    ]);
    if (error) throw new Error(`Unable to load learners: ${error.message}`);

    const byStudent = new Map((marks ?? []).map((m) => [m.student_id, m]));

    return (students ?? []).map((s) => {
      const mark = byStudent.get(s.id);
      return {
        studentId: s.id,
        fullName: s.full_name,
        admissionNo: s.admission_no,
        classLevel: s.grade_level,
        stream: s.stream,
        status: (mark?.status ?? null) as AttendanceStatus | null,
        note: mark?.note ?? null,
      };
    });
  });

export const saveStudentAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveStudentAttendanceSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ saved: number }> => {
    await assertCanMarkStudents(context);

    const rows = data.entries.map((entry) => ({
      student_id: entry.studentId,
      attended_on: data.date,
      class_level: data.classLevel,
      status: entry.status,
      note: entry.note || null,
      recorded_by: context.userId,
    }));

    const { error } = await context.supabase
      .from("student_attendance")
      .upsert(rows, { onConflict: "student_id,attended_on" });
    if (error) throw new Error(`Unable to save attendance: ${error.message}`);
    return { saved: rows.length };
  });

export const listStaffAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => attendanceQuerySchema.parse(input))
  .handler(async ({ data, context }): Promise<StaffAttendanceRowDTO[]> => {
    await assertRole(context, "is_staff", "You do not have access to attendance records.");

    const [{ data: staff, error }, { data: marks }] = await Promise.all([
      context.supabase
        .from("staff")
        .select("id, full_name, staff_no, job_title, department")
        .eq("status", "Active")
        .order("full_name"),
      context.supabase
        .from("staff_attendance")
        .select("staff_id, status, note")
        .eq("attended_on", data.date),
    ]);
    if (error) throw new Error(`Unable to load staff: ${error.message}`);

    const byStaff = new Map((marks ?? []).map((m) => [m.staff_id, m]));

    return (staff ?? []).map((s) => {
      const mark = byStaff.get(s.id);
      return {
        staffId: s.id,
        fullName: s.full_name,
        staffNo: s.staff_no,
        jobTitle: s.job_title,
        department: s.department,
        status: (mark?.status ?? null) as AttendanceStatus | null,
        note: mark?.note ?? null,
      };
    });
  });

export const saveStaffAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveStaffAttendanceSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ saved: number }> => {
    await assertRole(context, "is_admin", "Only administrators can mark staff attendance.");

    const rows = data.entries.map((entry) => ({
      staff_id: entry.staffId,
      attended_on: data.date,
      status: entry.status,
      note: entry.note || null,
      recorded_by: context.userId,
    }));

    const { error } = await context.supabase
      .from("staff_attendance")
      .upsert(rows, { onConflict: "staff_id,attended_on" });
    if (error) throw new Error(`Unable to save staff attendance: ${error.message}`);
    return { saved: rows.length };
  });

/** Attendance rate for the last 30 days, used on dashboards. */
export const getAttendanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AttendanceSummaryDTO> => {
    await assertRole(context, "is_staff", "You do not have access to attendance records.");

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data, error } = await context.supabase
      .from("student_attendance")
      .select("status, attended_on")
      .gte("attended_on", since);
    if (error) throw new Error(`Unable to load attendance: ${error.message}`);

    const rows = data ?? [];
    const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
    const days = new Set(rows.map((r) => r.attended_on)).size;

    return {
      records: rows.length,
      daysRecorded: days,
      presentRate: rows.length ? Math.round((present / rows.length) * 1000) / 10 : 0,
      absentCount: rows.filter((r) => r.status === "absent").length,
    };
  });

export type { Ctx };
