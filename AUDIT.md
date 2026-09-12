# GreenHill EduMaster — Chief Architect Audit (evidence-backed)

Date: 2026-09-02. Scope: full repository + live backend schema.

## 1. What the system actually is today

Actual architecture (not the README's):

```text
React 19 + TypeScript + Tailwind v4 + shadcn/ui
        |  TanStack Router (file routes in src/routes)
        v
TanStack Start server functions (src/lib/api/*.functions.ts)
   - Zod input validation (src/lib/validation/schemas.ts)
   - requireSupabaseAuth bearer middleware on every exported fn
        v
Supabase Postgres (23 tables, RLS on all, SECURITY DEFINER RBAC helpers)
```

No Redis, no object storage, no email/SMS/payment provider, no background jobs,
no separate backend service. Business logic lives in server functions plus SQL
functions/triggers — acceptable and production-viable; a backend rewrite is
**not** recommended.

## 2. Secrets

`.env` contains only `SUPABASE_URL`, `SUPABASE_PROJECT_ID`,
`SUPABASE_PUBLISHABLE_KEY` and their `VITE_` twins. These are publishable,
browser-safe values — no service-role key, DB password, JWT secret, SMTP or
payment credential anywhere in source. No hard-coded secrets found in `src/`.
Privileged work uses the server-only admin client. **No rotation required.**

## 3. Feature classification

| Module | State | Notes |
| --- | --- | --- |
| Dashboard | REAL | DB-backed KPIs + charts via `term_dashboard_stats` |
| Students | REAL | CRUD, pagination, filters, Zod validated |
| Teachers/Staff | REAL | CRUD + salary |
| Subjects | REAL | Admin-created |
| Terms + locking | REAL | Enforced by DB trigger, not just UI |
| Examinations / marks / ranking | REAL | Locked-term writes rejected in SQL |
| Report cards | PARTIALLY REAL | Rendered per term; no cumulative transcript |
| Attendance (learner + staff) | REAL | Tables, RLS, register UI |
| Timetable / Homework | REAL | |
| Fees & payments | PARTIALLY REAL | Payments real; no fee structures, discounts, receipts |
| Payroll | REAL | SSNIT/tax computed |
| Library / Inventory / Transport | REAL | |
| Users & roles | REAL | 8 roles, super-admin escalation blocked |
| Audit log | REAL | Immutable (UPDATE/DELETE revoked) |
| Notifications | REAL in-app | No email/SMS delivery |
| Parent/Student portal | REAL | Guardian links + per-term view |
| Expenses, financial reports, events | MISSING | |
| Tests | PARTIALLY REAL | 47 passing Vitest tests; live database integration and browser end-to-end coverage remain |

## 4. Authorization — real or cosmetic?

Both layers exist and the server layer is authoritative:
- UI: `RoleGuard` + `canAccess` in `src/config/nav.ts` (cosmetic by design).
- Server: every `createServerFn` carries `requireSupabaseAuth`; role checks run
  against `has_role`/`is_admin`/`is_super_admin` SECURITY DEFINER functions.
- Database: RLS on all 23 public tables with explicit GRANTs.

No unauthenticated data-returning endpoint was found.

## 5. Tenant isolation — the key architectural gap

There is **no `school_id` anywhere**. The schema is single-tenant: every row
belongs to one implicit school. This is safe today but blocks SaaS. Multi-tenancy
would require a `schools` table, a `school_id` on every domain table, and RLS
rewritten around a user's school membership — a large, risky migration that
should only be undertaken if multi-school sales are actually planned.

## 6. Localisation

Ghana-first everywhere in the data model (GES IDs, GHS, KG1–Basic 9, regions).
Residual Kenyan copy (NEMIS/CBC/KES/Kenya) survived only in the public landing
page, sign-in page and root metadata — **fixed in this pass**. The unused
Kenyan mock-data module `src/lib/edumaster-data.ts` (847 fake learners) was dead
code and has been **deleted**; no module imports mock data any more.

## 7. Remaining prioritised backlog

1. **Testing (highest)** — Vitest installed; 47 tests pass covering navigation RBAC,
   grading, mark validation, term-lock server handlers and fee balances (2026-09-12).
   Server-handler tests mock database responses; live RLS/trigger integration tests,
   Testing Library UI tests and Playwright login → marks → report card remain.
2. **Finance completion** — fee structures, discounts/scholarships, receipts,
   expenses, financial reports.
3. **Exam lifecycle** — moderation → approval → publication states, so results
   are not visible to parents before approval.
4. **Academic lifecycle** — promotion, transfer, graduation, cumulative transcripts.
5. **Email/SMS delivery** for notifications (needs a verified sender domain).
6. **Rate limiting / brute-force protection** on auth-adjacent endpoints.
7. **Multi-tenancy** — only if SaaS is confirmed.

## 8. Definition-of-done answers

- Real backend: TanStack Start server functions on the edge runtime.
- Real database: Supabase Postgres, RLS-enforced.
- Auth: Supabase email/password with recovery + change-password.
- Authorization: DB SECURITY DEFINER role functions, enforced server-side.
- Tenant isolation: not implemented (single-tenant by design today).
- Exposed secrets: none.
- Mock data: eliminated.
- Preserve: schema, RLS model, server-function boundary, audit log, term locking.
- Build first: automated tests, then finance and exam-approval lifecycle.
