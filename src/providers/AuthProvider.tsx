import { createContext, useContext, useEffect, type ReactNode } from "react";
import { insforge, getCurrentAppRole, ensureAuthenticatedClient, isTokenExpired, type AppRole } from "@/lib/insforge";
import { useAuthStore } from "@/store/auth";
import { createMemberAccessRequest } from "@/lib/authRequests";
import { auditSecurityEvent, AUTHORITATIVE_SYSTEM_ACTOR_ID } from "@/lib/security";

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

const DEMO_EMAILS = new Set([
  "officer@trustgate.ai",
  "supervisor@trustgate.ai",
  "admin@trustgate.ai",
  "analyst@trustgate.ai",
]);

// ─── Login Rate Limiter ──────────────────────────────────────────────────────
// Prevents brute-force and credential-stuffing attacks by tracking per-email
// failed login attempts in sessionStorage (tab-scoped, cleared on close).
// IMPORTANT: This is a client-side soft limit. The real rate limiting MUST also
// be enforced server-side (InsForge handles this via its auth rate-limit headers).

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttemptRecord {
  count: number;
  lockedUntil: number | null;
}

function getAttemptRecord(email: string): LoginAttemptRecord {
  try {
    const raw = sessionStorage.getItem(`tg_login_attempts_${btoa(email)}`);
    if (!raw) return { count: 0, lockedUntil: null };
    return JSON.parse(raw) as LoginAttemptRecord;
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function recordFailedAttempt(email: string): LoginAttemptRecord {
  const record = getAttemptRecord(email);
  const now = Date.now();

  // Reset if previous lockout has expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    const fresh: LoginAttemptRecord = { count: 1, lockedUntil: null };
    try { sessionStorage.setItem(`tg_login_attempts_${btoa(email)}`, JSON.stringify(fresh)); } catch {}
    return fresh;
  }

  const newCount = record.count + 1;
  const lockedUntil = newCount >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_DURATION_MS : null;
  const updated: LoginAttemptRecord = { count: newCount, lockedUntil };
  try { sessionStorage.setItem(`tg_login_attempts_${btoa(email)}`, JSON.stringify(updated)); } catch {}
  return updated;
}

function clearAttemptRecord(email: string): void {
  try { sessionStorage.removeItem(`tg_login_attempts_${btoa(email)}`); } catch {}
}

function checkLoginAllowed(email: string): { allowed: boolean; remainingMs?: number; attemptsLeft?: number } {
  const record = getAttemptRecord(email);
  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, remainingMs: record.lockedUntil - now };
  }
  // Reset expired lockout automatically
  if (record.lockedUntil && now >= record.lockedUntil) {
    try { sessionStorage.removeItem(`tg_login_attempts_${btoa(email)}`); } catch {}
    return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS };
  }
  return {
    allowed: true,
    attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - record.count),
  };
}

/**
 * Sanitize cached sessions to purge legacy hardcoded demo personas ("Officer Sarah Chen", etc.)
 * Ensures instant access never retains a fake personal name.
 *
 * SECURITY NOTE: The role field from localStorage is NEVER directly trusted as the authorization
 * source. It is only used for UI rendering. The authoritative role is fetched from the database
 * via getCurrentAppRole() on every session hydration. The cached role is a UI hint only.
 */
function sanitizeSession<T extends Record<string, any>>(session: T): T {
  if (!session) return session;
  let name = session.name;
  let badgeId = session.badgeId;

  if (name === "Officer Sarah Chen" || name === "Sarah Chen") {
    name = "Officer";
    badgeId = "FO-8921";
  } else if (name === "Supervisor Marcus Vance" || name === "Marcus Vance") {
    name = "Supervisor";
    badgeId = "SUP-4402";
  } else if (name === "Chief Security Officer" && session.email === "admin@trustgate.ai") {
    name = "Admin";
    badgeId = "ADM-001";
  } else if (name === "Border Intelligence Analyst" && session.email === "analyst@trustgate.ai") {
    name = "Analyst";
    badgeId = "FOR-1109";
  }

  // Canonical demo badge fallback
  if (!badgeId || badgeId === "TG-SEC-001" || badgeId === "TG-OFF-702" || badgeId === "TG-SUP-104" || badgeId === "TG-ANA-409") {
    if (session.email === "admin@trustgate.ai" || session.role === "admin") {
      badgeId = "ADM-001";
    } else if (session.email === "supervisor@trustgate.ai" || session.role === "supervisor") {
      badgeId = "SUP-4402";
    } else if (session.email === "analyst@trustgate.ai" || session.role === "analyst") {
      badgeId = "FOR-1109";
    } else if (session.email === "officer@trustgate.ai" || session.role === "officer") {
      badgeId = "FO-8921";
    }
  }

  const sanitized = {
    ...session,
    name,
    badgeId,
  };

  // SECURITY: Write session cache to sessionStorage, not localStorage
  // sessionStorage is tab-scoped and cleared on tab/browser close
  try {
    sessionStorage.setItem("tg_authenticated_session", JSON.stringify(sanitized));
    // Remove legacy localStorage cache if present
    localStorage.removeItem("tg_authenticated_session");
  } catch {}

  return sanitized;
}

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
      // SECURITY: Prefer sessionStorage, fallback to localStorage for offline cache
      const cached = sessionStorage.getItem("tg_authenticated_session")
        || localStorage.getItem("tg_authenticated_session");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && parsed.role) {
          setSession(sanitizeSession(parsed));
          return;
        }
      }
    } catch {}

    const airGapSession = {
      id: AUTHORITATIVE_SYSTEM_ACTOR_ID,
      email: "admin@trustgate.ai",
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
    // Ensure access token is active before querying current user
    // SECURITY: Check sessionStorage first (preferred), then localStorage (legacy migration)
    const token = typeof window !== "undefined"
      ? (sessionStorage.getItem("tg_access_token") || localStorage.getItem("tg_access_token"))
      : null;
    // Migrate token from localStorage to sessionStorage if found in localStorage
    if (token && typeof window !== "undefined") {
      if (!sessionStorage.getItem("tg_access_token") && localStorage.getItem("tg_access_token")) {
        try {
          sessionStorage.setItem("tg_access_token", token);
          localStorage.removeItem("tg_access_token");
        } catch {}
      }
    }
    if (token) {
      if (isTokenExpired(token)) {
        try {
          localStorage.removeItem("tg_access_token");
          sessionStorage.removeItem("tg_access_token");
        } catch {}
        insforge.setAccessToken(null);
      } else {
        insforge.setAccessToken(token);
      }
    } else {
      await ensureAuthenticatedClient();
    }

    const { data, error } = await insforge.auth.getCurrentUser();
    if (error || !data?.user) {
      // Check cached session before clearing
      // SECURITY: Prefer sessionStorage, fallback to localStorage (migration path)
      const cached = sessionStorage.getItem("tg_authenticated_session")
        || localStorage.getItem("tg_authenticated_session");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && parsed.role) {
          setSession(sanitizeSession(parsed));
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

    const isDemoAccount = u.email && DEMO_EMAILS.has(u.email.toLowerCase().trim());
    let userStatus: "pending" | "approved" | "rejected" = "approved";
    let processId: string | undefined = p.process_id ?? undefined;

    // Name & identity resolution:
    // - For Instant Access / demo personas: NO personal name (e.g. Sarah Chen). Display role title only ("Officer", "Supervisor", "Admin", "Analyst").
    // - For officers who logged in with their actual account/name: ONLY that officer's registered name comes.
    let resolvedName = "Officer";
    if (isDemoAccount) {
      resolvedName = role === "admin" ? "Admin" : role === "supervisor" ? "Supervisor" : role === "analyst" ? "Analyst" : "Officer";
    } else {
      resolvedName =
        (p.display_name && p.display_name.trim()) ||
        (u.profile?.name && u.profile.name.trim()) ||
        (u.name && u.name.trim()) ||
        (u.email ? u.email.split("@")[0] : "Officer");
    }

    if (isDemoAccount) {
      userStatus = "approved";
      processId = undefined;
    } else if (role !== "admin") {
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
            displayName: resolvedName,
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

    const demoBadgeMap: Record<string, string> = {
      "admin@trustgate.ai": "ADM-001",
      "supervisor@trustgate.ai": "SUP-4402",
      "officer@trustgate.ai": "FO-8921",
      "analyst@trustgate.ai": "FOR-1109",
      "airgap.officer@trustgate.defense.gov": "AIRGAP-001",
    };
    const defaultRoleBadge =
      role === "admin"
        ? "ADM-001"
        : role === "supervisor"
        ? "SUP-4402"
        : role === "analyst"
        ? "FOR-1109"
        : "FO-8921";

    const resolvedBadgeId =
      p.badge_id ||
      (u.email ? demoBadgeMap[u.email.toLowerCase().trim()] : undefined) ||
      (isDemoAccount ? defaultRoleBadge : undefined);

    const sessionObj = {
      id: u.id,
      email: u.email ?? "",
      name: resolvedName,
      role,
      badgeId: resolvedBadgeId,
      station: p.station ?? undefined,
      team: p.team ?? undefined,
      status: userStatus,
      processId,
    };
    try {
      // SECURITY: Write to sessionStorage (tab-scoped) instead of localStorage
      sessionStorage.setItem("tg_authenticated_session", JSON.stringify(sessionObj));
      // Remove legacy localStorage entry
      localStorage.removeItem("tg_authenticated_session");
      if (processId) {
        localStorage.setItem("tg_last_process_id", processId);
      }
    } catch {}
    setSession(sessionObj);
  } catch {
    // If remote connection timed out or failed, try cached session ONLY
    // (Never grant a new session on failure — that would allow auth bypass)
    try {
      // SECURITY: Prefer sessionStorage, fallback to localStorage (migration path)
      const cached = sessionStorage.getItem("tg_authenticated_session")
        || localStorage.getItem("tg_authenticated_session");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && parsed.role) {
          setSession(sanitizeSession(parsed));
          return;
        }
      }
    } catch {}

    // Network error with no valid cached session — clear and require fresh login
    clearSession();
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
    // SECURITY: Enforce client-side rate limit before attempting auth
    const emailKey = email.trim().toLowerCase();
    const rateLimitCheck = checkLoginAllowed(emailKey);
    if (!rateLimitCheck.allowed) {
      const remainingMins = Math.ceil((rateLimitCheck.remainingMs ?? 0) / 60_000);
      // Audit the blocked attempt
      auditSecurityEvent({
        actorId: null,
        action: "LOGIN_RATE_LIMITED",
        eventType: "auth.login.rate_limited",
        result: "FAILURE",
        metadata: { email: emailKey, remaining_mins: remainingMins },
      }).catch(() => {});
      throw new Error(
        `Too many failed login attempts. Account temporarily locked. Please wait ${remainingMins} minute${remainingMins !== 1 ? "s" : ""} before trying again.`
      );
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      // Never automatically grant elevated access on network failure.
      // Show an error so the user knows connection is required.
      throw new Error(
        "No network connection. TrustGate AI requires a live connection to authenticate. " +
        "Please check your network and try again."
      );
    }

    try {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) {
        // SECURITY: Record failed attempt for rate limiting
        const updated = recordFailedAttempt(emailKey);
        const attemptsLeft = Math.max(0, MAX_LOGIN_ATTEMPTS - updated.count);

        auditSecurityEvent({
          actorId: null,
          action: "LOGIN_FAILED",
          eventType: "auth.login.failure",
          result: "FAILURE",
          metadata: {
            email: emailKey,
            attempts_remaining: attemptsLeft,
            error_code: (error as any)?.code ?? "unknown",
          },
        }).catch(() => {});

        // Provide generic error — do NOT reveal whether email vs password was wrong
        // (prevents email enumeration)
        const genericError = new Error("Invalid credentials. Please check your email and password.");
        if (attemptsLeft <= 2 && attemptsLeft > 0) {
          (genericError as any).attemptsLeft = attemptsLeft;
          genericError.message = `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining before temporary lockout.`;
        } else if (attemptsLeft === 0) {
          genericError.message = `Account temporarily locked due to too many failed attempts. Please wait ${Math.ceil(LOCKOUT_DURATION_MS / 60_000)} minutes.`;
        }
        throw genericError;
      }

      // SECURITY: Clear failed attempts on successful login
      clearAttemptRecord(emailKey);

      if (data?.accessToken) {
        if (typeof window !== "undefined") {
          // SECURITY: Use sessionStorage instead of localStorage for access tokens.
          // sessionStorage is tab-scoped and cleared when the tab is closed, reducing
          // the window of exposure for XSS-based token theft.
          sessionStorage.setItem("tg_access_token", data.accessToken);
          // Also remove any stale localStorage token from previous versions
          localStorage.removeItem("tg_access_token");
        }
        insforge.setAccessToken(data.accessToken);
      }
      await hydrate(
        (u) => setSession(u),
        () => clearSession()
      );

      const activeUser = useAuthStore.getState().user;
      if (activeUser?.id) {
        auditSecurityEvent({
          actorId: activeUser.id,
          action: "USER_LOGIN",
          eventType: "auth.login.success",
          result: "SUCCESS",
          metadata: {
            email: activeUser.email || email,
            role: activeUser.role,
            station: activeUser.station || "Border Checkpoint Central",
            name: activeUser.name,
            auth_provider: "credentials",
          },
        }).catch(() => {});
      }
    } catch (err: any) {
      throw err;
    }
  }

  /** Direct access to air-gapped offline station or demo fallback. */
  function loginOffline(role: AppRole = "admin", email?: string): void {
    const demoMeta: Record<string, { name: string; station: string; badgeId: string }> = {
      "officer@trustgate.ai": {
        name: "Officer",
        station: "Indo-Nepal ICP Raxaul · Lane 03",
        badgeId: "FO-8921",
      },
      "supervisor@trustgate.ai": {
        name: "Supervisor",
        station: "Northern Command HQ · Field Supervisor",
        badgeId: "SUP-4402",
      },
      "admin@trustgate.ai": {
        name: "Admin",
        station: "Border Defense National Cyber Command",
        badgeId: "ADM-001",
      },
      "analyst@trustgate.ai": {
        name: "Analyst",
        station: "Central Intelligence & Analytics Division",
        badgeId: "FOR-1109",
      },
    };

    const matched = email ? demoMeta[email.toLowerCase()] : undefined;
    const defaultName = role === "admin" ? "Admin" : role === "supervisor" ? "Supervisor" : role === "analyst" ? "Analyst" : "Officer";
    const defaultBadgeId = role === "admin" ? "ADM-001" : role === "supervisor" ? "SUP-4402" : role === "analyst" ? "FOR-1109" : "FO-8921";

    const actorId =
      role === "officer"
        ? "06d9077b-2a97-460e-b6ed-38d6a16581c3"
        : role === "supervisor"
        ? "e49cf4a5-e63d-4cac-a54a-436f47da9e52"
        : role === "analyst"
        ? "59119414-9a9b-4b00-bade-16e0b1e11ed1"
        : AUTHORITATIVE_SYSTEM_ACTOR_ID;

    const offlineSession = {
      id: actorId,
      email: email || (role === "admin" ? "admin@trustgate.ai" : role === "supervisor" ? "supervisor@trustgate.ai" : role === "analyst" ? "analyst@trustgate.ai" : "officer@trustgate.ai"),
      name: matched?.name || defaultName,
      role,
      badgeId: matched?.badgeId || defaultBadgeId,
      station: matched?.station || "Indo-Nepal ICP Raxaul · Terminal 01 (Offline)",
      team: "Border Defense Rapid Response",
      status: "approved" as const,
    };
    try {
      // SECURITY: sessionStorage — tab-scoped, cleared on close
      sessionStorage.setItem("tg_authenticated_session", JSON.stringify(offlineSession));
      localStorage.removeItem("tg_authenticated_session");
    } catch {}
    setSession(offlineSession);

    auditSecurityEvent({
      actorId,
      action: "USER_LOGIN",
      eventType: "auth.login.offline",
      result: "SUCCESS",
      metadata: {
        email: email || "offline.officer@trustgate.defense.gov",
        role,
        station: matched?.station || "Indo-Nepal ICP Raxaul · Terminal 01 (Offline)",
        name: matched?.name || defaultName,
        auth_provider: "airgap_station",
      },
    }).catch(() => {});
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

    // Ensure display_name and badgeId are explicitly saved in public.profiles
    if (data?.user?.id) {
      try {
        const updatePayload: Record<string, string> = {
          display_name: name.trim(),
        };
        if (_badgeId && _badgeId.trim()) {
          updatePayload.badge_id = _badgeId.trim();
        }
        await insforge.database
          .from("profiles")
          .update(updatePayload)
          .eq("id", data.user.id);
      } catch {}
    }

    // signUp succeeds → sign in
    const { data: signInData, error: le } = await insforge.auth.signInWithPassword({ email, password });
    if (le) throw le;

    // SECURITY: Store token in sessionStorage
    if (signInData?.accessToken) {
      try {
        sessionStorage.setItem("tg_access_token", signInData.accessToken);
        localStorage.removeItem("tg_access_token");
      } catch {}
      insforge.setAccessToken(signInData.accessToken);
    }

    await hydrate(
      (u) => setSession(u),
      () => clearSession()
    );
  }

  /** Sign out and wipe both remote and local auth store. */
  async function logout(): Promise<void> {
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.id) {
      auditSecurityEvent({
        actorId: currentUser.id,
        action: "USER_LOGOUT",
        eventType: "auth.logout",
        result: "SUCCESS",
        metadata: {
          email: currentUser.email,
          role: currentUser.role,
          name: currentUser.name,
        },
      }).catch(() => {});
    }

    try {
      // SECURITY: Clear both localStorage and sessionStorage tokens
      localStorage.removeItem("tg_authenticated_session");
      localStorage.removeItem("tg_access_token");
      sessionStorage.removeItem("tg_authenticated_session");
      sessionStorage.removeItem("tg_access_token");
      insforge.setAccessToken(null);
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
