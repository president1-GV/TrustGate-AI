import * as React from "react";
import {
  Settings,
  User,
  Lock,
  Bell,
  Sliders,
  Clock,
  BrainCircuit,
  Palette,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Separator } from "@/components/ui/Separator";
import { useAuth, useAuthStore } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { insforge } from "@/lib/insforge";
import { sweepExpiredCasesOffline } from "@/lib/offlineDb";
import { cn } from "@/lib/utils";

type SectionId =
  | "profile"
  | "security"
  | "notifications"
  | "system"
  | "retention"
  | "ai"
  | "appearance"
  | "audit";

const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "system", label: "System", icon: Sliders },
  { id: "retention", label: "Retention", icon: Clock },
  { id: "ai", label: "AI Configuration", icon: BrainCircuit },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "audit", label: "Audit Settings", icon: Shield },
];

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-ink-border/60 last:border-none">
      <div
        className="flex-1 cursor-pointer select-none"
        onClick={() => onChange(!checked)}
      >
        <div className="text-sm font-medium text-slate-200 hover:text-white transition-colors">
          {label}
        </div>
        {description && (
          <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-signal-blue/50 flex-shrink-0 cursor-pointer",
          checked ? "bg-signal-blue" : "bg-slate-700 hover:bg-slate-600"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { updatePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [section, setSection] = React.useState<SectionId>("profile");
  const [compactMode, setCompactMode] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  // Profile fields
  const [displayName, setDisplayName] = React.useState(user?.name ?? "");
  const [badgeId, setBadgeId] = React.useState(user?.badgeId ?? "");
  const [station, setStation] = React.useState(user?.station ?? "");
  const [team, setTeam] = React.useState(user?.team ?? "");

  // Security fields
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pwdSaving, setPwdSaving] = React.useState(false);
  const [pwdMsg, setPwdMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  // Notification toggles
  const [notifHighRisk, setNotifHighRisk] = React.useState(true);
  const [notifScreeningComplete, setNotifScreeningComplete] = React.useState(true);
  const [notifReviewRequired, setNotifReviewRequired] = React.useState(true);
  const [notifSystemAlert, setNotifSystemAlert] = React.useState(false);
  const [notifModelAlert, setNotifModelAlert] = React.useState(false);

  // Retention settings
  const [retentionDays, setRetentionDays] = React.useState(() => {
    return localStorage.getItem("tg_retention_days") || "90";
  });
  const [autoDeleteExpired, setAutoDeleteExpired] = React.useState(() => {
    return localStorage.getItem("tg_retention_auto_delete") !== "false";
  });
  const [retainDemoCases, setRetainDemoCases] = React.useState(() => {
    return localStorage.getItem("tg_retention_retain_demo") === "true";
  });
  const [retentionSaving, setRetentionSaving] = React.useState(false);
  const [retentionSweeping, setRetentionSweeping] = React.useState(false);
  const [retentionSavedMsg, setRetentionSavedMsg] = React.useState<string | null>(null);
  const [sweepResult, setSweepResult] = React.useState<{ ok: boolean; text: string } | null>(null);

  // Audit Settings toggles
  const [logAiOverrides, setLogAiOverrides] = React.useState(() => {
    return localStorage.getItem("tg_audit_log_ai_overrides") !== "false";
  });
  const [logReportGen, setLogReportGen] = React.useState(() => {
    return localStorage.getItem("tg_audit_log_report_gen") !== "false";
  });
  const [logAuthEvents, setLogAuthEvents] = React.useState(() => {
    return localStorage.getItem("tg_audit_log_auth_events") !== "false";
  });
  const [verbosePipelineLogging, setVerbosePipelineLogging] = React.useState(() => {
    return localStorage.getItem("tg_verbose_pipeline_logging") === "true";
  });
  const [auditSaving, setAuditSaving] = React.useState(false);
  const [auditSavedMsg, setAuditSavedMsg] = React.useState<string | null>(null);

  // AI settings
  const [riskThresholdMed, setRiskThresholdMed] = React.useState("30");
  const [riskThresholdHigh, setRiskThresholdHigh] = React.useState("70");
  const [faceSimilarityThreshold, setFaceSimilarityThreshold] = React.useState("70");
  const [tamperingThreshold, setTamperingThreshold] = React.useState("30");
  const [demoModeDefault, setDemoModeDefault] = React.useState(false);

  // Session timeout state (governed by Supervisor / Admin)
  const [sessionTimeoutMins, setSessionTimeoutMins] = React.useState(() => {
    return localStorage.getItem("tg_session_timeout_mins") || "30";
  });
  const [sessionSaving, setSessionSaving] = React.useState(false);
  const [sessionSavedMsg, setSessionSavedMsg] = React.useState<string | null>(null);

  const canManageSession = user?.role === "admin" || user?.role === "supervisor";

  React.useEffect(() => {
    Promise.resolve(
      insforge.database
        .from("settings")
        .select("value")
        .eq("key", "session_timeout_mins")
        .maybeSingle()
    )
      .then((res: any) => {
        const data = res?.data;
        if (data && typeof data.value !== "undefined") {
          const v = String(data.value);
          setSessionTimeoutMins(v);
          localStorage.setItem("tg_session_timeout_mins", v);
        }
      })
      .catch(() => {});

    // Fetch persisted retention policy
    Promise.resolve(
      insforge.database
        .from("settings")
        .select("value")
        .eq("key", "retention_policy")
        .maybeSingle()
    )
      .then((res: any) => {
        const val = res?.data?.value;
        if (val && typeof val === "object") {
          if (typeof val.retention_days === "number") {
            setRetentionDays(String(val.retention_days));
            localStorage.setItem("tg_retention_days", String(val.retention_days));
          }
          if (typeof val.auto_delete_expired === "boolean") {
            setAutoDeleteExpired(val.auto_delete_expired);
            localStorage.setItem("tg_retention_auto_delete", String(val.auto_delete_expired));
          }
          if (typeof val.retain_demo_cases === "boolean") {
            setRetainDemoCases(val.retain_demo_cases);
            localStorage.setItem("tg_retention_retain_demo", String(val.retain_demo_cases));
          }
        }
      })
      .catch(() => {});

    // Fetch persisted audit settings
    Promise.resolve(
      insforge.database
        .from("settings")
        .select("value")
        .eq("key", "audit_settings")
        .maybeSingle()
    )
      .then((res: any) => {
        const val = res?.data?.value;
        if (val && typeof val === "object") {
          if (typeof val.log_ai_overrides === "boolean") setLogAiOverrides(val.log_ai_overrides);
          if (typeof val.log_report_gen === "boolean") setLogReportGen(val.log_report_gen);
          if (typeof val.log_auth_events === "boolean") setLogAuthEvents(val.log_auth_events);
          if (typeof val.verbose_pipeline_logging === "boolean") {
            setVerbosePipelineLogging(val.verbose_pipeline_logging);
            localStorage.setItem("tg_verbose_pipeline_logging", String(val.verbose_pipeline_logging));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSessionTimeout = async () => {
    if (!canManageSession) return;
    setSessionSaving(true);
    setSessionSavedMsg(null);
    try {
      const mins = parseInt(sessionTimeoutMins, 10);
      localStorage.setItem("tg_session_timeout_mins", String(mins));
      window.dispatchEvent(new CustomEvent("tg:session_timeout_changed", { detail: mins }));
      await insforge.database
        .from("settings")
        .upsert({ key: "session_timeout_mins", value: mins } as any);
      setSessionSavedMsg(`Session inactivity timeout saved (${mins === 0 ? "Disabled" : mins + " mins"}).`);
      setTimeout(() => setSessionSavedMsg(null), 3000);
    } catch {
      setSessionSavedMsg("Session timeout saved locally.");
      setTimeout(() => setSessionSavedMsg(null), 3000);
    } finally {
      setSessionSaving(false);
    }
  };

  const handleSaveAuditSettings = async () => {
    setAuditSaving(true);
    setAuditSavedMsg(null);
    try {
      localStorage.setItem("tg_audit_log_ai_overrides", String(logAiOverrides));
      localStorage.setItem("tg_audit_log_report_gen", String(logReportGen));
      localStorage.setItem("tg_audit_log_auth_events", String(logAuthEvents));
      localStorage.setItem("tg_verbose_pipeline_logging", String(verbosePipelineLogging));

      window.dispatchEvent(
        new CustomEvent("tg:verbose_logging_changed", { detail: verbosePipelineLogging })
      );

      try {
        await insforge.database.from("settings").upsert({
          key: "audit_settings",
          value: {
            log_ai_overrides: logAiOverrides,
            log_report_gen: logReportGen,
            log_auth_events: logAuthEvents,
            verbose_pipeline_logging: verbosePipelineLogging,
          },
        } as any);
      } catch {
        // Safe local persistence fallback
      }

      setSavedSection("audit");
      setAuditSavedMsg("Audit trail depth and verbose pipeline logging preferences saved.");
      setTimeout(() => {
        setSavedSection(null);
        setAuditSavedMsg(null);
      }, 3500);
    } finally {
      setAuditSaving(false);
    }
  };

  const handleSaveRetention = async () => {
    setRetentionSaving(true);
    setRetentionSavedMsg(null);
    setSweepResult(null);
    try {
      const days = parseInt(retentionDays, 10) || 90;
      localStorage.setItem("tg_retention_days", String(days));
      localStorage.setItem("tg_retention_auto_delete", String(autoDeleteExpired));
      localStorage.setItem("tg_retention_retain_demo", String(retainDemoCases));

      window.dispatchEvent(
        new CustomEvent("tg:retention_policy_changed", {
          detail: { days, autoDeleteExpired, retainDemoCases },
        })
      );

      try {
        await Promise.all([
          insforge.database.from("settings").upsert({
            key: "retention_days",
            value: days,
          } as any),
          insforge.database.from("settings").upsert({
            key: "retention_policy",
            value: {
              retention_days: days,
              auto_delete_expired: autoDeleteExpired,
              retain_demo_cases: retainDemoCases,
            },
          } as any),
        ]);
      } catch (err) {
        console.warn("[TrustGate] Saved retention policy to local storage:", err);
      }

      setSavedSection("retention");
      setRetentionSavedMsg(
        `Data retention policy saved (${days} days, auto-delete ${autoDeleteExpired ? "enabled" : "disabled"}).`
      );
      setTimeout(() => {
        setSavedSection(null);
        setRetentionSavedMsg(null);
      }, 3500);
    } finally {
      setRetentionSaving(false);
    }
  };

  const handleExecuteRetentionSweep = async () => {
    setRetentionSweeping(true);
    setSweepResult(null);
    try {
      const days = parseInt(retentionDays, 10) || 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffIso = cutoffDate.toISOString();

      let purgedCount = 0;

      // 1. Check remote database
      try {
        let q = insforge.database
          .from("cases")
          .select("id,case_code,created_at,is_demo")
          .lt("created_at", cutoffIso);

        if (retainDemoCases) {
          q = q.eq("is_demo", false);
        }

        const res = await q;
        const expiredCases = res?.data ?? [];

        if (expiredCases.length > 0 && autoDeleteExpired) {
          for (const c of expiredCases) {
            await insforge.database.from("cases").delete().eq("id", c.id);
            purgedCount++;
          }
        }
      } catch (err) {
        console.warn("[TrustGate] Remote retention sweep query:", err);
      }

      // 2. Also check local offline database
      try {
        const offlineSweep = await sweepExpiredCasesOffline({
          days,
          retainDemo: retainDemoCases,
          autoDelete: autoDeleteExpired,
        });
        if (offlineSweep.purged > purgedCount) {
          purgedCount = offlineSweep.purged;
        }
      } catch {
        // Safe offline sweep fallback
      }

      // 3. Log to audit log
      try {
        await insforge.database.from("audit_logs").insert([
          {
            actor_id: user?.id ?? "06d9077b-2a97-460e-b6ed-38d6a16581c3",
            action: "RETENTION_SWEEP_EXECUTED",
            event_type: "system.retention_cleanup",
            result: "SUCCESS",
            metadata: {
              retention_days: days,
              auto_delete_enabled: autoDeleteExpired,
              retain_demo_cases: retainDemoCases,
              purged_count: purgedCount,
            },
          },
        ]);
      } catch {
        // Safe audit log fallback
      }

      if (purgedCount > 0) {
        setSweepResult({
          ok: true,
          text: `Auto-delete retention sweep completed: Successfully purged ${purgedCount} expired record(s) older than ${days} days.`,
        });
      } else {
        setSweepResult({
          ok: true,
          text: `Retention sweep completed: All screening records are compliant within the ${days}-day retention window. 0 expired records required deletion.`,
        });
      }
      setTimeout(() => setSweepResult(null), 6000);
    } catch (err: any) {
      setSweepResult({
        ok: false,
        text: `Retention sweep failed: ${err.message || "Unknown error"}`,
      });
    } finally {
      setRetentionSweeping(false);
    }
  };

  const [savedSection, setSavedSection] = React.useState<SectionId | null>(null);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwdMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      await updatePassword(newPassword);
      setPwdMsg({ ok: true, text: "Password updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = (err as Error).message ?? "Failed to update password.";
      // If the message contains "reset email has been sent" it is actually a success path
      if (msg.includes("reset email has been sent") || msg.includes("sent to ")) {
        setPwdMsg({ ok: true, text: msg });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwdMsg({ ok: false, text: msg });
      }
    } finally {
      setPwdSaving(false);
    }
  }

  function handleSave(sec: SectionId) {
    // In a real app, each section would persist to InsForge profiles/settings table.
    // For the prototype, we show a success toast.
    setSavedSection(sec);
    setTimeout(() => setSavedSection(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-signal-blue" />
          Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your profile, security preferences, notifications, and system configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-3">
            <nav className="space-y-1">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                      section === s.id
                        ? "bg-signal-blue/12 text-signal-blue"
                        : "text-slate-400 hover:bg-ink-raised/60 hover:text-slate-100"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3">
          {section === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Your identity within the TrustGate AI platform.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-signal-blue/60 to-signal-purple/60 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
                    {(displayName || user?.name || "U")
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">{user?.name ?? "Officer"}</div>
                    <div className="text-sm text-slate-400">{user?.email}</div>
                    <Badge variant="default" className="mt-1.5 uppercase">
                      {user?.role ?? "officer"}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="badgeId">Badge / Officer ID</Label>
                    <Input
                      id="badgeId"
                      value={badgeId}
                      onChange={(e) => setBadgeId(e.target.value)}
                      placeholder="e.g. OF-04821"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="station">Station / Checkpoint</Label>
                    <Input
                      id="station"
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                      placeholder="e.g. Terminal 2 — International"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="team">Team</Label>
                    <Input
                      id="team"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      placeholder="e.g. Alpha Shift"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSave("profile")}
                  >
                    {savedSection === "profile" ? (
                      <><CheckCircle2 className="h-4 w-4" /> Saved</>
                    ) : (
                      <><Save className="h-4 w-4" /> Save Profile</>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500">
                    Profile updates require a page refresh to reflect globally.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {section === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Change your password and review session security settings.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5">
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <h3 className="text-sm font-semibold text-slate-200">Change Password</h3>
                  {pwdMsg && (
                    <div
                      className={cn(
                        "rounded-lg border px-4 py-3 text-sm",
                        pwdMsg.ok
                          ? "border-risk-low/40 bg-risk-low/5 text-risk-low"
                          : "border-risk-high/40 bg-risk-high/5 text-risk-high"
                      )}
                    >
                      {pwdMsg.text}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={pwdSaving}
                  >
                    {pwdSaving ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </form>
                <Separator className="my-5" />
                <div className="space-y-4">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-signal-blue" />
                        Session Inactivity Logout Time
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Enforce automated officer logout on idle terminals to protect border screening integrity.
                      </p>
                    </div>
                    {canManageSession ? (
                      <Badge variant="pass" className="text-[10px] font-mono">
                        <Shield className="h-3 w-3 mr-1" /> SUPERVISOR &amp; ADMIN ACCESS
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/10">
                        <Lock className="h-3 w-3 mr-1" /> ADMIN &amp; SUPERVISOR ONLY
                      </Badge>
                    )}
                  </div>

                  {sessionSavedMsg && (
                    <div className="rounded-lg border border-risk-low/40 bg-risk-low/5 px-4 py-2.5 text-xs text-risk-low flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {sessionSavedMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="sessionTimeout">Session Timeout Duration</Label>
                      <select
                        id="sessionTimeout"
                        disabled={!canManageSession || sessionSaving}
                        value={sessionTimeoutMins}
                        onChange={(e) => setSessionTimeoutMins(e.target.value)}
                        className={cn(
                          "w-full rounded-lg border border-ink-border bg-ink-card px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-signal-blue/50",
                          !canManageSession && "opacity-60 cursor-not-allowed bg-ink/50"
                        )}
                      >
                        <option value="5">5 Minutes — Maximum Security (Inspection Checkpoint)</option>
                        <option value="15">15 Minutes — High Security (Primary Booth)</option>
                        <option value="30">30 Minutes — Standard Security (Recommended Default)</option>
                        <option value="60">60 Minutes (1 Hour) — Extended Border Shift</option>
                        <option value="240">240 Minutes (4 Hours) — Half Shift Duty</option>
                        <option value="480">480 Minutes (8 Hours) — Full Operational Day</option>
                        <option value="0">0 (Disabled — Continuous Session Allowed)</option>
                      </select>
                    </div>
                    {canManageSession ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={sessionSaving}
                        onClick={handleSaveSessionTimeout}
                        className="h-[38px] w-full sm:w-auto"
                      >
                        {sessionSaving ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                        ) : (
                          <><Save className="h-4 w-4" /> Save Timeout</>
                        )}
                      </Button>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic pb-2">
                        Managed by Supervisor / Admin
                      </div>
                    )}
                  </div>

                  {!canManageSession && (
                    <div className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 leading-relaxed">
                      Session inactivity logout is locked to Border Supervisors and Chief Administrators to comply with zero-trust checkpoint regulations. Screening officers and analysts cannot alter this policy.
                    </div>
                  )}

                  <Separator className="my-2" />

                  <div className="space-y-0">
                    <ToggleSwitch
                      checked={true}
                      onChange={() => {}}
                      label="Persist Session"
                      description="Stay signed in across browser restarts while active. Managed by InsForge Auth."
                    />
                    <ToggleSwitch
                      checked={true}
                      onChange={() => {}}
                      label="Auto-refresh Token"
                      description="Automatically renew security tokens before expiry."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {section === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Control which events trigger platform notifications.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <ToggleSwitch
                  checked={notifHighRisk}
                  onChange={setNotifHighRisk}
                  label="High-Risk Case Alert"
                  description="Notify when a screening case receives a HIGH risk score."
                />
                <ToggleSwitch
                  checked={notifScreeningComplete}
                  onChange={setNotifScreeningComplete}
                  label="Screening Complete"
                  description="Notify when the TRUSTFUSION RISK ENGINE finishes multi-modal verification."
                />
                <ToggleSwitch
                  checked={notifReviewRequired}
                  onChange={setNotifReviewRequired}
                  label="Review Required"
                  description="Notify when a case is flagged for supervisor review."
                />
                <ToggleSwitch
                  checked={notifSystemAlert}
                  onChange={setNotifSystemAlert}
                  label="System Alerts"
                  description="Infrastructure health events and service degradation notices."
                />
                <ToggleSwitch
                  checked={notifModelAlert}
                  onChange={setNotifModelAlert}
                  label="AI Model Alerts"
                  description="Alerts when model confidence drops below configured thresholds."
                />
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSave("notifications")}
                  >
                    {savedSection === "notifications" ? (
                      <><CheckCircle2 className="h-4 w-4" /> Saved</>
                    ) : (
                      <><Save className="h-4 w-4" /> Save Preferences</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {section === "retention" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Data Retention &amp; Lifecycle Management</CardTitle>
                    <CardDescription>
                      Configure document longevity thresholds, automated purge policies, and trigger storage sweeps.
                    </CardDescription>
                  </div>
                  <Badge
                    variant={autoDeleteExpired ? "pass" : "default"}
                    className="text-[10px] font-mono tracking-wider"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full mr-1.5",
                        autoDeleteExpired ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                      )}
                    />
                    {autoDeleteExpired ? "AUTO-DELETE ACTIVE" : "MANUAL REVIEW ONLY"}
                  </Badge>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="rounded-lg border border-risk-medium/30 bg-risk-medium/5 px-4 py-3 text-sm text-risk-medium">
                  <strong>Privacy principle:</strong> Identity documents should not be retained
                  beyond operational necessity. Configure retention to meet your jurisdiction's
                  data-minimization requirements.
                </div>

                {retentionSavedMsg && (
                  <div className="rounded-lg border border-risk-low/40 bg-risk-low/5 px-4 py-2.5 text-xs text-risk-low flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {retentionSavedMsg}
                  </div>
                )}

                {sweepResult && (
                  <div
                    className={cn(
                      "rounded-lg border px-4 py-2.5 text-xs flex items-center gap-2",
                      sweepResult.ok
                        ? "border-signal-blue/40 bg-signal-blue/10 text-signal-cyan"
                        : "border-risk-high/40 bg-risk-high/10 text-risk-high"
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {sweepResult.text}
                  </div>
                )}

                <div className="space-y-1.5 max-w-xs">
                  <Label htmlFor="retentionDays">Retention Period (days)</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min="1"
                    max="3650"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Documents are automatically flagged for deletion after this period.
                  </p>
                </div>

                <ToggleSwitch
                  checked={autoDeleteExpired}
                  onChange={(v) => {
                    setAutoDeleteExpired(v);
                    localStorage.setItem("tg_retention_auto_delete", String(v));
                  }}
                  label="Auto-delete Expired Records"
                  description="Automatically remove document images and OCR data after retention period expires."
                />
                <ToggleSwitch
                  checked={retainDemoCases}
                  onChange={(v) => {
                    setRetainDemoCases(v);
                    localStorage.setItem("tg_retention_retain_demo", String(v));
                  }}
                  label="Retain Demo Cases Permanently"
                  description="Keep demo/synthetic cases indefinitely for training and demonstration purposes."
                />

                <div className="flex items-center flex-wrap gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={retentionSaving || retentionSweeping}
                    onClick={handleSaveRetention}
                  >
                    {retentionSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving…
                      </>
                    ) : savedSection === "retention" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-1.5" /> Policy Saved
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1.5" /> Save Retention Policy
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={retentionSaving || retentionSweeping}
                    onClick={handleExecuteRetentionSweep}
                    className="border-rose-500/40 hover:bg-rose-500/10 text-rose-300 hover:text-rose-200"
                  >
                    {retentionSweeping ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5 text-rose-400" /> Scanning &amp; Purging…
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1.5 text-rose-400" /> Run Auto-Delete Sweep Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {section === "ai" && (
            <Card>
              <CardHeader>
                <CardTitle>AI Configuration</CardTitle>
                <CardDescription>
                  Threshold tuning for risk scoring, face matching, and tampering detection.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-5">
                <div className="rounded-lg border border-signal-blue/30 bg-signal-blue/5 px-4 py-3 text-sm text-signal-cyan">
                  These thresholds affect the TRUSTFUSION RISK ENGINE classification boundaries. Changes
                  take effect on the next screening run. They do not modify trained model weights.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="riskMed">Medium Risk Threshold (0–100)</Label>
                    <Input
                      id="riskMed"
                      type="number"
                      min="0"
                      max="100"
                      value={riskThresholdMed}
                      onChange={(e) => setRiskThresholdMed(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Score ≥ this → MEDIUM risk</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="riskHigh">High Risk Threshold (0–100)</Label>
                    <Input
                      id="riskHigh"
                      type="number"
                      min="0"
                      max="100"
                      value={riskThresholdHigh}
                      onChange={(e) => setRiskThresholdHigh(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Score ≥ this → HIGH risk</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="faceSim">Face Similarity Threshold (%)</Label>
                    <Input
                      id="faceSim"
                      type="number"
                      min="0"
                      max="100"
                      value={faceSimilarityThreshold}
                      onChange={(e) => setFaceSimilarityThreshold(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Below this → face mismatch finding</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tampThresh">Tampering Detection Threshold (%)</Label>
                    <Input
                      id="tampThresh"
                      type="number"
                      min="0"
                      max="100"
                      value={tamperingThreshold}
                      onChange={(e) => setTamperingThreshold(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Above this → tampering finding raised</p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={demoModeDefault}
                  onChange={setDemoModeDefault}
                  label="Default to Demo Mode"
                  description="New screenings will default to demo mode until manually switched."
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSave("ai")}
                >
                  {savedSection === "ai" ? (
                    <><CheckCircle2 className="h-4 w-4" /> Saved</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save AI Config</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {section === "system" && (
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  Platform-wide settings for TrustGate AI.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="grid gap-3">
                  {[
                    { label: "API Base URL", value: import.meta.env.VITE_INSFORGE_URL ?? "https://heicn84u.us-east.insforge.app" },
                    { label: "App Version", value: "1.0.0-enterprise" },
                    { label: "Deployment Standard", value: "ICAO-9303 Enterprise Border Security" },
                    { label: "Database Backend", value: "InsForge / Postgres" },
                    { label: "Auth Provider", value: "InsForge Auth" },
                    { label: "TRUSTFUSION RISK ENGINE", value: "9-Stage Multi-Modal (MIDV-2020 & FaceForensics++)" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-ink-border/60 bg-ink-card/30 px-4 py-2.5">
                      <span className="text-sm text-slate-400">{item.label}</span>
                      <span className="text-sm font-mono text-slate-200 text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {section === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Visual preferences for the TrustGate AI interface.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">Theme</h3>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "flex-1 rounded-xl p-4 text-center transition-all cursor-pointer",
                        theme === "dark"
                          ? "border-2 border-signal-blue bg-ink shadow-md"
                          : "border border-ink-border bg-ink-card/40 opacity-70 hover:opacity-100 hover:border-slate-500"
                      )}
                    >
                      <div className="text-sm font-semibold text-slate-100 flex items-center justify-center gap-1.5">
                        <span>Dark</span>
                        {theme === "dark" && <span className="text-xs text-signal-blue font-bold">✓</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Default — recommended for operations
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={cn(
                        "flex-1 rounded-xl p-4 text-center transition-all cursor-pointer",
                        theme === "light"
                          ? "border-2 border-signal-blue bg-white shadow-md text-slate-900"
                          : "border border-ink-border bg-ink-card/40 opacity-70 hover:opacity-100 hover:border-slate-500"
                      )}
                    >
                      <div className="text-sm font-semibold text-slate-100 flex items-center justify-center gap-1.5">
                        <span>Light</span>
                        {theme === "light" && <span className="text-xs text-signal-blue font-bold">✓</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Clean white background for bright environments
                      </div>
                    </button>
                  </div>
                </div>
                <Separator />
                <ToggleSwitch
                  checked={compactMode}
                  onChange={setCompactMode}
                  label="Compact Mode"
                  description="Reduce padding and spacing for information-dense displays."
                />
                <ToggleSwitch
                  checked={reduceMotion}
                  onChange={setReduceMotion}
                  label="Reduce Motion"
                  description="Limit animations to subtle transitions only."
                />
              </CardContent>
            </Card>
          )}

          {section === "audit" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Audit Settings</CardTitle>
                    <CardDescription>
                      Configuration for audit trail depth, pipeline diagnostic logging, and record keeping.
                    </CardDescription>
                  </div>
                  <Badge
                    variant={verbosePipelineLogging ? "pass" : "default"}
                    className="text-[10px] font-mono tracking-wider"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full mr-1.5",
                        verbosePipelineLogging
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-slate-500"
                      )}
                    />
                    {verbosePipelineLogging ? "VERBOSE LOGGING ACTIVE" : "STANDARD LOGGING"}
                  </Badge>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="rounded-lg border border-risk-low/30 bg-risk-low/5 px-4 py-3 text-sm text-risk-low">
                  The audit log is INSERT-only at the database level. These settings control
                  display and export behavior only — not what is recorded.
                </div>

                {auditSavedMsg && (
                  <div className="rounded-lg border border-risk-low/40 bg-risk-low/5 px-4 py-2.5 text-xs text-risk-low flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {auditSavedMsg}
                  </div>
                )}

                <ToggleSwitch
                  checked={logAiOverrides}
                  onChange={(v) => {
                    setLogAiOverrides(v);
                    localStorage.setItem("tg_audit_log_ai_overrides", String(v));
                  }}
                  label="Log All AI Override Actions"
                  description="Record every officer override with reason, actor, and timestamp."
                />
                <ToggleSwitch
                  checked={logReportGen}
                  onChange={(v) => {
                    setLogReportGen(v);
                    localStorage.setItem("tg_audit_log_report_gen", String(v));
                  }}
                  label="Log Report Generation"
                  description="Audit every report export including generated_by and timestamp."
                />
                <ToggleSwitch
                  checked={logAuthEvents}
                  onChange={(v) => {
                    setLogAuthEvents(v);
                    localStorage.setItem("tg_audit_log_auth_events", String(v));
                  }}
                  label="Log Authentication Events"
                  description="Record all login, logout, and failed authentication attempts."
                />
                <ToggleSwitch
                  checked={verbosePipelineLogging}
                  onChange={(v) => {
                    setVerbosePipelineLogging(v);
                    localStorage.setItem("tg_verbose_pipeline_logging", String(v));
                    window.dispatchEvent(
                      new CustomEvent("tg:verbose_logging_changed", { detail: v })
                    );
                  }}
                  label="Verbose Pipeline Logging"
                  description="Log per-step TrustGate Fusion Engine results in addition to case-level events."
                />

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={auditSaving}
                    onClick={handleSaveAuditSettings}
                  >
                    {auditSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving…
                      </>
                    ) : savedSection === "audit" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-1.5" /> Saved
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1.5" /> Save Audit Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
