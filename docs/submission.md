# Assignment 2 submission · DHA Attendance

| Item | Where |
| --- | --- |
| Lovable app | https://lovable.dev/projects/f7ded613-d439-4afe-a282-bc724a6799de |
| GitHub repo | https://github.com/Ammar-Kurt/create-an-app-according-to-the-given-skeleton-requirement-requirement-create-the-main-pages... |
| Supabase project ref | `bkfxjanxthmyezixovsh` |
| Database plan (Step 5) | `docs/database-plan.md` |
| Lovable prompts (Step 6) | `docs/lovable-prompts.md` |
| Migrations | `supabase/migrations/` (also combined in `supabase/apply-all.sql`) |
| Testing note (Step 9) | `docs/testing-note.md`, raw output in `docs/data-flow-test-output.txt` |
| App screenshots | `docs/screenshots/` (desktop 1440px and mobile 390px) |

## Screenshots included

- Landing, Sign up, Sign in: desktop + mobile
- Dashboard as System Admin and as Employee: desktop + mobile
- My Attendance, Leave, Profile, Notifications (employee): desktop, plus attendance/leave mobile
- Team Attendance, Approvals, Employees, Departments & Shifts, Leave & Holidays, Reports, Users & Roles, Audit Log (admin): desktop, plus approvals/employees mobile

## Supabase dashboard screenshots still to capture (from the Supabase UI)

1. **Authentication → Users**: the two test users (Ali Ammar and Hamza Khan).
2. **Table Editor → profiles**: the two matching profile rows (DHA-1046, DHA-1047).
3. **Database → Schema Visualizer** (or Table Editor): all 11 tables with their foreign keys.
4. **Authentication → Policies**: the RLS policies on `profiles`, `attendance_records`, `leave_requests`.
5. **Table Editor → attendance_records**: the rows for Hamza Khan matching `docs/screenshots/attendance-desktop.png` (create/read), and after editing or deleting one in the app, the same table showing the change (update/delete).
6. **Table Editor → notifications / audit_logs**: the rows created by approving the leave request (related tables).

## Checklist

- [x] Lovable project synced to GitHub with meaningful commits
- [x] Supabase project created; only the publishable (anon) key is in the frontend `.env`
- [x] `profiles` table with id = auth user id, full_name, email, created_at, updated_at and RLS
- [x] Landing, sign-up, sign-in, sign-out, protected routes
- [x] Every table from the plan created by migration with UUID keys, FKs, timestamps and RLS
- [x] RLS tested: blocked actions confirmed (see testing note)
- [x] Mock data replaced by live Supabase queries with loading / empty / error / success states
- [x] Create, read, update, delete and related-table tests passed (41/41)
- [x] Desktop and mobile layouts checked
- [ ] Connect the Supabase project inside Lovable (Lovable → Supabase button → select project `bkfxjanxthmyezixovsh`)
- [ ] Capture the Supabase dashboard screenshots listed above
