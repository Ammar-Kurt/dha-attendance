import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, EmptyState, QueryState, Section } from "@/components/data-states";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationRow } from "@/lib/db-types";
import { useAuth } from "@/lib/auth";
import { formatDateTime, getErrorMessage } from "@/lib/format";
import { unwrap } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<NotificationRow | null>(null);
  const items = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ),
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-count"] });
  };

  const markRead = useMutation({
    mutationFn: async (id: string | "all") => {
      const q = supabase.from("notifications").update({ is_read: true });
      const { error } = id === "all" ? await q.eq("is_read", false) : await q.eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e) => toast.error("Couldn't update", { description: getErrorMessage(e) }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast.success("Notification deleted");
    },
    onError: (e) => toast.error("Couldn't delete", { description: getErrorMessage(e) }),
  });

  const unread = (items.data ?? []).filter((i) => !i.is_read).length;

  return (
    <AppShell
      title="Notifications"
      eyebrow="Updates"
      actions={
        <Button
          variant="outline"
          disabled={unread === 0 || markRead.isPending}
          onClick={() => markRead.mutate("all")}
        >
          Mark all read
        </Button>
      }
    >
      <Section title="Recent notifications" subtitle={`${unread} unread`}>
        <QueryState
          isLoading={items.isLoading}
          error={items.error}
          data={items.data}
          onRetry={() => items.refetch()}
          empty={
            <EmptyState
              icon={Bell}
              title="You're all caught up"
              text="Approvals and corrections will notify you here."
            />
          }
        >
          {(rows) => (
            <div className="divide-y">
              {rows.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-5 hover:bg-muted/40"
                >
                  <button
                    type="button"
                    aria-label={item.is_read ? "Read" : "Mark as read"}
                    onClick={() => !item.is_read && markRead.mutate(item.id)}
                    className={cn(
                      "mt-1.5 size-2.5 rounded-full",
                      item.is_read ? "bg-muted" : "bg-primary",
                    )}
                  />
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => !item.is_read && markRead.mutate(item.id)}
                  >
                    <span className={cn("block", item.is_read ? "font-semibold" : "font-bold")}>
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{item.body}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatDateTime(item.created_at)}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete notification"
                    onClick={() => setToDelete(item)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </Section>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this notification?"
        description={toDelete?.title ?? ""}
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </AppShell>
  );
}
