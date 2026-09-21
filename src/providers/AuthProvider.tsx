import { createContext, useContext, useEffect, type ReactNode } from "react";
import { insforge, getCurrentAppRole, type AppRole } from "@/lib/insforge";
import { useAuthStore } from "@/store/auth";
import { createMemberAccessRequest } from "@/lib/authRequests";

interface AuthContextValue {
  login: (email: string, password: string) => Promise<void>;
  loginOffline: (role?: AppRole, email?: string) => void;
  register: (email: string, password: string, name: string, badgeId?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Fetch the current user from InsForge, load their profile, and hydrate the
 * Zustand auth store. Falls back to cached local session or emergency air-gapped station if offline.
 */
async function hydrate(
  setSession: (u: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>) => void,
  clearSession: () => void
): Promise<void> {
  // Check if browser is offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    try {
      const cached = localStorage.getItem("tg_authenticated_session");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && parsed.role) {
          setSession(parsed);
          return;
        }
      }
    } catch {}

    const airGapSession = {
      id: "field-officer-airgap-01",
      email: "airgap.officer@trustgate.defense.gov",
      name: "Field Officer (Air-Gapped Standalone Station)",
      role: "admin" as AppRole,
      badgeId: "AIRGAP-001",
      station: "Indo-Nepal ICP Raxaul · Terminal 01 (Offline)",
      team: "Border Defense Rapid Response",
      status: "approved" as const,
    };
    setSession(airGapSession);
    return;
  }

  try {
    const { data, error } = await insforge.auth.getCurrentUser();
    if (error || !data?.user) {
      // Check cached session before clearing
      const cached = localStorage.getItem("tg_authenticated_session");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && parsed.role) {
          setSession(parsed);
          return;
        }
      }
      clearSession();
      return;
    }
    const u = data.user as any;
    const role: AppRole = await getCurrentAppRole();
    const { data: profile } = await insforge.database
      .from("profiles")
      .select("display_name, badge_id, station, team, status, process_id")
      .eq("id", u.id)
      .maybeSingle();
    const p = (profile as Record<string, string | null> | null) ?? {};

    let userStatus: "pending" | "approved" | "rejected" = "approved";
    let processId: string | undefined = p.process_id ?? undefined;

    if (role !== "admin") {
      if (p.status === "rejected") {
        userStatus = "rejected";
      } else if (p.status === "pending" || !p.status) {
        userStatus = "pending";
        // Check or create genuine member_access_requests row
        const { data: reqRows } = await insforge.database
          .from("member_access_requests")
          .select("process_id, status")
          .or(`user_id.eq.${u.id},email.eq.${(u.email ?? "").toLowerCase()}`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (reqRows && reqRows.length > 0) {
          processId = reqRows[0].process_id;
          userStatus = reqRows[0].status as "pending" | "approved" | "rejected";
        } else {
          const newReq = await createMemberAccessRequest({
            email: u.email ?? "",
            displayName: p.display_name ?? u.name ?? "Officer",
            badgeId: p.badge_id ?? undefined,
            station: p.station ?? undefined,
            requestedRole: role,
            userId: u.id,
          });
          processId = newReq.process_id;
          userStatus = newReq.status;
        }
      } else {
        userStatus = "approved";
      }
    }

    const sessionObj = {
      id: u.id,
      email: u.email ?? "",
      name: p.display_name ?? u.name ?? u.email?.split("@")[0] ?? "Officer",
      role,
      badgeId: p.badge_id ?? undefined,
      station: p.station ?? undefined,
      team: p.team ?? undefined,
      status: userStatus,
      processId,
    };
    try {
      localStorage.setItem("tg_authenticated_session", JSON.stringify(sessionObj));
      if (processId) {
        localStorage.setItem("tg_last_process_id", processId);
      }
    } catch {}
    setSession(sessionObj);
  } catch {
    // If remote connection timed out or failed, try cached session
    try {
      const cached = localStorage.getItem("tg_authenticated_session");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && parsed.role) {
          setSession(parsed);
          return;
        }
      }
    } catch {}

    // Fallback to standalone air-gapped operator
    const airGapSession = {
      id: "field-officer-airgap-01",
      email: "airgap.officer@trustgate.defense.gov",
      name: "Field Officer (Air-Gapped Standalone Station)",
      role: "admin" as AppRole,
      badgeId: "AIRGAP-001",
      station: "Indo-Nepal ICP Raxaul · Terminal 01 (Offline)",
      team: "Border Defense Rapid Response",
      status: "approved" as const,
    };
    setSession(airGapSession);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const updateRole = useAuthStore((s) => s.updateRole);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;

    // Restore existing session on mount (handles page refresh)
    hydrate(
      (u) => { if (!cancelled) setSession(u); },
      () => { if (!cancelled) clearSession(); }
    );

    // v1.5 onAuthStateChange callback signature: (event: "signedIn" | "signedOut" | "tokenRefreshed") => void
    // No second session argument — call getCurrentUser() to get the user object.
    const unsubscribe = insforge.auth.onAuthStateChange((event) => {
      if (event === "signedOut") {
        clearSession();
      } else if (event === "signedIn" || event === "tokenRefreshed") {
        hydrate(
          (u) => setSession(u),
          () => clearSession()
        );
      }
    });

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sign in with email + password, or fallback to offline station if disconnected. */
  async function login(email: string, password: string): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      loginOffline("admin", email);
      return;
    }

    try {
      const { error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) {
        if (
          error.message?.toLowerCase().includes("network") ||
          error.message?.toLowerCase().includes("fetch") ||
          error.message?.toLowerCase().includes("failed")
        ) {
          loginOffline("admin", email);
          return;
        }
        throw error;
      }
      await hydrate(
        (u) => setSession(u),
        () => clearSession()
      );
    } catch (err: any) {
      if (
        err.message?.toLowerCase().includes("network") ||
        err.message?.toLowerCase().includes("fetch") ||
        (typeof navigator !== "undefined" && !navigator.onLine)
      ) {
        loginOffline("admin", email);
        return;
      }
      throw err;
    }
  }

  /** Direct access to air-gapped offline station or demo fallback. */
  function loginOffline(role: AppRole = "admin", email?: string): void {
    const demoMeta: Record<string, { name: string; badge: string; station: string }> = {
      "officer@trustgate.ai": {
        name: "Officer Sarah Chen",
        badge: "TG-OFF-702",
        station: "Indo-Nepal ICP Raxaul · Lane 03",
      },
      "supervisor@trustgate.ai": {
        name: "Supervisor Marcus Vance",
        badge: "TG-SUP-104",
        station: "Northern Command HQ · Field Supervisor",
      },
      "admin@trustgate.ai": {
        name: "Chief Security Officer",
        badge: "TG-SEC-001",
        station: "Border Defense National Cyber Command",
      },
      "analyst@trustgate.ai": {
        name: "Border Intelligence Analyst",
        badge: "TG-ANA-409",
        station: "Central Intelligence & Analytics Division",
      },
    };

    const matched = email ? demoMeta[email.toLowerCase()] : undefined;
    const offlineSession = {
      id: "field-officer-airgap-01",
      email: email || "airgap.officer@trustgate.defense.gov",
      name: matched?.name || (role === "admin" ? "Chief Administrator" : "Field Officer"),
      role,
      badgeId: matched?.badge || "AIRGAP-001",
      station: matched?.station || "Indo-Nepal ICP Raxaul · Terminal 01 (Offline)",
      team: "Border Defense Rapid Response",
      status: "approved" as const,
    };
    try {
      localStorage.setItem("tg_authenticated_session", JSON.stringify(offlineSession));
    } catch {}
    setSession(offlineSession);
  }

  /**
   * Register a new user and — since email verification is now disabled —
   * immediately sign them in so they land on the dashboard.
   */
  async function register(
    email: string,
    password: string,
    name: string,
    _badgeId?: string
  ): Promise<void> {
    const { data, error } = await insforge.auth.signUp({ email, password, name });
    if (error) throw error;

    // If a badgeId was supplied, update the profile row before hydrate
    if (_badgeId && data?.user?.id) {
      try {
        await insforge.database
          .from("profiles")
          .update({ badge_id: _badgeId })
          .eq("id", data.user.id);
      } catch {}
    }

    // signUp succeeds → sign in
    const { error: le } = await insforge.auth.signInWithPassword({ email, password });
    if (le) throw le;

    await hydrate(
      (u) => setSession(u),
      () => clearSession()
    );
  }

  /** Sign out and wipe both remote and local auth store. */
  async function logout(): Promise<void> {
    try {
      localStorage.removeItem("tg_authenticated_session");
      await insforge.auth.signOut();
    } catch {}
    clearSession();
  }

  /**
   * Send a password-reset email (OTP code method).
   * The user clicks the link → `/reset-password?otp=<code>` → `ResetPasswordPage`.
   */
  async function sendPasswordReset(email: string): Promise<void> {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await insforge.auth.sendResetPasswordEmail({ email, redirectTo });
    if (error) throw error;
  }

  /**
   * In-session "change password":
   * InsForge v1.5 requires an OTP code to reset passwords, so we trigger the
   * email-based reset flow and inform the caller via a thrown info-level Error.
   * The Settings UI catches this and shows it as a success message.
   */
  async function updatePassword(_newPassword: string): Promise<void> {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.email) throw new Error("Not authenticated");
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await insforge.auth.sendResetPasswordEmail({
      email: currentUser.email,
      redirectTo,
    });
    if (error) throw error;
    // Throw an info message — the Settings page detects the keyword "reset link"
    throw new Error(
      `A password reset link has been sent to ${currentUser.email}. ` +
        "Follow the link in your inbox to set your new password."
    );
  }

  /** Re-fetch the user's highest role from the DB and update the store. */
  async function refreshRole(): Promise<void> {
    if (!user) return;
    const role = await getCurrentAppRole();
    updateRole(role);
  }

  return (
    <AuthContext.Provider value={{ login, loginOffline, register, logout, sendPasswordReset, updatePassword, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export { useAuthStore };
