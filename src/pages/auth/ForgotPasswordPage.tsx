import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotForm) {
    setErrorMsg(null);
    try {
      await sendPasswordReset(values.email);
      setSent(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to send reset link. Please try again.";
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

        <h2 className="text-lg font-semibold text-slate-100 mb-1">Reset password</h2>
        <p className="text-sm text-slate-400 mb-6">
          Enter your email and we'll send a secure reset code to your inbox.
        </p>

        {sent ? (
          <Alert severity="success" className="mb-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <AlertTitle>Reset code sent</AlertTitle>
                <AlertDescription>
                  Check your inbox for a password reset email. Follow the link
                  to set a new password. The code expires shortly for security.
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ) : (
          <>
            {errorMsg && (
              <Alert severity="destructive" className="mb-5">
                <AlertTitle>Could not send</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="officer@trustgate.ai"
                    className="pl-9"
                    autoComplete="email"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-400">{errors.email.message}</p>
                )}
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
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 pt-5 border-t border-ink-border text-center">
          <p className="text-xs text-slate-400">
            Remembered it?{" "}
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
