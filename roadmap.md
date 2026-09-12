# Test-suite completion

- [x] Run existing role-access and grading tests; correct the rounding expectation.
- [x] Add server-handler regression tests for term locking and fee balances.
- [x] Run the completed suite and record verification and limitations.

Verification: `bunx vitest run` — 47 tests passed across three files on 2026-09-12; preview build OK.
Scope: role navigation, grading/formatting, actual server handlers with mocked database responses, mark validation, lock error handling, lock administration, fee records and summaries.
Limitation: database mocks do not verify live row-level security or trigger enforcement; live database integration and browser end-to-end tests remain separate follow-up work.