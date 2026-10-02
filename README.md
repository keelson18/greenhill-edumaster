# EduMaster — Greenhill Academy

School management system for Ghanaian basic schools (KG1 – Basic 9), GES proficiency bands (HP/P/AP/D), Ghana cedi (₵), en-GH, Africa/Accra.

## Stack
- TanStack Start v1 (React 19, Vite 7, SSR) on an edge runtime
- Tailwind CSS v4 + shadcn/ui, Recharts
- Lovable Cloud (Supabase Postgres, Auth, RLS)
- Zod validation, TanStack Query, Vitest

## Architecture
- Routes: `src/routes` (protected pages under `_authenticated/`).
- Server logic: `createServerFn` in `src/lib/api/*.functions.ts`, authenticated via `requireSupabaseAuth`; roles re-checked server-side.
- Authorization: `user_roles` table + security-definer helpers (`has_role`, `is_admin`, `can_view_student`) used by RLS. UI guards are cosmetic.
- Config: `src/config/app.config.ts` (school profile, grades, bands, roles).
- Audit trail and notifications are written only by the trusted server (`audit.server.ts`).

## Key rules
- Term locking and published-results freezing are enforced by database triggers.
- Families (parents/students) see exam marks only after an administrator publishes the exam.
- Role changes run atomically via the `replace_user_role` database function.

## Setup
```sh
bun install
cp .env.example .env   # fill in values
bun run dev
```

## Testing
```sh
bunx vitest run
```

## Known limitations
Single-school tenancy, no auth rate limiting, no email/SMS delivery, guardian contact details visible to staff, no full multi-stage exam moderation workflow.
