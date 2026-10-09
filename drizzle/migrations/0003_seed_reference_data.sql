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