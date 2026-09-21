import * as React from "react";
import {
  ShieldCheck,
  UserCheck,
  Radio,
  Building2,
  ArrowRight,
  CheckCircle2,
  X,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, useAuth } from "@/providers/AuthProvider";
import { type AppRole } from "@/lib/insforge";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface DutyOfficerProfile {
  id: string;
  name: string;
  role: AppRole;
  badgeId: string;
  station: string;
  team: string;
  email: string;
  clearanceLevel: string;
  dutyStatus: "ON_DUTY" | "STANDBY" | "SUPERVISORY";
  avatarColor: string;
  description: string;
}

export const ROSTER_OFFICERS: DutyOfficerProfile[] = [
  {
    id: "officer-rajesh-kumar",
    name: "Inspector Rajesh Kumar",
    role: "officer",
    badgeId: "FO-8921",
    station: "Indo-Nepal ICP Raxaul · Lane 04 (Primary Ingestion)",
    team: "First-Line Border Screening Roster",
    email: "rajesh.kumar@trustgate.defense.gov",
    clearanceLevel: "Level 1 — Operational Screener",
    dutyStatus: "ON_DUTY",
    avatarColor: "from-blue-600 to-cyan-500",
    description: "Frontline passport optical inspection, live biometric capture, and primary ICAO 9303 verification.",
  },
  {
    id: "supervisor-priya-sharma",
    name: "Supervisor Priya Sharma",
    role: "supervisor",
    badgeId: "SUP-4402",
    station: "Indo-Nepal ICP Raxaul · Command & Escalation Desk",
    team: "Border Defense Rapid Response",
    email: "priya.sharma@trustgate.defense.gov",
    clearanceLevel: "Level 2 — Supervisory Authority",
    dutyStatus: "ON_DUTY",
    avatarColor: "from-amber-600 to-orange-500",
    description: "Escalation review, manual override approvals, high-risk quarantine, and watchlist disposition management.",
  },
  {
    id: "analyst-devendra-singh",
    name: "Devendra Singh",
    role: "analyst",
    badgeId: "FOR-1109",
    station: "Indo-Nepal ICP Raxaul · Forensic Document Lab",
    team: "Forensics & Biometric Intelligence",
    email: "devendra.singh@trustgate.defense.gov",
    clearanceLevel: "Level 3 — Forensic Document Examiner",
    dutyStatus: "ON_DUTY",
    avatarColor: "from-purple-600 to-indigo-500",
    description: "Deep Error Level Analysis (ELA), spectral photo inspection, and synthetic face detection.",
  },
  {
    id: "admin-vk-nair",
    name: "Commandant V. K. Nair",
    role: "admin",
    badgeId: "ADM-001",
    station: "ICP Central Command · Headquarters",
    team: "Border Command & System Administration",
    email: "commandant.nair@trustgate.defense.gov",
    clearanceLevel: "Level 4 — Full Border Administrator",
    dutyStatus: "ON_DUTY",
    avatarColor: "from-emerald-600 to-teal-500",
    description: "System security, member authorizations, model lifecycle, and audit retention policies.",
  },
  {
    id: "field-officer-airgap-01",
    name: "Field Officer (Air-Gapped Standalone Station)",
    role: "admin",
    badgeId: "AIRGAP-001",
    station: "Indo-Nepal ICP Raxaul · Terminal 01 (Offline)",
    team: "Border Defense Rapid Response",
    email: "airgap.officer@trustgate.defense.gov",
    clearanceLevel: "Air-Gapped Emergency Override",
    dutyStatus: "ON_DUTY",
    avatarColor: "from-sky-600 to-blue-500",
    description: "Local standalone operational workstation with encrypted local IndexedDB storage.",
  },
];

interface OfficerSwitcherModalProps {
  open: boolean;
  onClose: () => void;
}

export function OfficerSwitcherModal({ open, onClose }: OfficerSwitcherModalProps) {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [selectedSuccess, setSelectedSuccess] = React.useState<string | null>(null);

  if (!open) return null;

  const handleSwitch = (profile: DutyOfficerProfile) => {
    const updatedSession = {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      badgeId: profile.badgeId,
      station: profile.station,
      team: profile.team,
      email: profile.email,
    };

    setSession(updatedSession);
    setSelectedSuccess(profile.name);
    try {
      localStorage.setItem("tg_authenticated_session", JSON.stringify(updatedSession));
    } catch {}


    // Dispatch broadcast alert for real-time notification popover
    window.dispatchEvent(
      new CustomEvent("tg:new_alert", {
        detail: {
          title: `👤 Active Duty Officer Switched: ${profile.name}`,
          body: `Logged on at ${profile.station}. Authorization: ${profile.role.toUpperCase()} (Badge ${profile.badgeId}).`,
          kind: "security",
        },
      })
    );

    setTimeout(() => {
      onClose();
    }, 450);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duty-roster-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-signal-blue/40 bg-ink-card/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-signal-blue/15 border border-signal-blue/40 flex items-center justify-center text-signal-cyan shadow-glow">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="duty-roster-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                Border Gateway Duty Officer Roster
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400">
                Switch active operator profile or inspect terminal security clearance credentials.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-ink-raised transition-colors cursor-pointer"
            aria-label="Close officer switcher"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Officer Status Banner */}
        <div className="px-6 py-3 bg-signal-blue/10 border-b border-signal-blue/20 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Radio className="h-4 w-4 text-signal-cyan animate-pulse" />
            <span className="text-xs text-slate-300 font-medium">
              Currently Logged In:
            </span>
            <span className="text-xs font-bold text-white tracking-wide">
              {user?.name || "Field Officer"}
            </span>
            <Badge variant="default" className="text-[10px] uppercase font-mono bg-signal-blue/20 text-signal-cyan border-signal-blue/40">
              {user?.role || "officer"}
            </Badge>
            {user?.badgeId && (
              <span className="text-[10px] font-mono text-slate-400">
                ({user.badgeId})
              </span>
            )}
          </div>
          <div className="text-[11px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            ONLINE & AUTHENTICATED
          </div>
        </div>

        {selectedSuccess && (
          <div className="px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4" />
            Duty switched to {selectedSuccess}. Terminal permissions updated.
          </div>
        )}

        {/* Officers List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Authorized Field & Command Personnel</span>
            <span className="text-[10px] text-signal-cyan font-mono">Select officer to switch duty</span>
          </div>

          <div className="space-y-2.5">
            {ROSTER_OFFICERS.map((officer) => {
              const isActive =
                user?.name === officer.name ||
                (user?.badgeId && user.badgeId === officer.badgeId);

              return (
                <div
                  key={officer.id}
                  onClick={() => handleSwitch(officer)}
                  className={cn(
                    "group relative flex items-start gap-4 p-3.5 rounded-xl border transition-all cursor-pointer",
                    isActive
                      ? "bg-signal-blue/15 border-signal-blue/60 shadow-md shadow-signal-blue/10 ring-1 ring-signal-blue/30"
                      : "bg-ink-card/60 border-ink-border hover:border-slate-600 hover:bg-ink-raised/60"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shadow-md flex-shrink-0 mt-0.5",
                      officer.avatarColor
                    )}
                  >
                    {officer.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-100 group-hover:text-signal-cyan transition-colors">
                        {officer.name}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {officer.badgeId}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded border",
                          officer.role === "admin"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : officer.role === "supervisor"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : officer.role === "analyst"
                            ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                            : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        )}
                      >
                        {officer.role}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active Shift
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      {officer.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {officer.station}
                      </span>
                      <span>·</span>
                      <span className="text-slate-400">{officer.clearanceLevel}</span>
                    </div>
                  </div>

                  {/* Action Icon */}
                  <div className="flex-shrink-0 pt-1">
                    {isActive ? (
                      <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:border-signal-blue group-hover:bg-signal-blue/20 transition-colors">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-ink-border bg-ink/70 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate("/settings");
              }}
              className="text-xs gap-1.5 border-ink-border text-slate-300 hover:text-white cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Officer Profile & Settings
            </Button>
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate("/admin/authorizations");
                }}
                className="text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Authorizations
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                onClose();
                try {
                  await logout();
                  navigate("/login");
                } catch {}
              }}
              className="text-xs text-rose-400 hover:bg-rose-500/10 gap-1.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
              className="text-xs bg-signal-blue hover:bg-signal-blue/90 cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
