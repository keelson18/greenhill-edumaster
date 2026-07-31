import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  examInputSchema,
  saveMarksSchema,
  studentInputSchema,
  studentQuerySchema,
  studentUpdateSchema,
  termCodeSchema,
  termLockSchema,
  uuidSchema,
} from "@/lib/validation/schemas";
import { describeWindow } from "@/lib/api/types";
import type { AppRole } from "@/config/app.config";
import type {
  DashboardStats,
  ExamDTO,
  MarkSheetDTO,
  MarkSheetRow,
  PagedResult,
  SessionUser,
  StudentDTO,
  SubjectDTO,
  TermDTO,
} from "@/lib/api/types";

/**
 * The single server-side data access boundary for EduMaster.
 *
 * Every function runs as the signed-in user (RLS enforced), validates its
 * input with a shared Zod schema, and returns a plain DTO. Nothing in the
 * browser talks to the database directly.
 */

const STUDENT_COLUMNS =
  "id, full_name, admission_no, ges_id, grade_level, stream, gender, guardian_name, guardian_phone, date_of_birth, region, district, town, ghana_post_gps, status, admitted_on, fee_billed";

type StudentRow = {
  id: string;
  full_name: string;
  admission_no: string;
  ges_id: string;
  grade_level: string;
  stream: string;
  gender: string;
  guardian_name: string;
  guardian_phone: string;
  date_of_birth: string | null;
  region: string | null;
  district: string | null;
  town: string | null;
  ghana_post_gps: string | null;
  status: string;
  admitted_on: string;
  fee_billed: number | string;
};

function toStudentDTO(s: StudentRow): StudentDTO {
  return {
    id: s.id,
    fullName: s.full_name,
    admissionNo: s.admission_no,
    gesId: s.ges_id,
    gradeLevel: s.grade_level as StudentDTO["gradeLevel"],
    stream: s.stream,
    gender: s.gender as StudentDTO["gender"],
    guardianName: s.guardian_name,
    guardianPhone: s.guardian_phone,
    dateOfBirth: s.date_of_birth,
    region: s.region,
    district: s.district,
    town: s.town,
    ghanaPostGps: s.ghana_post_gps,
    status: s.status as StudentDTO["status"],
    admittedOn: s.admitted_on,
    feeBilled: Number(s.fee_billed),
  };
}

const ROLE_PRIORITY: AppRole[] = [
  "super_admin",
  "admin",
  "accountant",
  "librarian",
  "teacher",
  "staff",
  "parent",
  "student",
];

export const getSessionUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionUser> => {
    const { supabase, userId, claims } = context;

    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, is_suspended")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const roles = (roleRows ?? []).map((r) => r.role as AppRole);
    const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? "staff";
    const isSuperAdmin = roles.includes("super_admin");
    const isAdmin = isSuperAdmin || roles.includes("admin");

    return {
      id: userId,
      email: profile?.email ?? (claims.email as string | undefined) ?? null,
      fullName: profile?.full_name || "Staff member",
      roles,
      primaryRole,
      isSuspended: Boolean(profile?.is_suspended),
      isSuperAdmin,
      isAdmin,
      isStaff:
        isAdmin ||
        roles.some((r) => ["teacher", "accountant", "librarian", "staff"].includes(r)),
      isFinance: isAdmin || roles.includes("accountant"),
    };
  });

export const listTerms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TermDTO[]> => {
    const { data, error } = await context.supabase
      .from("terms")
      .select("id, code, label, short_label, year, starts_on, ends_on, status, is_locked")
      .order("starts_on", { ascending: true });

    if (error) throw new Error(`Unable to load academic terms: ${error.message}`);

    return (data ?? []).map((t) => ({
      id: t.code,
      uuid: t.id,
      label: t.label,
      short: t.short_label,
      year: t.year,
      startsOn: t.starts_on,
      endsOn: t.ends_on,
      window: describeWindow(t.starts_on, t.ends_on),
      status: t.status,
      isLocked: t.is_locked,
    }));
  });

export const setTermLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => termLockSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ termCode: string; locked: boolean }> => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Only administrators can open or close a term.");

    const { error } = await supabase
      .from("terms")
      .update({
        is_locked: data.locked,
        locked_at: data.locked ? new Date().toISOString() : null,
        locked_by: data.locked ? userId : null,
      })
      .eq("code", data.termCode);

    if (error) throw new Error(`Unable to update the term: ${error.message}`);
    return { termCode: data.termCode, locked: data.locked };
  });

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => studentQuerySchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<PagedResult<StudentDTO>> => {
    const from = (data.page - 1) * data.pageSize;
    let query = context.supabase
      .from("students")
      .select(STUDENT_COLUMNS, { count: "exact" });

    if (data.grade) query = query.eq("grade_level", data.grade);
    if (data.status) query = query.eq("status", data.status);
    if (data.search) {
      // Parameterised by PostgREST — never string-concatenated into SQL.
      const term = data.search.replace(/[%,()]/g, " ").trim();
      if (term) {
        query = query.or(
          `full_name.ilike.%${term}%,admission_no.ilike.%${term}%,ges_id.ilike.%${term}%`,
        );
      }
    }

    const { data: rows, count, error } = await query
      .order("full_name", { ascending: true })
      .range(from, from + data.pageSize - 1);

    if (error) throw new Error(`Unable to load learners: ${error.message}`);

    const total = count ?? 0;
    return {
      items: ((rows ?? []) as unknown as StudentRow[]).map(toStudentDTO),
      total,
      page: data.page,
      pageSize: data.pageSize,
      pageCount: Math.max(1, Math.ceil(total / data.pageSize)),
    };
  });

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => studentInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<StudentDTO> => {
    const { data: row, error } = await context.supabase
      .from("students")
      .insert({
        full_name: data.fullName,
        admission_no: data.admissionNo,
        ges_id: data.gesId,
        grade_level: data.gradeLevel,
        stream: data.stream,
        gender: data.gender,
        guardian_name: data.guardianName,
        guardian_phone: data.guardianPhone,
        date_of_birth: data.dateOfBirth || null,
        region: data.region ?? null,
        district: data.district ?? null,
        town: data.town ?? null,
        ghana_post_gps: data.ghanaPostGps || null,
        status: data.status,
        fee_billed: data.feeBilled,
      })
      .select(STUDENT_COLUMNS)
      .single();

    if (error) {
      throw new Error(
        error.code === "23505"
          ? "A learner with that admission number or GES ID already exists."
          : `Unable to admit the learner: ${error.message}`,
      );
    }
    return toStudentDTO(row as unknown as StudentRow);
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => studentUpdateSchema.parse(input))
  .handler(async ({ data, context }): Promise<StudentDTO> => {
    const patch: Record<string, unknown> = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName;
    if (data.admissionNo !== undefined) patch.admission_no = data.admissionNo;
    if (data.gesId !== undefined) patch.ges_id = data.gesId;
    if (data.gradeLevel !== undefined) patch.grade_level = data.gradeLevel;
    if (data.stream !== undefined) patch.stream = data.stream;
    if (data.gender !== undefined) patch.gender = data.gender;
    if (data.guardianName !== undefined) patch.guardian_name = data.guardianName;
    if (data.guardianPhone !== undefined) patch.guardian_phone = data.guardianPhone;
    if (data.dateOfBirth !== undefined) patch.date_of_birth = data.dateOfBirth || null;
    if (data.region !== undefined) patch.region = data.region;
    if (data.district !== undefined) patch.district = data.district;
    if (data.town !== undefined) patch.town = data.town;
    if (data.ghanaPostGps !== undefined) patch.ghana_post_gps = data.ghanaPostGps || null;
    if (data.status !== undefined) patch.status = data.status;
    if (data.feeBilled !== undefined) patch.fee_billed = data.feeBilled;

    const { data: row, error } = await context.supabase
      .from("students")
      .update(patch as never)
      .eq("id", data.id)
      .select(STUDENT_COLUMNS)
      .single();

    if (error) throw new Error(`Unable to update the learner: ${error.message}`);
    return toStudentDTO(row as unknown as StudentRow);
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({ id: uuidSchema.parse((input as { id: string })?.id) }))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { error } = await context.supabase.from("students").delete().eq("id", data.id);
    if (error) throw new Error(`Unable to remove the learner: ${error.message}`);
    return { id: data.id };
  });

export const listSubjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubjectDTO[]> => {
    const { data, error } = await context.supabase
      .from("subjects")
      .select("id, code, name")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`Unable to load subjects: ${error.message}`);
    return data ?? [];
  });

export const listExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    termCode: termCodeSchema.parse((input as { termCode: string })?.termCode),
  }))
  .handler(async ({ data, context }): Promise<ExamDTO[]> => {
    const { supabase } = context;

    const { data: term, error: termError } = await supabase
      .from("terms")
      .select("id")
      .eq("code", data.termCode)
      .maybeSingle();
    if (termError) throw new Error(`Unable to load the term: ${termError.message}`);
    if (!term) return [];

    const { data: exams, error } = await supabase
      .from("exams")
      .select("id, name, grade_scope, starts_on, ends_on, status, marks(count)")
      .eq("term_id", term.id)
      .order("starts_on", { ascending: true });
    if (error) throw new Error(`Unable to load examinations: ${error.message}`);

    return (exams ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      termCode: data.termCode,
      gradeScope: e.grade_scope,
      startsOn: e.starts_on,
      endsOn: e.ends_on,
      status: e.status,
      marksEntered: (e.marks as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    }));
  });

export const createExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => examInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;

    const { data: term } = await supabase
      .from("terms")
      .select("id, is_locked")
      .eq("code", data.termCode)
      .maybeSingle();
    if (!term) throw new Error("That academic term no longer exists.");
    if (term.is_locked) throw new Error("This term is closed. Reopen it before adding exams.");

    const { data: created, error } = await supabase
      .from("exams")
      .insert({
        term_id: term.id,
        name: data.name,
        grade_scope: data.gradeScope,
        starts_on: data.startsOn,
        ends_on: data.endsOn,
        status: "Draft",
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(
        error.code === "23505"
          ? "An examination with that name already exists this term."
          : `Unable to create the examination: ${error.message}`,
      );
    }
    return { id: created.id };
  });

export const getMarkSheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const value = (input ?? {}) as { examId?: string; grade?: string };
    return { examId: uuidSchema.parse(value.examId), grade: String(value.grade ?? "") };
  })
  .handler(async ({ data, context }): Promise<MarkSheetDTO> => {
    const { supabase } = context;

    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("id, term_id, terms(code, is_locked)")
      .eq("id", data.examId)
      .maybeSingle();
    if (examError) throw new Error(`Unable to load the examination: ${examError.message}`);
    if (!exam) throw new Error("That examination no longer exists.");

    const term = exam.terms as unknown as { code: string; is_locked: boolean };

    const [{ data: subjects }, { data: students }] = await Promise.all([
      supabase.from("subjects").select("id, code, name").order("sort_order"),
      supabase
        .from("students")
        .select("id, full_name, admission_no")
        .eq("grade_level", data.grade)
        .eq("status", "Active")
        .order("full_name")
        .limit(60),
    ]);

    const studentIds = (students ?? []).map((s) => s.id);
    const { data: marks } = studentIds.length
      ? await supabase
          .from("marks")
          .select("student_id, subject_id, score")
          .eq("exam_id", data.examId)
          .in("student_id", studentIds)
      : { data: [] };

    const byStudent = new Map<string, Record<string, number>>();
    for (const mark of marks ?? []) {
      const scores = byStudent.get(mark.student_id) ?? {};
      scores[mark.subject_id] = Number(mark.score);
      byStudent.set(mark.student_id, scores);
    }

    const rows: MarkSheetRow[] = (students ?? []).map((s) => ({
      studentId: s.id,
      fullName: s.full_name,
      admissionNo: s.admission_no,
      scores: byStudent.get(s.id) ?? {},
    }));

    return {
      examId: data.examId,
      termCode: term.code,
      locked: term.is_locked,
      subjects: subjects ?? [],
      rows,
    };
  });

export const saveMarks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveMarksSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ saved: number }> => {
    const { supabase, userId } = context;

    const { error } = await supabase.from("marks").upsert(
      data.entries.map((entry) => ({
        exam_id: data.examId,
        student_id: entry.studentId,
        subject_id: entry.subjectId,
        score: entry.score,
        entered_by: userId,
      })),
      { onConflict: "exam_id,student_id,subject_id" },
    );

    if (error) {
      throw new Error(
        error.message.includes("TERM_LOCKED")
          ? "This term is closed — marks are a published record and cannot be changed."
          : `Unable to save marks: ${error.message}`,
      );
    }
    return { saved: data.entries.length };
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    termCode: termCodeSchema.parse((input as { termCode: string })?.termCode),
  }))
  .handler(async ({ data, context }): Promise<DashboardStats> => {
    const { data: stats, error } = await context.supabase.rpc("term_dashboard_stats", {
      _term_code: data.termCode,
    });
    if (error) throw new Error(`Unable to load the dashboard summary: ${error.message}`);
    return stats as unknown as DashboardStats;
  });

export const getGradePerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    termCode: termCodeSchema.parse((input as { termCode: string })?.termCode),
  }))
  .handler(async ({ data, context }): Promise<{ grade: string; mean: number }[]> => {
    const { data: rows, error } = await context.supabase.rpc("term_grade_performance", {
      _term_code: data.termCode,
    });
    if (error) throw new Error(`Unable to load grade performance: ${error.message}`);
    return (rows ?? []).map((r) => ({ grade: r.grade_level, mean: Number(r.mean_score) }));
  });

export const getEnrolmentByGrade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ grade: string; learners: number }[]> => {
    const { data, error } = await context.supabase
      .from("students")
      .select("grade_level")
      .eq("status", "Active")
      .limit(5000);
    if (error) throw new Error(`Unable to load enrolment: ${error.message}`);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.grade_level, (counts.get(row.grade_level) ?? 0) + 1);
    }
    return [...counts.entries()].map(([grade, learners]) => ({ grade, learners }));
  });
