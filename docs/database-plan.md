# DHA Attendance · Database plan (Assignment 2, Step 5)

Every table uses a UUID primary key, `created_at` / `updated_at` timestamps (kept fresh by the
`set_updated_at` trigger) and Row Level Security. Tables dropped from the Assignment 1 plan:
none. Tables added that the mock app only implied: `user_roles`, `correction_requests`,
`notifications`, `audit_logs`.

## Tables and purpose

| Table                 | Purpose (one line)                                                       |
| --------------------- | ------------------------------------------------------------------------ |
| `profiles`            | One row per signed-up user: name, email, employee code, department, shift |
| `user_roles`          | The role of each user (employee, manager, hr_admin, system_admin)         |
| `departments`         | Company departments used for grouping, team views and reports             |
| `shifts`              | Work shifts with start/end time and grace period for late detection       |
| `leave_types`         | Leave categories and their annual quota                                   |
| `holidays`            | Public holidays shown to all employees                                    |
| `attendance_records`  | One row per employee per day: check-in, check-out, status                 |
| `leave_requests`      | Leave applications with review status                                     |
| `correction_requests` | Requests to fix a missed check-in/out, applied on approval                |
| `notifications`       | Per-user messages created when requests are reviewed                      |
| `audit_logs`          | Who did what, written by the app and by triggers                          |

## Columns

### profiles
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | = `auth.users.id`, on delete cascade |
| full_name | text | required, 2–80 chars |
| email | text | required, copied from auth |
| employee_code | text | required, unique, generated `DHA-1042…` by trigger |
| department_id | uuid FK → departments.id | nullable, on delete set null |
| shift_id | uuid FK → shifts.id | nullable, on delete set null |
| designation, phone | text | optional |
| join_date | date | default today |
| is_active | boolean | default true |
| created_at, updated_at | timestamptz | default now() |

### user_roles
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK → auth.users.id | unique, cascade |
| role | app_role enum | default `employee`; first account becomes `system_admin` |
| created_at, updated_at | timestamptz | |

### departments
`id` uuid PK · `name` text unique required · `head_name` text · timestamps

### shifts
`id` uuid PK · `name` text unique required · `start_time` time required · `end_time` time required ·
`grace_minutes` int default 15 (0–120) · `working_days` text default `Mon-Sat` · timestamps

### leave_types
`id` uuid PK · `name` text unique required · `annual_quota` int default 0 (0–365) ·
`is_paid` boolean default true · timestamps

### holidays
`id` uuid PK · `name` text required · `holiday_date` date required · unique (name, date) · timestamps

### attendance_records
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK → profiles.id | required, cascade |
| work_date | date | default today; unique with user_id |
| check_in, check_out | timestamptz | nullable; check_out ≥ check_in |
| status | text | present · late · absent · on_leave · holiday · half_day |
| note | text | optional |
| created_at, updated_at | timestamptz | |

### leave_requests
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK → profiles.id | required, cascade |
| leave_type_id | uuid FK → leave_types.id | required, on delete restrict |
| start_date, end_date | date | required, end ≥ start |
| days | int | generated: end − start + 1 |
| reason | text | required, 10–500 chars |
| status | text | pending (default) · approved · rejected · cancelled |
| reviewed_by | uuid FK → profiles.id | nullable, set null |
| reviewed_at | timestamptz | nullable |
| review_note | text | optional |
| created_at, updated_at | timestamptz | |

### correction_requests
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK → profiles.id | required, cascade |
| attendance_record_id | uuid FK → attendance_records.id | nullable, set null |
| work_date | date | required |
| requested_check_in, requested_check_out | time | nullable |
| reason | text | required, 10–300 chars |
| status | text | pending (default) · approved · rejected |
| reviewed_by, reviewed_at | uuid FK → profiles.id, timestamptz | nullable |
| created_at, updated_at | timestamptz | |

### notifications
`id` uuid PK · `user_id` uuid FK → profiles.id (cascade) · `title` text · `body` text ·
`is_read` boolean default false · timestamps

### audit_logs
`id` uuid PK · `actor_id` uuid FK → profiles.id (set null) · `action` text · `target` text ·
`details` jsonb default `{}` · `created_at`

## Relationships

- `auth.users` 1 — 1 `profiles` (same id) and 1 — 1 `user_roles`
- `departments` 1 — many `profiles`
- `shifts` 1 — many `profiles`
- `profiles` 1 — many `attendance_records`, `leave_requests`, `correction_requests`, `notifications`, `audit_logs` (as actor)
- `leave_types` 1 — many `leave_requests`
- `attendance_records` 1 — many `correction_requests` (optional link)
- `profiles` (reviewer) 1 — many `leave_requests.reviewed_by` / `correction_requests.reviewed_by`

No many-to-many tables are needed: an employee belongs to exactly one department and one shift.

## Row Level Security summary

| Table | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| profiles | own, or staff | trigger only | own, or admin | — (cascade from auth) |
| user_roles | own, or staff | system_admin | system_admin | system_admin |
| departments, shifts, leave_types, holidays | any signed-in user | admin | admin | admin |
| attendance_records | own, or staff | own | own, or staff | own, or admin |
| leave_requests | own, or staff | own | own, or staff | own while pending, or admin |
| correction_requests | own, or staff | own | own, or staff | own while pending, or admin |
| notifications | own | own, or staff | own | own |
| audit_logs | own, or admin | own (actor = self) | — | — |

Helper functions (`security definer`, used inside policies): `has_role(uid, role)`,
`is_staff(uid)` = manager/hr_admin/system_admin, `is_admin(uid)` = hr_admin/system_admin.

## Automation (triggers)

- `on_auth_user_created` → creates the profile (with employee code) and the role row.
- `protect_profile_columns` → non-admins cannot change employee code, email, status or join date.
- `notify_on_review` → approving/rejecting a leave or correction inserts a notification and an audit row.
- `apply_correction` → approving a correction writes the requested times into `attendance_records`.
