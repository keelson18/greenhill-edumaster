# EduMaster — Ghana Rebuild, Audit & Completion

## Where the app is today

- Backend (database + auth) is live: `terms`, `subjects`, `students`, `exams`, `marks`, `fee_payments`, `profiles`, `user_roles`, with row-level security and a term-lock trigger.
- Only 3 roles exist (admin, teacher, parent). The request needs 8.
- Everything is Kenya-flavoured: KES currency, `en-KE` locale, NEMIS numbers, counties, `+254` phones, CBC grade ladder PP1–Grade 9.
- Dashboard, Students and Examinations still read from the in-memory mock file `src/lib/edumaster-data.ts` instead of the database.
- 8 module pages (Teachers, Timetable, Homework, Fees, Payroll, Library, Inventory, Transport) are hardcoded placeholder tables with fake rows and no working buttons.
- No per-role dashboards, no role-filtered sidebar, no user management screen.

## Phase 1 — Ghana localization (data + presentation)

Database migration:
- Rename learner identity fields: `nemis_no` becomes a Ghana **GES student ID**, `county` becomes **region**; add `district`, `town`, `ghana_post_gps`.
- Replace grade ladder with Ghana Basic Education: KG1, KG2, Basic 1–Basic 9 (JHS1–3 = Basic 7–9). Existing rows are mapped, not dropped.
- Replace the Kenyan term calendar with the Ghana 3-term academic year.
- Re-seed learner names, regions, districts, guardian phones (`+233 XX XXX XXXX`) and fee amounts in cedis.

App layer:
- Central `src/config/locale.ts`: currency GHS with the ₵ symbol, `en-GH` locale, `Africa/Accra` timezone, `DD/MM/YYYY` dates, `+233` phone formatting/validation.
- All currency and date rendering routed through shared formatters — no component formats money itself.
- Address form fields become Region (dropdown of the 16 Ghana regions) → District → Town/City → Ghana Post GPS (validated `XX-000-0000`).
- Performance bands stay competency-based but relabelled to Ghana/GES wording (Advanced, Proficient, Approaching, Beginning).

## Phase 2 — Roles, auth and access control

- Extend the role type to: Super Admin, Administrator, Teacher, Student, Parent, Accountant, Librarian, Staff.
- Roles remain in the separate `user_roles` table (never on the profile) and are checked by a security-definer function, so a user cannot escalate their own role.
- Sign-in stays email + password; after authentication the app reads the role and routes to that role's home: Super Admin/Admin → Admin dashboard, Teacher → Teacher dashboard, Student → Student portal, Parent → Parent portal, Accountant → Finance, Librarian → Library, Staff → Staff home.
- Route protection is enforced twice: a route guard per role area on the client, and access rules in the database so a blocked page also cannot be read through the API.
- Sidebar navigation is generated from the signed-in role, so each role only sees its own modules.
- Login hardening: failed-attempt throttling with temporary lockout, generic error text, secure session handling, clean sign-out that clears cached data.
- **User management** (Super Admin only): list, create, edit, activate, suspend, delete users, assign/change role, trigger password reset.

## Phase 3 — Real data everywhere, no placeholders

- Dashboard, Students and Examinations move off the mock file onto the existing server functions; the mock file is deleted.
- Each of the 8 placeholder modules gets real tables, real access rules, real server functions and a working screen with search, filters, pagination, create/edit forms, loading skeletons, empty states and error states:
  - Teachers/Staff directory, Timetable, Homework & assignments, Fees & invoices (₵), Payroll (₵), Library catalogue & lending, Inventory & assets, Transport routes.
- Role dashboards: Admin (school-wide KPIs, charts, recent activity, quick actions), Teacher (my classes, marks due, attendance), Student (my results, fees, timetable), Parent (child performance, fees, attendance), Accountant (collections, arrears, payroll).

## Phase 4 — Buttons, forms, routes, UI/UX, QA

- Every button audited: real handler, loading spinner, success/error toast, disabled reasoning. No dead buttons.
- Every form validated with shared schemas (client + server), clear field errors, success feedback, reset.
- Full route sweep: no dead links, no blank screens, breadcrumbs on nested pages, a proper 404 page.
- Responsive pass at mobile/tablet/desktop, contrast and keyboard/screen-reader pass, consistent spacing and typography.
- Browser-driven QA run over every page, form, modal, table, search and filter; then a written report of issues fixed, pages created, buttons repaired, routes added, localization changes, and optional future work.

## Technical notes

- Stack unchanged: TanStack Start + React + TypeScript, Tailwind + shadcn/ui, Recharts, Lovable Cloud (Postgres) with row-level security.
- All data access stays inside typed server functions with Zod validation; the browser never queries tables directly.
- Shared formatters/validators live in `src/lib/locale`, role rules in `src/lib/auth`, one reusable data-table and page-shell component to keep modules DRY.
- Each phase ends with a typecheck and a preview smoke test before the next begins.

## Scope note

This is roughly four large work sessions. I will execute the phases in order and report after each, so you can steer before the next one starts.
