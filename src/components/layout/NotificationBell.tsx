import * as React from "react";
import {
  Bell,
  CheckCheck,
  X,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Volume2,
  VolumeX,
  PlusCircle,
  ExternalLink,
  Radio,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatTimeAgo } from "@/lib/utils";

export interface AlertNotification {
  id: string;
  user_id?: string;
  title: string;
  body: string;
  kind: "high_risk" | "security" | "review" | "system" | "info";
  case_id?: string | null;
  read_at?: string | null;
  created_at: string;
}

const DEFAULT_BORDER_ALERTS: AlertNotification[] = [
  {
    id: "alt-01",
    title: "🚨 High-Risk Passport Intercepted (Case #TG-9182)",
    body: "Biometric face verification score 42.1% (Threshold 80.0%). ICAO 9303 Line 2 checksum mismatch on birth date field.",
    kind: "high_risk",
    case_id: "c-1001",
    read_at: null,
    created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-02",
    title: "⚠️ Tampering Anomaly: Photo Zone ELA Residual",
    body: "Error Level Analysis detected 8.7% compression residual (max threshold 5.0%) in ID photo boundary. Secondary inspection required.",
    kind: "security",
    case_id: "c-1002",
    read_at: null,
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-03",
    title: "🔴 Watchlist Interception: Interpol SLTD Match",
    body: "Document X8921003 flagged on Stolen & Lost Travel Documents database. Terminal gate lockdown protocol activated.",
    kind: "high_risk",
    case_id: "c-1003",
    read_at: null,
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-04",
    title: "🛡️ Terminal 01 Cryptographic SHA-256 Active",
    body: "Indo-Nepal ICP Raxaul node operational. All scanned identity documents bound to SHA-256 hash provenance audit trail.",
    kind: "system",
    read_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-05",
    title: "📋 Supervisor Escalation Referral Pending",
    body: "Inspector Rajesh Kumar submitted case #TG-9169 for supervisor sign-off on borderline facial landmark geometry.",
    kind: "review",
    case_id: "c-1004",
    read_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
  },
];

function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start(ctx.currentTime + 0.08);
    osc1.stop(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.35);
  } catch {
    // AudioContext blocked by browser policy until user gesture
  }
}

function kindIcon(kind: string) {
  switch (kind) {
    case "high_risk":
      return <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />;
    case "security":
      return <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0" />;
    case "review":
      return <CheckCircle2 className="h-4 w-4 text-signal-cyan flex-shrink-0" />;
    case "system":
      return <Radio className="h-4 w-4 text-emerald-400 flex-shrink-0" />;
    default:
      return <Info className="h-4 w-4 text-signal-blue flex-shrink-0" />;
  }
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "high_risk" | "security" | "unread">("all");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [animating, setAnimating] = React.useState(false);
  const navigate = useNavigate();

  // Load notifications from local storage with initial border defaults
  const [alerts, setAlerts] = React.useState<AlertNotification[]>(() => {
    try {
      const stored = localStorage.getItem("tg_border_alerts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_BORDER_ALERTS;
  });

  // Persist alerts to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem("tg_border_alerts", JSON.stringify(alerts));
    } catch {}
  }, [alerts]);

  // Listen for real-time alerts across the application (e.g. from Screening, Camera, or Officer switch)
  React.useEffect(() => {
    const handleNewAlert = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.title) return;

      const newAlert: AlertNotification = {
        id: "alt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        title: detail.title,
        body: detail.body || "Operational screening notification.",
        kind: detail.kind || "info",
        case_id: detail.case_id || null,
        read_at: null,
        created_at: new Date().toISOString(),
      };

      setAlerts((prev) => [newAlert, ...prev]);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 1200);

      if (soundEnabled) {
        playAlertChime();
      }
    };

    window.addEventListener("tg:new_alert", handleNewAlert);
    return () => window.removeEventListener("tg:new_alert", handleNewAlert);
  }, [soundEnabled]);

  const unreadCount = alerts.filter((a) => !a.read_at).length;

  const markAllRead = () => {
    const now = new Date().toISOString();
    setAlerts((prev) => prev.map((a) => ({ ...a, read_at: a.read_at || now })));
  };

  const markOneRead = (id: string) => {
    const now = new Date().toISOString();
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read_at: a.read_at ? null : now } : a))
    );
  };

  const dismissAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Simulate a realistic live border alert for immediate testing
  const triggerTestAlert = () => {
    const testCases = [
      {
        title: "🚨 Live Intercept: Biometric Face Mismatch (Case #TG-9430)",
        body: "Facial landmark distance 0.38 (Confidence FAIL). Photo tampering suspected in document TD3 passport.",
        kind: "high_risk" as const,
        case_id: "c-1001",
      },
      {
        title: "⚠️ High ELA Residual Detected: 9.2% (Case #TG-9431)",
        body: "Document security pattern broken in MRZ region. Ghost portrait missing required UV watermarks.",
        kind: "security" as const,
        case_id: "c-1002",
      },
      {
        title: "🛡️ Watchlist Alert: Stolen Passport Record Hit",
        body: "Passport Serial #P984210 matching Interpol Lost & Stolen Travel Documents (SLTD) database.",
        kind: "high_risk" as const,
        case_id: "c-1003",
      },
    ];
    const picked = testCases[Math.floor(Math.random() * testCases.length)];
    window.dispatchEvent(new CustomEvent("tg:new_alert", { detail: picked }));
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    if (filter === "unread") return !a.read_at;
    if (filter === "high_risk") return a.kind === "high_risk";
    if (filter === "security") return a.kind === "security";
    return true;
  });

  // Close on outside click
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "relative h-9 w-9 p-0 text-slate-400 hover:text-white transition-all cursor-pointer",
          open && "bg-ink-card text-white ring-1 ring-signal-blue/50",
          animating && "animate-bounce text-signal-cyan"
        )}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Security Alerts${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        title="View live border alerts and system notifications"
      >
        <Bell className={cn("h-5 w-5 transition-transform", unreadCount > 0 && "text-signal-cyan")} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none shadow-md shadow-rose-500/40 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-[420px] max-w-[calc(100vw-32px)] z-50 rounded-2xl bg-ink-card/95 backdrop-blur-xl shadow-2xl border border-signal-blue/40 overflow-hidden flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-border bg-ink/80">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-signal-blue/20 border border-signal-blue/40 flex items-center justify-center text-signal-cyan">
                <Bell className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Border Alerts & Messages
                {unreadCount > 0 && (
                  <Badge variant="default" className="text-rose-400 border-rose-500/40 bg-rose-500/10 text-[10px] px-1.5 py-0">
                    {unreadCount} UNREAD
                  </Badge>
                )}
              </h4>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSoundEnabled((s) => !s)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  soundEnabled ? "text-signal-cyan hover:bg-signal-blue/20" : "text-slate-500 hover:text-slate-300"
                )}
                title={soundEnabled ? "Sound enabled (Click to mute)" : "Sound muted (Click to unmute)"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={triggerTestAlert}
                className="flex items-center gap-1 text-[11px] font-mono text-signal-cyan hover:text-white bg-signal-blue/15 hover:bg-signal-blue/25 border border-signal-blue/30 transition-all px-2 py-1 rounded cursor-pointer"
                title="Dispatch simulated high-risk alert"
              >
                <PlusCircle className="h-3 w-3" />
                Simulate Alert
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-200 transition-colors p-1.5 rounded cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar & Quick Actions */}
          <div className="px-3 py-2 bg-ink/50 border-b border-ink-border flex items-center justify-between text-xs gap-1 flex-wrap">
            <div className="flex items-center gap-1">
              {(["all", "unread", "high_risk", "security"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium uppercase font-mono transition-colors cursor-pointer",
                    filter === tab
                      ? "bg-signal-blue text-white font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-ink-raised"
                  )}
                >
                  {tab === "all"
                    ? `All (${alerts.length})`
                    : tab === "unread"
                    ? `Unread (${unreadCount})`
                    : tab === "high_risk"
                    ? "Critical"
                    : "Tamper"}
                </button>
              ))}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-signal-cyan hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Alerts List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-ink-border/50">
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <Bell className="h-8 w-8 opacity-25" />
                <div className="text-sm font-medium">No alerts in this category</div>
                <div className="text-xs text-slate-600">
                  New high-risk screenings or system events will appear here in real time.
                </div>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    markOneRead(alert.id);
                    if (alert.case_id) {
                      navigate(`/cases`);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "group flex items-start gap-3 p-3.5 transition-colors cursor-pointer relative",
                    !alert.read_at
                      ? "bg-signal-blue/8 hover:bg-signal-blue/15"
                      : "hover:bg-ink-raised/50 opacity-80 hover:opacity-100"
                  )}
                >
                  {/* Status Indicator */}
                  <div className="mt-0.5">{kindIcon(alert.kind)}</div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-xs font-bold truncate",
                          !alert.read_at ? "text-slate-100" : "text-slate-300"
                        )}
                      >
                        {alert.title}
                      </span>
                      <span className="text-[10px] text-slate-500 flex-shrink-0 font-mono">
                        {formatTimeAgo(alert.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {alert.body}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="default"
                        className={cn(
                          "text-[9px] uppercase font-mono px-1.5 py-0 border",
                          alert.kind === "high_risk"
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : alert.kind === "security"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-signal-blue/15 text-signal-cyan border-signal-blue/30"
                        )}
                      >
                        {alert.kind.replace("_", " ")}
                      </Badge>
                      {alert.case_id && (
                        <span className="text-[10px] font-mono text-signal-cyan flex items-center gap-1 group-hover:underline">
                          Inspect Record <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Read / Dismiss Buttons */}
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markOneRead(alert.id);
                      }}
                      className={cn(
                        "h-4 w-4 rounded-full border flex items-center justify-center transition-colors cursor-pointer",
                        alert.read_at
                          ? "border-slate-700 hover:border-slate-500 text-slate-500"
                          : "border-signal-cyan bg-signal-cyan/20 text-signal-cyan"
                      )}
                      title={alert.read_at ? "Mark as unread" : "Mark as read"}
                    >
                      <span className={cn("h-2 w-2 rounded-full", !alert.read_at && "bg-signal-cyan")} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => dismissAlert(alert.id, e)}
                      className="text-slate-600 hover:text-slate-300 transition-colors p-0.5 cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Dismiss alert"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-ink-border bg-ink/70 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""} recorded
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/cases");
              }}
              className="text-signal-cyan hover:underline font-mono"
            >
              All Screening Records →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
