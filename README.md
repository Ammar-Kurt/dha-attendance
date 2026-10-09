# DHA Attendance

Employee attendance and leave management for DHA Company. Built in [Lovable](https://lovable.dev/projects/f7ded613-d439-4afe-a282-bc724a6799de)
with TanStack Start, React 19, Tailwind v4 and shadcn/ui, backed by **Supabase** (Auth + Postgres
with Row Level Security).

Assignment 1 delivered the screens on mock data. Assignment 2 connects the app to GitHub and
Supabase, adds real sign-up / sign-in / sign-out, builds the full database and proves the live data flow.

## What the app does

| Role | Can do |
| --- | --- |
| Employee | Check in / out, view and edit own attendance, request corrections, request and cancel leave, read notifications, edit profile |
| Manager | Everything above plus live team register, approve/reject leave and corrections, monthly reports |
| HR Admin | Everything above plus employees directory, departments, shifts, leave types, holidays, audit log |
| System Admin | Everything above plus assigning roles |

The first account that signs up becomes **System Admin** automatically; every later account is an
Employee until a system admin changes their role under *Users & Roles*.

## Project structure

```
supabase/migrations/   SQL migrations: schema, RLS policies, triggers, seed data
src/integrations/      Supabase client and database types
src/lib/auth.tsx       Session + profile + role context (AuthProvider / useAuth)
src/lib/queries.ts     Shared react-query hooks and audit-log helper
src/components/shell   App shell, navigation, route protection
src/components/pages   One module per screen, all reading/writing live Supabase data
src/routes/            TanStack Start file routes (protected routes render client-side only)
docs/                  Database plan, Lovable prompts and testing note
```

## Local development

```sh
bun install            # or npm install
cp .env.example .env   # then fill in your Supabase URL and publishable (anon) key
bun run dev
```

Apply the migrations to your Supabase project in order (SQL editor or `supabase db push`).
Only the **publishable/anon** key belongs in the frontend; the service-role key is never used here.

## Verification

- `bun run build` – production build
- `./node_modules/.bin/tsc --noEmit` – typecheck
- `bun run lint` – eslint + prettier

See `docs/testing-note.md` for the data-flow tests that were run against the live database.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f7ded613-d439-4afe-a282-bc724a6799de).
Every change made in Lovable is committed to this repository, and pushes to `main` sync back into Lovable.
