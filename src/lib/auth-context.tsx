import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSessionUser } from "@/lib/api/school.functions";
import type { SessionUser } from "@/lib/api/types";
import type { AppRole } from "@/config/app.config";

interface AuthContextValue {
  session: Session | null;
  user: SessionUser | null;
  /** True until the initial session check has resolved. */
  initialising: boolean;
  profileLoading: boolean;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Owns the browser session. A single `onAuthStateChange` subscriber lives here
 * (never per-page) and keeps both the router and the query cache coherent.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialising, setInitialising] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitialising(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  const { data: user, isLoading: profileLoading } = useQuery({
    queryKey: ["session-user", session?.user.id],
    queryFn: () => getSessionUser(),
    enabled: Boolean(session),
    staleTime: 60_000,
  });

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }, [queryClient, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: user ?? null,
      initialising,
      profileLoading: Boolean(session) && profileLoading,
      hasRole: (role) => Boolean(user?.roles.includes(role)),
      isAdmin: Boolean(user?.isAdmin),
      isStaff: Boolean(user?.isStaff),
      signOut,
    }),
    [session, user, initialising, profileLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
