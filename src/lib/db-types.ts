// App-owned row types.
//
// src/integrations/supabase/types.ts is regenerated whenever the database
// schema changes, so it only ever carries the generic `Database` shape.
// This file is the project's own, stable naming layer on top of it: screens
// import `ProfileRow`, `AppRole`, … from here and never from the generated
// module, so a schema regeneration can never break an import again.

import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type { Json } from "@/integrations/supabase/types";

export type AppRole = Enums["app_role"];

export type ProfileRow = Tables["profiles"]["Row"];
export type UserRoleRow = Tables["user_roles"]["Row"];
export type DepartmentRow = Tables["departments"]["Row"];
export type ShiftRow = Tables["shifts"]["Row"];
export type LeaveTypeRow = Tables["leave_types"]["Row"];
export type HolidayRow = Tables["holidays"]["Row"];
export type AttendanceRow = Tables["attendance_records"]["Row"];
export type AttendanceStatus = AttendanceRow["status"];
export type LeaveRequestRow = Tables["leave_requests"]["Row"];
export type CorrectionRow = Tables["correction_requests"]["Row"];
export type NotificationRow = Tables["notifications"]["Row"];
export type AuditLogRow = Tables["audit_logs"]["Row"];
