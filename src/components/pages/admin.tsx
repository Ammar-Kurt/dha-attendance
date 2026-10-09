import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { z, type ZodTypeAny } from "zod";
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FieldError,
  QueryState,
  SavingLabel,
  Section,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type {
  AppRole,
  DepartmentRow,
  HolidayRow,
  LeaveTypeRow,
  ShiftRow,
} from "@/integrations/supabase/types";
import { roleLabels, useAuth } from "@/lib/auth";
import { formatClock, formatDate, formatDateTime, getErrorMessage } from "@/lib/format";
import {
  unwrap,
  useAudit,
  useDepartments,
  useHolidays,
  useLeaveTypes,
  useProfiles,
  useShifts,
  type ProfileWithRole,
} from "@/lib/queries";

/* ------------------------------------------------------------------ */
/* Generic record dialog: renders fields, validates with zod, upserts   */
/* ------------------------------------------------------------------ */

type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "time" | "date" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
};

function RecordDialog<T extends Record<string, unknown>>({
  table,
  title,
  description,
  fields,
  schema,
  row,
  trigger,
  queryKey,
  toPayload,
  onSaved,
}: {
  table: "departments" | "shifts" | "leave_types" | "holidays";
  title: string;
  description: string;
  fields: Field[];
  schema: ZodTypeAny;
  row?: T & { id: string };
  trigger: ReactNode;
  queryKey: string;
  toPayload: (values: Record<string, unknown>) => Record<string, unknown>;
  onSaved?: (row: Record<string, unknown>) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const raw: Record<string, unknown> = {};
      for (const f of fields)
        raw[f.name] = f.type === "checkbox" ? form.get(f.name) === "on" : (form.get(f.name) ?? "");
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
        setErrors(next);
        throw new Error("validation");
      }
      setErrors({});
      const payload = toPayload(parsed.data as Record<string, unknown>);
      // The four reference tables share one shape for the client: cast once here.
      const from = supabase.from(table as "departments");
      const result = row
        ? await from
            .update(payload as never)
            .eq("id", row.id)
            .select("*")
            .single()
        : await from
            .insert(payload as never)
            .select("*")
            .single();
      return unwrap(result) as unknown as Record<string, unknown>;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setOpen(false);
      toast.success(row ? "Changes saved" : "Record created", {
        description: "Stored in Supabase.",
      });
      onSaved?.(saved);
    },
    onError: (e) => {
      if (e.message === "validation") return;
      toast.error("Couldn't save", {
        description: /duplicate key|unique/i.test(e.message)
          ? "A record with that name already exists."
          : getErrorMessage(e),
      });
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
            <DialogTitle>
              {row ? `Edit ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const current = row ? (row as Record<string, unknown>)[f.name] : f.defaultValue;
              const id = `${table}-${f.name}`;
              return (
                <div
                  key={f.name}
                  className={
                    f.type === "checkbox"
                      ? "flex items-center gap-2 sm:col-span-2"
                      : fields.length === 1 || f.name === "name"
                        ? "sm:col-span-2"
                        : ""
                  }
                >
                  {f.type === "checkbox" ? (
                    <>
                      <input
                        id={id}
                        name={f.name}
                        type="checkbox"
                        defaultChecked={current === undefined ? true : Boolean(current)}
                        className="size-4 accent-primary"
                      />
                      <Label htmlFor={id}>{f.label}</Label>
                    </>
                  ) : f.type === "select" ? (
                    <>
                      <Label htmlFor={id}>{f.label}</Label>
                      <select
                        id={id}
                        name={f.name}
                        defaultValue={String(current ?? "")}
                        className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        {(f.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <Label htmlFor={id}>{f.label}</Label>
                      <Input
                        id={id}
                        name={f.name}
                        type={f.type ?? "text"}
                        defaultValue={
                          current === undefined || current === null
                            ? ""
                            : String(f.type === "time" ? String(current).slice(0, 5) : current)
                        }
                        placeholder={f.placeholder ?? ""}
                        className="mt-2"
                      />
                    </>
                  )}
                  <FieldError message={errors[f.name]} />
                </div>
              );
            })}
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
              <SavingLabel saving={save.isPending}>{row ? "Save changes" : "Create"}</SavingLabel>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useDeleteRow(
  table: "departments" | "shifts" | "leave_types" | "holidays",
  queryKey: string,
) {
  const queryClient = useQueryClient();
  const audit = useAudit();
  return useMutation({
    mutationFn: async ({ id }: { id: string; label: string }) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_, { id, label }) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      await audit(`${table.replace("_", " ")} deleted`, `${table}:${id}`, { name: label });
      toast.success("Deleted", { description: `${label} was removed from Supabase.` });
    },
    onError: (e) =>
      toast.error("Couldn't delete", {
        description: /foreign key|violates/i.test(e.message)
          ? "This record is still in use by other rows."
          : getErrorMessage(e),
      }),
  });
}

/* ------------------------------------------------------------------ */
/* Departments & Shifts                                                */
/* ------------------------------------------------------------------ */

const departmentSchema = z.object({
  name: z.string().trim().min(2, "Enter a department name.").max(60),
  head_name: z.string().trim().max(80),
});
const shiftSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a shift name.").max(40),
    start_time: z.string().min(1, "Choose a start time."),
    end_time: z.string().min(1, "Choose an end time."),
    grace_minutes: z.coerce.number().int().min(0).max(120, "Grace must be 0–120 minutes."),
    working_days: z.string().trim().min(1, "Enter working days.").max(40),
  })
  .refine((v) => v.end_time > v.start_time, {
    path: ["end_time"],
    message: "End time must be after start time.",
  });

export function OrganizationPage() {
  const departments = useDepartments();
  const shifts = useShifts();
  const profiles = useProfiles();
  const audit = useAudit();
  const deleteDept = useDeleteRow("departments", "departments");
  const deleteShift = useDeleteRow("shifts", "shifts");
  const [pending, setPending] = useState<{
    kind: "department" | "shift";
    id: string;
    label: string;
  } | null>(null);
  const headcount = (deptId: string) =>
    (profiles.data ?? []).filter((p) => p.department_id === deptId && p.is_active).length;

  const deptDialog = (row?: DepartmentRow, trigger?: ReactNode) => (
    <RecordDialog
      table="departments"
      title="Department"
      description="Departments group employees for team views and reports."
      queryKey="departments"
      schema={departmentSchema}
      {...(row ? { row } : {})}
      fields={[
        { name: "name", label: "Department name", placeholder: "Operations" },
        { name: "head_name", label: "Head of department", placeholder: "Sara Ali" },
      ]}
      toPayload={(v) => ({ name: v["name"], head_name: (v["head_name"] as string) || null })}
      onSaved={(saved) =>
        audit(row ? "Department updated" : "Department created", `departments:${saved["id"]}`, {
          name: saved["name"] as string,
        })
      }
      trigger={
        trigger ?? (
          <Button size="sm">
            <Plus /> Add
          </Button>
        )
      }
    />
  );
  const shiftDialog = (row?: ShiftRow, trigger?: ReactNode) => (
    <RecordDialog
      table="shifts"
      title="Shift"
      description="Check-ins after start time plus grace are marked late."
      queryKey="shifts"
      schema={shiftSchema}
      {...(row ? { row } : {})}
      fields={[
        { name: "name", label: "Shift name", placeholder: "General" },
        { name: "start_time", label: "Start time", type: "time", defaultValue: "09:00" },
        { name: "end_time", label: "End time", type: "time", defaultValue: "17:30" },
        {
          name: "grace_minutes",
          label: "Grace period (minutes)",
          type: "number",
          defaultValue: 15,
        },
        {
          name: "working_days",
          label: "Working days",
          placeholder: "Mon-Sat",
          defaultValue: "Mon-Sat",
        },
      ]}
      toPayload={(v) => ({
        name: v["name"],
        start_time: v["start_time"],
        end_time: v["end_time"],
        grace_minutes: v["grace_minutes"],
        working_days: v["working_days"],
      })}
      onSaved={(saved) =>
        audit(row ? "Shift updated" : "Shift created", `shifts:${saved["id"]}`, {
          name: saved["name"] as string,
        })
      }
      trigger={
        trigger ?? (
          <Button size="sm">
            <Plus /> Add
          </Button>
        )
      }
    />
  );

  return (
    <AppShell title="Departments & Shifts" eyebrow="Organization setup">
      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="mt-4">
          <Section
            title="Departments"
            subtitle="Headcount counts active employees"
            action={deptDialog()}
          >
            <QueryState
              isLoading={departments.isLoading}
              error={departments.error}
              data={departments.data}
              onRetry={() => departments.refetch()}
              empty={
                <EmptyState
                  title="No departments yet"
                  text="Add your first department to organise employees."
                />
              }
            >
              {(rows) => (
                <DataTable
                  headers={["Department", "Head", "Employees", "Updated", "Actions"]}
                  rows={rows.map((d) => [
                    <span key="n" className="font-bold">
                      {d.name}
                    </span>,
                    d.head_name ?? "—",
                    headcount(d.id),
                    formatDateTime(d.updated_at),
                    <div key="a" className="flex gap-1">
                      {deptDialog(
                        d,
                        <Button variant="ghost" size="icon" aria-label={`Edit ${d.name}`}>
                          <Pencil />
                        </Button>,
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${d.name}`}
                        onClick={() => setPending({ kind: "department", id: d.id, label: d.name })}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>,
                  ])}
                />
              )}
            </QueryState>
          </Section>
        </TabsContent>
        <TabsContent value="shifts" className="mt-4">
          <Section title="Work shifts" action={shiftDialog()}>
            <QueryState
              isLoading={shifts.isLoading}
              error={shifts.error}
              data={shifts.data}
              onRetry={() => shifts.refetch()}
              empty={
                <EmptyState
                  title="No shifts yet"
                  text="Add a shift so check-ins can be marked on time or late."
                />
              }
            >
              {(rows) => (
                <DataTable
                  headers={["Shift", "Hours", "Grace period", "Working days", "Actions"]}
                  rows={rows.map((s) => [
                    <span key="n" className="font-bold">
                      {s.name}
                    </span>,
                    `${formatClock(s.start_time)} – ${formatClock(s.end_time)}`,
                    `${s.grace_minutes} minutes`,
                    s.working_days,
                    <div key="a" className="flex gap-1">
                      {shiftDialog(
                        s,
                        <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`}>
                          <Pencil />
                        </Button>,
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${s.name}`}
                        onClick={() => setPending({ kind: "shift", id: s.id, label: s.name })}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>,
                  ])}
                />
              )}
            </QueryState>
          </Section>
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={`Delete ${pending?.label}?`}
        description="Employees linked to it will become unassigned. This cannot be undone."
        pending={deleteDept.isPending || deleteShift.isPending}
        onConfirm={() => {
          if (!pending) return;
          const m = pending.kind === "department" ? deleteDept : deleteShift;
          m.mutate({ id: pending.id, label: pending.label }, { onSettled: () => setPending(null) });
        }}
      />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Leave types & Holidays                                              */
/* ------------------------------------------------------------------ */

const leaveTypeSchema = z.object({
  name: z.string().trim().min(2, "Enter a leave type name.").max(40),
  annual_quota: z.coerce.number().int().min(0).max(365, "Quota must be 0–365."),
  is_paid: z.boolean(),
});
const holidaySchema = z.object({
  name: z.string().trim().min(2, "Enter a holiday name.").max(60),
  holiday_date: z.string().min(1, "Choose a date."),
});

export function LeaveHolidaysPage() {
  const leaveTypes = useLeaveTypes();
  const holidays = useHolidays();
  const audit = useAudit();
  const deleteType = useDeleteRow("leave_types", "leave_types");
  const deleteHoliday = useDeleteRow("holidays", "holidays");
  const [pending, setPending] = useState<{
    kind: "type" | "holiday";
    id: string;
    label: string;
  } | null>(null);

  const typeDialog = (row?: LeaveTypeRow, trigger?: ReactNode) => (
    <RecordDialog
      table="leave_types"
      title="Leave type"
      description="Quotas reset every calendar year."
      queryKey="leave_types"
      schema={leaveTypeSchema}
      {...(row ? { row } : {})}
      fields={[
        { name: "name", label: "Name", placeholder: "Annual Leave" },
        { name: "annual_quota", label: "Annual quota (days)", type: "number", defaultValue: 10 },
        { name: "is_paid", label: "Paid leave", type: "checkbox" },
      ]}
      toPayload={(v) => ({
        name: v["name"],
        annual_quota: v["annual_quota"],
        is_paid: v["is_paid"],
      })}
      onSaved={(saved) =>
        audit(row ? "Leave type updated" : "Leave type created", `leave_types:${saved["id"]}`, {
          name: saved["name"] as string,
        })
      }
      trigger={
        trigger ?? (
          <Button size="sm">
            <Plus /> Add
          </Button>
        )
      }
    />
  );
  const holidayDialog = (row?: HolidayRow, trigger?: ReactNode) => (
    <RecordDialog
      table="holidays"
      title="Holiday"
      description="Public holidays shown to every employee."
      queryKey="holidays"
      schema={holidaySchema}
      {...(row ? { row } : {})}
      fields={[
        { name: "name", label: "Holiday name", placeholder: "Iqbal Day" },
        { name: "holiday_date", label: "Date", type: "date" },
      ]}
      toPayload={(v) => ({ name: v["name"], holiday_date: v["holiday_date"] })}
      onSaved={(saved) =>
        audit(row ? "Holiday updated" : "Holiday created", `holidays:${saved["id"]}`, {
          name: saved["name"] as string,
        })
      }
      trigger={
        trigger ?? (
          <Button size="sm">
            <Plus /> Add
          </Button>
        )
      }
    />
  );

  return (
    <AppShell title="Leave & Holidays" eyebrow="Policy setup">
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Leave types" action={typeDialog()}>
          <QueryState
            isLoading={leaveTypes.isLoading}
            error={leaveTypes.error}
            data={leaveTypes.data}
            onRetry={() => leaveTypes.refetch()}
            empty={
              <EmptyState
                title="No leave types"
                text="Add Annual, Sick or Casual leave to get started."
              />
            }
          >
            {(rows) => (
              <DataTable
                headers={["Type", "Annual quota", "Paid", "Actions"]}
                rows={rows.map((t) => [
                  <span key="n" className="font-bold">
                    {t.name}
                  </span>,
                  `${t.annual_quota} days`,
                  <StatusBadge key="p" status={t.is_paid ? "Yes" : "No"} />,
                  <div key="a" className="flex gap-1">
                    {typeDialog(
                      t,
                      <Button variant="ghost" size="icon" aria-label={`Edit ${t.name}`}>
                        <Pencil />
                      </Button>,
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${t.name}`}
                      onClick={() => setPending({ kind: "type", id: t.id, label: t.name })}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>,
                ])}
              />
            )}
          </QueryState>
        </Section>
        <Section title="Holidays" action={holidayDialog()}>
          <QueryState
            isLoading={holidays.isLoading}
            error={holidays.error}
            data={holidays.data}
            onRetry={() => holidays.refetch()}
            empty={<EmptyState title="No holidays" text="Add upcoming public holidays." />}
          >
            {(rows) => (
              <div className="divide-y">
                {rows.map((h) => (
                  <div key={h.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{h.name}</p>
                      <p className="text-xs text-muted-foreground">Public holiday</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatDate(h.holiday_date)}</span>
                      {holidayDialog(
                        h,
                        <Button variant="ghost" size="icon" aria-label={`Edit ${h.name}`}>
                          <Pencil />
                        </Button>,
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${h.name}`}
                        onClick={() => setPending({ kind: "holiday", id: h.id, label: h.name })}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </QueryState>
        </Section>
      </div>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={`Delete ${pending?.label}?`}
        description={
          pending?.kind === "type"
            ? "Leave types with existing requests cannot be deleted."
            : "This holiday will be removed for everyone."
        }
        pending={deleteType.isPending || deleteHoliday.isPending}
        onConfirm={() => {
          if (!pending) return;
          const m = pending.kind === "type" ? deleteType : deleteHoliday;
          m.mutate({ id: pending.id, label: pending.label }, { onSettled: () => setPending(null) });
        }}
      />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Employees (HR) and Users & Roles (system admin)                     */
/* ------------------------------------------------------------------ */

const employeeSchema = z.object({
  designation: z.string().trim().max(60),
  department_id: z.string(),
  shift_id: z.string(),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces, + ( ) - only."),
});

function EmployeeDialog({ employee, trigger }: { employee: ProfileWithRole; trigger: ReactNode }) {
  const queryClient = useQueryClient();
  const departments = useDepartments();
  const shifts = useShifts();
  const audit = useAudit();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = employeeSchema.safeParse({
        designation: form.get("designation") ?? "",
        department_id: form.get("department_id") ?? "",
        shift_id: form.get("shift_id") ?? "",
        phone: form.get("phone") ?? "",
      });
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
        setErrors(next);
        throw new Error("validation");
      }
      setErrors({});
      const v = parsed.data;
      return unwrap(
        await supabase
          .from("profiles")
          .update({
            designation: v.designation || null,
            department_id: v.department_id || null,
            shift_id: v.shift_id || null,
            phone: v.phone || null,
          })
          .eq("id", employee.id)
          .select("*")
          .single(),
      );
    },
    onSuccess: async (row) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setOpen(false);
      await audit("Employee updated", `profiles:${row.id}`, { name: row.full_name });
      toast.success("Employee updated", { description: `${row.full_name} saved to Supabase.` });
    },
    onError: (e) => {
      if (e.message !== "validation")
        toast.error("Couldn't save", { description: getErrorMessage(e) });
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(new FormData(e.currentTarget));
          }}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Edit {employee.full_name}</DialogTitle>
            <DialogDescription>
              {employee.employee_code} · {employee.email}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="e-designation">Designation</Label>
              <Input
                id="e-designation"
                name="designation"
                defaultValue={employee.designation ?? ""}
                className="mt-2"
              />
              <FieldError message={errors["designation"]} />
            </div>
            <div>
              <Label htmlFor="e-dept">Department</Label>
              <select
                id="e-dept"
                name="department_id"
                defaultValue={employee.department_id ?? ""}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Unassigned</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="e-shift">Shift</Label>
              <select
                id="e-shift"
                name="shift_id"
                defaultValue={employee.shift_id ?? ""}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Unassigned</option>
                {(shifts.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="e-phone">Phone</Label>
              <Input
                id="e-phone"
                name="phone"
                defaultValue={employee.phone ?? ""}
                className="mt-2"
              />
              <FieldError message={errors["phone"]} />
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
              <SavingLabel saving={save.isPending}>Save changes</SavingLabel>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const profiles = useProfiles();
  const departments = useDepartments();
  const shifts = useShifts();
  const audit = useAudit();
  const [query, setQuery] = useState("");
  const [toToggle, setToToggle] = useState<ProfileWithRole | null>(null);

  const toggle = useMutation({
    mutationFn: async (p: ProfileWithRole) =>
      unwrap(
        await supabase
          .from("profiles")
          .update({ is_active: !p.is_active })
          .eq("id", p.id)
          .select("*")
          .single(),
      ),
    onSuccess: async (row) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setToToggle(null);
      await audit(
        row.is_active ? "Employee activated" : "Employee deactivated",
        `profiles:${row.id}`,
        { name: row.full_name },
      );
      toast.success(`${row.full_name} ${row.is_active ? "activated" : "deactivated"}`);
    },
    onError: (e) => toast.error("Couldn't update status", { description: getErrorMessage(e) }),
  });

  const rows = (profiles.data ?? []).filter((e) =>
    `${e.full_name} ${e.employee_code} ${e.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  const deptName = (id: string | null) =>
    departments.data?.find((d) => d.id === id)?.name ?? "Unassigned";
  const shiftName = (id: string | null) => shifts.data?.find((s) => s.id === id)?.name ?? "—";

  return (
    <AppShell title="Employees" eyebrow="HR administration">
      <Section
        title="Employee directory"
        subtitle={`${(profiles.data ?? []).filter((e) => e.is_active).length} active employees · new accounts appear here after sign-up`}
        action={
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees"
              className="w-56 pl-9"
            />
          </div>
        }
      >
        <QueryState
          isLoading={profiles.isLoading}
          error={profiles.error}
          data={rows}
          onRetry={() => profiles.refetch()}
          empty={
            <EmptyState
              title={profiles.data?.length ? "No employees found" : "No employees yet"}
              text={
                profiles.data?.length
                  ? "Try another name, code or email."
                  : "Employees appear after they create an account."
              }
            />
          }
        >
          {(list) => (
            <DataTable
              headers={[
                "Employee",
                "Department",
                "Designation",
                "Shift",
                "Role",
                "Status",
                "Actions",
              ]}
              rows={list.map((e) => [
                <div key="n">
                  <p className="font-bold">{e.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.employee_code} · {e.email}
                  </p>
                </div>,
                deptName(e.department_id),
                e.designation ?? "—",
                shiftName(e.shift_id),
                roleLabels[e.role],
                <StatusBadge key="s" status={e.is_active ? "active" : "inactive"} />,
                <div key="a" className="flex gap-1">
                  <EmployeeDialog
                    employee={e}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Edit ${e.full_name}`}>
                        <Pencil />
                      </Button>
                    }
                  />
                  <Button variant="ghost" size="sm" onClick={() => setToToggle(e)}>
                    {e.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>,
              ])}
            />
          )}
        </QueryState>
      </Section>
      <ConfirmDialog
        open={!!toToggle}
        onOpenChange={(o) => !o && setToToggle(null)}
        title={`${toToggle?.is_active ? "Deactivate" : "Activate"} ${toToggle?.full_name}?`}
        description={
          toToggle?.is_active
            ? "The employee stays in Supabase but is marked inactive and excluded from team counts."
            : "The employee will be counted as active again."
        }
        confirmLabel={toToggle?.is_active ? "Deactivate" : "Activate"}
        destructive={!!toToggle?.is_active}
        pending={toggle.isPending}
        onConfirm={() => toToggle && toggle.mutate(toToggle)}
      />
    </AppShell>
  );
}

export function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profiles = useProfiles();
  const departments = useDepartments();
  const audit = useAudit();
  const [query, setQuery] = useState("");

  const changeRole = useMutation({
    mutationFn: async ({ p, role }: { p: ProfileWithRole; role: AppRole }) =>
      unwrap(
        await supabase.from("user_roles").update({ role }).eq("user_id", p.id).select("*").single(),
      ),
    onSuccess: async (row, { p }) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await audit("Role changed", `user_roles:${row.user_id}`, {
        name: p.full_name,
        role: row.role,
      });
      toast.success(`${p.full_name} is now ${roleLabels[row.role]}`);
    },
    onError: (e) => toast.error("Couldn't change role", { description: getErrorMessage(e) }),
  });

  const rows = (profiles.data ?? []).filter((e) =>
    `${e.full_name} ${e.email}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell title="Users & Roles" eyebrow="System administration">
      <div className="mb-5 rounded-md border border-warning/30 bg-warning-soft p-4 text-sm">
        <p className="flex items-center gap-2 font-bold">
          <ShieldCheck className="size-4 text-warning" /> Role assignments
        </p>
        <p className="mt-1 text-muted-foreground">
          Roles live in the user_roles table and are enforced by Row Level Security. You cannot
          change your own role.
        </p>
      </div>
      <Section
        title="User access"
        subtitle={`${profiles.data?.length ?? 0} accounts`}
        action={
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users"
              className="w-56 pl-9"
            />
          </div>
        }
      >
        <QueryState
          isLoading={profiles.isLoading}
          error={profiles.error}
          data={rows}
          onRetry={() => profiles.refetch()}
          empty={<EmptyState title="No users found" text="Try another name or email." />}
        >
          {(list) => (
            <DataTable
              headers={["User", "Role", "Department", "Status", "Joined"]}
              rows={list.map((e) => [
                <div key="n">
                  <p className="font-bold">
                    {e.full_name}
                    {e.id === user?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.email}</p>
                </div>,
                <select
                  key="r"
                  aria-label={`Role for ${e.full_name}`}
                  value={e.role}
                  disabled={e.id === user?.id || changeRole.isPending}
                  onChange={(ev) => changeRole.mutate({ p: e, role: ev.target.value as AppRole })}
                  className="h-8 rounded-md border bg-background px-2 text-xs disabled:opacity-60"
                >
                  {(Object.keys(roleLabels) as AppRole[]).map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>,
                departments.data?.find((d) => d.id === e.department_id)?.name ?? "Unassigned",
                <StatusBadge key="s" status={e.is_active ? "active" : "inactive"} />,
                formatDate(e.created_at),
              ])}
            />
          )}
        </QueryState>
      </Section>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

export function AuditLogPage() {
  const [query, setQuery] = useState("");
  const profiles = useProfiles();
  const logs = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ),
  });
  const actor = (id: string | null) =>
    profiles.data?.find((p) => p.id === id)?.full_name ?? "System";
  const rows = (logs.data ?? []).filter((a) =>
    `${a.action} ${actor(a.actor_id)} ${a.target}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell title="Audit Log" eyebrow="Governance">
      <Section
        title="Activity history"
        subtitle="Administrative changes, approvals and profile edits"
        action={
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-56 pl-9"
              placeholder="Search activity"
            />
          </div>
        }
      >
        <QueryState
          isLoading={logs.isLoading}
          error={logs.error}
          data={rows}
          onRetry={() => logs.refetch()}
          empty={
            <EmptyState
              title={logs.data?.length ? "No activity found" : "No activity yet"}
              text={
                logs.data?.length
                  ? "Try a broader search term."
                  : "Approvals and admin changes will be recorded here."
              }
            />
          }
        >
          {(list) => (
            <DataTable
              headers={["Action", "Actor", "Record", "Time"]}
              rows={list.map((a) => [
                <span key="a" className="font-bold">
                  {a.action}
                </span>,
                actor(a.actor_id),
                <span key="t" className="font-mono text-xs">
                  {a.target}
                </span>,
                formatDateTime(a.created_at),
              ])}
            />
          )}
        </QueryState>
      </Section>
    </AppShell>
  );
}
