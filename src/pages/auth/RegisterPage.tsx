import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth, useAuthStore } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    badge_id: z.string().optional(),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(8, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", badge_id: "", email: "", password: "", confirm: "" },
  });

  async function onSubmit(values: RegisterForm) {
    setErrorMsg(null);
    try {
      // register() signs up + signs in → hydrates auth store
      await signup(values.email, values.password, values.name, values.badge_id || undefined);
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === "admin" && currentUser?.status === "approved") {
        navigate("/admin/authorizations", { replace: true });
      } else {
        const pid = currentUser?.processId || localStorage.getItem("tg_last_process_id");
        navigate(`/authorization-gate${pid ? `?processId=${pid}` : ""}`, { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setErrorMsg(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid py-8">
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

        <h2 className="text-lg font-semibold text-slate-100 mb-1">Create account</h2>
        <p className="text-sm text-slate-400 mb-6">
          Register as an officer. The first account created becomes the Admin.
        </p>

        {errorMsg && (
          <Alert severity="destructive" className="mb-5">
            <AlertTitle>Registration failed</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Officer Full Name"
              autoComplete="name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-rose-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="badge_id">
              Badge / Officer ID{" "}
              <span className="text-slate-500 font-normal">(optional)</span>
            </Label>
            <Input
              id="badge_id"
              type="text"
              placeholder="e.g. TG-04821"
              {...register("badge_id")}
            />
          </div>

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
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                onClick={() => setShowPass((s) => !s)}
                tabIndex={-1}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-400">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
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
                aria-label={showConfirm ? "Hide password" : "Show password"}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account & sign in"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-ink-border text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-signal-blue hover:text-signal-cyan font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
