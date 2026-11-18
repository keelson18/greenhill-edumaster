import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { feePaymentSchema, termCodeSchema } from "@/lib/validation/schemas";
import type { FeeRecordDTO, FeeSummaryDTO } from "@/lib/api/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { feeListInput, feeSearchFilter, readAllPages } from "./finance.query";

/**
 * Fees & finance boundary. Reads are open to staff (RLS enforced); writes are
 * limited to finance roles by the database policies on `fee_payments`.
 */

async function resolveTermId(
  supabase: SupabaseClient<Database>,
  termCode: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("terms")
    .select("id")
    .eq("code", termCode)
    .maybeSingle();
  if (error || !data) throw new Error("That academic term could not be found.");
  return data.id;
}

export const listFeeRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => feeListInput.parse(input))
  .handler(async ({ data, context }): Promise<FeeRecordDTO[]> => {
    const termId = await resolveTermId(context.supabase, data.termCode);

    let studentQuery = context.supabase
      .from("students")
      .select("id, full_name, admission_no, grade_level, fee_billed")
      .order("full_name")
      .order("id")
      .range(data.offset, data.offset + data.limit);
    const filter = feeSearchFilter(data.search);
    if (filter) studentQuery = studentQuery.or(filter);

    const { data: students, error } = await studentQuery;
    if (error) throw new Error(`Unable to load learners: ${error.message}`);
    if (!students?.length) return [];
    const payments = await readAllPages(
      (from, to) => context.supabase.from("fee_payments")
        .select("student_id, amount").eq("term_id", termId)
        .in("student_id", students.map((student) => student.id))
        .order("id").range(from, to),
      "payments",
    );

    const paidBy = new Map<string, number>();
    for (const p of payments ?? []) {
      paidBy.set(p.student_id, (paidBy.get(p.student_id) ?? 0) + Number(p.amount));
    }

    return (students ?? []).map((s) => {
      const billed = Number(s.fee_billed);
      const paid = paidBy.get(s.id) ?? 0;
      return {
        studentId: s.id,
        fullName: s.full_name,
        admissionNo: s.admission_no,
        gradeLevel: s.grade_level,
        billed,
        paid,
        balance: Math.max(billed - paid, 0),
      };
    });
  });

export const getFeeSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    termCode: termCodeSchema.parse((input as { termCode: string })?.termCode),
  }))
  .handler(async ({ data, context }): Promise<FeeSummaryDTO> => {
    const termId = await resolveTermId(context.supabase, data.termCode);

    const [students, payments] = await Promise.all([
      readAllPages((from, to) => context.supabase.from("students")
        .select("id, fee_billed").order("id").range(from, to), "learners"),
      readAllPages((from, to) => context.supabase.from("fee_payments")
        .select("student_id, amount").eq("term_id", termId)
        .order("id").range(from, to), "payments"),
    ]);

    const billed = (students ?? []).reduce((sum, s) => sum + Number(s.fee_billed), 0);
    const paidBy = new Map<string, number>();
    for (const p of payments ?? []) {
      paidBy.set(p.student_id, (paidBy.get(p.student_id) ?? 0) + Number(p.amount));
    }
    const collected = [...paidBy.values()].reduce((a, b) => a + b, 0);
    const cleared = (students ?? []).filter(
      (s) => (paidBy.get(s.id) ?? 0) >= Number(s.fee_billed),
    ).length;

    return {
      billed,
      collected,
      outstanding: Math.max(billed - collected, 0),
      payments: (payments ?? []).length,
      clearedLearners: cleared,
    };
  });

export const recordFeePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => feePaymentSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const termId = await resolveTermId(context.supabase, data.termCode);
    const { data: row, error } = await context.supabase
      .from("fee_payments")
      .insert({
        student_id: data.studentId,
        term_id: termId,
        amount: data.amount,
        method: data.method,
        reference: data.reference || null,
        recorded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Unable to record the payment: ${error.message}`);
    return { id: row.id };
  });
