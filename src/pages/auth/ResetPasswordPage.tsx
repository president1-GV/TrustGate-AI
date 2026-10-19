import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Lock, ShieldCheck, Sun, Moon } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(8, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  // InsForge sends ?otp=<code> or ?token=<code> in the reset link
  const otp = params.get("otp") ?? params.get("token") ?? "";

  const [showPass, setShowPass] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: ResetForm) {
    if (!otp) {
      setErrorMsg("Reset token missing from URL. Please use the link from your email.");
      return;
    }
    setErrorMsg(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_INSFORGE_URL ?? "https://i8yy29ec.us-east.insforge.app"}/auth/v1/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_INSFORGE_ANON_KEY ?? "",
          },
          body: JSON.stringify({ type: "recovery", token: otp }),
        }
      );
      if (!res.ok) {
        throw new Error("Invalid or expired reset token. Please request a new link.");
      }
      const data = (await res.json()) as { access_token?: string };
      const token = data.access_token;
      if (!token) throw new Error("Could not verify reset token.");

      const updateRes = await fetch(
        `${import.meta.env.VITE_INSFORGE_URL ?? "https://i8yy29ec.us-east.insforge.app"}/auth/v1/user`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_INSFORGE_ANON_KEY ?? "",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password: values.password }),
        }
      );
      if (!updateRes.ok) {
        throw new Error("Failed to update password. Please try again.");
      }
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to reset password. Please request a new link.";
      setErrorMsg(msg);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-50 via-white to-slate-100/90 dark:from-slate-950 dark:via-ink dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative overflow-hidden">
      {/* Soft Ambient Illumination */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[380px] bg-signal-blue/5 dark:bg-signal-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[250px] bg-slate-200/40 dark:bg-signal-purple/5 rounded-full blur-3xl" />
      </div>

      {/* Header Bar */}
      <header className="w-full border-b border-slate-200/80 dark:border-ink-border bg-white/80 dark:bg-ink/80 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between gap-4 z-10">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded-md px-2 py-1"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
          <span>Back to Sign In</span>
        </Link>

        <div className="hidden sm:inline-flex items-center gap-2 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-ink-card px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
          <Lock className="h-3 w-3 text-signal-blue" />
          <span>CREDENTIAL ROTATION · ENCRYPTED PROTOCOL</span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-2xs"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-signal-blue" />}
        </button>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4 sm:my-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-7 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl dark:shadow-black/50 transition-all">
          <div className="flex flex-col items-center mb-6 text-center">
            <img
              src="/trustgate-logo.png"
              alt="TrustGate AI Logo"
              className="h-16 w-16 rounded-2xl object-cover shadow-xs mb-3 border border-signal-blue/40"
            />
            <h1 className="text-2xl font-extrabold tracking-[0.16em] text-slate-900 dark:text-white">
              TRUSTGATE <span className="text-signal-blue">AI</span>
            </h1>
            <p className="text-xs text-sky-700 dark:text-signal-cyan mt-1 font-mono tracking-widest uppercase font-bold">
              VERIFY · DETECT · PROTECT
            </p>
          </div>

          <div className="h-px w-full bg-slate-200 dark:bg-slate-800 mb-6" />

          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Set new password</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Choose a strong, unique password for your station clearance.
            </p>
          </div>

          {!otp && (
            <Alert variant="default" className="mb-5 border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <AlertTitle className="text-amber-900 dark:text-amber-300 text-xs font-bold">Missing reset token</AlertTitle>
                  <AlertDescription className="text-amber-800/90 dark:text-slate-300 text-xs">
                    Please use the full link from your reset email. If the link was
                    corrupted, request a new one.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {done ? (
            <Alert variant="default" className="mb-5 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-500/10">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <AlertTitle className="text-emerald-900 dark:text-emerald-300 text-xs font-bold">Password successfully updated</AlertTitle>
                  <AlertDescription className="text-emerald-800/90 dark:text-slate-300 text-xs">
                    Your password has been changed securely. Redirecting to sign in…
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ) : (
            <>
              {errorMsg && (
                <Alert severity="destructive" className="mb-5">
                  <AlertTitle className="text-xs">Update failed</AlertTitle>
                  <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-800 dark:text-slate-200">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      className="h-10 text-sm pr-9 border-slate-300 dark:border-ink-border focus:border-signal-blue"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      onClick={() => setShowPass((s) => !s)}
                      tabIndex={-1}
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-xs font-semibold text-slate-800 dark:text-slate-200">Confirm new password</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="h-10 text-sm pr-9 border-slate-300 dark:border-ink-border focus:border-signal-blue"
                      {...register("confirm")}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      onClick={() => setShowConfirm((s) => !s)}
                      tabIndex={-1}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.confirm.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-semibold shadow-xs h-11 text-sm mt-2"
                  disabled={isSubmitting || !otp}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Updating password…
                    </>
                  ) : (
                    "Reset password"
                  )}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              <Link
                to="/login"
                className="text-signal-blue hover:underline font-semibold transition-colors"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-ink-border bg-white/70 dark:bg-ink/70 backdrop-blur-md px-4 sm:px-8 py-3.5 z-10 text-center">
        <div className="max-w-2xl mx-auto space-y-1">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-risk-low">
              <ShieldCheck className="h-3 w-3" />
              <span>TLS 1.3 · ENCRYPTED CREDENTIAL PROVENANCE</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
