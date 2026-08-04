import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { feePaymentSchema, termCodeSchema } from "@/lib/validation/schemas";
import type { FeeRecordDTO, FeeSummaryDTO } from "@/lib/api/types";

/**
 * Fees & finance boundary. Reads are open to staff (RLS enforced); writes are
 * limited to finance roles by the database policies on `fee_payments`.
 */

const termInput = (input: unknown) => ({
  termCode: termCodeSchema.parse((input as { termCode: string })?.termCode),
  search: String((input as { search?: string })?.search ?? "")
    .trim()
    .slice(0, 80),
});

async function resolveTermId(
  supabase: { from: (t: string) => any },
  termCode: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("terms")
    .select("id")
    .eq("code", termCode)
    .maybeSingle();
  if (error || !data) throw new Error("That academic term could not be found.");
  return data.id as string;
}

export const listFeeRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(termInput)
  .handler(async ({ data, context }): Promise<FeeRecordDTO[]> => {
    const termId = await resolveTermId(context.supabase, data.termCode);

    let studentQuery = context.supabase
      .from("students")
      .select("id, full_name, admission_no, grade_level, fee_billed")
      .order("full_name")
      .limit(400);
    if (data.search) {
      // Strip PostgREST filter-control characters so a search term cannot
      // inject extra OR conditions into the query.
      const term = data.search.replace(/[%,()]/g, " ").trim();
      if (term) {
        studentQuery = studentQuery.or(
          `full_name.ilike.%${term}%,admission_no.ilike.%${term}%`,
        );
      }
    }


    const [{ data: students, error }, { data: payments, error: payError }] = await Promise.all([
      studentQuery,
      context.supabase.from("fee_payments").select("student_id, amount").eq("term_id", termId),
    ]);
    if (error) throw new Error(`Unable to load learners: ${error.message}`);
    if (payError) throw new Error(`Unable to load payments: ${payError.message}`);

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

    const [{ data: students }, { data: payments }] = await Promise.all([
      context.supabase.from("students").select("id, fee_billed"),
      context.supabase.from("fee_payments").select("student_id, amount").eq("term_id", termId),
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
