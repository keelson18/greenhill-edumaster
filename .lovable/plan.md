# EduMaster — Audit Findings & Improvement Plan

## Current verified state (today)
- Build: OK, no runtime errors logged.
- Tests: 57 of 62 pass. The 5 failing are the live database-rule tests: the test runner can't reach the database right now ("tenant not found"). The app code itself is not at fault.
- Earlier this session: security scan clean, linter shows only the 8 intentional role-check helpers.

## Findings

| # | Severity | Area | Problem | Files |
|---|---|---|---|---|
| 1 | High | Testing | Live rule tests fail hard when the database is unreachable, so a network blip looks like a security regression | `src/lib/api/rls-policies.live.test.ts` |
| 2 | High | Data | Several list screens load whole tables with no paging (students, fees, audit log only partially limited) — slows down as the school grows | `src/lib/api/school.functions.ts`, `finance.functions.ts`, `operations.functions.ts` |
| 3 | Medium | Quality | 21 type escapes (`as any` / `@ts-ignore`) hide mismatches with the database types | across `src/` |
| 4 | Medium | Quality | Large pages mixing data, forms and tables (Examinations 783 lines, Students 633) | `examinations.tsx`, `students.tsx` |
| 5 | Medium | Framework | 8 pages fetch data in effects instead of route loaders — slower first paint, flicker | `src/routes/_authenticated/*` |
| 6 | Medium | Testing | No signed-in browser tests for login, marks entry, publishing | — |
| 7 | Low | Ops | No CI pipeline or health-check endpoint | — |
| 8 | Open (needs you) | Integrations | Email/SMS alerts not sent — needs a provider decision | — |

## Plan (each phase leaves the app working)

**Phase 1 — Critical/High**
1. Make live tests skip clearly (with a reason) when the database is unreachable, fail only on real rule changes. Test: run suite offline/online.
2. Add server-side paging + search to students, fees and audit log; add "Load more"/pager in the UI. Test: new unit tests on page sizes; screens checked in preview.

**Phase 2 — Medium**
3. Remove type escapes, using the generated database types. Test: type check clean, suite green.
4. Split Examinations and Students pages into smaller pieces (no behaviour change). Test: preview check + existing tests.
5. Move effect-based fetching to route loaders. Test: pages load with no flicker, no console errors.
6. Add a `/api/public/health` check endpoint.

**Phase 3 — Verification & docs**
7. Signed-in browser checks (Principal, Teacher, Parent) once a test account exists.
8. Update README/AUDIT.md and roadmap with results; final completion report (sections A–G).

## Not included (needs your decision)
- Email/SMS provider for alerts.
- Remaining roadmap modules (full finance, exam moderation lifecycle, documents, communication centre) — each is a separate feature build.
