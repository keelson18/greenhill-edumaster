import { beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the real handlers and validators without starting the RPC runtime.
// Database responses are mocked: these tests do not prove live RLS/trigger enforcement.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (input: unknown): any => input;
    const builder = {
      middleware: () => builder,
      inputValidator: (validator: typeof validate) => { validate = validator; return builder; },
      handler: (handler: (input: any) => unknown) => (input: any) =>
        Promise.resolve().then(() => handler({ ...input, data: validate(input.data) })),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/api/audit.server", () => ({
  resolveActor: vi.fn(async () => ({ id: "actor", name: "Admin" })),
  recordAudit: vi.fn(),
  notifyUsers: vi.fn(),
}));

import { createExam, saveMarks, setTermLock } from "./school.functions";
import { getFeeSummary, listFeeRecords } from "./finance.functions";
import { recordAudit } from "./audit.server";

const id = "10000000-0000-4000-8000-000000000001";
const termCode = "2026-t1";

function database(responses: Record<string, { data?: unknown; error?: unknown }>) {
  const queries: Record<string, any> = {};
  const from = vi.fn((table: string) => {
    const result = responses[table] ?? { data: null, error: null };
    const query: any = {};
    for (const method of ["select", "eq", "order", "limit", "or", "update", "insert", "upsert", "in"]) {
      query[method] = vi.fn(() => query);
    }
    query.maybeSingle = vi.fn(async () => result);
    query.single = vi.fn(async () => result);
    query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    queries[table] = query;
    return query;
  });
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  return { context: { supabase: { from, rpc }, userId: id }, queries, from, rpc };
}

// Cast only the test invocation: the production RPC signature deliberately hides context.
const invoke = (fn: unknown, db: ReturnType<typeof database>, data: unknown): Promise<any> =>
  (fn as (input: unknown) => Promise<unknown>)({ context: db.context, data });

beforeEach(() => vi.clearAllMocks());

describe("term locking server handlers", () => {
  const exam = { termCode, name: "End of term", gradeScope: "Basic 9", startsOn: "2026-09-01", endsOn: "2026-09-02" };
  const marks = { examId: id, entries: [{ studentId: id, subjectId: id, score: 80 }] };

  it("rejects exam creation in a locked term before inserting", async () => {
    const db = database({ terms: { data: { id, is_locked: true } } });
    await expect(invoke(createExam, db, exam)).rejects.toThrow("This term is closed");
    expect(db.from).not.toHaveBeenCalledWith("exams");
  });

  it("allows exam creation in an open term", async () => {
    const db = database({ terms: { data: { id, is_locked: false } }, exams: { data: { id } } });
    await expect(invoke(createExam, db, exam)).resolves.toEqual({ id });
    expect(db.queries.exams.insert).toHaveBeenCalledWith(expect.objectContaining({ term_id: id, created_by: id }));
  });

  it("rejects a missing term", async () => {
    await expect(invoke(createExam, database({}), exam)).rejects.toThrow("no longer exists");
  });

  it("translates a database lock rejection into a useful error", async () => {
    const db = database({ marks: { error: { message: "TERM_LOCKED: cannot modify marks" } } });
    await expect(invoke(saveMarks, db, marks)).rejects.toThrow("This term is closed");
  });

  it("saves validated marks with the actor identity", async () => {
    const db = database({ marks: { error: null } });
    await expect(invoke(saveMarks, db, marks)).resolves.toEqual({ saved: 1 });
    expect(db.queries.marks.upsert).toHaveBeenCalledWith([
      { exam_id: id, student_id: id, subject_id: id, score: 80, entered_by: id },
    ], { onConflict: "exam_id,student_id,subject_id" });
  });

  it.each([-1, 101, NaN, Infinity])("rejects invalid score %s before database access", async (score) => {
    const db = database({});
    await expect(invoke(saveMarks, db, { ...marks, entries: [{ ...marks.entries[0], score }] })).rejects.toThrow();
    expect(db.from).not.toHaveBeenCalled();
  });

  it("does not hide unrelated save failures", async () => {
    await expect(invoke(saveMarks, database({ marks: { error: { message: "permission denied" } } }), marks))
      .rejects.toThrow("Unable to save marks: permission denied");
  });

  it("denies lock changes to non-administrators", async () => {
    const db = database({});
    db.rpc.mockResolvedValue({ data: false, error: null });
    await expect(invoke(setTermLock, db, { termCode, locked: true })).rejects.toThrow("Only administrators");
    expect(db.from).not.toHaveBeenCalled();
  });

  it.each([true, false])("persists and audits locked=%s", async (locked) => {
    const db = database({ terms: { data: { id, label: "Term 1" } }, user_roles: { data: [] } });
    await expect(invoke(setTermLock, db, { termCode, locked })).resolves.toEqual({ termCode, locked });
    expect(db.queries.terms.update).toHaveBeenCalledWith({
      is_locked: locked, locked_at: locked ? expect.any(String) : null, locked_by: locked ? id : null,
    });
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: locked ? "term_locked" : "term_unlocked" }));
  });
});

describe("term fee balances", () => {
  function fees(students: unknown[], payments: unknown[]) {
    return database({ terms: { data: { id } }, students: { data: students }, fee_payments: { data: payments } });
  }
  const learner = { id, full_name: "Learner", admission_no: "GH001", grade_level: "Basic 9", fee_billed: "1000" };

  it.each([
    [[], 0, 1000],
    [[{ student_id: id, amount: "250.50" }, { student_id: id, amount: "149.50" }], 400, 600],
    [[{ student_id: id, amount: 1000 }], 1000, 0],
    [[{ student_id: id, amount: 1200 }], 1200, 0],
  ])("calculates unpaid, partial, cleared and overpaid balances", async (payments, paid, balance) => {
    const db = fees([learner], payments);
    const rows = await invoke(listFeeRecords, db, { termCode });
    expect(rows[0]).toMatchObject({ billed: 1000, paid, balance });
    expect(db.queries.fee_payments.eq).toHaveBeenCalledWith("term_id", id);
  });

  it("does not apply another learner's payment to the current learner", async () => {
    const db = fees([learner], [{ student_id: "other", amount: 1000 }]);
    expect((await invoke(listFeeRecords, db, { termCode }))[0].balance).toBe(1000);
  });

  it("summarises payments and cleared learners", async () => {
    const db = fees([learner, { id: "other", fee_billed: 500 }], [{ student_id: id, amount: 1000 }, { student_id: "other", amount: 200 }]);
    await expect(invoke(getFeeSummary, db, { termCode })).resolves.toEqual({ billed: 1500, collected: 1200, outstanding: 300, payments: 2, clearedLearners: 1 });
    expect(db.queries.fee_payments.eq).toHaveBeenCalledWith("term_id", id);
  });

  it("returns an empty summary without NaN", async () => {
    await expect(invoke(getFeeSummary, fees([], []), { termCode })).resolves.toEqual({ billed: 0, collected: 0, outstanding: 0, payments: 0, clearedLearners: 0 });
  });

  it("rejects an unknown term", async () => {
    await expect(invoke(listFeeRecords, database({}), { termCode })).rejects.toThrow("could not be found");
  });

  it("surfaces payment read failures rather than inventing balances", async () => {
    const db = database({ terms: { data: { id } }, students: { data: [learner] }, fee_payments: { error: { message: "unavailable" } } });
    await expect(invoke(listFeeRecords, db, { termCode })).rejects.toThrow("Unable to load payments");
  });
});