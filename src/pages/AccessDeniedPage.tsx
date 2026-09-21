import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid">
      <div className="max-w-md w-full text-center glass-card rounded-card shadow-panel p-10 glow-border">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
          <ShieldAlert className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gradient-signal mb-2 tabular-nums">
          403
        </h1>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">
          Access Denied
        </h2>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
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
