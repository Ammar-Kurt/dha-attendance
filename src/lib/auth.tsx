import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, ProfileRow } from "@/lib/db-types";

export const roleLabels: Record<AppRole, string> = {
  employee: "Employee",
  manager: "Manager",
  hr_admin: "HR Admin",
  system_admin: "System Admin",
};

type AuthContextValue = {
  /** true until the first session check has completed in the browser */
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  role: AppRole;
  isStaff: boolean;
  isAdmin: boolean;
  isSystemAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<AppRole>("employee");

  const loadProfile = useCallback(async (userId: string) => {
    const [{ data: profileData }, { data: roleData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile(profileData ?? null);
    setRole(roleData?.role ?? "employee");
  }, []);

  useEffect(() => {
    let active = true;

    // Listener first, then the initial session read, so no auth event is missed.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        // Defer Supabase calls out of the auth callback to avoid deadlocks.
        setTimeout(() => {
          if (active) void loadProfile(nextSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRole("employee");
        queryClient.clear();
      }
    });

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session?.user) await loadProfile(data.session.user.id);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile, queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const isSystemAdmin = role === "system_admin";
    const isAdmin = isSystemAdmin || role === "hr_admin";
    const isStaff = isAdmin || role === "manager";
    return {
      loading,
      session,
      user: session?.user ?? null,
      profile,
      role,
      isStaff,
      isAdmin,
      isSystemAdmin,
      refreshProfile: async () => {
        if (session?.user) await loadProfile(session.user.id);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setRole("employee");
        queryClient.clear();
      },
    };
  }, [loading, session, profile, role, loadProfile, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing");
  return context;
}
