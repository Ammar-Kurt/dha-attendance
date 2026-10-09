import { AlertCircle, FileText, Loader2, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { labelFor } from "@/lib/format";
import { cn } from "@/lib/utils";

const successStatuses = new Set(["present", "approved", "active", "Active", "Yes", "Paid"]);
const warningStatuses = new Set(["late", "pending", "half_day"]);
const dangerStatuses = new Set(["absent", "rejected", "inactive", "Inactive", "cancelled", "No"]);

export function StatusBadge({ status }: { status: string }) {
  const style = successStatuses.has(status)
    ? "bg-success-soft text-success"
    : warningStatuses.has(status)
      ? "bg-warning-soft text-warning"
      : dangerStatuses.has(status)
        ? "bg-danger-soft text-destructive"
        : "bg-info-soft text-primary";
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", style)}
    >
      {labelFor(status)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const tones = {
    primary: "bg-info-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-destructive",
  };
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-extrabold">{value}</p>
        </div>
        <div className={cn("grid size-10 place-items-center rounded-md", tones[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <div className="min-w-0">
          <h2 className="truncate font-extrabold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="bg-muted/70">
            {headers.map((h) => (
              <th key={h} className="px-5 py-3 text-xs font-bold uppercase text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t transition-colors hover:bg-muted/35">
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-3.5 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon: Icon = FileText,
}: {
  title: string;
  text: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="grid min-h-52 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <h3 className="mt-3 font-bold">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export function LoadingState({ rows = 4, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-3 p-5" role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
      <p className="sr-only">{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  title = "Couldn't load this data",
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="grid min-h-52 place-items-center p-8 text-center" role="alert">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-danger-soft">
          <AlertCircle className="size-5 text-destructive" />
        </div>
        <h3 className="mt-3 font-bold">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-destructive" role="alert">
      <AlertCircle className="size-3" /> {message}
    </p>
  );
}

export function FormAlert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md p-3 text-sm font-semibold",
        tone === "error" ? "bg-danger-soft text-destructive" : "bg-success-soft text-success",
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function SavingLabel({ saving, children }: { saving: boolean; children: ReactNode }) {
  return saving ? (
    <>
      <Loader2 className="animate-spin" /> Saving…
    </>
  ) : (
    <>{children}</>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={cn(
              destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" /> Working…
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Renders loading / error / empty / content for a list query in one place. */
export function QueryState<T>({
  isLoading,
  error,
  data,
  onRetry,
  empty,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  data: T[] | undefined;
  onRetry?: () => void;
  empty: ReactNode;
  children: (rows: T[]) => ReactNode;
}) {
  if (isLoading) return <LoadingState />;
  if (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Unexpected error.";
    return <ErrorState message={message} {...(onRetry ? { onRetry } : {})} />;
  }
  if (!data || data.length === 0) return <>{empty}</>;
  return <>{children(data)}</>;
}
