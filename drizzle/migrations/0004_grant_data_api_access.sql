-- =====================================================================
-- DHA Attendance · Data API access
-- Supabase does not grant default privileges on public, so every table
-- the app reads or writes needs explicit GRANTs. All policies are scoped
-- to signed-in users, so no anon grants are given.
-- =====================================================================

grant select, insert, update, delete on public.departments          to authenticated;
grant select, insert, update, delete on public.shifts               to authenticated;
grant select, insert, update, delete on public.profiles             to authenticated;
grant select, insert, update, delete on public.user_roles           to authenticated;
grant select, insert, update, delete on public.leave_types          to authenticated;
grant select, insert, update, delete on public.holidays             to authenticated;
grant select, insert, update, delete on public.attendance_records   to authenticated;
grant select, insert, update, delete on public.leave_requests       to authenticated;
grant select, insert, update, delete on public.correction_requests  to authenticated;
grant select, insert, update, delete on public.notifications        to authenticated;
grant select, insert, update, delete on public.audit_logs           to authenticated;

grant all on public.departments          to service_role;
grant all on public.shifts               to service_role;
grant all on public.profiles             to service_role;
grant all on public.user_roles           to service_role;
grant all on public.leave_types          to service_role;
grant all on public.holidays             to service_role;
grant all on public.attendance_records   to service_role;
grant all on public.leave_requests       to service_role;
grant all on public.correction_requests  to service_role;
grant all on public.notifications        to service_role;
grant all on public.audit_logs           to service_role;

grant usage, select on sequence public.employee_code_seq to service_role;