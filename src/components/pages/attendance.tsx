import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Pencil, Plus, Timer, Trash2, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FieldError,
  QueryState,
  SavingLabel,
  Section,
  StatCard,
  StatusBadge,
} from "@/components/data-states";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { AttendanceRow, AttendanceStatus } from "@/lib/db-types";
import { useAuth } from "@/lib/auth";
import {
  formatDate,
  formatDay,
  formatTime,
  getErrorMessage,
  minutesBetween,
  monthKey,
  todayISO,
  workedHours,
} from "@/lib/format";
import { unwrap } from "@/lib/queries";

const statuses: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "on_leave",
  "holiday",
  "half_day",
];

function monthOptions() {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({
      value: monthKey(m),
      label: m.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

function monthRange(key: string) {
  const [y = "2026", m = "01"] = key.split("-");
  const start = `${y}-${m}-01`;
  const endDate = new Date(Number(y), Number(m), 0);
  const end = `${y}-${m}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

export function useMyAttendance(month: string) {
  const { user } = useAuth();
  const { start, end } = monthRange(month);
  return useQuery({
    queryKey: ["attendance", "mine", user?.id, month],
    enabled: !!user,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("attendance_records")
          .select("*")
          .eq("user_id", user!.id)
          .gte("work_date", start)
          .lte("work_date", end)
          .order("work_date", { ascending: false }),
      ),
  });
}

const recordSchema = z
  .object({
    work_date: z.string().min(1, "Choose a date."),
    check_in: z.string(),
    check_out: z.string(),
    status: z.enum(["present", "late", "absent", "on_leave", "holiday", "half_day"]),
    note: z.string().trim().max(200, "Keep the note under 200 characters."),
  })
  .refine((v) => !v.check_in || !v.check_out || v.check_out >= v.check_in, {
    path: ["check_out"],
    message: "Check-out must be after check-in.",
  });

function toTimestamp(date: string, time: string) {
  if (!time) return null;
  return new Date(`${date}T${time}:00`).toISOString();
}

function toTimeInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Create or edit a manual attendance record (used for missed days and the CRUD proof). */
export function RecordDialog({
  record,
  trigger,
}: {
  record?: AttendanceRow;
  trigger: React.ReactNode;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = recordSchema.safeParse({
        work_date: form.get("work_date"),
        check_in: form.get("check_in"),
        check_out: form.get("check_out"),
        status: form.get("status"),
        note: form.get("note") ?? "",
      });
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
        setErrors(next);
        throw new Error("validation");
      }
      setErrors({});
      const v = parsed.data;
      const payload = {
        work_date: v.work_date,
        check_in: toTimestamp(v.work_date, v.check_in),
        check_out: toTimestamp(v.work_date, v.check_out),
        status: v.status,
        note: v.note || null,
      };
      if (record) {
        return unwrap(
          await supabase
            .from("attendance_records")
            .update(payload)
            .eq("id", record.id)
            .select("*")
            .single(),
        );
      }
      return unwrap(
        await supabase
          .from("attendance_records")
          .insert({ user_id: user!.id, ...payload })
          .select("*")
          .single(),
      );
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setOpen(false);
      toast.success(record ? "Record updated" : "Record added", {
        description: `${formatDate(row.work_date)} saved to Supabase.`,
      });
    },
    onError: (e) => {
      if (e.message === "validation") return;
      const msg = /duplicate key|unique/i.test(e.message)
        ? "You already have a record for that date. Edit it instead."
        : getErrorMessage(e);
      toast.error("Couldn't save record", { description: msg });
    },
  });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    save.mutate(new FormData(e.currentTarget));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setErrors({});
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{record ? "Edit attendance record" : "Add attendance record"}</DialogTitle>
            <DialogDescription>
              {record
                ? "Update the times or status for this day."
                : "Log a day that was missed by the check-in button."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="work_date">Date</Label>
              <Input
                id="work_date"
                name="work_date"
                type="date"
                className="mt-2"
                max={todayISO()}
                defaultValue={record?.work_date ?? todayISO()}
              />
              <FieldError message={errors["work_date"]} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={record?.status ?? "present"}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="check_in">Check-in</Label>
              <Input
                id="check_in"
                name="check_in"
                type="time"
                className="mt-2"
                defaultValue={toTimeInput(record?.check_in ?? null)}
              />
            </div>
            <div>
              <Label htmlFor="check_out">Check-out</Label>
              <Input
                id="check_out"
                name="check_out"
                type="time"
                className="mt-2"
                defaultValue={toTimeInput(record?.check_out ?? null)}
              />
              <FieldError message={errors["check_out"]} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                name="note"
                className="mt-2"
                maxLength={200}
                defaultValue={record?.note ?? ""}
                placeholder="e.g. Worked from client site"
              />
              <FieldError message={errors["note"]} />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              <SavingLabel saving={save.isPending}>
                {record ? "Save changes" : "Add record"}
              </SavingLabel>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CorrectionDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = z
        .object({
          work_date: z.string().min(1, "Choose the date to correct."),
          requested_check_in: z.string(),
          requested_check_out: z.string(),
          reason: z.string().trim().min(10, "Please provide at least 10 characters.").max(300),
        })
        .safeParse({
          work_date: form.get("work_date"),
          requested_check_in: form.get("requested_check_in"),
          requested_check_out: form.get("requested_check_out"),
          reason: form.get("reason"),
        });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please check the form.");
        throw new Error("validation");
      }
      setError("");
      const v = parsed.data;
      return unwrap(
        await supabase
          .from("correction_requests")
          .insert({
            user_id: user!.id,
            work_date: v.work_date,
            requested_check_in: v.requested_check_in || null,
            requested_check_out: v.requested_check_out || null,
            reason: v.reason,
          })
          .select("*")
          .single(),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["correction_requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-count"] });
      setOpen(false);
      toast.success("Correction request submitted", {
        description: "Your manager has been notified.",
      });
    },
    onError: (e) => {
      if (e.message !== "validation")
        toast.error("Couldn't submit", { description: getErrorMessage(e) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil /> Request correction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate(new FormData(e.currentTarget));
          }}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Request attendance correction</DialogTitle>
            <DialogDescription>
              Tell your manager which times should be recorded. Approved corrections update your
              record automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="c_date">Date</Label>
              <Input
                id="c_date"
                name="work_date"
                type="date"
                max={todayISO()}
                defaultValue={todayISO()}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="cin">Check-in</Label>
              <Input
                id="cin"
                name="requested_check_in"
                type="time"
                defaultValue="09:00"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="cout">Check-out</Label>
              <Input
                id="cout"
                name="requested_check_out"
                type="time"
                defaultValue="17:30"
                className="mt-2"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                name="reason"
                className="mt-2"
                placeholder="Explain why this record needs correction"
                maxLength={300}
              />
              <FieldError message={error} />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submit.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              <SavingLabel saving={submit.isPending}>Submit request</SavingLabel>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MyCorrections() {
  const { user } = useAuth();
  const corrections = useQuery({
    queryKey: ["correction_requests", "mine", user?.id],
    enabled: !!user,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("correction_requests")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ),
  });
  return (
    <Section title="My correction requests" subtitle="Requests reviewed by your manager">
      <QueryState
        isLoading={corrections.isLoading}
        error={corrections.error}
        data={corrections.data}
        onRetry={() => corrections.refetch()}
        empty={
          <EmptyState
            title="No correction requests"
            text="Use “Request correction” when a check-in or check-out is missing."
          />
        }
      >
        {(rows) => (
          <DataTable
            headers={["Date", "Requested times", "Reason", "Status"]}
            rows={rows.map((c) => [
              <span key="d" className="font-bold">
                {formatDate(c.work_date)}
              </span>,
              `${c.requested_check_in?.slice(0, 5) ?? "—"} – ${c.requested_check_out?.slice(0, 5) ?? "—"}`,
              <span key="r" className="line-clamp-2 max-w-xs">
                {c.reason}
              </span>,
              <StatusBadge key="s" status={c.status} />,
            ])}
          />
        )}
      </QueryState>
    </Section>
  );
}

export function AttendancePage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(monthKey());
  const [status, setStatus] = useState("all");
  const [toDelete, setToDelete] = useState<AttendanceRow | null>(null);
  const records = useMyAttendance(month);

  const filtered = useMemo(
    () => (records.data ?? []).filter((r) => status === "all" || r.status === status),
    [records.data, status],
  );
  const all = records.data ?? [];
  const present = all.filter((r) => r.status === "present").length;
  const late = all.filter((r) => r.status === "late").length;
  const absent = all.filter((r) => r.status === "absent").length;
  const totalMinutes = all.reduce((sum, r) => sum + minutesBetween(r.check_in, r.check_out), 0);
  const workedDays = all.filter((r) => r.check_in && r.check_out).length;

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance_records").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setToDelete(null);
      toast.success("Record deleted", { description: "The row was removed from Supabase." });
    },
    onError: (e) => toast.error("Couldn't delete", { description: getErrorMessage(e) }),
  });

  return (
    <AppShell
      title="My Attendance"
      eyebrow="Personal records"
      actions={
        <>
          <CorrectionDialog />
          <RecordDialog
            trigger={
              <Button>
                <Plus /> Add record
              </Button>
            }
          />
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Present"
          value={present}
          detail="Days this month"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Late"
          value={late}
          detail={
            all.length
              ? `On-time rate ${Math.round(((all.length - late) / all.length) * 100)}%`
              : "No records yet"
          }
          icon={Timer}
          tone="warning"
        />
        <StatCard
          label="Absent"
          value={absent}
          detail="Unexcused absences"
          icon={XCircle}
          tone="danger"
        />
        <StatCard
          label="Worked hours"
          value={`${Math.floor(totalMinutes / 60)}h`}
          detail={
            workedDays
              ? `${Math.round((totalMinutes / workedDays / 60) * 10) / 10}h daily average`
              : "No completed days"
          }
          icon={Clock3}
        />
      </div>
      <div className="mt-5 space-y-5">
        <Section
          title="Attendance register"
          subtitle="Loaded live from Supabase"
          action={
            <>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-label="Month"
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                {monthOptions().map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </>
          }
        >
          <QueryState
            isLoading={records.isLoading}
            error={records.error}
            data={filtered}
            onRetry={() => records.refetch()}
            empty={
              <EmptyState
                title={all.length ? "No records match this filter" : "No attendance this month"}
                text={
                  all.length
                    ? "Try another status."
                    : "Check in from the dashboard or add a record manually."
                }
              />
            }
          >
            {(rows) => (
              <DataTable
                headers={["Date", "Check in", "Check out", "Worked", "Status", "Actions"]}
                rows={rows.map((a) => [
                  <div key="d">
                    <p className="font-bold">{formatDate(a.work_date)}</p>
                    <p className="text-xs text-muted-foreground">{formatDay(a.work_date)}</p>
                  </div>,
                  formatTime(a.check_in),
                  formatTime(a.check_out),
                  workedHours(a.check_in, a.check_out),
                  <StatusBadge key="s" status={a.status} />,
                  <div key="a" className="flex gap-1">
                    <RecordDialog
                      record={a}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${formatDate(a.work_date)}`}
                        >
                          <Pencil />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${formatDate(a.work_date)}`}
                      onClick={() => setToDelete(a)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>,
                ])}
              />
            )}
          </QueryState>
        </Section>
        <MyCorrections />
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this attendance record?"
        description={
          toDelete
            ? `The record for ${formatDate(toDelete.work_date)} will be permanently removed from Supabase.`
            : ""
        }
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </AppShell>
  );
}
