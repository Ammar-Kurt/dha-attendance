import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CalendarDays, Palmtree, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { LeaveRequestRow } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { formatRange, getErrorMessage } from "@/lib/format";
import { unwrap, useLeaveTypes } from "@/lib/queries";

const schema = z
  .object({
    leave_type_id: z.string().uuid("Choose a leave type."),
    start_date: z.string().min(1, "Choose a start date."),
    end_date: z.string().min(1, "Choose an end date."),
    reason: z
      .string()
      .trim()
      .min(10, "Please explain your request in at least 10 characters.")
      .max(500, "Keep the reason under 500 characters."),
  })
  .refine((v) => v.end_date >= v.start_date, {
    path: ["end_date"],
    message: "End date must be on or after the start date.",
  });

function useMyLeave() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leave_requests", "mine", user?.id],
    enabled: !!user,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("leave_requests")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
      ),
  });
}

function LeaveDialog({
  request,
  trigger,
}: {
  request?: LeaveRequestRow;
  trigger: React.ReactNode;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const leaveTypes = useLeaveTypes();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = schema.safeParse({
        leave_type_id: form.get("leave_type_id"),
        start_date: form.get("start_date"),
        end_date: form.get("end_date"),
        reason: form.get("reason"),
      });
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
        setErrors(next);
        throw new Error("validation");
      }
      setErrors({});
      if (request) {
        return unwrap(
          await supabase
            .from("leave_requests")
            .update(parsed.data)
            .eq("id", request.id)
            .select("*")
            .single(),
        );
      }
      return unwrap(
        await supabase
          .from("leave_requests")
          .insert({ user_id: user!.id, ...parsed.data })
          .select("*")
          .single(),
      );
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-count"] });
      setOpen(false);
      toast.success(request ? "Leave request updated" : "Leave request submitted", {
        description: `${row.days} day${row.days === 1 ? "" : "s"} · your manager will review it.`,
      });
    },
    onError: (e) => {
      if (e.message !== "validation")
        toast.error("Couldn't save request", { description: getErrorMessage(e) });
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
            <DialogTitle>{request ? "Edit leave request" : "New leave request"}</DialogTitle>
            <DialogDescription>
              {request
                ? "Pending requests can be changed until they are reviewed."
                : "Days are counted inclusively from start to end date."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="leave_type_id">Leave type</Label>
              <select
                id="leave_type_id"
                name="leave_type_id"
                defaultValue={request?.leave_type_id ?? leaveTypes.data?.[0]?.id ?? ""}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {(leaveTypes.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.annual_quota} days/year
                  </option>
                ))}
              </select>
              <FieldError message={errors["leave_type_id"]} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="start_date">Start date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={request?.start_date ?? ""}
                  className="mt-2"
                />
                <FieldError message={errors["start_date"]} />
              </div>
              <div>
                <Label htmlFor="end_date">End date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={request?.end_date ?? ""}
                  className="mt-2"
                />
                <FieldError message={errors["end_date"]} />
              </div>
            </div>
            <div>
              <Label htmlFor="leave-reason">Reason</Label>
              <Textarea
                id="leave-reason"
                name="reason"
                maxLength={500}
                defaultValue={request?.reason ?? ""}
                className="mt-2"
                placeholder="Reason for leave"
              />
              <FieldError message={errors["reason"]} />
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
            <Button type="submit" disabled={save.isPending || leaveTypes.isLoading}>
              <SavingLabel saving={save.isPending}>
                {request ? "Save changes" : "Submit request"}
              </SavingLabel>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LeavePage() {
  const queryClient = useQueryClient();
  const leaveTypes = useLeaveTypes();
  const requests = useMyLeave();
  const [toCancel, setToCancel] = useState<LeaveRequestRow | null>(null);
  const year = new Date().getFullYear();

  const typeName = (id: string) => leaveTypes.data?.find((t) => t.id === id)?.name ?? "Leave";
  const balances = (leaveTypes.data ?? []).map((t) => {
    const used = (requests.data ?? [])
      .filter(
        (r) =>
          r.leave_type_id === t.id &&
          r.status === "approved" &&
          r.start_date.startsWith(String(year)),
      )
      .reduce((s, r) => s + r.days, 0);
    return { ...t, used, remaining: Math.max(0, t.annual_quota - used) };
  });
  const icons = [Palmtree, Activity, CalendarDays] as const;
  const tones = ["primary", "success", "warning"] as const;

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_requests").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-count"] });
      setToCancel(null);
      toast.success("Request cancelled", { description: "The row was deleted from Supabase." });
    },
    onError: (e) => toast.error("Couldn't cancel", { description: getErrorMessage(e) }),
  });

  return (
    <AppShell
      title="Leave"
      eyebrow="Time away"
      actions={
        <LeaveDialog
          trigger={
            <Button>
              <Plus /> New leave request
            </Button>
          }
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {balances.length === 0 && !leaveTypes.isLoading ? (
          <div className="sm:col-span-3">
            <EmptyState
              title="No leave types configured"
              text="HR can add leave types under Leave & Holidays."
            />
          </div>
        ) : (
          balances.map((b, i) => (
            <StatCard
              key={b.id}
              label={b.name}
              value={`${b.remaining} days`}
              detail={`${b.used} of ${b.annual_quota} used`}
              icon={icons[i % icons.length] ?? Palmtree}
              tone={tones[i % tones.length] ?? "primary"}
            />
          ))
        )}
      </div>
      <div className="mt-5">
        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">My requests</TabsTrigger>
            <TabsTrigger value="policy">Leave policy</TabsTrigger>
          </TabsList>
          <TabsContent value="requests" className="mt-4">
            <Section title="Request history" subtitle="Track current and previous requests">
              <QueryState
                isLoading={requests.isLoading}
                error={requests.error}
                data={requests.data}
                onRetry={() => requests.refetch()}
                empty={
                  <EmptyState
                    title="No leave requests yet"
                    text="Submit your first request with the button above."
                  />
                }
              >
                {(rows) => (
                  <DataTable
                    headers={["Type", "Dates", "Days", "Reason", "Status", "Actions"]}
                    rows={rows.map((r) => [
                      <span key="t" className="font-bold">
                        {typeName(r.leave_type_id)}
                      </span>,
                      formatRange(r.start_date, r.end_date),
                      r.days,
                      <span key="r" className="line-clamp-2 max-w-xs">
                        {r.reason}
                      </span>,
                      <div key="s">
                        <StatusBadge status={r.status} />
                        {r.review_note && (
                          <p className="mt-1 text-xs text-muted-foreground">{r.review_note}</p>
                        )}
                      </div>,
                      r.status === "pending" ? (
                        <div key="a" className="flex gap-1">
                          <LeaveDialog
                            request={r}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Edit request">
                                <Pencil />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Cancel request"
                            onClick={() => setToCancel(r)}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <span key="a" className="text-xs text-muted-foreground">
                          Reviewed
                        </span>
                      ),
                    ])}
                  />
                )}
              </QueryState>
            </Section>
          </TabsContent>
          <TabsContent value="policy" className="mt-4">
            <Section title={`${year} leave policy`}>
              <QueryState
                isLoading={leaveTypes.isLoading}
                error={leaveTypes.error}
                data={leaveTypes.data}
                empty={<EmptyState title="No policy yet" text="Leave types have not been added." />}
              >
                {(types) => (
                  <div className="grid gap-4 p-5 md:grid-cols-3">
                    {types.map((t) => (
                      <div key={t.id} className="border-l-2 border-primary pl-4">
                        <p className="font-bold">{t.name}</p>
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {t.annual_quota} days
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t.is_paid ? "Paid leave." : "Unpaid leave."} Submit requests in advance
                          where possible.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </QueryState>
            </Section>
          </TabsContent>
        </Tabs>
      </div>
      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(o) => !o && setToCancel(null)}
        title="Cancel this leave request?"
        description={
          toCancel
            ? `Your ${typeName(toCancel.leave_type_id).toLowerCase()} request for ${formatRange(toCancel.start_date, toCancel.end_date)} will be deleted.`
            : ""
        }
        confirmLabel="Cancel request"
        pending={cancel.isPending}
        onConfirm={() => toCancel && cancel.mutate(toCancel.id)}
      />
    </AppShell>
  );
}
