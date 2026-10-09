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
