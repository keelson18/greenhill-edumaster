import { describe, expect, it, vi } from "vitest";
import { feeSearchFilter, readAllPages } from "./finance.query";

describe("fee query boundaries", () => {
  it("collects every payment beyond a single database response", async () => {
    const rows = Array.from({ length: 1251 }, (_, id) => ({ id }));
    const read = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1), error: null,
    }));
    expect(await readAllPages(read, "payments")).toEqual(rows);
    expect(read.mock.calls).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });

  it("fails when a later payment page cannot be read", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce({ data: Array(500).fill({ amount: 1 }), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "connection lost" } });
    await expect(readAllPages(read, "payments")).rejects.toThrow("Unable to load payments: connection lost");
  });

  it("removes filter syntax and wildcards from learner search", () => {
    const filter = feeSearchFilter('%,()\\"_*');
    expect(filter).toBeNull();
    expect(feeSearchFilter("GH001")).toBe(
      "full_name.ilike.%GH001%,admission_no.ilike.%GH001%,grade_level.ilike.%GH001%",
    );
  });
});