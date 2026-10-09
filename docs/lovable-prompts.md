# Lovable prompts used to build the database (Assignment 2, Step 6)

Each prompt below produced one migration in `supabase/migrations/`. The generated SQL was read
before it was approved; the exact files are committed in this repository.

---

## Prompt 1 → `20261009000100_core_schema.sql`

> Create the core schema for DHA Attendance.
> 1. Create an enum `app_role` with values employee, manager, hr_admin, system_admin.
> 2. Create a `departments` table: id uuid primary key default gen_random_uuid(), name text not null unique, head_name text, created_at and updated_at timestamptz default now().
> 3. Create a `shifts` table: id uuid primary key, name text not null unique, start_time time not null, end_time time not null, grace_minutes integer default 15 (0–120), working_days text default 'Mon-Sat', created_at, updated_at.
> 4. Create a `profiles` table: id uuid primary key references auth.users(id) on delete cascade, full_name text not null (2–80 chars), email text not null, employee_code text not null unique, department_id uuid references departments(id) on delete set null, shift_id uuid references shifts(id) on delete set null, designation text, phone text, join_date date default current_date, is_active boolean default true, created_at and updated_at timestamptz default now().
> 5. Create a `user_roles` table: id uuid primary key, user_id uuid not null unique references auth.users(id) on delete cascade, role app_role not null default 'employee', created_at, updated_at. Keep roles out of profiles so users cannot escalate their own access.
> 6. Add security-definer helper functions `has_role(user_id, role)`, `is_staff(user_id)` (manager, hr_admin or system_admin) and `is_admin(user_id)` (hr_admin or system_admin).
> 7. Add a trigger on auth.users insert that creates the profile (full_name from raw_user_meta_data, employee_code 'DHA-' + sequence starting at 1042) and the role row. The very first user becomes system_admin, everyone else employee.
> 8. Add a trigger that stops non-admins from changing employee_code, email, is_active or join_date on their own profile, and a shared `set_updated_at` trigger on every table.
> 9. Enable RLS: departments and shifts readable by any authenticated user, writable only by is_admin. profiles: users can select and update only their own row; staff can select all; admins can update all; no client inserts. user_roles: users read their own row, staff read all, only system_admin can insert/update/delete.

## Prompt 2 → `20261009000200_attendance_and_leave.sql`

> Add the attendance and leave tables.
> 1. `leave_types`: id uuid primary key, name text unique not null, annual_quota integer default 0 (0–365), is_paid boolean default true, created_at, updated_at.
> 2. `holidays`: id uuid primary key, name text not null, holiday_date date not null, unique(name, holiday_date), created_at, updated_at.
> 3. `attendance_records`: id uuid primary key, user_id uuid not null references profiles(id) on delete cascade, work_date date default current_date, check_in timestamptz, check_out timestamptz, status text default 'present' limited to present/late/absent/on_leave/holiday/half_day, note text, created_at, updated_at, unique(user_id, work_date), check_out must be after check_in.
> 4. `leave_requests`: id uuid primary key, user_id uuid references profiles(id) on delete cascade, leave_type_id uuid references leave_types(id) on delete restrict, start_date date, end_date date (end ≥ start), days integer generated as end_date − start_date + 1, reason text (10–500 chars), status text default 'pending' limited to pending/approved/rejected/cancelled, reviewed_by uuid references profiles(id) on delete set null, reviewed_at timestamptz, review_note text, created_at, updated_at.
> 5. `correction_requests`: id uuid primary key, user_id uuid references profiles(id) on delete cascade, attendance_record_id uuid references attendance_records(id) on delete set null, work_date date not null, requested_check_in time, requested_check_out time, reason text (10–300 chars), status text default 'pending' limited to pending/approved/rejected, reviewed_by, reviewed_at, created_at, updated_at.
> 6. Enable RLS on all five tables. leave_types and holidays: read for authenticated, write for is_admin. attendance_records, leave_requests, correction_requests: users can select, insert, update their own rows (user_id = auth.uid()); staff can select and update every row; users can delete their own pending requests, admins can delete any.
> 7. Add indexes on (user_id, work_date), work_date, (user_id, created_at) and status.

## Prompt 3 → `20261009000300_notifications_and_audit.sql`

> Add `notifications` (id uuid primary key, user_id uuid references profiles(id) on delete cascade, title text, body text, is_read boolean default false, created_at, updated_at) and `audit_logs` (id uuid primary key, actor_id uuid references profiles(id) on delete set null, action text, target text, details jsonb default '{}', created_at).
> Enable RLS: notifications are strictly per user for select/update/delete, insert allowed for the owner or staff. audit_logs: anyone can insert rows where actor_id = auth.uid(); users read their own rows, admins read everything.
> Add a trigger so that when a leave_request or correction_request changes to approved or rejected, a notification is inserted for the employee and an audit row is written. Add a second trigger so that approving a correction_request upserts the requested check-in/check-out into attendance_records for that user and date.

## Prompt 4 → `20261009000400_seed_reference_data.sql`

> Seed only configuration data, nothing user-specific: departments Operations (head Sara Ali), Human Resources (Ayesha Malik), Finance (Farhan Sheikh); shifts General 09:00–17:30 with 15 minutes grace and Early 08:00–16:30 with 10 minutes grace, both Mon-Sat; leave types Annual Leave 20 days, Sick Leave 10 days, Casual Leave 5 days, all paid; holidays Iqbal Day 2026-11-09, Quaid-e-Azam Day 2026-12-25, Kashmir Day 2027-02-05. Use on conflict do nothing so the seed is safe to re-run.

## Prompt 5 → frontend wiring (no migration)

> Replace all mock data with live Supabase queries. Add a landing page with header, hero, features, Sign In and Get Started buttons; a sign-up page (full name, email, password, confirm password, every field validated with clear messages); a sign-in page (email, password, wrong-credentials message, redirect to dashboard); and a working sign-out button. Protect every dashboard route so signed-out users are redirected to sign-in. Connect dashboard, attendance, leave, approvals, team attendance, employees, departments & shifts, leave & holidays, reports, notifications, users & roles, audit log and profile to their tables with loading, empty, error and success states, confirmation dialogs before every delete, and Save buttons disabled while saving.
