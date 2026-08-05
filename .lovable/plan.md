# GreenHill EduMaster — Production Upgrade

## Audit report (current state)

Solid foundations already in place:
- Auth (email + password sign-in/sign-up), protected `_authenticated` layout, session context with clean sign-out.
- 8-role model, role-filtered sidebar, RBAC helper functions in the database.
- 13 working modules wired to the live database: Dashboard, Students, Examinations, Teachers, Timetable, Homework, Fees, Payroll, Library, Inventory, Transport, Users, Audit Log.
- Ghana localisation: GHS currency, GES IDs, KG1–Basic 9 ladder, regions.
- Immutable audit log, in-app notifications, term locking, Zod validation on server functions.

Gaps found:

| Area | Gap |
| --- | --- |
| Attendance | Module does not exist at all — no table, no API, no page |
| Parent portal | `parent` role exists but has no linkage to children and no dedicated screens |
| Student portal | `student` role has no self-service view (results, fees, timetable) |
| Dashboards | One shared admin dashboard; no per-role variants |
| Auth | No forgot-password, no reset-password page, no change-password |
| Authorization | No `/unauthorized` page; role gating is sidebar-level, routes are not role-guarded |
| Fees | No fee structures, receipts, discounts or scholarships; payments only |
| Academics | No promotion/transfer/graduation lifecycle; no transcripts |
| UI | No dark-mode toggle, inconsistent empty/skeleton states |
| Testing | Zero tests, no test runner installed |
| Docs | No deployment/admin/user guides |

## Delivery plan (phased)

### Phase 1 — Security & access hardening
- Route-level role guards: reusable guard component + `/unauthorized` page; every route declares required roles so URL-typing cannot bypass the sidebar.
- Password lifecycle: forgot-password on `/auth`, new public `/reset-password` route, change-password in a new `/settings` page.
- Session-expiry handling with a clear re-login prompt.

### Phase 2 — Attendance module
- Migration: `attendance_sessions` + `attendance_records` (student, date, status, marked_by), plus staff attendance; grants, RLS, indexes.
- Server functions for marking and reporting; teacher-scoped writes, admin-wide reads.
- `/attendance` page: daily class register, bulk mark, per-student history, attendance-rate reports.
- Absence notification to linked guardians.

### Phase 3 — Parent & student portals
- Migration: `guardians` link table (parent user ↔ student) with RLS so parents read only their children.
- Student portal: own results, attendance, timetable, fee balance.
- Parent portal: children switcher with the same four views + notifications.

### Phase 4 — Role dashboards
- Split the dashboard into role-specific views (Super Admin, School Admin, Teacher, Student, Parent, Accountant, Librarian, Staff) with the KPI sets in the brief, each backed by scoped queries.

### Phase 5 — Finance completion
- Migration: `fee_structures`, `fee_items`, `discounts`/`scholarships`, `receipts`.
- Billing generation per term/class, receipt issue and print, payment method breakdown (Mobile Money, bank, cash), financial reports.

### Phase 6 — Academic lifecycle
- Student promotion, transfer, graduation with status history.
- Report cards and transcripts (cumulative across terms), printable.

### Phase 7 — UI/UX, performance, quality
- Dark/light toggle, consistent skeletons, empty and error states, mobile/tablet passes, accessibility fixes.
- Route-level code splitting and query tuning.
- Vitest + Testing Library setup with unit/integration tests on auth, RBAC, fees, attendance, results; a Playwright smoke suite for the critical flows.
- Deployment, environment, admin and user guides plus a final change report.

## Technical notes

- All new tables ship with GRANTs, RLS enabled, owner/role-scoped policies, foreign keys, and indexes on lookup columns, in versioned migrations.
- Data access stays behind `createServerFn` with `requireSupabaseAuth`; privileged work continues to re-check roles in the database, never client state.
- Role guards read from the existing auth context; the `_authenticated` gate stays as-is.
- Attendance, guardians and fees writes are all audited through the existing audit-log helper.

## Sequencing

Phases run in order; each ends with a working, typechecked app so progress is visible. Phase 1 and 2 are the highest value — they close the real security gap and the one entirely missing module.
