# Test-suite completion

# Full audit — 2026-09-18

- [x] Review tests, runtime, dependencies, database access and server/page code.
- [x] Fix confirmed security and reliability issues and add regression coverage.
- [x] Verify fixes and document remaining limitations in AUDIT.md.

Verification (2026-09-21): 47 tests pass, preview build OK, security scan clean, dependency scan
reports no known vulnerabilities after pinning browserslist, baseline-browser-mapping and js-yaml.
Fixed this pass: account-suspension protection, family-portal access checks, term-lock bypasses,
sign-out ordering.
Remaining: live database integration tests, browser end-to-end coverage, email/SMS delivery.

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

# Requested security hardening and housekeeping

- [ ] Environment example, accurate README, canonical migration history and single lockfile.
- [ ] Live grants/policy cleanup and trusted audit insertion.
- [ ] Exam publication gate with administrator controls and family visibility protection.
- [ ] Atomic role replacement and defensive grading with regression tests.
- [ ] Verify changes and document remaining limitations.
