// Database types for the DHA Attendance schema (see supabase/migrations).
// Hand-maintained to mirror the migrations; regenerate with `supabase gen types` if the schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "employee" | "manager" | "hr_admin" | "system_admin";
export type AttendanceStatus = "present" | "late" | "absent" | "on_leave" | "holiday" | "half_day";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type CorrectionStatus = "pending" | "approved" | "rejected";

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = Timestamps & {
  id: string;
  full_name: string;
  email: string;
  employee_code: string;
  department_id: string | null;
  shift_id: string | null;
  designation: string | null;
  phone: string | null;
  join_date: string;
  is_active: boolean;
};

export type UserRoleRow = Timestamps & { id: string; user_id: string; role: AppRole };

export type DepartmentRow = Timestamps & { id: string; name: string; head_name: string | null };

export type ShiftRow = Timestamps & {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  working_days: string;
};

export type LeaveTypeRow = Timestamps & {
  id: string;
  name: string;
  annual_quota: number;
  is_paid: boolean;
};

export type HolidayRow = Timestamps & { id: string; name: string; holiday_date: string };

export type AttendanceRow = Timestamps & {
  id: string;
  user_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  note: string | null;
};

export type LeaveRequestRow = Timestamps & {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
};

export type CorrectionRequestRow = Timestamps & {
  id: string;
  user_id: string;
  attendance_record_id: string | null;
  work_date: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  status: CorrectionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

export type NotificationRow = Timestamps & {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
};

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target: string;
  details: Json;
  created_at: string;
};

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id" | "full_name" | "email" | "employee_code">;
      user_roles: Table<UserRoleRow, "user_id">;
      departments: Table<DepartmentRow, "name">;
      shifts: Table<ShiftRow, "name" | "start_time" | "end_time">;
      leave_types: Table<LeaveTypeRow, "name">;
      holidays: Table<HolidayRow, "name" | "holiday_date">;
      attendance_records: Table<AttendanceRow, "user_id">;
      leave_requests: {
        Row: LeaveRequestRow;
        // `days` is a generated column: never written by the client.
        Insert: Partial<Omit<LeaveRequestRow, "days">> &
          Pick<LeaveRequestRow, "user_id" | "leave_type_id" | "start_date" | "end_date" | "reason">;
        Update: Partial<Omit<LeaveRequestRow, "days">>;
        Relationships: [];
      };
      correction_requests: Table<CorrectionRequestRow, "user_id" | "work_date" | "reason">;
      notifications: Table<NotificationRow, "user_id" | "title" | "body">;
      audit_logs: Table<AuditLogRow, "action" | "target">;
    };
    Views: Record<string, never>;
    Functions: {
      has_role: { Args: { _user_id: string; _role: AppRole }; Returns: boolean };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: { app_role: AppRole };
    CompositeTypes: Record<string, never>;
  };
};
