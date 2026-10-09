import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Loader2, Palmtree, Search, Timer, X, XCircle } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate, formatRange, formatTime, getErrorMessage, todayISO } from "@/lib/format";
import { unwrap, useDepartments, useLeaveTypes, useProfiles } from "@/lib/queries";

export function TeamAttendancePage() {
  const [query, setQuery] = useState("");
  const profiles = useProfiles();
  const departments = useDepartments();
  const today = useQuery({
    queryKey: ["attendance", "all-today"],
    queryFn: async () =>
      unwrap(await supabase.from("attendance_records").select("*").eq("work_date", todayISO())),
  });
  const approvedLeave = useQuery({
    queryKey: ["leave_requests", "on-leave-today"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("leave_requests")
          .select("user_id")
          .eq("status", "approved")
          .lte("start_date", todayISO())
          .gte("end_date", todayISO()),
      ),
  });

  const members = (profiles.data ?? []).filter((p) => p.is_active);
  const rows = members.map((p) => {
    const record = today.data?.find((r) => r.user_id === p.id);
    const onLeave = approvedLeave.data?.some((l) => l.user_id === p.id);
    const status = record?.status ?? (onLeave ? "on_leave" : "absent");
    return {
      ...p,
      record,
      status,
      department: departments.data?.find((d) => d.id === p.department_id)?.name ?? "Unassigned",
    };
  });
  const filtered = rows.filter((m) =>
    `${m.full_name} ${m.employee_code} ${m.department}`.toLowerCase().includes(query.toLowerCase()),
  );
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const isLoading = profiles.isLoading || today.isLoading;
  const error = profiles.error ?? today.error;

  return (
    <AppShell title="Team Attendance" eyebrow="Live register">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Present"
          value={isLoading ? "…" : count("present")}
          detail={
            rows.length
              ? `${Math.round((count("present") / rows.length) * 100)}% of team`
              : "No team yet"
          }
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Late"
          value={isLoading ? "…" : count("late")}
          detail="Arrived after grace period"
          icon={Timer}
          tone="warning"
        />
        <StatCard
          label="On leave"
          value={isLoading ? "…" : count("on_leave")}
          detail="Approved leave today"
          icon={Palmtree}
        />
        <StatCard
          label="Not checked in"
          value={isLoading ? "…" : count("absent")}
          detail="Needs follow-up"
          icon={XCircle}
          tone="danger"
        />
      </div>
      <div className="mt-5">
        <Section
          title="Today's register"
          subtitle={formatDate(todayISO(), "EEEE, dd MMMM yyyy")}
          action={
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search team"
                className="w-56 pl-9"
              />
            </div>
          }
        >
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState
              message={getErrorMessage(error)}
              onRetry={() => {
                profiles.refetch();
                today.refetch();
              }}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={rows.length ? "No team members found" : "No active employees"}
              text={
                rows.length
                  ? "Try a different name, code or department."
                  : "Employees appear here after they sign up."
              }
            />
          ) : (
            <DataTable
              headers={["Employee", "Department", "Check in", "Check out", "Status"]}
              rows={filtered.map((m) => [
                <div key="n">
                  <p className="font-bold">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground">{m.employee_code}</p>
                </div>,
                m.department,
                formatTime(m.record?.check_in ?? null),
                formatTime(m.record?.check_out ?? null),
                <StatusBadge key="s" status={m.status} />,
              ])}
            />
          )}
        </Section>
      </div>
    </AppShell>
  );
}

export function ApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profiles = useProfiles();
  const leaveTypes = useLeaveTypes();
  const leave = useQuery({
    queryKey: ["leave_requests", "pending"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("leave_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at"),
      ),
  });
  const corrections = useQuery({
    queryKey: ["correction_requests", "pending"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("correction_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at"),
      ),
  });
  const nameOf = (id: string) => profiles.data?.find((p) => p.id === id)?.full_name ?? "Employee";
  const codeOf = (id: string) => profiles.data?.find((p) => p.id === id)?.employee_code ?? "";
  const typeOf = (id: string) => leaveTypes.data?.find((t) => t.id === id)?.name ?? "Leave";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
    queryClient.invalidateQueries({ queryKey: ["correction_requests"] });
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
    queryClient.invalidateQueries({ queryKey: ["pending-count"] });
    queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
  };

  const decideLeave = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      unwrap(
        await supabase
          .from("leave_requests")
          .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
          .eq("id", id)
          .select("*")
          .single(),
      ),
    onSuccess: (row) => {
      invalidate();
      toast.success(`Leave request ${row.status}`, {
        description: "The employee has been notified.",
      });
    },
    onError: (e) => toast.error("Couldn't update request", { description: getErrorMessage(e) }),
  });

  const decideCorrection = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      unwrap(
        await supabase
          .from("correction_requests")
          .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
          .eq("id", id)
          .select("*")
          .single(),
      ),
    onSuccess: (row) => {
      invalidate();
      toast.success(`Correction ${row.status}`, {
        description:
          row.status === "approved"
            ? "The attendance record was updated."
            : "The employee has been notified.",
      });
    },
    onError: (e) => toast.error("Couldn't update correction", { description: getErrorMessage(e) }),
  });

  const busy = decideLeave.isPending || decideCorrection.isPending;

  return (
    <AppShell title="Approvals" eyebrow="Manager workspace">
      <Tabs defaultValue="leave">
        <TabsList>
          <TabsTrigger value="leave">Leave requests ({leave.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="corrections">
            Corrections ({corrections.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="leave" className="mt-4">
          <Section
            title="Pending leave requests"
            subtitle="Approving notifies the employee and writes an audit entry"
          >
            {leave.isLoading ? (
              <LoadingState />
            ) : leave.error ? (
              <ErrorState message={getErrorMessage(leave.error)} onRetry={() => leave.refetch()} />
            ) : !leave.data?.length ? (
              <EmptyState
                title="All caught up"
                text="There are no leave requests waiting for review."
              />
            ) : (
              <div className="divide-y">
                {leave.data.map((r) => (
                  <div
                    key={r.id}
                    className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-extrabold">{nameOf(r.user_id)}</p>
                        <span className="text-xs text-muted-foreground">{codeOf(r.user_id)}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {typeOf(r.leave_type_id)} · {formatRange(r.start_date, r.end_date)} ·{" "}
                        {r.days} day{r.days === 1 ? "" : "s"}
                      </p>
                      <p className="mt-3 text-sm">“{r.reason}”</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => decideLeave.mutate({ id: r.id, status: "rejected" })}
                      >
                        <X /> Reject
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => decideLeave.mutate({ id: r.id, status: "approved" })}
                      >
                        {busy ? <Loader2 className="animate-spin" /> : <Check />} Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>
        <TabsContent value="corrections" className="mt-4">
          <Section
            title="Attendance corrections"
            subtitle="Approved times are written to the attendance record automatically"
          >
            {corrections.isLoading ? (
              <LoadingState />
            ) : corrections.error ? (
              <ErrorState
                message={getErrorMessage(corrections.error)}
                onRetry={() => corrections.refetch()}
              />
            ) : !corrections.data?.length ? (
              <EmptyState
                title="No corrections pending"
                text="Employees can request corrections from My Attendance."
              />
            ) : (
              <DataTable
                headers={["Employee", "Date", "Requested time", "Reason", "Action"]}
                rows={corrections.data.map((c) => [
                  <div key="n">
                    <p className="font-bold">{nameOf(c.user_id)}</p>
                    <p className="text-xs text-muted-foreground">{codeOf(c.user_id)}</p>
                  </div>,
                  formatDate(c.work_date),
                  `${c.requested_check_in?.slice(0, 5) ?? "—"} – ${c.requested_check_out?.slice(0, 5) ?? "—"}`,
                  <span key="r" className="line-clamp-2 max-w-xs">
                    {c.reason}
                  </span>,
                  <div key="a" className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => decideCorrection.mutate({ id: c.id, status: "rejected" })}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => decideCorrection.mutate({ id: c.id, status: "approved" })}
                    >
                      Approve
                    </Button>
                  </div>,
                ])}
              />
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
