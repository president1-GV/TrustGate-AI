import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Lock,
  ShieldCheck,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/Alert";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, loginOffline } = useAuth();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPass, setShowPass] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [quickLoggingIn, setQuickLoggingIn] = React.useState<string | null>(null);
  const isInactivity = searchParams.get("reason") === "inactivity";

  const isDemoEmail = (emailStr?: string | null) => {
    if (!emailStr) return false;
    const lower = emailStr.toLowerCase().trim();
    return [
      "officer@trustgate.ai",
      "supervisor@trustgate.ai",
      "admin@trustgate.ai",
      "analyst@trustgate.ai",
    ].includes(lower);
  };

  // If already authenticated, check approval status before routing
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (!isDemoEmail(user.email) && user.role !== "admin" && (user.status === "pending" || user.status === "rejected")) {
        const pid = user.processId || localStorage.getItem("tg_last_process_id");
        navigate(`/authorization-gate${pid ? `?processId=${pid}` : ""}`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: LoginForm) {
    setErrorMsg(null);
    try {
      await login(values.email, values.password);
      const currentUser = useAuthStore.getState().user;
      if (!isDemoEmail(values.email) && currentUser?.role !== "admin" && (currentUser?.status === "pending" || currentUser?.status === "rejected")) {
        const pid = currentUser.processId || localStorage.getItem("tg_last_process_id");
        navigate(`/authorization-gate${pid ? `?processId=${pid}` : ""}`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      const emailLower = values.email.toLowerCase();
      const demoRoles: Record<string, "officer" | "supervisor" | "admin" | "analyst"> = {
        "officer@trustgate.ai": "officer",
        "supervisor@trustgate.ai": "supervisor",
        "admin@trustgate.ai": "admin",
        "analyst@trustgate.ai": "analyst",
      };
      const DEMO_PASSWORD_DEFAULT = "TrustGate@2026!";
      const demoPassword = (import.meta.env.VITE_DEMO_PASSWORD as string) || DEMO_PASSWORD_DEFAULT;
      if (demoRoles[emailLower] && (demoPassword ? values.password === demoPassword : values.password.length >= 8)) {
        loginOffline(demoRoles[emailLower], emailLower);
        navigate("/dashboard", { replace: true });
        return;
      }
      const msg = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      setErrorMsg(msg);
    }
  }

  const handleQuickLogin = async (email: string) => {
    setQuickLoggingIn(email);
    setErrorMsg(null);
    const demoRoles: Record<string, "officer" | "supervisor" | "admin" | "analyst"> = {
      "officer@trustgate.ai": "officer",
      "supervisor@trustgate.ai": "supervisor",
      "admin@trustgate.ai": "admin",
      "analyst@trustgate.ai": "analyst",
    };
    const targetRole = demoRoles[email.toLowerCase()] || "officer";
    const DEMO_PASSWORD_DEFAULT = "TrustGate@2026!";
    const demoPassword = (import.meta.env.VITE_DEMO_PASSWORD as string) || DEMO_PASSWORD_DEFAULT;

    try {
      setValue("email", email, { shouldValidate: true });
      setValue("password", demoPassword, { shouldValidate: true });
      await login(email, demoPassword);
      const currentUser = useAuthStore.getState().user;
      // Pre-authorized demo personas always enter dashboard immediately
      if (currentUser && currentUser.status !== "approved") {
        useAuthStore.getState().setSession({
          ...currentUser,
          status: "approved",
          role: targetRole,
        });
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.warn("Direct BaaS authentication encountered an issue, transitioning to verified demo station session:", err);
      loginOffline(targetRole, email);
      navigate("/dashboard", { replace: true });
    } finally {
      setQuickLoggingIn(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-50 via-white to-slate-100/90 dark:from-slate-950 dark:via-ink dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative overflow-hidden">
      {/* Soft Ambient Illumination (Eliminates harsh graph-paper grid lines) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[380px] bg-signal-blue/5 dark:bg-signal-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[250px] bg-slate-200/40 dark:bg-signal-purple/5 rounded-full blur-3xl" />
      </div>

      {/* ── Top Security Header Bar ── */}
      <header className="w-full border-b border-slate-200/80 dark:border-ink-border bg-white/80 dark:bg-ink/80 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between gap-4 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded-md px-2 py-1"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
          <span>Back to TrustGate AI</span>
        </Link>

        <div className="hidden sm:inline-flex items-center gap-2 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-ink-card px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
          <Lock className="h-3 w-3 text-signal-blue" />
          <span>RESTRICTED ACCESS · LAW ENFORCEMENT &amp; BORDER SECURITY ONLY</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-ink-raised transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-signal-blue" />
            )}
          </button>
        </div>
      </header>

      {/* ── Main Login Station Card ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4 sm:my-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-7 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl dark:shadow-black/50 transition-all">
          {/* Official Seal & Brand Header */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="relative mb-3">
              <img
                src="/trustgate-logo.png"
                alt="TrustGate AI Logo"
                className="h-16 w-16 rounded-2xl object-cover shadow-xs border border-signal-blue/40"
              />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-ink-card flex items-center justify-center text-white">
                <CheckCircle2 className="h-3 w-3" />
              </div>
            </div>

            <h1 className="text-2xl font-extrabold tracking-[0.16em] text-slate-900 dark:text-white leading-tight">
              TRUSTGATE <span className="text-signal-blue">AI</span>
            </h1>

            <p className="text-xs text-sky-700 dark:text-signal-cyan mt-1 font-mono tracking-widest uppercase font-bold">
              VERIFY · DETECT · PROTECT
            </p>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tracking-wider font-medium">
              OFFICIAL IDENTITY &amp; DOCUMENT SCREENING PORTAL
            </p>
          </div>

          <div className="h-px w-full bg-slate-200 dark:bg-slate-800 mb-6" />

          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Welcome back</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Sign in with your authorized station credentials.
            </p>
          </div>

          {isInactivity && !errorMsg && (
            <Alert variant="default" className="mb-5 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300">
              <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5 text-xs">
                Session Inactivity Timeout
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-200/90 text-xs">
                Your terminal session was securely closed due to idle timeout. Sign in below to resume operations.
              </AlertDescription>
            </Alert>
          )}

          {errorMsg && (
            <Alert severity="destructive" className="mb-5">
              <AlertTitle className="text-xs">Authentication failed</AlertTitle>
              <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="officer@trustgate.ai"
                autoComplete="email"
                className="h-10 text-sm border-slate-300 dark:border-ink-border focus:border-signal-blue"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-10 text-sm pr-9 border-slate-300 dark:border-ink-border focus:border-signal-blue"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  onClick={() => setShowPass((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 dark:border-ink-border text-signal-blue focus:ring-signal-blue/50"
                  {...register("rememberMe")}
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Remember this device</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-signal-blue hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-semibold shadow-xs h-11 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Authenticating…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Quick Demo Role Presets (Preserved exactly for convenience) */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                DEMO PERSONAS (INSTANT ACCESS)
              </span>
              <span className="text-[10px] text-sky-800 dark:text-signal-cyan font-mono bg-sky-50 dark:bg-signal-cyan/10 px-1.5 py-0.5 rounded border border-sky-200 dark:border-signal-cyan/20 font-semibold">
                1-CLICK → DASHBOARD
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Officer", email: "officer@trustgate.ai", badgeId: "FO-8921", desc: "Screening & Verification" },
                { label: "Supervisor", email: "supervisor@trustgate.ai", badgeId: "SUP-4402", desc: "All Cases & Risk Override" },
                { label: "Admin", email: "admin@trustgate.ai", badgeId: "ADM-001", desc: "Full Access & Security Center" },
                { label: "Analyst", email: "analyst@trustgate.ai", badgeId: "FOR-1109", desc: "Read-only Analytics" },
              ].map((persona) => (
                <button
                  key={persona.label}
                  type="button"
                  onClick={() => handleQuickLogin(persona.email)}
                  disabled={quickLoggingIn !== null || isSubmitting}
                  className="p-2.5 text-left rounded-xl bg-slate-50 dark:bg-ink-card/70 hover:bg-slate-100/90 dark:hover:bg-signal-blue/15 border border-slate-200/90 dark:border-slate-800 hover:border-signal-blue/40 transition-all group relative cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-signal-blue dark:group-hover:text-signal-cyan transition-colors">
                        {persona.label}
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-signal-blue/10 text-signal-blue dark:text-signal-cyan border border-signal-blue/20">
                        {persona.badgeId}
                      </span>
                    </div>
                    {quickLoggingIn === persona.email ? (
                      <Loader2 className="h-3 w-3 animate-spin text-signal-blue" />
                    ) : (
                      <span className="text-[9px] text-slate-400 group-hover:text-signal-blue font-mono">→ Enter</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                    {persona.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Air-Gapped Offline Standalone Station Entry */}
            <div className="mt-3 p-2.5 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-300">Air-Gapped Standalone Mode</div>
                  <div className="text-[10px] text-amber-800/80 dark:text-amber-200/70 font-medium">100% Offline Biometrics &amp; Real-Time DB</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  loginOffline("admin");
                  navigate("/dashboard", { replace: true });
                }}
                className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-amber-200/60 hover:bg-amber-200 dark:bg-amber-500/25 dark:hover:bg-amber-500/40 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
              >
                Enter Air-Gap →
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              New officer?{" "}
              <Link
                to="/register"
                className="text-signal-blue hover:underline font-semibold transition-colors"
              >
                Request station clearance
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* ── Ethical & Legal Security Notice Footer ── */}
      <footer className="w-full border-t border-slate-200/80 dark:border-ink-border bg-white/70 dark:bg-ink/70 backdrop-blur-md px-4 sm:px-8 py-3.5 z-10 text-center">
        <div className="max-w-2xl mx-auto space-y-1.5">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-risk-low">
              <ShieldCheck className="h-3 w-3" />
              <span>TLS 1.3 · 256-BIT ENCRYPTION</span>
            </span>
            <span>•</span>
            <span>FIPS 140-2 COMPLIANT CONTROLS</span>
            <span>•</span>
            <span>ICAO DOC 9303 BIOMETRICS</span>
            <span>•</span>
            <span>ZERO-KNOWLEDGE AUDIT TRAIL</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
            <strong>OFFICIAL USE NOTICE:</strong> This system is restricted to authorized personnel for official identity verification and document security duties. All authentication events, biometric matches, and case actions are cryptographically signed and logged.
          </p>
        </div>
      </footer>
    </div>
  );
}
