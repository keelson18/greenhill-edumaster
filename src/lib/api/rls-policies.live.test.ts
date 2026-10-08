import { afterAll, describe, expect, it } from "vitest";

// Reads the live database's access rules and pins the ones that decide who
// sees learner records and exam results. Skipped when no database URL is set.
const url = process.env["DB_URL"] ?? process.env["SUPABASE_DB_URL"];

describe.skipIf(!url)("live access rules for learners and results", async () => {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url!, { max: 1, ssl: "require" });
  afterAll(() => sql.end());

  const policies = async (table: string) =>
    sql<{ cmd: string; qual: string | null }[]>`
      select cmd, qual from pg_policies where schemaname = 'public' and tablename = ${table}`;
  const body = async (fn: string) =>
    (await sql<{ prosrc: string }[]>`select prosrc from pg_proc where proname = ${fn}`)[0]!.prosrc;
  const reads = (rows: { cmd: string; qual: string | null }[]) =>
    rows.filter((r) => r.cmd === "SELECT" || r.cmd === "ALL").map((r) => r.qual ?? "");

  it("learner records: staff or linked family only", async () => {
    expect(reads(await policies("students")).sort()).toEqual(
      ["can_view_student(auth.uid(), id)", "is_staff(auth.uid())"].sort(),
    );
  });

  it("marks: staff, or family only once the exam is published", async () => {
    const quals = reads(await policies("marks"));
    expect(quals).toHaveLength(2);
    expect(quals).toContain("is_staff(auth.uid())");
    expect(
      quals.some((q) => q.includes("can_view_student") && q.includes("exam_is_published")),
    ).toBe(true);
  });

  it("exams: family sees only published exams", async () => {
    const family = reads(await policies("exams")).filter((q) => !q.startsWith("is_staff"));
    expect(family.length).toBeGreaterThan(0);
    for (const q of family) expect(q).toMatch(/is_published/);
  });

  it("only principals (admins) and teachers may change marks; only admins delete", async () => {
    const rows = await policies("marks");
    expect(rows.find((r) => r.cmd === "UPDATE")?.qual).toMatch(/is_admin.*teacher/);
    expect(rows.find((r) => r.cmd === "DELETE")?.qual).toBe("is_admin(auth.uid())");
  });

  it("parents are not staff and suspended accounts lose family access", async () => {
    const staff = await body("is_staff");
    expect(staff).not.toMatch(/'parent'|'student'/);
    expect(staff).toMatch(/'teacher'/);
    expect(await body("can_view_student")).toMatch(/NOT is_suspended/);
  });
});
