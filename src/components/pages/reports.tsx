import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, EmptyState, ErrorState, LoadingState, Section } from "@/components/data-states";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage, minutesBetween, monthKey } from "@/lib/format";
import { unwrap, useDepartments, useProfiles } from "@/lib/queries";

function months() {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const m = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    out.push({
      value: monthKey(m),
      label: m.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

export function ReportsPage() {
  const [month, setMonth] = useState(monthKey());
  const [department, setDepartment] = useState("all");
  const [onlyActive, setOnlyActive] = useState(true);
  const profiles = useProfiles();
  const departments = useDepartments();
  const [y = "2026", m = "01"] = month.split("-");
  const start = `${y}-${m}-01`;
  const end = `${y}-${m}-${String(new Date(Number(y), Number(m), 0).getDate()).padStart(2, "0")}`;

  const records = useQuery({
    queryKey: ["attendance", "report", month],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("attendance_records")
          .select("*")
          .gte("work_date", start)
          .lte("work_date", end),
      ),
  });
  const leave = useQuery({
    queryKey: ["leave_requests", "report", month],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("leave_requests")
          .select("user_id, days, start_date")
          .eq("status", "approved")
          .gte("start_date", start)
          .lte("start_date", end),
      ),
  });

  const rows = useMemo(() => {
    const people = (profiles.data ?? []).filter(
      (p) =>
        (department === "all" || p.department_id === department) && (!onlyActive || p.is_active),
    );
    return people.map((p) => {
      const mine = (records.data ?? []).filter((r) => r.user_id === p.id);
      const count = (s: string) => mine.filter((r) => r.status === s).length;
      const minutes = mine.reduce((sum, r) => sum + minutesBetween(r.check_in, r.check_out), 0);
      const leaveDays = (leave.data ?? [])
        .filter((l) => l.user_id === p.id)
        .reduce((s, l) => s + l.days, 0);
      return {
        code: p.employee_code,
        name: p.full_name,
        department: departments.data?.find((d) => d.id === p.department_id)?.name ?? "Unassigned",
        present: count("present"),
        late: count("late"),
        absent: count("absent"),
        halfDay: count("half_day"),
        leave: leaveDays,
        hours: Math.round((minutes / 60) * 10) / 10,
      };
    });
  }, [profiles.data, records.data, leave.data, departments.data, department, onlyActive]);

  const hasData = rows.some((r) => r.present + r.late + r.absent + r.halfDay + r.leave > 0);

  const download = () => {
    const header = "Code,Employee,Department,Present,Late,Absent,Half day,Leave days,Hours";
    const csv = [
      header,
      ...rows.map((r) =>
        [
          r.code,
          `"${r.name}"`,
          `"${r.department}"`,
          r.present,
          r.late,
          r.absent,
          r.halfDay,
          r.leave,
          r.hours,
        ].join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `dha-attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV report downloaded");
  };

  const isLoading = profiles.isLoading || records.isLoading || leave.isLoading;
  const error = profiles.error ?? records.error ?? leave.error;
  const label = months().find((x) => x.value === month)?.label ?? month;

  return (
    <AppShell
      title="Attendance Reports"
      eyebrow="Workforce insights"
      actions={
        <Button variant="outline" onClick={download} disabled={isLoading || rows.length === 0}>
          <Download /> Export CSV
        </Button>
      }
    >
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="r-month">Month</Label>
            <select
              id="r-month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {months().map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="r-dept">Department</Label>
            <select
              id="r-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All departments</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="r-status">Employees</Label>
            <select
              id="r-status"
              value={onlyActive ? "active" : "all"}
              onChange={(e) => setOnlyActive(e.target.value === "active")}
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="active">Active only</option>
              <option value="all">All employees</option>
            </select>
          </div>
        </div>
      </section>
      <div className="mt-5">
        <Section
          title={`${label} attendance summary`}
          subtitle="Computed live from attendance_records and approved leave_requests"
        >
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState
              message={getErrorMessage(error)}
              onRetry={() => {
                records.refetch();
                leave.refetch();
              }}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No employees match"
              text="Change the department or status filter."
              icon={FileText}
            />
          ) : !hasData ? (
            <EmptyState
              title={`No attendance recorded in ${label}`}
              text="Records appear here as soon as employees check in."
              icon={FileText}
            />
          ) : (
            <DataTable
              headers={[
                "Employee",
                "Department",
                "Present",
                "Late",
                "Absent",
                "Half day",
                "Leave",
                "Hours",
              ]}
              rows={rows.map((r) => [
                <div key="n">
                  <p className="font-bold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.code}</p>
                </div>,
                r.department,
                r.present,
                r.late,
                r.absent,
                r.halfDay,
                r.leave,
                `${r.hours}h`,
              ])}
            />
          )}
        </Section>
      </div>
    </AppShell>
  );
}
