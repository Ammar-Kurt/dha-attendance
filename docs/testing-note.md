# Testing note (Assignment 2, Step 9)

Tested on 9 October 2026 against the live Supabase project `bkfxjanxthmyezixovsh` with two fresh
accounts created through sign-up: an admin (first account, auto-promoted to System Admin) and an
employee. 41 automated checks ran through the same `@supabase/supabase-js` client the app uses
(`tools/dataflow-test.mjs`), then every screen was opened in a real browser on desktop and mobile.

**What was tested and what happened**

1. Sign-up created the `profiles` row (code DHA-1046) and the `user_roles` row by trigger; a wrong password was rejected with "Invalid login credentials" and the right one signed in; sign-out cleared the session and a signed-out client got zero rows.
2. Attendance: a record was created, read back after refresh, updated with a check-out time, and deleted; the row in Supabase matched each step, and a second record for the same date was blocked by the unique (user, date) constraint.
3. Leave: a request was created (generated `days` = 3), edited while pending, approved by the admin, and a pending one was cancelled (deleted); a reason under 10 characters was rejected by the check constraint.
4. Related tables: approving the leave request inserted a `notifications` row for the employee and an `audit_logs` row whose `actor_id` points to the reviewer; approving a correction request wrote the requested times into `attendance_records` for that date.
5. Row Level Security: as the employee, reading or updating another user's profile returned 0 rows, inserting attendance for another user and creating a department failed with "new row violates row-level security policy", changing own role affected 0 rows, and the anonymous visitor saw no profiles or departments.
6. Profile edit: phone, designation, department and shift were saved and `updated_at` moved forward; the employee could not flip `is_active` (trigger raised "Only HR or system administrators…").
7. UI pass: all 16 pages rendered at 1440×900 and 390×844 with no console errors; loading, empty, error and success states, delete confirmations and disabled-while-saving buttons behaved as expected.

Result: 41/41 checks passed. Test credentials are kept out of the repository.
