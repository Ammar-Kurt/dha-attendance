import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileClock,
  Loader2,
  LogOut,
  Palmtree,
  Timer,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  Section,
  StatCard,
  StatusBadge,
} from "@/components/data-states";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AttendanceRow, ShiftRow } from "@/lib/db-types";
import { useAuth } from "@/lib/auth";
import {
  formatClock,
  formatDate,
  formatDay,
  formatRange,
  formatTime,
  getErrorMessage,
  todayISO,
  workedHours,
} from "@/lib/format";
import { unwrap, useDepartments, useLeaveTypes, useProfiles, useShifts } from "@/lib/queries";

export function useTodayRecord() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["attendance", "today", user?.id],
    enabled: !!user,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("attendance_records")
          .select("*")
          .eq("user_id", user!.id)
          .eq("work_date", todayISO())
          .maybeSingle(),
      ) as AttendanceRow | null,
  });
}

export function useMyShift() {
  const { profile } = useAuth();
  const shifts = useShifts();
  const shift = shifts.data?.find((s) => s.id === profile?.shift_id) ?? shifts.data?.[0] ?? null;
  return { shift, isLoading: shifts.isLoading };
}

function statusForCheckIn(now: Date, shift: ShiftRow | null) {
  const [h = "9", m = "0"] = (shift?.start_time ?? "09:00").split(":");
  const startMinutes = Number(h) * 60 + Number(m) + (shift?.grace_minutes ?? 15);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > startMinutes ? "late" : "present";
}

export function useCheckInOut() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { shift } = useMyShift();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["attendance"] });

  const checkIn = useMutation({
    mutationFn: async () => {
      const now = new Date();
      return unwrap(
        await supabase
          .from("attendance_records")
          .insert({
            user_id: user!.id,
            work_date: todayISO(),
            check_in: now.toISOString(),
            status: statusForCheckIn(now, shift),
          })
          .select("*")
          .single(),
      );
    },
    onSuccess: (row) => {
      invalidate();
      toast.success(`Checked in at ${formatTime(row.check_in)}`, {
        description: `Status: ${row.status === "late" ? "Late" : "Present"} · ${shift?.name ?? "General"} shift`,
      });
    },
    onError: (e) => toast.error("Check-in failed", { description: getErrorMessage(e) }),
  });

  const checkOut = useMutation({
    mutationFn: async (recordId: string) =>
      unwrap(
        await supabase
          .from("attendance_records")
          .update({ check_out: new Date().toISOString() })
          .eq("id", recordId)
          .select("*")
          .single(),
      ),
    onSuccess: (row) => {
      invalidate();
      toast.success("Checked out for today", {
        description: `Worked ${workedHours(row.check_in, row.check_out)}.`,
      });
    },
    onError: (e) => toast.error("Check-out failed", { description: getErrorMessage(e) }),
  });

  return { checkIn, checkOut };
}

function useLeaveBalance() {
  const { user } = useAuth();
  const leaveTypes = useLeaveTypes();
  const year = new Date().getFullYear();
  const approved = useQuery({
    queryKey: ["leave_requests", "approved-year", user?.id, year],
    enabled: !!user,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("leave_requests")
          .select("leave_type_id, days")
          .eq("user_id", user!.id)
          .eq("status", "approved")
          .gte("start_date", `${year}-01-01`)
          .lte("start_date", `${year}-12-31`),
      ),
  });
  const balances = (leaveTypes.data ?? []).map((t) => {
    const used = (approved.data ?? [])
      .filter((r) => r.leave_type_id === t.id)
      .reduce((sum, r) => sum + (r.days ?? 0), 0);
    return { ...t, used, remaining: Math.max(0, t.annual_quota - used) };
  });
  return { balances, isLoading: leaveTypes.isLoading || approved.isLoading };
}

function EmployeeDashboard() {
  const { profile, user } = useAuth();
  const today = useTodayRecord();
  const { shift } = useMyShift();
  const { checkIn, checkOut } = useCheckInOut();
  const { balances, isLoading: balancesLoading } = useLeaveBalance();
  const recent = useQuery({
    queryKey: ["attendance", "recent", user?.id],
    enabled: !!user,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("attendance_records")
          .select("*")
          .eq("user_id", user!.id)
          .order("work_date", { ascending: false })
          .limit(5),
      ),
  });

  const record = today.data ?? null;
  const checkedIn = !!record?.check_in;
  const checkedOut = !!record?.check_out;
  const busy = checkIn.isPending || checkOut.isPending;
  const firstName = profile?.full_name.split(" ")[0] ?? "there";

  return (
    <AppShell title={`Good day, ${firstName}`} eyebrow="Employee dashboard">
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-lg bg-sidebar p-6 text-sidebar-foreground shadow-sm">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-bold text-sidebar-primary">
                TODAY · {(shift?.name ?? "GENERAL").toUpperCase()} SHIFT
              </p>
              <p className="mt-2 text-3xl font-extrabold">
                {today.isLoading
                  ? "Loading…"
                  : checkedOut
                    ? "Workday complete"
                    : checkedIn
                      ? "You're checked in"
                      : "Ready to start?"}
              </p>
              <p className="mt-2 text-sidebar-foreground/60">
                {shift
                  ? `${formatClock(shift.start_time)} – ${formatClock(shift.end_time)} · ${shift.grace_minutes} min grace`
                  : "No shift assigned yet"}
              </p>
            </div>
            <div className="rounded-md bg-sidebar-accent p-4 text-center">
              <p className="text-xs text-sidebar-foreground/60">Current status</p>
              <p className="mt-1 font-extrabold text-sidebar-primary">
                {checkedOut
                  ? "COMPLETED"
                  : checkedIn
                    ? record?.status === "late"
                      ? "LATE"
                      : "PRESENT"
                    : "NOT CHECKED IN"}
              </p>
              {record?.check_in && (
                <p className="mt-1 text-xs text-sidebar-foreground/60">
                  In {formatTime(record.check_in)}
                  {record.check_out ? ` · Out ${formatTime(record.check_out)}` : ""}
                </p>
              )}
            </div>
          </div>
          {today.error && (
            <p className="mt-4 flex items-center gap-2 text-sm text-destructive-foreground">
              <AlertCircle className="size-4" /> {getErrorMessage(today.error)}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            {!checkedIn ? (
              <Button
                onClick={() => checkIn.mutate()}
                disabled={busy || today.isLoading}
                className="min-w-40 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
              >
                {busy ? <Loader2 className="animate-spin" /> : <Clock3 />} Check in now
              </Button>
            ) : (
              <Button
                onClick={() => record && checkOut.mutate(record.id)}
                disabled={busy || checkedOut}
                className="min-w-40 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
              >
                {busy ? <Loader2 className="animate-spin" /> : <LogOut />}{" "}
                {checkedOut ? "Checked out" : "Check out"}
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="border-sidebar-border bg-sidebar/20 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Link to="/attendance">View attendance</Link>
            </Button>
          </div>
        </section>
        <Section title="Leave balance" subtitle={`${new Date().getFullYear()} allocation`}>
          {balancesLoading ? (
            <LoadingState rows={1} />
          ) : balances.length === 0 ? (
            <EmptyState title="No leave types yet" text="HR has not configured leave types." />
          ) : (
            <div className="grid grid-cols-3 divide-x p-5 text-center">
              {balances.map((b) => (
                <div key={b.id}>
                  <p className="text-2xl font-extrabold">{b.remaining}</p>
                  <p className="text-xs text-muted-foreground">{b.name.replace(" Leave", "")}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.used} of {b.annual_quota} used
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
      <div className="mt-5">
        <Section
          title="Recent attendance"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/attendance">View all</Link>
            </Button>
          }
        >
          {recent.isLoading ? (
            <LoadingState />
          ) : recent.error ? (
            <ErrorState message={getErrorMessage(recent.error)} onRetry={() => recent.refetch()} />
          ) : !recent.data?.length ? (
            <EmptyState
              title="No attendance yet"
              text="Check in today to create your first record."
            />
          ) : (
            <DataTable
              headers={["Date", "Check in", "Check out", "Hours", "Status"]}
              rows={recent.data.map((a) => [
                <div key="d">
                  <p className="font-bold">{formatDate(a.work_date)}</p>
                  <p className="text-xs text-muted-foreground">{formatDay(a.work_date)}</p>
                </div>,
                formatTime(a.check_in),
                formatTime(a.check_out),
                workedHours(a.check_in, a.check_out),
                <StatusBadge key="s" status={a.status} />,
              ])}
            />
          )}
        </Section>
      </div>
    </AppShell>
  );
}

function StaffDashboard() {
  const { role } = useAuth();
  const profiles = useProfiles();
  const departments = useDepartments();
  const todayRecords = useQuery({
    queryKey: ["attendance", "all-today"],
    queryFn: async () =>
      unwrap(await supabase.from("attendance_records").select("*").eq("work_date", todayISO())),
  });
  const pending = useQuery({
    queryKey: ["leave_requests", "pending-preview"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("leave_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(4),
      ),
  });
  const pendingCorrections = useQuery({
    queryKey: ["correction_requests", "pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("correction_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });
  const leaveTypes = useLeaveTypes();

  const active = (profiles.data ?? []).filter((p) => p.is_active);
  const records = todayRecords.data ?? [];
  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const isLoading = profiles.isLoading || todayRecords.isLoading;
  const error = profiles.error ?? todayRecords.error;
  const nameOf = (id: string) => profiles.data?.find((p) => p.id === id)?.full_name ?? "Employee";
  const typeOf = (id: string) => leaveTypes.data?.find((t) => t.id === id)?.name ?? "Leave";
  const isManager = role === "manager";

  return (
    <AppShell
      title={isManager ? "Team Dashboard" : "HR Overview"}
      eyebrow={isManager ? "Manager workspace" : "Company dashboard"}
    >
      {error ? (
        <ErrorState
          message={getErrorMessage(error)}
          onRetry={() => {
            profiles.refetch();
            todayRecords.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active employees"
              value={isLoading ? "…" : active.length}
              detail={`${(profiles.data?.length ?? 0) - active.length} inactive`}
              icon={Users}
            />
            <StatCard
              label="Present today"
              value={isLoading ? "…" : present + late}
              detail={
                active.length
                  ? `${Math.round(((present + late) / active.length) * 100)}% of workforce`
                  : "No employees yet"
              }
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              label="Late arrivals"
              value={isLoading ? "…" : late}
              detail="After shift start + grace"
              icon={Timer}
              tone="warning"
            />
            <StatCard
              label="Pending actions"
              value={
                pending.isLoading
                  ? "…"
                  : (pending.data?.length ?? 0) + (pendingCorrections.data ?? 0)
              }
              detail={`${pending.data?.length ?? 0} leave · ${pendingCorrections.data ?? 0} corrections`}
              icon={FileClock}
              tone="danger"
            />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Section title="Attendance by department" subtitle="Today's workforce status">
              {isLoading || departments.isLoading ? (
                <LoadingState rows={3} />
              ) : !departments.data?.length ? (
                <EmptyState
                  title="No departments"
                  text="Add departments under Departments & Shifts."
                />
              ) : (
                <div className="space-y-5 p-5">
                  {departments.data.map((d) => {
                    const members = active.filter((p) => p.department_id === d.id);
                    const here = members.filter((p) =>
                      records.some(
                        (r) =>
                          r.user_id === p.id && (r.status === "present" || r.status === "late"),
                      ),
                    ).length;
                    const rate = members.length ? Math.round((here / members.length) * 100) : 0;
                    return (
                      <div key={d.id}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="font-bold">{d.name}</span>
                          <span className="text-muted-foreground">
                            {here} / {members.length} · {rate}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
            <Section
              title="Needs attention"
              subtitle="Requests awaiting review"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/approvals">View all</Link>
                </Button>
              }
            >
              {pending.isLoading ? (
                <LoadingState rows={2} />
              ) : !pending.data?.length ? (
                <EmptyState
                  title="All caught up"
                  text="No leave requests are waiting for review."
                />
              ) : (
                <div className="divide-y">
                  {pending.data.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-4">
                      <div className="grid size-9 place-items-center rounded-full bg-warning-soft text-warning">
                        <Palmtree className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{nameOf(r.user_id)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {typeOf(r.leave_type_id)} · {formatRange(r.start_date, r.end_date)}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </AppShell>
  );
}

export function DashboardPage() {
  const { isStaff } = useAuth();
  return isStaff ? <StaffDashboard /> : <EmployeeDashboard />;
}
