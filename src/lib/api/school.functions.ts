import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  examInputSchema,
  saveMarksSchema,
  studentQuerySchema,
  termCodeSchema,
  termLockSchema,
  uuidSchema,
} from "@/lib/validation/schemas";
import { describeWindow } from "@/lib/api/types";
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

export const getSessionUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionUser> => {
    const { supabase, userId, claims } = context;

    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const roles = (roleRows ?? []).map((r) => r.role as string);
    return {
      id: userId,
      email: profile?.email ?? (claims.email as string | undefined) ?? null,
      fullName: profile?.full_name || "Staff member",
      roles,
      isAdmin: roles.includes("admin"),
      isStaff: roles.includes("admin") || roles.includes("teacher"),
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

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
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
      .select(
        "id, full_name, admission_no, nemis_no, grade_level, stream, gender, guardian_name, guardian_phone, date_of_birth, county, status, admitted_on, fee_billed",
        { count: "exact" },
      );

    if (data.grade) query = query.eq("grade_level", data.grade);
    if (data.status) query = query.eq("status", data.status);
    if (data.search) {
      // Parameterised by PostgREST — never string-concatenated into SQL.
      const term = data.search.replace(/[%,()]/g, " ").trim();
      if (term) {
        query = query.or(
          `full_name.ilike.%${term}%,admission_no.ilike.%${term}%,nemis_no.ilike.%${term}%`,
        );
      }
    }

    const { data: rows, count, error } = await query
      .order("full_name", { ascending: true })
      .range(from, from + data.pageSize - 1);

    if (error) throw new Error(`Unable to load learners: ${error.message}`);

    const total = count ?? 0;
    return {
      items: (rows ?? []).map((s) => ({
        id: s.id,
        fullName: s.full_name,
        admissionNo: s.admission_no,
        nemisNo: s.nemis_no,
        gradeLevel: s.grade_level as StudentDTO["gradeLevel"],
        stream: s.stream,
        gender: s.gender,
        guardianName: s.guardian_name,
        guardianPhone: s.guardian_phone,
        dateOfBirth: s.date_of_birth,
        county: s.county,
        status: s.status,
        admittedOn: s.admitted_on,
        feeBilled: Number(s.fee_billed),
      })),
      total,
      page: data.page,
      pageSize: data.pageSize,
      pageCount: Math.max(1, Math.ceil(total / data.pageSize)),
    };
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
  .inputValidator((input: unknown) => ({ termCode: termCodeSchema.parse((input as { termCode: string })?.termCode) }))
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
