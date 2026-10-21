import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-ink dark:to-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>
      <div className="max-w-md w-full text-center rounded-2xl border border-slate-200 dark:border-ink-border bg-white/95 dark:bg-ink-card/90 backdrop-blur-md shadow-panel p-10 relative z-10">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
          <ShieldAlert className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gradient-signal mb-2 tabular-nums">
          403
        </h1>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Access Denied
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Your current security clearance does not permit access to this section. Contact a supervisor if you believe this is an error.
        </p>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-signal-blue/40 to-transparent mb-8" />
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate("/")}
        >
          Return to Command Center
        </Button>
      </div>
    </div>
  );
}
