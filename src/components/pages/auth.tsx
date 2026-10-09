import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError, FormAlert } from "@/components/data-states";
import { Brand } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(340px,0.8fr)_1.2fr]">
      <section className="flex items-center justify-center bg-card px-5 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 inline-block">
            <Brand dark={false} />
          </Link>
          <p className="text-sm font-bold text-primary">DHA ATTENDANCE</p>
          <h1 className="mt-2 text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-x-0 top-0 h-1 bg-sidebar-primary" />
        <p className="text-sm font-bold text-sidebar-primary">DHA COMPANY · PEOPLE & CULTURE</p>
        <div className="max-w-2xl">
          <p className="text-5xl font-extrabold leading-[1.1]">
            Every workday,
            <br />
            clearly accounted for.
          </p>
          <p className="mt-5 max-w-lg text-lg text-sidebar-foreground/65">
            Attendance, leave, approvals and reporting on a live Supabase database.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/40">Pakistan Standard Time</p>
      </section>
    </main>
  );
}

/** Sends signed-in visitors straight to the dashboard. */
function useRedirectIfSignedIn(target: string) {
  const { loading, session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && session) navigate({ to: target as "/dashboard" });
  }, [loading, session, navigate, target]);
}

const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name (at least 2 characters).")
      .max(80, "Name is too long."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[0-9]/, "Password must include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpPage() {
  useRedirectIfSignedIn("/dashboard");
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState<string | null>(null);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });
  const { isSubmitting, errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError("");
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setServerError(
        /already registered|already exists/i.test(error.message)
          ? "An account with this email already exists. Try signing in instead."
          : error.message,
      );
      return;
    }
    if (data.session) {
      toast.success("Account created", { description: "Welcome to DHA Attendance." });
      navigate({ to: "/dashboard" });
      return;
    }
    setNeedsConfirmation(values.email);
  });

  if (needsConfirmation) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle="One more step before you can sign in."
        footer={
          <Link to="/sign-in" className="font-semibold text-primary">
            Back to sign in
          </Link>
        }
      >
        <FormAlert tone="success">
          <span className="flex items-center gap-2">
            <MailCheck className="size-4" /> Confirmation email sent to{" "}
            <strong>{needsConfirmation}</strong>.
          </span>
          <span className="mt-1 block font-normal">
            Open the link in that email to activate your account, then sign in.
          </span>
        </FormAlert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Sign up with your work email to join the DHA Attendance workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/sign-in" className="font-semibold text-primary">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            className="mt-2 h-11"
            placeholder="Hamza Khan"
            aria-invalid={!!errors.fullName}
            {...form.register("fullName")}
          />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-2 h-11"
            placeholder="you@dha.com"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className="mt-2 h-11"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            <FieldError message={errors.password?.message} />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="mt-2 h-11"
              aria-invalid={!!errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
            <FieldError message={errors.confirmPassword?.message} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">At least 8 characters with one number.</p>
        {serverError && <FormAlert tone="error">{serverError}</FormAlert>}
        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" /> Creating account…
            </>
          ) : (
            <>
              Create account <ArrowRight />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type SignInValues = z.infer<typeof signInSchema>;

export function SignInPage({ redirect }: { redirect?: string | undefined }) {
  useRedirectIfSignedIn(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const { isSubmitting, errors, isSubmitSuccessful } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setServerError(
        /invalid login credentials/i.test(error.message)
          ? "Wrong email or password. Please check your details and try again."
          : /email not confirmed/i.test(error.message)
            ? "Your email is not confirmed yet. Open the confirmation link we sent you."
            : error.message,
      );
      throw error; // keeps isSubmitSuccessful false
    }
    toast.success("Signed in", { description: "Taking you to your dashboard." });
    const target = redirect && redirect.startsWith("/") ? redirect : "/dashboard";
    navigate({ to: target as "/dashboard" });
  });

  return (
    <AuthLayout
      title="Sign in to your workspace"
      subtitle="Use the email and password you registered with."
      footer={
        <>
          New to DHA Attendance?{" "}
          <Link to="/sign-up" className="font-semibold text-primary">
            Create an account
          </Link>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          onSubmit(e).catch(() => undefined);
        }}
        noValidate
        className="space-y-4"
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-2 h-11"
            placeholder="you@dha.com"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-2 h-11"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>
        {serverError && <FormAlert tone="error">{serverError}</FormAlert>}
        {isSubmitSuccessful && !serverError && (
          <FormAlert tone="success">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Signed in. Redirecting…
            </span>
          </FormAlert>
        )}
        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
