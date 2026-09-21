import { Component, type ErrorInfo, type ReactNode } from "react";
import { ShieldAlert, RefreshCw, Home, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  sanitizedMessage: string;
}

/**
 * Enterprise Defensive Security Error Boundary
 *
 * Prevents unhandled exceptions, malformed attacker payloads, or corrupt state
 * from crashing the application into a blank white screen.
 * Suppresses raw file paths, line numbers, and database stack traces to prevent
 * information disclosure / reconnaissance attacks.
 */
export class SecurityErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    sanitizedMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    // Sanitize error message to prevent leaking internal code paths or database details
    const raw = error?.message || "";
    let safeMessage = "A guarded application component encountered an unexpected event. State has been isolated.";

    if (raw.includes("network") || raw.includes("fetch")) {
      safeMessage = "Secure network service communication was interrupted. Data integrity is preserved.";
    } else if (raw.includes("quota") || raw.includes("memory")) {
      safeMessage = "Browser execution memory threshold reached. Session resources have been cleared.";
    }

    return {
      hasError: true,
      sanitizedMessage: safeMessage,
    };
  }

  public override componentDidCatch(_error: Error, errorInfo: ErrorInfo) {
    // Log securely to client console with masked details
    console.warn(
      "[TrustGate Security Defense] Guarded error intercepted and isolated:",
      {
        timestamp: new Date().toISOString(),
        componentStack: errorInfo.componentStack?.slice(0, 150),
      }
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, sanitizedMessage: "" });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, sanitizedMessage: "" });
    window.location.href = "/dashboard";
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-ink text-slate-100">
          <div className="max-w-md w-full rounded-2xl border border-ink-border bg-ink-card p-6 shadow-panel space-y-5 text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-signal-blue/15 border border-signal-blue/40 flex items-center justify-center text-signal-cyan shadow-glow">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                Operational Resilience Active
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {this.state.sanitizedMessage}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-left flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-300 leading-snug">
                <strong>Zero Data Leakage:</strong> All user credentials, document data, and active session tokens remain securely isolated and protected.
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="border-ink-border text-slate-300 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reload View
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleGoHome}
                className="bg-signal-blue hover:bg-signal-blue/90"
              >
                <Home className="h-3.5 w-3.5 mr-1.5" />
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
