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