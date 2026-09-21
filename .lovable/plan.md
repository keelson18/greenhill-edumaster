# Security hardening and repository cleanup

## Scope
Implement the seven requested actions plus the audit-insert restriction, preserving the Ghana-first application and existing permissions.

1. **Environment hygiene:** add `.env.example` with placeholders and retain `.env` in ignore rules. Leave the managed `.env` untouched. Git index/commit commands cannot be run in this environment; untracking it remains a repository-owner action.
2. **Accurate documentation:** replace the historical README brief with the actual architecture, Ghana conventions, setup, testing, migrations, permissions, and known limitations.
3. **Repository cleanup:** keep `bun.lock`, remove the redundant pnpm lockfile, and remove unused Drizzle configuration/dependencies after checking references. Preserve the real security migration currently in the Drizzle tree in the canonical migration history before removing that tree; do not lose or blindly reapply it.
4. **Permission cleanup:** inspect live policies/grants, revoke authenticated profile INSERT, and remove only proven redundant policies. The reported duplicate subject SELECT policy is not present in the live database, so no speculative drops.
5. **Results publication:** add an explicit Published exam state and administrator-only publish/withdraw controls. Existing exams remain unpublished. Gate family exam/mark reads in the database and portal, so unpublished marks cannot leak through direct API calls. Protect publication changes in the database, and prevent editing published marks until withdrawn; retain locked-term protections. Publication is an explicit administrator approval, not a full multi-stage moderation workflow.
6. **Atomic role replacement:** replace delete-then-insert with one transactional database operation. Re-check actor permissions, self-change restrictions and Super Admin protection inside that operation, serialize competing changes, and preserve existing notification behavior.
7. **Defensive grading:** sort grading thresholds once before lookup and add regression coverage for out-of-order bands.
8. **Audit integrity:** deny authenticated direct audit inserts and use the trusted server audit writer only after authorization; preserve immutable history and existing admin read access.

## Technical details
- Use schema migrations with explicit function execution privileges; avoid recursive exam/mark policies with a narrowly scoped security-definer publication predicate.
- Keep ordinary reads and role checks on the authenticated client; privileged audit insertion remains server-only.
- Update exam DTOs, validation, server functions, portal queries and UI together; do not manually edit generated integration types.
- Add focused tests for publication authorization, family visibility and atomic role replacement, alongside the existing suite.

## Verification and limits
Run automated tests, check preview errors, review live grants/policies and test publication/role flows where an authorized test session is available. Do not publish real results or alter real user roles merely to test. Report any authenticated live checks that cannot be completed.

Single tenancy, auth rate limiting, guardian-contact scoping and email/SMS delivery remain outside this change.
