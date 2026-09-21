import * as React from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  LogOut,
  AlertCircle,
  Building2,
  Lock,
} from "lucide-react";
import { checkRequestStatus, subscribeToAccessRequests, type MemberAccessRequest } from "@/lib/authRequests";
import { useAuthStore } from "@/store/auth";
import { insforge } from "@/lib/insforge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

export function AuthorizationGatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryProcessId = searchParams.get("processId");
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  // Derive initial process ID from query param, user state, or localStorage
  const [processId, setProcessId] = React.useState<string>(() => {
    if (queryProcessId) return queryProcessId;
    if (user?.processId) return user.processId;
    const stored = localStorage.getItem("tg_last_process_id");
    return stored || "";
  });

  const [inputProcessId, setInputProcessId] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [requestData, setRequestData] = React.useState<MemberAccessRequest | null>(null);
  const [status, setStatus] = React.useState<"pending" | "approved" | "rejected">(
    user?.status === "approved" ? "approved" : user?.status === "rejected" ? "rejected" : "pending"
  );
  const [pollCount, setPollCount] = React.useState(0);

  // Auto-resolve processId from database if missing but user is logged in
  React.useEffect(() => {
    if (!processId && user?.email) {
      const currentUser = user;
      async function resolveProcessId() {
        try {
          const { data } = await insforge.database
            .from("member_access_requests")
            .select("*")
            .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email.toLowerCase()}`)
            .order("created_at", { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            const r = data[0] as MemberAccessRequest;
            setProcessId(r.process_id);
            setRequestData(r);
            setStatus(r.status);
          }
        } catch (err) {
          console.warn("Could not auto-resolve process ID:", err);
        }
      }
      resolveProcessId();
    }
  }, [processId, user]);

  // Initial check, periodic live polling, and real-time WebSocket sync
  React.useEffect(() => {
    let isMounted = true;

    async function poll() {
      if (!processId) return;
      try {
        const req = await checkRequestStatus(processId);
        if (!isMounted) return;

        if (req) {
          setRequestData(req);
          setStatus(req.status);

          // If approved, update user session and redirect
          if (req.status === "approved") {
            if (user) {
              setSession({
                ...user,
                status: "approved",
                processId: req.process_id,
              });
            }
            setTimeout(() => {
              if (isMounted) {
                navigate("/dashboard", { replace: true });
              }
            }, 1200);
          }
        }
      } catch (err) {
        console.warn("Polling status error:", err);
      } finally {
        if (isMounted) {
          setPollCount((c) => c + 1);
        }
      }
    }

    poll();
    const interval = setInterval(poll, 1800);

    // Live Real-Time WebSocket event listener
    const unsubscribe = subscribeToAccessRequests((updatedReq: any) => {
      if (!isMounted) return;
      if (
        (updatedReq?.process_id && updatedReq.process_id === processId) ||
        (user?.id && updatedReq?.user_id === user.id) ||
        (user?.email && updatedReq?.email === user.email.toLowerCase())
      ) {
        setRequestData(updatedReq);
        setStatus(updatedReq.status);
        if (updatedReq.status === "approved") {
          if (user) {
            setSession({
              ...user,
              status: "approved",
              processId: updatedReq.process_id,
            });
          }
          setTimeout(() => {
            if (isMounted) {
              navigate("/dashboard", { replace: true });
            }
          }, 1000);
        }
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [processId, user, setSession, navigate]);

  const handleManualCheck = async () => {
    const targetId = (inputProcessId || processId).trim().toUpperCase();
    if (!targetId) return;
    setIsChecking(true);
    try {
      const res = await checkRequestStatus(targetId);
      if (res) {
        setProcessId(res.process_id);
        setRequestData(res);
        setStatus(res.status);
        if (res.status === "approved") {
          setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
        }
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopyId = () => {
    if (!processId) return;
    navigator.clipboard.writeText(processId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-2xl glass-card rounded-2xl shadow-2xl border border-signal-blue/30 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-ink-card via-signal-blue/15 to-ink-card border-b border-ink-border p-6 text-center relative">
          <div className="flex justify-center mb-3">
            <img
              src="/trustgate-logo.png"
              alt="TrustGate AI Logo"
              className="h-14 w-14 rounded-2xl object-cover shadow-glow border border-signal-blue/40"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal-blue/20 border border-signal-blue/40 text-signal-cyan text-xs font-mono font-medium mb-3">
            <Lock className="h-3.5 w-3.5" />
            TRUSTGATE AI · NATIONAL BORDER SECURITY INTRANET
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-wide flex items-center justify-center gap-2.5">
            {status === "approved" ? (
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
            ) : status === "rejected" ? (
              <AlertCircle className="h-7 w-7 text-rose-400" />
            ) : (
              <ShieldAlert className="h-7 w-7 text-amber-400 animate-pulse" />
            )}
            Authorization Gate
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Operational screening checkpoint. Member login credentials received and awaiting chief administrator clearance.
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Status Display Alert */}
          {status === "approved" ? (
            <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <AlertTitle className="text-emerald-300 font-semibold">
                Access Authorized by Administrator
              </AlertTitle>
              <AlertDescription className="text-emerald-200/90 text-xs">
                Your credentials and security clearance have been verified. Launching operational command dashboard…
              </AlertDescription>
            </Alert>
          ) : status === "rejected" ? (
            <Alert className="border-rose-500/40 bg-rose-500/10 text-rose-300">
              <AlertCircle className="h-5 w-5 text-rose-400" />
              <AlertTitle className="text-rose-300 font-semibold">
                Access Clearance Denied
              </AlertTitle>
              <AlertDescription className="text-rose-200/90 text-xs mt-1">
                Reason: {requestData?.rejection_reason || "Access request rejected by Command Security Officer."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5 animate-spin" style={{ animationDuration: "6s" }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-amber-300 flex items-center justify-between">
                  <span>Pending Admin Clearance</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                    POLLING #{pollCount}
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                  Your station login request has been queued in the live <strong className="text-amber-100">Admin Authority Panel</strong>.
                  Once the Chief Administrator clicks <strong className="text-emerald-300">"Admit / Accept"</strong>, this terminal will unlock automatically.
                </p>
              </div>
            </div>
          )}

          {/* Cryptographic Login Process ID Box */}
          <div className="rounded-xl border border-ink-border bg-ink-card/60 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                Cryptographic Login Process ID
              </span>
              <Badge
                variant={status === "approved" ? "pass" : status === "rejected" ? "critical" : "warning"}
                className="font-mono uppercase text-[10px]"
              >
                {status}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-ink-raised/70 border border-ink-border rounded-lg px-4 py-3 font-mono text-base md:text-lg font-bold text-signal-cyan tracking-wider truncate select-all">
                {processId}
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={handleCopyId}
                className="flex items-center gap-1.5 whitespace-nowrap"
                title="Copy Process ID"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>

            <p className="text-[11px] text-slate-500 font-mono">
              Provide this unique tracking ID to your Station Supervisor or Command Admin if expedited clearance is needed.
            </p>
          </div>

          {/* Officer & Station Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg border border-ink-border/70 bg-ink-card/40">
              <span className="text-slate-500 block mb-1">Personnel</span>
              <span className="font-semibold text-slate-200 text-sm">
                {requestData?.display_name || user?.name || "Officer"}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                {requestData?.email || user?.email || "officer@trustgate.ai"}
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-ink-border/70 bg-ink-card/40">
              <span className="text-slate-500 block mb-1">Station &amp; Post</span>
              <span className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-signal-blue" />
                {requestData?.station || user?.station || "Indo-Nepal ICP Raxaul"}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                Role: <strong className="text-slate-300 uppercase">{requestData?.requested_role || user?.role || "officer"}</strong>
                {requestData?.badge_id ? ` · Badge ${requestData.badge_id}` : ""}
              </span>
            </div>
          </div>

          {/* Manual Process ID Lookup Section */}
          <div className="pt-2 border-t border-ink-border/70 space-y-2">
            <label className="block text-xs font-medium text-slate-400">
              Check Existing Process ID or Enter Admin Voucher
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. AUTH-20260905-8941"
                value={inputProcessId}
                onChange={(e) => setInputProcessId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualCheck()}
                className="font-mono text-xs uppercase"
              />
              <Button
                variant="secondary"
                size="md"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="gap-1.5 whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
                Verify Approval
              </Button>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-ink-border">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Return to Login
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/admin/authorizations"
                className="text-xs text-signal-blue hover:text-signal-cyan font-semibold flex items-center gap-1 transition-colors"
              >
                Open Admin Panel <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
