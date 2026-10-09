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
