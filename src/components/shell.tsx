import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Palmtree,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/db-types";
import { roleLabels, useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const allRoles: AppRole[] = ["employee", "manager", "hr_admin", "system_admin"];
const staffRoles: AppRole[] = ["manager", "hr_admin", "system_admin"];
const adminRoles: AppRole[] = ["hr_admin", "system_admin"];

export const navItems: { label: string; to: string; icon: typeof Users; roles: AppRole[] }[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: allRoles },
  { label: "My Attendance", to: "/attendance", icon: CalendarDays, roles: allRoles },
  { label: "Leave", to: "/leave", icon: Palmtree, roles: allRoles },
  { label: "Team Attendance", to: "/team-attendance", icon: Users, roles: staffRoles },
  { label: "Approvals", to: "/approvals", icon: CheckCircle2, roles: staffRoles },
  { label: "Employees", to: "/employees", icon: CircleUserRound, roles: adminRoles },
  { label: "Departments & Shifts", to: "/organization", icon: Building2, roles: adminRoles },
  { label: "Leave & Holidays", to: "/leave-holidays", icon: CalendarDays, roles: adminRoles },
  { label: "Reports", to: "/reports", icon: FileText, roles: staffRoles },
  { label: "Users & Roles", to: "/users", icon: UserCog, roles: ["system_admin"] },
  { label: "Audit Log", to: "/audit-log", icon: History, roles: adminRoles },
];

export function Brand({ compact = false, dark = true }: { compact?: boolean; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary font-extrabold text-primary-foreground">
        D
      </div>
      {!compact && (
        <div>
          <p className={cn("font-extrabold", dark ? "text-sidebar-foreground" : "text-foreground")}>
            DHA Attendance
          </p>
          <p
            className={cn("text-xs", dark ? "text-sidebar-foreground/60" : "text-muted-foreground")}
          >
            People Operations
          </p>
        </div>
      )}
    </div>
  );
}

function usePendingCount() {
  const { isStaff, user } = useAuth();
  return useQuery({
    queryKey: ["pending-count"],
    enabled: isStaff && !!user,
    queryFn: async () => {
      const [leave, corrections] = await Promise.all([
        supabase
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("correction_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      return (leave.count ?? 0) + (corrections.count ?? 0);
    },
  });
}

function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
  });
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const pending = usePendingCount();
  const visible = navItems.filter((item) => item.roles.includes(role));
  return (
    <nav className="mt-8 space-y-1" aria-label="Main navigation">
      {visible.map((item) => {
        const active = path === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-[18px] shrink-0" />
            <span>{item.label}</span>
            {item.to === "/approvals" && (pending.data ?? 0) > 0 && (
              <span className="ml-auto rounded-full bg-warning px-2 py-0.5 text-[10px] text-foreground">
                {pending.data}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      className={cn(
        "w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        className,
      )}
      onClick={async () => {
        setBusy(true);
        await signOut();
        toast.success("Signed out");
        navigate({ to: "/" });
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <LogOut />} Sign out
    </Button>
  );
}

function UserCard() {
  const { profile, role, user } = useAuth();
  const name = profile?.full_name ?? user?.email ?? "Account";
  return (
    <div className="border-t border-sidebar-border pt-4">
      <Link
        to="/profile"
        className="flex items-center gap-3 rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <div className="grid size-9 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{roleLabels[role]}</p>
        </div>
      </Link>
      <SignOutButton className="mt-1" />
    </div>
  );
}

function MobileDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col border-sidebar-border bg-sidebar p-5">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <UserCard />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Wraps protected content: waits for the auth check, redirects signed-out users to /sign-in,
 * and blocks pages the current role may not open.
 */
export function Protected({ roles, children }: { roles?: AppRole[]; children: ReactNode }) {
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/sign-in", search: { redirect: window.location.pathname } });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background" role="status">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Checking your session…
        </div>
      </div>
    );
  }

  if (roles && !roles.includes(role)) {
    return (
      <AppShell title="No access" eyebrow="Restricted">
        <div className="grid min-h-64 place-items-center rounded-lg border bg-card p-8 text-center shadow-sm">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-danger-soft">
              <ShieldAlert className="size-5 text-destructive" />
            </div>
            <h2 className="mt-3 font-extrabold">This page needs a different role</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your account is signed in as <strong>{roleLabels[role]}</strong>. Ask a system
              administrator if you need access.
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}

export function AppShell({
  title,
  eyebrow,
  children,
  actions,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const unread = useUnreadCount();
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <UserCard />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-card/95 px-4 backdrop-blur md:px-7">
          <MobileDrawer />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase text-primary">
              {eyebrow ?? "DHA Company"}
            </p>
            <h1 className="truncate text-lg font-extrabold md:text-xl">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" size="icon">
              <Link to="/notifications" aria-label="Notifications" className="relative">
                <Bell />
                {(unread.data ?? 0) > 0 && (
                  <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />
                )}
              </Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 pb-24 md:p-7 lg:pb-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{today} · PKT</p>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card px-1 py-1 lg:hidden"
        aria-label="Mobile navigation"
      >
        {[
          { label: "Home", to: "/dashboard", icon: Gauge },
          { label: "Attendance", to: "/attendance", icon: Clock3 },
          { label: "Leave", to: "/leave", icon: Palmtree },
          { label: "Alerts", to: "/notifications", icon: Bell },
          { label: "Profile", to: "/profile", icon: CircleUserRound },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: "text-primary bg-accent" }}
            className="flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-bold text-muted-foreground"
          >
            <item.icon className="size-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
