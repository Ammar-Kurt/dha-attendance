import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Palmtree,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shell";
import { useAuth } from "@/lib/auth";

const features = [
  {
    icon: Clock3,
    title: "One-tap check-in",
    text: "Employees check in and out from any device. Late arrivals are flagged automatically against their shift.",
  },
  {
    icon: Palmtree,
    title: "Leave that reviews itself",
    text: "Submit annual, sick or casual leave. Managers approve in one click and balances update instantly.",
  },
  {
    icon: Users,
    title: "Live team register",
    text: "Managers see who is present, late or away right now, with search across the whole department.",
  },
  {
    icon: BarChart3,
    title: "Reports you can export",
    text: "Monthly attendance summaries by department, exported to CSV for payroll and audits.",
  },
];

const steps = [
  {
    title: "Create your account",
    text: "Sign up with your work email. Your employee profile is created for you.",
  },
  {
    title: "Check in every day",
    text: "Record attendance, request corrections and plan leave from the dashboard.",
  },
  {
    title: "Let HR run the rest",
    text: "Approvals, departments, shifts, holidays and audit logs live in one place.",
  },
];

export function LandingPage() {
  const { session, loading } = useAuth();
  const signedIn = !loading && !!session;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Brand dark={false} />
          <nav
            className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex"
            aria-label="Site"
          >
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild>
                <Link to="/dashboard">
                  Open dashboard <ArrowRight />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/sign-in">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-sidebar text-sidebar-foreground">
          <div className="absolute inset-x-0 top-0 h-1 bg-sidebar-primary" />
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:px-6 md:py-24">
            <div>
              <p className="text-sm font-bold text-sidebar-primary">
                DHA COMPANY · PEOPLE & CULTURE
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] md:text-6xl">
                Every workday,
                <br />
                clearly accounted for.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-sidebar-foreground/65">
                A focused workspace for attendance, leave planning, approvals and workforce
                reporting, backed by a live database with per-user security.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                >
                  <Link to={signedIn ? "/dashboard" : "/sign-up"}>
                    {signedIn ? "Go to dashboard" : "Get started"} <ArrowRight />
                  </Link>
                </Button>
                {!signedIn && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Link to="/sign-in">Sign in</Link>
                  </Button>
                )}
              </div>
              <p className="mt-6 flex items-center gap-2 text-xs text-sidebar-foreground/50">
                <ShieldCheck className="size-4 text-sidebar-primary" /> Row Level Security keeps
                every employee's records private to them and their managers.
              </p>
            </div>
            <div className="grid gap-4 self-center sm:grid-cols-2 md:grid-cols-1">
              {[
                { icon: CalendarCheck2, label: "Attendance rate", value: "94.2%" },
                { icon: Users, label: "Departments & shifts", value: "Configurable" },
                { icon: CheckCircle2, label: "Approvals", value: "One click" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-4 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-4"
                >
                  <div className="grid size-11 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                    <stat.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold">{stat.value}</p>
                    <p className="text-sm text-sidebar-foreground/60">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <p className="text-sm font-bold uppercase text-primary">Features</p>
          <h2 className="mt-2 text-3xl font-extrabold">Everything HR needs, nothing it doesn't</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="grid size-10 place-items-center rounded-md bg-info-soft text-primary">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-extrabold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-t bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <p className="text-sm font-bold uppercase text-primary">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold">Up and running in three steps</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="border-l-2 border-primary pl-4">
                  <p className="text-sm font-bold text-primary">Step {i + 1}</p>
                  <h3 className="mt-1 font-extrabold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
            {!signedIn && (
              <Button asChild size="lg" className="mt-10">
                <Link to="/sign-up">
                  Create your account <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p>© 2026 DHA Company · People Operations</p>
          <p>Built with Lovable · Supabase · Pakistan Standard Time</p>
        </div>
      </footer>
    </div>
  );
}
