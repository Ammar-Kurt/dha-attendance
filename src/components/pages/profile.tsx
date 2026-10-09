import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError, SavingLabel, Section, StatusBadge } from "@/components/data-states";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { roleLabels, useAuth } from "@/lib/auth";
import { formatClock, formatDate, getErrorMessage, initials } from "@/lib/format";
import { unwrap, useAudit, useDepartments, useShifts } from "@/lib/queries";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter at least 2 characters.").max(80, "Name is too long."),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long.")
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces, + ( ) - only."),
  designation: z.string().trim().max(60, "Keep it under 60 characters."),
  department_id: z.string(),
  shift_id: z.string(),
});
type Values = z.infer<typeof schema>;

export function ProfilePage() {
  const { profile, role, user, refreshProfile } = useAuth();
  const departments = useDepartments();
  const shifts = useShifts();
  const audit = useAudit();
  const queryClient = useQueryClient();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", phone: "", designation: "", department_id: "", shift_id: "" },
  });
  const { errors, isDirty } = form.formState;

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name,
        phone: profile.phone ?? "",
        designation: profile.designation ?? "",
        department_id: profile.department_id ?? "",
        shift_id: profile.shift_id ?? "",
      });
    }
  }, [profile, form]);

  const save = useMutation({
    mutationFn: async (values: Values) =>
      unwrap(
        await supabase
          .from("profiles")
          .update({
            full_name: values.full_name,
            phone: values.phone || null,
            designation: values.designation || null,
            department_id: values.department_id || null,
            shift_id: values.shift_id || null,
          })
          .eq("id", user!.id)
          .select("*")
          .single(),
      ),
    onSuccess: async (row) => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await audit("Profile updated", `profiles:${row.id}`, { full_name: row.full_name });
      toast.success("Profile saved", { description: "Your changes are stored in Supabase." });
    },
    onError: (e) => toast.error("Couldn't save profile", { description: getErrorMessage(e) }),
  });

  const name = profile?.full_name ?? "—";
  const department = departments.data?.find((d) => d.id === profile?.department_id);
  const shift = shifts.data?.find((s) => s.id === profile?.shift_id);

  return (
    <AppShell title="My Profile" eyebrow="Personal details">
      <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        <Section title="Employee card">
          <div className="p-6 text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground">
              {initials(name)}
            </div>
            <h2 className="mt-4 text-xl font-extrabold">{name}</h2>
            <p className="text-sm text-muted-foreground">
              {profile?.designation ?? "No designation yet"}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <StatusBadge status={roleLabels[role]} />
              <StatusBadge status={profile?.is_active ? "active" : "inactive"} />
            </div>
            <dl className="mt-6 grid gap-4 text-left sm:grid-cols-2">
              {[
                ["Employee code", profile?.employee_code ?? "—"],
                ["Email", profile?.email ?? "—"],
                ["Department", department?.name ?? "Unassigned"],
                [
                  "Shift",
                  shift
                    ? `${shift.name} · ${formatClock(shift.start_time)}–${formatClock(shift.end_time)}`
                    : "Unassigned",
                ],
                ["Join date", formatDate(profile?.join_date)],
                ["Last updated", formatDate(profile?.updated_at, "dd MMM yyyy, hh:mm a")],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="text-xs font-bold uppercase text-muted-foreground">{term}</dt>
                  <dd className="mt-1 break-all text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>
        <Section
          title="Edit work information"
          subtitle="Saved to the profiles table under Row Level Security"
        >
          <form
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
            noValidate
            className="grid gap-4 p-5 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                className="mt-2"
                aria-invalid={!!errors.full_name}
                {...form.register("full_name")}
              />
              <FieldError message={errors.full_name?.message} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                className="mt-2"
                placeholder="+92 300 555 0184"
                aria-invalid={!!errors.phone}
                {...form.register("phone")}
              />
              <FieldError message={errors.phone?.message} />
            </div>
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                className="mt-2"
                placeholder="Operations Executive"
                aria-invalid={!!errors.designation}
                {...form.register("designation")}
              />
              <FieldError message={errors.designation?.message} />
            </div>
            <div>
              <Label htmlFor="department_id">Department</Label>
              <select
                id="department_id"
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                {...form.register("department_id")}
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
              <Label htmlFor="shift_id">Shift</Label>
              <select
                id="shift_id"
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                {...form.register("shift_id")}
              >
                <option value="">Unassigned</option>
                {(shifts.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {formatClock(s.start_time)}–{formatClock(s.end_time)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={save.isPending || !profile || !isDirty}>
                <SavingLabel saving={save.isPending}>Save changes</SavingLabel>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending || !isDirty}
                onClick={() => form.reset()}
              >
                Reset
              </Button>
            </div>
          </form>
        </Section>
      </div>
      <div className="mt-5">
        <Section title="Account">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">Signed in as {profile?.email ?? user?.email}</p>
              <p className="text-sm text-muted-foreground">
                Sign out from the sidebar, or go back to the home page.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/">
                <LogOut /> Home page
              </Link>
            </Button>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
