import { describe, expect, it, vi } from "vitest";
import { canAccess } from "@/config/nav";

// Runs the real server handlers against a role-aware fake database. The fake
// mimics what row-level security returns for each role; the live policies
// themselves are pinned in rls-policies.live.test.ts.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (input: unknown): any => input;
    const builder = {
      middleware: () => builder,
      inputValidator: (v: typeof validate) => {
        validate = v;
        return builder;
      },
      handler: (handler: (input: any) => unknown) => (input: any) =>
        Promise.resolve().then(() => handler({ ...input, data: validate(input.data) })),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/api/audit.server", () => ({
  resolveActor: vi.fn(async () => ({ id: "actor", name: "Actor", email: null })),
  recordAudit: vi.fn(),
  notifyUsers: vi.fn(),
  adminUserIds: vi.fn(async () => []),
}));

import { getStudentPortal, linkGuardian, listGuardianLinks } from "./portal.functions";
import { setExamPublished } from "./school.functions";

const OWN_CHILD = "11111111-1111-4111-8111-111111111111";
const OTHER_CHILD = "22222222-2222-4222-8222-222222222222";
const PUBLISHED = "33333333-3333-4333-8333-333333333333";
const UNPUBLISHED = "44444444-4444-4444-8444-444444444444";
const TERM = "55555555-5555-4555-8555-555555555555";

type Role = "principal" | "teacher" | "parent";

/** What the database lets each role see, mirroring the live RLS rules. */
function fakeDb(role: Role) {
  const staff = role !== "parent";
  const visibleStudents = staff ? [OWN_CHILD, OTHER_CHILD] : [OWN_CHILD];
  const exams = [
    { id: PUBLISHED, name: "End of Term", is_published: true },
    { id: UNPUBLISHED, name: "Mid-Term", is_published: false },
  ].filter((e) => staff || e.is_published);
  const marks = [
    { exam_id: PUBLISHED, student_id: OWN_CHILD, score: 80, subjects: { name: "English" } },
    { exam_id: UNPUBLISHED, student_id: OWN_CHILD, score: 40, subjects: { name: "English" } },
  ].filter((m) => exams.some((e) => e.id === m.exam_id));
  const updates: unknown[] = [];

  const query = (table: string) => {
    const filters: Record<string, unknown> = {};
    let rows: any[] =
      table === "students"
        ? visibleStudents.map((id) => ({
            id,
            full_name: "Learner",
            admission_no: "A1",
            ges_id: "G1",
            grade_level: "Basic 6",
            stream: "A",
            fee_billed: 0,
          }))
        : table === "terms"
          ? [{ id: TERM, starts_on: "2026-01-01", ends_on: "2026-04-01" }]
          : table === "exams"
            ? exams
            : table === "marks"
              ? marks
              : [];
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        if (col === "id" || col === "student_id") rows = rows.filter((r) => r[col] === val);
        return chain;
      },
      in: (col: string, vals: unknown[]) => {
        rows = rows.filter((r) => vals.includes(r[col]));
        return chain;
      },
      gte: () => chain,
      lte: () => chain,
      order: () => chain,
      update: (v: unknown) => {
        updates.push(v);
        return chain;
      },
      insert: () => Promise.resolve({ error: null }),
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(ok),
    };
    return chain;
  };

  return {
    updates,
    supabase: {
      from: query,
      rpc: (fn: string) =>
        Promise.resolve({
          data: fn === "is_admin" ? role === "principal" : fn === "is_staff" ? staff : false,
          error: null,
        }),
    },
  };
}

const ctx = (role: Role) => {
  const db = fakeDb(role);
  return { db, context: { supabase: db.supabase, userId: `${role}-id` } };
};

describe("page access by role", () => {
  it("principals reach student records and examinations", () => {
    expect(canAccess("/students", ["admin"])).toBe(true);
    expect(canAccess("/examinations", ["admin"])).toBe(true);
  });
  it("teachers reach student records and examinations but not user management", () => {
    expect(canAccess("/students", ["teacher"])).toBe(true);
    expect(canAccess("/examinations", ["teacher"])).toBe(true);
    expect(canAccess("/users", ["teacher"])).toBe(false);
  });
  it("parents get the family portal and results page, never the student register", () => {
    expect(canAccess("/portal", ["parent"])).toBe(true);
    expect(canAccess("/examinations", ["parent"])).toBe(true); // rows filtered by the database
    expect(canAccess("/students", ["parent"])).toBe(false);
    expect(canAccess("/users", ["parent"])).toBe(false);
  });
});

describe("parent access to records and results", () => {
  it("cannot open a learner they are not linked to", async () => {
    const { context } = ctx("parent");
    await expect(
      getStudentPortal({ data: { studentId: OTHER_CHILD, termCode: "T1" }, context } as never),
    ).rejects.toThrow(/do not have access/);
  });

  it("sees only published results for their own child", async () => {
    const { context } = ctx("parent");
    const portal = await getStudentPortal({
      data: { studentId: OWN_CHILD, termCode: "T1" },
      context,
    } as never);
    expect(portal.results.map((r) => r.examId)).toEqual([PUBLISHED]);
  });

  it("cannot publish results or manage family links", async () => {
    const { context } = ctx("parent");
    await expect(
      setExamPublished({ data: { examId: UNPUBLISHED, published: true }, context } as never),
    ).rejects.toThrow(/administrator/);
    await expect(listGuardianLinks({ context } as never)).rejects.toThrow(/administrators/);
  });
});

describe("teacher access", () => {
  it("can open any learner, including unpublished marks", async () => {
    const { context } = ctx("teacher");
    const portal = await getStudentPortal({
      data: { studentId: OWN_CHILD, termCode: "T1" },
      context,
    } as never);
    expect(portal.results.map((r) => r.examId).sort()).toEqual([PUBLISHED, UNPUBLISHED].sort());
  });

  it("cannot publish results or grant family access", async () => {
    const { context, db } = ctx("teacher");
    await expect(
      setExamPublished({ data: { examId: UNPUBLISHED, published: true }, context } as never),
    ).rejects.toThrow(/administrator/);
    await expect(
      linkGuardian({
        data: { studentId: OWN_CHILD, guardianId: OTHER_CHILD, relationship: "Mother" },
        context,
      } as never),
    ).rejects.toThrow(/administrators/);
    expect(db.updates).toHaveLength(0);
  });
});

describe("principal access", () => {
  it("can publish results", async () => {
    const { context, db } = ctx("principal");
    await expect(
      setExamPublished({ data: { examId: UNPUBLISHED, published: true }, context } as never),
    ).resolves.toEqual({ examId: UNPUBLISHED, published: true });
    expect(db.updates).toEqual([{ is_published: true }]);
  });

  it("can grant family access", async () => {
    const { context } = ctx("principal");
    await expect(
      linkGuardian({
        data: { studentId: OWN_CHILD, guardianId: OTHER_CHILD, relationship: "Mother" },
        context,
      } as never),
    ).resolves.toEqual({ ok: true });
  });
});
