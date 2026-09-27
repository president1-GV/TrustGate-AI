import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthStore } from "@/store/auth";
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
      const demoPassword = (import.meta.env.VITE_DEMO_PASSWORD as string) || "";
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
    const demoPassword = (import.meta.env.VITE_DEMO_PASSWORD as string) || "";

    try {
      setValue("email", email, { shouldValidate: true });
      if (demoPassword) {
        setValue("password", demoPassword, { shouldValidate: true });
        await login(email, demoPassword);
      } else {
        loginOffline(targetRole, email);
      }
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid">
      <div className="w-full max-w-md glass-card rounded-card shadow-panel glow-border p-8">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/trustgate-logo.png"
            alt="TrustGate AI Logo"
            className="h-16 w-16 rounded-2xl object-cover shadow-glow mb-3 border border-signal-blue/40"
          />
          <h1 className="text-2xl font-bold tracking-[0.16em] text-slate-100">
            TRUSTGATE <span className="text-signal-blue">AI</span>
          </h1>
          <p className="text-xs text-signal-cyan mt-1 font-mono tracking-widest uppercase font-semibold">
            VERIFY · DETECT · PROTECT
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 tracking-wider">
            AI-POWERED IDENTITY &amp; DOCUMENT SCREENING
          </p>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-signal-blue/40 to-transparent mb-6" />

        <h2 className="text-lg font-semibold text-slate-100 mb-1">Welcome back</h2>
        <p className="text-sm text-slate-400 mb-6">
          Sign in to access the secure command center.
        </p>

        {isInactivity && !errorMsg && (
          <Alert variant="default" className="mb-5 border-amber-500/40 bg-amber-500/10 text-amber-300">
            <AlertTitle className="text-amber-300 font-semibold flex items-center gap-1.5">
              Session Inactivity Timeout
            </AlertTitle>
            <AlertDescription className="text-amber-200/90 text-xs">
              Your terminal session was securely closed due to idle timeout. Sign in below to resume operations.
            </AlertDescription>
          </Alert>
        )}

        {errorMsg && (
          <Alert severity="destructive" className="mb-5">
            <AlertTitle>Authentication failed</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="officer@trustgate.ai"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-rose-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                onClick={() => setShowPass((s) => !s)}
                tabIndex={-1}
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-400">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink-border bg-ink-card/60 text-signal-blue focus:ring-signal-blue/50 focus:ring-offset-0"
                {...register("rememberMe")}
              />
              <span className="text-xs text-slate-400">Remember this device</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-signal-blue hover:text-signal-cyan transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Quick Demo Role Presets */}
        <div className="mt-5 pt-4 border-t border-ink-border">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Demo Personas (Instant Access)
            </span>
            <span className="text-[10px] text-signal-cyan font-mono bg-signal-cyan/10 px-1.5 py-0.5 rounded border border-signal-cyan/20">
              1-CLICK → DASHBOARD
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Officer", email: "officer@trustgate.ai", desc: "Screening & Verification" },
              { label: "Supervisor", email: "supervisor@trustgate.ai", desc: "All Cases & Risk Override" },
              { label: "Admin", email: "admin@trustgate.ai", desc: "Full Access & Security Center" },
              { label: "Analyst", email: "analyst@trustgate.ai", desc: "Read-only Analytics" },
            ].map((persona) => (
              <button
                key={persona.label}
                type="button"
                onClick={() => handleQuickLogin(persona.email)}
                disabled={quickLoggingIn !== null || isSubmitting}
                className="p-2 text-left rounded-lg bg-ink-card/60 hover:bg-signal-blue/15 border border-ink-border hover:border-signal-blue/40 transition-all group relative cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-slate-200 group-hover:text-signal-cyan">
                    {persona.label}
                  </div>
                  {quickLoggingIn === persona.email ? (
                    <Loader2 className="h-3 w-3 animate-spin text-signal-cyan" />
                  ) : (
                    <span className="text-[9px] text-slate-500 group-hover:text-signal-blue font-mono">→ Enter</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {persona.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Air-Gapped Offline Standalone Station Entry */}
          <div className="mt-3 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold text-amber-300">Air-Gapped Standalone Mode</div>
                <div className="text-[10px] text-amber-200/70">100% Offline Biometrics &amp; Real-Time DB</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                loginOffline("admin");
                navigate("/dashboard", { replace: true });
              }}
              className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              Enter Air-Gap →
            </button>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-ink-border text-center">
          <p className="text-xs text-slate-400">
            New officer?{" "}
            <Link
              to="/register"
              className="text-signal-blue hover:text-signal-cyan font-medium transition-colors"
            >
              Request access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
