# Test-suite completion

# Full audit — 2026-09-18

- [ ] Review tests, runtime, dependencies, database access and server/page code.
- [ ] Fix confirmed security and reliability issues and add regression coverage.
- [ ] Verify fixes and document remaining limitations in AUDIT.md.

- [x] Run existing role-access and grading tests; correct the rounding expectation.
- [x] Add server-handler regression tests for term locking and fee balances.
- [x] Run the completed suite and record verification and limitations.

Verification: `bunx vitest run` — 47 tests passed across three files on 2026-09-12; preview build OK.
Scope: role navigation, grading/formatting, actual server handlers with mocked database responses, mark validation, lock error handling, lock administration, fee records and summaries.
Limitation: database mocks do not verify live row-level security or trigger enforcement; live database integration and browser end-to-end tests remain separate follow-up work.

# Public-page redesign

- [x] Apply the selected Neo-Swiss editorial direction to the homepage.
- [x] Apply the same direction to sign-in, registration, and password reset.
- [x] Verify desktop and mobile presentation and page actions.

Verified sign-in rendering, registration validation, forgot-password navigation, expired recovery state, and mobile overflow checks. Latest preview build OK. No live account creation or email delivery test performed.
