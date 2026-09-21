import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { insforge } from "@/lib/insforge";
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
    setErrorMsg(null);
    try {
      const { error } = await insforge.auth.resetPassword({
        newPassword: values.password,
        otp,
      });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update password. The link may be expired — request a new one.";
      setErrorMsg(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid">
      <div className="w-full max-w-md glass-card rounded-card shadow-panel glow-border p-8">
        {/* Brand */}
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

        <h2 className="text-lg font-semibold text-slate-100 mb-1">Set new password</h2>
        <p className="text-sm text-slate-400 mb-6">
          Choose a strong, unique password for your secure account.
        </p>

        {!otp && (
          <Alert variant="default" className="mb-5 border-risk-medium/40 bg-risk-medium/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-risk-medium flex-shrink-0 mt-0.5" />
              <div>
                <AlertTitle className="text-risk-medium">Missing reset token</AlertTitle>
                <AlertDescription className="text-slate-300">
                  Please use the full link from your reset email. If the link was
                  corrupted, request a new one.
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {done ? (
          <Alert variant="default" className="mb-5 border-risk-low/40 bg-risk-low/5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-risk-low flex-shrink-0 mt-0.5" />
              <div>
                <AlertTitle className="text-risk-low">Password updated</AlertTitle>
                <AlertDescription className="text-slate-300">
                  Your credentials have been secured. Redirecting you to sign in…
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ) : (
          <>
            {errorMsg && (
              <Alert variant="default" className="mb-5 border-risk-high/40 bg-risk-high/5">
                <AlertTitle className="text-risk-high">Update failed</AlertTitle>
                <AlertDescription className="text-slate-300">{errorMsg}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    onClick={() => setShowPass((s) => !s)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-400">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm new password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    {...register("confirm")}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    onClick={() => setShowConfirm((s) => !s)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirm && (
                  <p className="text-xs text-rose-400">{errors.confirm.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !otp}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating password…
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 pt-5 border-t border-ink-border text-center">
          <p className="text-xs text-slate-400">
            <Link
              to="/login"
              className="text-signal-blue hover:text-signal-cyan font-medium transition-colors"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
