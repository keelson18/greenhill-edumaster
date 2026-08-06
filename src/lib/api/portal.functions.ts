import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { perfLevel } from "@/lib/domain/grading";
import type {
  GuardianLinkDTO,
  LinkedStudentDTO,
  PortalExamResultDTO,
  StudentPortalDTO,
} from "@/lib/api/portal.types";

/**
 * Family portal.
 *
 * Students see their own record; parents see the learners they are linked to.
 * Every read goes through the caller's own Supabase client, so the database
 * `can_view_student()` policy — not this code — is the real access boundary.
 */

export const listMyStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LinkedStudentDTO[]> => {
    const { supabase, userId } = context;

    const [{ data: own }, { data: links }] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, admission_no, ges_id, grade_level, stream")
        .eq("user_id", userId),
      supabase
        .from("student_guardians")
        .select(
          "relationship, students(id, full_name, admission_no, ges_id, grade_level, stream)",
        )
        .eq("guardian_id", userId),
    ]);

    const rows: LinkedStudentDTO[] = [];
    for (const s of own ?? []) {
      rows.push({
        id: s.id,
        fullName: s.full_name,
        admissionNo: s.admission_no,
        gesId: s.ges_id,
        gradeLevel: s.grade_level as LinkedStudentDTO["gradeLevel"],
        stream: s.stream,
        relationship: "Self",
      });
    }
    for (const link of links ?? []) {
      const s = link.students as unknown as {
        id: string;
        full_name: string;
        admission_no: string;
        ges_id: string;
        grade_level: string;
        stream: string;
      } | null;
      if (!s || rows.some((r) => r.id === s.id)) continue;
      rows.push({
        id: s.id,
        fullName: s.full_name,
        admissionNo: s.admission_no,
        gesId: s.ges_id,
        gradeLevel: s.grade_level as LinkedStudentDTO["gradeLevel"],
        stream: s.stream,
        relationship: link.relationship,
      });
    }
    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  });

export const getStudentPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ studentId: z.string().uuid(), termCode: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentPortalDTO> => {
    const { supabase } = context;

    const { data: student, error } = await supabase
      .from("students")
      .select("id, full_name, admission_no, ges_id, grade_level, stream, fee_billed")
      .eq("id", data.studentId)
      .maybeSingle();
    if (error) throw new Error(`Unable to load the learner: ${error.message}`);
    if (!student) throw new Error("You do not have access to that learner's record.");

    const { data: term } = await supabase
      .from("terms")
      .select("id, starts_on, ends_on")
      .eq("code", data.termCode)
      .maybeSingle();
    if (!term) throw new Error("That academic term no longer exists.");

    const { data: exams } = await supabase
      .from("exams")
      .select("id, name")
      .eq("term_id", term.id)
      .order("starts_on");

    const examIds = (exams ?? []).map((e) => e.id);

    const [{ data: marks }, { data: attendance }, { data: payments }] = await Promise.all([
      examIds.length
        ? supabase
            .from("marks")
            .select("exam_id, score, subjects(name)")
            .eq("student_id", data.studentId)
            .in("exam_id", examIds)
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("student_attendance")
        .select("status")
        .eq("student_id", data.studentId)
        .gte("attended_on", term.starts_on)
        .lte("attended_on", term.ends_on),
      supabase
        .from("fee_payments")
        .select("id, amount, method, paid_at")
        .eq("student_id", data.studentId)
        .eq("term_id", term.id)
        .order("paid_at", { ascending: false }),
    ]);

    const results: PortalExamResultDTO[] = (exams ?? []).map((exam) => {
      const rows = (marks ?? []).filter((m) => m.exam_id === exam.id);
      const subjects = rows.map((m) => ({
        subject: (m.subjects as unknown as { name: string } | null)?.name ?? "Subject",
        score: Number(m.score),
      }));
      const average = subjects.length
        ? Math.round((subjects.reduce((s, r) => s + r.score, 0) / subjects.length) * 10) / 10
        : 0;
      return {
        examId: exam.id,
        examName: exam.name,
        subjects: subjects.sort((a, b) => a.subject.localeCompare(b.subject)),
        average,
        level: perfLevel(average),
      };
    });

    const att = attendance ?? [];
    const counts = {
      present: att.filter((a) => a.status === "present").length,
      absent: att.filter((a) => a.status === "absent").length,
      late: att.filter((a) => a.status === "late").length,
      excused: att.filter((a) => a.status === "excused").length,
    };
    const recorded = att.length;

    const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const billed = Number(student.fee_billed);

    return {
      student: {
        id: student.id,
        fullName: student.full_name,
        admissionNo: student.admission_no,
        gesId: student.ges_id,
        gradeLevel: student.grade_level as LinkedStudentDTO["gradeLevel"],
        stream: student.stream,
        relationship: "",
      },
      termCode: data.termCode,
      results: results.filter((r) => r.subjects.length > 0),
      attendance: {
        ...counts,
        recorded,
        rate: recorded
          ? Math.round(((counts.present + counts.late) / recorded) * 1000) / 10
          : 0,
      },
      fees: {
        billed,
        paid,
        balance: Math.max(billed - paid, 0),
        payments: (payments ?? []).map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          paidAt: p.paid_at,
        })),
      },
    };
  });

export const listGuardianLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GuardianLinkDTO[]> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Only administrators can manage family access.");

    const { data, error } = await context.supabase
      .from("student_guardians")
      .select("id, student_id, guardian_id, relationship, students(full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to load family links: ${error.message}`);

    const guardianIds = [...new Set((data ?? []).map((r) => r.guardian_id))];
    const { data: profiles } = guardianIds.length
      ? await context.supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", guardianIds)
      : { data: [] as Array<{ id: string; full_name: string; email: string | null }> };

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return (data ?? []).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentName: (r.students as unknown as { full_name: string } | null)?.full_name ?? "Learner",
      guardianId: r.guardian_id,
      guardianName: byId.get(r.guardian_id)?.full_name ?? "Account",
      guardianEmail: byId.get(r.guardian_id)?.email ?? null,
      relationship: r.relationship,
    }));
  });

export const linkGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        studentId: z.string().uuid(),
        guardianId: z.string().uuid(),
        relationship: z.string().trim().min(2).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Only administrators can manage family access.");

    const { error } = await context.supabase.from("student_guardians").insert({
      student_id: data.studentId,
      guardian_id: data.guardianId,
      relationship: data.relationship,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.code === "23505"
            ? "That account is already linked to this learner."
            : `Unable to link the account: ${error.message}`,
      };
    }
    return { ok: true };
  });

export const unlinkGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Only administrators can manage family access.");

    const { error } = await context.supabase
      .from("student_guardians")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(`Unable to remove the link: ${error.message}`);
    return { ok: true };
  });

/** Attaches (or detaches, with `userId: null`) a login account to a learner record. */
export const linkStudentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ studentId: z.string().uuid(), userId: z.string().uuid().nullable() })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Only administrators can manage family access.");

    const { error } = await context.supabase
      .from("students")
      .update({ user_id: data.userId })
      .eq("id", data.studentId);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "23505"
            ? "That account is already linked to another learner."
            : `Unable to link the account: ${error.message}`,
      };
    }
    return { ok: true };
  });
