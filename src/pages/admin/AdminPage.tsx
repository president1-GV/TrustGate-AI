import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Shield,
  Activity,
  Server,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Settings,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { insforge } from "@/lib/insforge";
import { cn, formatTimeAgo } from "@/lib/utils";

async function fetchAdminSummary() {
  const [usersRes, casesRes, auditRes, modelRes, requestsRes] = await Promise.all([
    insforge.database.from("profiles").select("id").limit(1000),
    insforge.database.from("cases").select("id,status,risk_level,created_at").order("created_at", { ascending: false }).limit(500),
    insforge.database.from("audit_logs").select("id,action,actor_id,created_at").order("created_at", { ascending: false }).limit(20),
    insforge.database.from("model_versions").select("*"),
    insforge.database.from("member_access_requests").select("id,status"),
  ]);

  const totalUsers = (usersRes.data ?? []).length;
  const allCases = casesRes.data ?? [];
  const highRisk = allCases.filter((c) => c.risk_level === "HIGH").length;
  const flagged = allCases.filter((c) => c.status === "FLAGGED" || c.status === "ESCALATED").length;
  const pendingAuths = (requestsRes.data ?? []).filter((r: any) => r.status === "pending").length;

  return {
    totalUsers,
    totalCases: allCases.length,
    highRiskCases: highRisk,
    flaggedCases: flagged,
    pendingAuthorizations: pendingAuths,
    recentAudit: auditRes.data ?? [],
    models: modelRes.data ?? [],
  };
}

const ADMIN_LINKS = [
  { to: "/admin/authorizations", label: "Member Authorizations", icon: ShieldCheck, desc: "Admit or deny member login requests in real time" },
  { to: "/admin/users", label: "User Management", icon: Users, desc: "Manage officers, roles, and access" },
  { to: "/security", label: "Security Center", icon: Shield, desc: "Security posture and controls" },
  { to: "/audit", label: "Audit Log", icon: Activity, desc: "Immutable event trail" },
  { to: "/models", label: "AI Model Registry", icon: Cpu, desc: "Model versions and benchmarks" },
  { to: "/settings", label: "System Settings", icon: Settings, desc: "Platform configuration" },
];

export function AdminPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: fetchAdminSummary,
    staleTime: 30_000,
  });

  const statCards = [
    {
      label: "Total Users",
      value: isLoading ? "…" : String(data?.totalUsers ?? 0),
      icon: Users,
      iconClass: "bg-signal-blue/15 text-signal-blue",
    },
    {
      label: "Total Cases",
      value: isLoading ? "…" : String(data?.totalCases ?? 0),
      icon: Activity,
      iconClass: "bg-signal-cyan/15 text-signal-cyan",
    },
    {
      label: "High Risk Cases",
      value: isLoading ? "…" : String(data?.highRiskCases ?? 0),
      icon: AlertTriangle,
      iconClass: "bg-risk-high/15 text-risk-high",
    },
    {
      label: "Flagged / Escalated",
      value: isLoading ? "…" : String(data?.flaggedCases ?? 0),
      icon: Shield,
      iconClass: "bg-risk-medium/15 text-risk-medium",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Lock className="h-6 w-6 text-signal-blue" />
            Administration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            System-wide control panel for admin-level management and monitoring.
          </p>
        </div>
        <Badge variant="default" className="border-signal-purple/40 text-signal-purple bg-signal-purple/10">
          ADMIN ACCESS
        </Badge>
      </div>

      {/* Pending Authorizations Action Banner */}
      {(data?.pendingAuthorizations ?? 0) > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-300">
                {data?.pendingAuthorizations} Member Login Request{data?.pendingAuthorizations !== 1 ? "s" : ""} Pending Approval
              </div>
              <div className="text-xs text-amber-200/75 mt-0.5">
                Incoming officers have registered and are held at the Authorization Gate awaiting your admission.
              </div>
            </div>
          </div>
          <Link to="/admin/authorizations">
            <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-1.5 shadow-sm">
              Review &amp; Admit Members <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-5">
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center mb-4",
                    c.iconClass
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                  {c.label}
                </div>
                <div className="text-3xl font-bold tabular-nums text-slate-100">
                  {c.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Quick nav */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Navigation</CardTitle>
            <CardDescription>Quick access to all administrative sections.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-2">
            {ADMIN_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.to} to={link.to}>
                  <div className="flex items-center gap-3 rounded-xl border border-ink-border/60 bg-ink-card/30 hover:bg-ink-raised/40 hover:border-slate-600/50 transition-all p-3 group">
                    <div className="h-9 w-9 rounded-lg bg-signal-blue/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4.5 w-4.5 text-signal-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-100">{link.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{link.desc}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent audit */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Audit Events</CardTitle>
                <CardDescription>Latest 10 system audit entries.</CardDescription>
              </div>
              <Link to="/audit">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-3 space-y-2">
            {isLoading ? (
              <div className="py-6 text-center text-slate-500 text-sm">Loading…</div>
            ) : (
              (data?.recentAudit ?? []).slice(0, 8).map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 py-1.5 border-b border-ink-border/50 last:border-none"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {a.action.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {formatTimeAgo(a.created_at)}
                    </div>
                  </div>
                  <CheckCircle2 className="h-3.5 w-3.5 text-risk-low flex-shrink-0 mt-0.5" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Model Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-signal-blue" />
                AI Model Health
              </CardTitle>
              <CardDescription>Status of all registered AI model versions.</CardDescription>
            </div>
            <Link to="/models">
              <Button variant="ghost" size="sm">
                Model Registry <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="text-slate-500 text-sm py-4">Loading models…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data?.models ?? []).map((m: any) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-ink-border/60 bg-ink-card/30 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{m.display_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{m.version}</div>
                    </div>
                    <Badge
                      variant={
                        m.status === "production"
                          ? "pass"
                          : m.status === "staging"
                          ? "warning"
                          : "default"
                      }
                    >
                      {m.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {m.notes}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-slate-400" />
            System Information
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Platform", value: "TrustGate AI Billion" },
              { label: "Version", value: "1.0.0-enterprise" },
              { label: "Deployment Standard", value: "ICAO-9303 Enterprise" },
              { label: "Backend", value: "InsForge" },
              { label: "Database", value: "Postgres (RLS enforced)" },
              { label: "Auth", value: "InsForge Auth + RBAC" },
              { label: "TRUSTFUSION RISK ENGINE", value: "9-Stage Multi-Modal (MIDV-2020 & FaceForensics++)" },
              { label: "Frontend", value: "React 18 + Vite + TypeScript" },
              { label: "Deployment", value: "Vercel Enterprise Tier" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-ink-border/60 bg-ink-card/30 px-4 py-3"
              >
                <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                  {item.label}
                </div>
                <div className="text-sm font-medium text-slate-200">{item.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
