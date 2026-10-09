import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json, ProfileRow, UserRoleRow } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

/** Throws Supabase errors so react-query surfaces them in the error state. */
export function unwrap<T>(result: PostgrestSingleResponse<T>): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => unwrap(await supabase.from("departments").select("*").order("name")),
  });
}

export function useShifts() {
  return useQuery({
    queryKey: ["shifts"],
    queryFn: async () => unwrap(await supabase.from("shifts").select("*").order("start_time")),
  });
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave_types"],
    queryFn: async () => unwrap(await supabase.from("leave_types").select("*").order("name")),
  });
}

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async () => unwrap(await supabase.from("holidays").select("*").order("holiday_date")),
  });
}

export type ProfileWithRole = ProfileRow & { role: UserRoleRow["role"] };

/** Directory of profiles (RLS: staff see everyone, employees only themselves). */
export function useProfiles(enabled = true) {
  return useQuery({
    queryKey: ["profiles"],
    enabled,
    queryFn: async (): Promise<ProfileWithRole[]> => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("*"),
      ]);
      const rows = unwrap(profiles);
      const roleRows = unwrap(roles);
      const roleByUser = new Map(roleRows.map((r) => [r.user_id, r.role]));
      return rows.map((p) => ({ ...p, role: roleByUser.get(p.id) ?? "employee" }));
    },
  });
}

/** Append a row to the audit log for the signed-in actor. Failures are logged, never thrown. */
export function useAudit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return async (action: string, target: string, details: Record<string, Json | undefined> = {}) => {
    if (!user) return;
    const { error } = await supabase
      .from("audit_logs")
      .insert({ actor_id: user.id, action, target, details: details as Json });
    if (error) console.warn("audit log failed", error.message);
    queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
  };
}
