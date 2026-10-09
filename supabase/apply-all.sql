-- DHA Attendance: all migrations in order. Paste into Supabase SQL Editor and click Run.
-- Generated from supabase/migrations/*.sql

-- ===== 20261009000100_core_schema.sql =====
-- =====================================================================
-- DHA Attendance · Migration 1: core schema
-- profiles, user_roles, departments, shifts + helper functions and RLS
-- =====================================================================

-- ---------- Enums ----------
create type public.app_role as enum ('employee', 'manager', 'hr_admin', 'system_admin');

-- ---------- Shared trigger: keep updated_at fresh ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Reference tables (needed by profiles) ----------
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  head_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.shifts (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  start_time     time not null,
  end_time       time not null,
  grace_minutes  integer not null default 15 check (grace_minutes between 0 and 120),
  working_days   text not null default 'Mon-Sat',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- Profiles (1:1 with auth.users) ----------
create sequence public.employee_code_seq start 1042;

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null check (char_length(full_name) between 2 and 80),
  email          text not null,
  employee_code  text not null unique,
  department_id  uuid references public.departments (id) on delete set null,
  shift_id       uuid references public.shifts (id) on delete set null,
  designation    text,
  phone          text,
  join_date      date not null default current_date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- Roles (separate table so users cannot escalate themselves) ----------
create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  role        public.app_role not null default 'employee',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Helper functions (SECURITY DEFINER so RLS policies can call them) ----------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- manager, hr_admin or system_admin
create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('manager', 'hr_admin', 'system_admin')
  );
$$;

-- hr_admin or system_admin
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('hr_admin', 'system_admin')
  );
$$;

-- ---------- Create profile + role when a user signs up ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role public.app_role;
begin
  -- The very first account becomes system_admin so the workspace can be managed.
  if (select count(*) from public.user_roles) = 0 then
    _role := 'system_admin';
  else
    _role := 'employee';
  end if;

  insert into public.profiles (id, full_name, email, employee_code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    'DHA-' || nextval('public.employee_code_seq')
  );

  insert into public.user_roles (user_id, role) values (new.id, _role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Protect sensitive profile columns from self-edits ----------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if new.employee_code is distinct from old.employee_code
       or new.email is distinct from old.email
       or new.is_active is distinct from old.is_active
       or new.join_date is distinct from old.join_date then
      raise exception 'Only HR or system administrators can change employee code, email, status or join date';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------- updated_at triggers ----------
create trigger set_departments_updated_at before update on public.departments
  for each row execute function public.set_updated_at();
create trigger set_shifts_updated_at before update on public.shifts
  for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_user_roles_updated_at before update on public.user_roles
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.departments enable row level security;
alter table public.shifts      enable row level security;
alter table public.profiles    enable row level security;
alter table public.user_roles  enable row level security;

-- departments / shifts: everyone signed in can read, only admins change
create policy "departments_select_authenticated" on public.departments
  for select to authenticated using (true);
create policy "departments_insert_admin" on public.departments
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "departments_update_admin" on public.departments
  for update to authenticated using (public.is_admin(auth.uid()));
create policy "departments_delete_admin" on public.departments
  for delete to authenticated using (public.is_admin(auth.uid()));

create policy "shifts_select_authenticated" on public.shifts
  for select to authenticated using (true);
create policy "shifts_insert_admin" on public.shifts
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "shifts_update_admin" on public.shifts
  for update to authenticated using (public.is_admin(auth.uid()));
create policy "shifts_delete_admin" on public.shifts
  for delete to authenticated using (public.is_admin(auth.uid()));

-- profiles: a user reads and updates only their own row; staff can read the directory,
-- admins can update any profile (status, department, etc.). No client inserts: the trigger does it.
create policy "profiles_select_own_or_staff" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.is_staff(auth.uid()));
create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (auth.uid() = id or public.is_admin(auth.uid()));

-- user_roles: read own (staff can read all); only system_admin may change roles
create policy "user_roles_select_own_or_staff" on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "user_roles_insert_system_admin" on public.user_roles
  for insert to authenticated with check (public.has_role(auth.uid(), 'system_admin'));
create policy "user_roles_update_system_admin" on public.user_roles
  for update to authenticated using (public.has_role(auth.uid(), 'system_admin'));
create policy "user_roles_delete_system_admin" on public.user_roles
  for delete to authenticated using (public.has_role(auth.uid(), 'system_admin'));

-- ---------- Indexes ----------
create index profiles_department_id_idx on public.profiles (department_id);
create index profiles_shift_id_idx on public.profiles (shift_id);

-- ===== 20261009000200_attendance_and_leave.sql =====
-- =====================================================================
-- DHA Attendance · Migration 2: leave types, holidays, attendance,
-- leave requests and attendance corrections (all with RLS)
-- =====================================================================

-- ---------- Leave types & holidays (reference data managed by HR) ----------
create table public.leave_types (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  annual_quota  integer not null default 0 check (annual_quota between 0 and 365),
  is_paid       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.holidays (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  holiday_date  date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (name, holiday_date)
);

-- ---------- Attendance records (one row per employee per day) ----------
create table public.attendance_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  work_date   date not null default current_date,
  check_in    timestamptz,
  check_out   timestamptz,
  status      text not null default 'present'
              check (status in ('present', 'late', 'absent', 'on_leave', 'holiday', 'half_day')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, work_date),
  check (check_out is null or check_in is null or check_out >= check_in)
);

-- ---------- Leave requests (child of profiles and leave_types) ----------
create table public.leave_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  leave_type_id  uuid not null references public.leave_types (id) on delete restrict,
  start_date     date not null,
  end_date       date not null,
  days           integer generated always as (end_date - start_date + 1) stored,
  reason         text not null check (char_length(reason) between 10 and 500),
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  review_note    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ---------- Attendance correction requests (child of profiles, optional link to a record) ----------
create table public.correction_requests (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (id) on delete cascade,
  attendance_record_id  uuid references public.attendance_records (id) on delete set null,
  work_date             date not null,
  requested_check_in    time,
  requested_check_out   time,
  reason                text not null check (char_length(reason) between 10 and 300),
  status                text not null default 'pending'
                        check (status in ('pending', 'approved', 'rejected')),
  reviewed_by           uuid references public.profiles (id) on delete set null,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
create trigger set_leave_types_updated_at before update on public.leave_types
  for each row execute function public.set_updated_at();
create trigger set_holidays_updated_at before update on public.holidays
  for each row execute function public.set_updated_at();
create trigger set_attendance_records_updated_at before update on public.attendance_records
  for each row execute function public.set_updated_at();
create trigger set_leave_requests_updated_at before update on public.leave_requests
  for each row execute function public.set_updated_at();
create trigger set_correction_requests_updated_at before update on public.correction_requests
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.leave_types         enable row level security;
alter table public.holidays            enable row level security;
alter table public.attendance_records  enable row level security;
alter table public.leave_requests      enable row level security;
alter table public.correction_requests enable row level security;

-- leave_types / holidays: read for all signed-in users, write for admins
create policy "leave_types_select_authenticated" on public.leave_types
  for select to authenticated using (true);
create policy "leave_types_insert_admin" on public.leave_types
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "leave_types_update_admin" on public.leave_types
  for update to authenticated using (public.is_admin(auth.uid()));
create policy "leave_types_delete_admin" on public.leave_types
  for delete to authenticated using (public.is_admin(auth.uid()));

create policy "holidays_select_authenticated" on public.holidays
  for select to authenticated using (true);
create policy "holidays_insert_admin" on public.holidays
  for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "holidays_update_admin" on public.holidays
  for update to authenticated using (public.is_admin(auth.uid()));
create policy "holidays_delete_admin" on public.holidays
  for delete to authenticated using (public.is_admin(auth.uid()));

-- attendance_records: employees manage their own rows; staff can read every row
-- (team views / reports) and correct them; only admins may delete someone else's row.
create policy "attendance_select_own_or_staff" on public.attendance_records
  for select to authenticated
  using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "attendance_insert_own" on public.attendance_records
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy "attendance_update_own_or_staff" on public.attendance_records
  for update to authenticated
  using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "attendance_delete_own_or_admin" on public.attendance_records
  for delete to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- leave_requests: employees create/read/edit/cancel their own; staff read and review all
create policy "leave_requests_select_own_or_staff" on public.leave_requests
  for select to authenticated
  using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "leave_requests_insert_own" on public.leave_requests
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy "leave_requests_update_own_or_staff" on public.leave_requests
  for update to authenticated
  using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "leave_requests_delete_own_pending_or_admin" on public.leave_requests
  for delete to authenticated
  using ((auth.uid() = user_id and status = 'pending') or public.is_admin(auth.uid()));

-- correction_requests: same shape as leave_requests
create policy "corrections_select_own_or_staff" on public.correction_requests
  for select to authenticated
  using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "corrections_insert_own" on public.correction_requests
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy "corrections_update_own_or_staff" on public.correction_requests
  for update to authenticated
  using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "corrections_delete_own_pending_or_admin" on public.correction_requests
  for delete to authenticated
  using ((auth.uid() = user_id and status = 'pending') or public.is_admin(auth.uid()));

-- ---------- Indexes for the queries the app runs ----------
create index attendance_records_user_date_idx on public.attendance_records (user_id, work_date desc);
create index attendance_records_work_date_idx on public.attendance_records (work_date);
create index leave_requests_user_idx on public.leave_requests (user_id, created_at desc);
create index leave_requests_status_idx on public.leave_requests (status);
create index correction_requests_user_idx on public.correction_requests (user_id, created_at desc);
create index correction_requests_status_idx on public.correction_requests (status);
create index holidays_date_idx on public.holidays (holiday_date);

-- ===== 20261009000300_notifications_and_audit.sql =====
-- =====================================================================
-- DHA Attendance · Migration 3: notifications and audit log
-- =====================================================================

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target      text not null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create trigger set_notifications_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.notifications enable row level security;
alter table public.audit_logs    enable row level security;

-- notifications: strictly per user
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "notifications_insert_own_or_staff" on public.notifications
  for insert to authenticated with check (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

-- audit_logs: anyone can record their own action; admins read everything, users read their own
create policy "audit_logs_select_own_or_admin" on public.audit_logs
  for select to authenticated using (actor_id = auth.uid() or public.is_admin(auth.uid()));
create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated with check (actor_id = auth.uid());

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------- Related-table automation ----------
-- When a leave request or correction is reviewed, notify the employee and write an audit row.
create or replace function public.notify_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _label text;
  _row   jsonb := to_jsonb(new);
  _date  date  := coalesce(_row ->> 'start_date', _row ->> 'work_date')::date;
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    _label := case when tg_table_name = 'leave_requests' then 'Leave request' else 'Attendance correction' end;

    insert into public.notifications (user_id, title, body)
    values (
      new.user_id,
      _label || ' ' || new.status,
      'Your ' || lower(_label) || ' for ' || to_char(_date, 'DD Mon YYYY') || ' was ' || new.status || '.'
    );

    insert into public.audit_logs (actor_id, action, target, details)
    values (
      coalesce(new.reviewed_by, auth.uid()),
      _label || ' ' || new.status,
      tg_table_name || ':' || new.id,
      jsonb_build_object('employee', new.user_id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger leave_requests_notify_on_review
  after update on public.leave_requests
  for each row execute function public.notify_on_review();

create trigger correction_requests_notify_on_review
  after update on public.correction_requests
  for each row execute function public.notify_on_review();

-- Approving a correction writes the requested times back into the attendance record.
create or replace function public.apply_correction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.attendance_records (user_id, work_date, check_in, check_out, status, note)
    values (
      new.user_id,
      new.work_date,
      case when new.requested_check_in  is null then null else (new.work_date + new.requested_check_in)  at time zone 'Asia/Karachi' end,
      case when new.requested_check_out is null then null else (new.work_date + new.requested_check_out) at time zone 'Asia/Karachi' end,
      'present',
      'Corrected via request ' || new.id
    )
    on conflict (user_id, work_date) do update
      set check_in  = coalesce(excluded.check_in,  public.attendance_records.check_in),
          check_out = coalesce(excluded.check_out, public.attendance_records.check_out),
          status    = 'present',
          note      = excluded.note;
  end if;
  return new;
end;
$$;

create trigger correction_requests_apply
  after update on public.correction_requests
  for each row execute function public.apply_correction();

-- ===== 20261009000400_seed_reference_data.sql =====
-- =====================================================================
-- DHA Attendance · Migration 4: reference data
-- Only configuration rows are seeded. Attendance, leave and profile rows
-- are created through the app so the data flow can be proven live.
-- =====================================================================

insert into public.departments (name, head_name) values
  ('Operations', 'Sara Ali'),
  ('Human Resources', 'Ayesha Malik'),
  ('Finance', 'Farhan Sheikh')
on conflict (name) do nothing;

insert into public.shifts (name, start_time, end_time, grace_minutes, working_days) values
  ('General', '09:00', '17:30', 15, 'Mon-Sat'),
  ('Early',   '08:00', '16:30', 10, 'Mon-Sat')
on conflict (name) do nothing;

insert into public.leave_types (name, annual_quota, is_paid) values
  ('Annual Leave', 20, true),
  ('Sick Leave',   10, true),
  ('Casual Leave',  5, true)
on conflict (name) do nothing;

insert into public.holidays (name, holiday_date) values
  ('Iqbal Day',        '2026-11-09'),
  ('Quaid-e-Azam Day', '2026-12-25'),
  ('Kashmir Day',      '2027-02-05')
on conflict (name, holiday_date) do nothing;
