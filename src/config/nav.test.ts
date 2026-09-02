import { describe, expect, it } from "vitest";
import { canAccess, labelForPath, navFor, rolesForPath } from "./nav";
import type { AppRole } from "./app.config";

/**
 * The sidebar metadata is the single source of truth for the layout-level
 * route guard, so a mistake here silently exposes a page. These tests pin the
 * access matrix for every role.
 */

const ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "teacher",
  "student",
  "parent",
  "accountant",
  "librarian",
  "staff",
];

describe("route access matrix", () => {
  it("lets super admins reach every navigable page", () => {
    const paths = navFor(["super_admin"]).flatMap((s) => s.items.map((i) => i.to));
    for (const path of paths) expect(canAccess(path, ["super_admin"])).toBe(true);
  });

  it("keeps administration pages away from non-admin roles", () => {
    for (const role of ROLES) {
      const allowed = role === "super_admin" || role === "admin";
      expect(canAccess("/users", [role])).toBe(allowed);
      expect(canAccess("/audit-log", [role])).toBe(allowed);
      expect(canAccess("/teachers", [role])).toBe(allowed);
    }
  });

  it("restricts payroll to finance roles", () => {
    expect(canAccess("/payroll", ["accountant"])).toBe(true);
    expect(canAccess("/payroll", ["admin"])).toBe(true);
    expect(canAccess("/payroll", ["teacher"])).toBe(false);
    expect(canAccess("/payroll", ["parent"])).toBe(false);
  });

  it("blocks learners and parents from student records and attendance", () => {
    for (const role of ["student", "parent"] as AppRole[]) {
      expect(canAccess("/students", [role])).toBe(false);
      expect(canAccess("/attendance", [role])).toBe(false);
    }
  });

  it("opens the family portal to learners, parents and admins only", () => {
    expect(canAccess("/portal", ["parent"])).toBe(true);
    expect(canAccess("/portal", ["student"])).toBe(true);
    expect(canAccess("/portal", ["admin"])).toBe(true);
    expect(canAccess("/portal", ["teacher"])).toBe(false);
    expect(canAccess("/portal", ["librarian"])).toBe(false);
  });

  it("gives every signed-in role the dashboard and settings", () => {
    for (const role of ROLES) {
      expect(canAccess("/dashboard", [role])).toBe(true);
      expect(canAccess("/settings", [role])).toBe(true);
    }
  });

  it("denies access when the user carries no role at all", () => {
    expect(canAccess("/students", [])).toBe(false);
    expect(canAccess("/dashboard", [])).toBe(false);
  });

  it("applies the parent route's rules to its sub-paths", () => {
    expect(rolesForPath("/students/abc-123")).toEqual(rolesForPath("/students"));
    expect(canAccess("/users/settings", ["teacher"])).toBe(false);
  });

  it("treats unknown paths as unrestricted so no page 403s by accident", () => {
    expect(rolesForPath("/some-new-page")).toBeUndefined();
    expect(canAccess("/some-new-page", ["staff"])).toBe(true);
  });

  it("resolves a human label for the access-denied message", () => {
    expect(labelForPath("/audit-log")).toBe("Audit Log");
    expect(labelForPath("/nope")).toBeUndefined();
  });
});

describe("sidebar composition", () => {
  it("hides empty groups", () => {
    const sections = navFor(["librarian"]);
    expect(sections.every((s) => s.items.length > 0)).toBe(true);
    expect(sections.flatMap((s) => s.items).map((i) => i.to)).not.toContain("/payroll");
  });

  it("falls back to the staff view for a roleless account", () => {
    expect(navFor([])).toEqual(navFor(["staff"]));
  });

  it("unions the entries of a multi-role account", () => {
    const paths = navFor(["teacher", "accountant"]).flatMap((s) => s.items.map((i) => i.to));
    expect(paths).toContain("/students");
    expect(paths).toContain("/payroll");
  });
});
