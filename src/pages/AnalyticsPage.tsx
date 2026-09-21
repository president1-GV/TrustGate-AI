import * as React from "react";
import {
  FileText,
  ScanSearch,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Flag,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  Target,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listCasesForDashboard, type DashboardSummary } from "@/lib/db";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDuration } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: string | number;
  delta?: { value: string; positive?: boolean };
  sub?: string;
  loading?: boolean;
}

function KpiCard({ icon: Icon, iconClass, label, value, delta, sub, loading }: KpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              iconClass
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          {delta && !loading && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold",
                delta.positive ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {delta.positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta.value}
            </span>
          )}
        </div>
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400 mb-1">
            {label}
          </div>
          {loading ? (
            <div className="h-7 w-20 bg-ink-raised/60 animate-pulse rounded-md" />
          ) : (
            <div className="text-2xl font-black tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
              {value}
            </div>
          )}
          {sub && (
            <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPage() {
  const { theme } = useTheme();
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: listCasesForDashboard,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  const tooltipStyle = React.useMemo(() => ({
    background: theme === "light" ? "#ffffff" : "rgba(15, 23, 42, 0.95)",
    border: theme === "light" ? "1px solid #e2e8f0" : "1px solid rgba(148,163,184,0.2)",
    borderRadius: 10,
    color: theme === "light" ? "#0f172a" : "#f8fafc",
    fontSize: 12,
    boxShadow: theme === "light" ? "0 10px 25px -5px rgba(15, 23, 42, 0.12)" : "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  }), [theme]);

  const total = data?.totalCases ?? 0;
  const cleared = data?.clearedCount ?? 0;
  const flagged = (data?.flaggedCount ?? 0) + (data?.escalatedCount ?? 0);
  const clearanceRate = total > 0 ? ((cleared / total) * 100).toFixed(1) + "%" : "0%";
  const flagRate = total > 0 ? ((flagged / total) * 100).toFixed(1) + "%" : "0%";

  const kpiCards: KpiCardProps[] = [
    {
      icon: FileText,
      iconClass: "bg-signal-blue/15 text-signal-blue",
      label: "Total Cases",
      value: total.toLocaleString(),
      sub: "Active database screenings",
      loading: isLoading,
    },
    {
      icon: ScanSearch,
      iconClass: "bg-signal-cyan/15 text-signal-cyan",
      label: "Today's Screenings",
      value: (data?.todayCases ?? 0).toLocaleString(),
      sub: "Processed in last 24h",
      loading: isLoading,
    },
    {
      icon: AlertOctagon,
      iconClass: "bg-risk-high/15 text-risk-high",
      label: "High Risk Cases",
      value: (data?.highRiskCount ?? 0).toLocaleString(),
      sub: "Requiring escalation",
      loading: isLoading,
    },
    {
      icon: AlertTriangle,
      iconClass: "bg-risk-medium/15 text-risk-medium",
      label: "Medium Risk Cases",
      value: (data?.mediumRiskCount ?? 0).toLocaleString(),
      sub: "Under review queue",
      loading: isLoading,
    },
    {
      icon: ShieldCheck,
      iconClass: "bg-risk-low/15 text-risk-low",
      label: "Clearance Rate",
      value: clearanceRate,
      sub: `${cleared} cases cleared`,
      loading: isLoading,
    },
    {
      icon: Flag,
      iconClass: "bg-signal-purple/15 text-signal-purple",
      label: "Flagged / Escalated",
      value: flagged.toLocaleString(),
      sub: `${flagRate} alert proportion`,
      loading: isLoading,
    },
    {
      icon: Clock,
      iconClass: "bg-slate-500/15 text-slate-300",
      label: "Avg Processing Time",
      value: data ? formatDuration(data.avgProcessingTimeMs) : "—",
      sub: "Live inference pipeline",
      loading: isLoading,
    },
    {
      icon: Target,
      iconClass: "bg-emerald-500/15 text-emerald-400",
      label: "AI Confidence Avg",
      value: data ? `${data.avgAiConfidencePct}/100` : "—",
      sub: "Combined risk assessment",
      loading: isLoading,
    },
  ];

  const screeningVolume = data?.dailyScreeningVolume ?? [];
  const riskDistribution = data?.riskDistribution ?? [];
  const alertTrends = data?.dailyAlertTrends ?? [];
  const documentTypes = data?.documentTypes ?? [];
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Intelligence Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Operational KPIs and AI model performance across the border network.
          </p>
        </div>
        <Badge variant="pass" className="text-xs px-3 py-1">
          <Activity className="h-3 w-3" />
          Live Data
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Screening Volume Area Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Screening Volume — Last 14 Days</CardTitle>
              <Badge variant="pass" className="text-[10px] font-mono">Live</Badge>
            </div>
            <CardDescription>Daily throughput trend with clearance split from active records.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-signal-blue" />
                  <span className="text-xs">Loading live telemetry…</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={screeningVolume} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradAScreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5FF" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#0EA5FF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradACleared" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ReTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="screenings" stroke="#0EA5FF" strokeWidth={2} fill="url(#gradAScreen)" name="Total Screened" />
                    <Area type="monotone" dataKey="cleared" stroke="#10B981" strokeWidth={2} fill="url(#gradACleared)" name="Cleared" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution Donut Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Risk Distribution</CardTitle>
              <Badge variant="default" className="text-[10px] font-mono">{total} Cases</Badge>
            </div>
            <CardDescription>Overall case proportion by evaluated risk tier.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-72 flex items-center justify-center">
              {isLoading ? (
                <div className="w-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-signal-blue" />
                  <span className="text-xs">Loading live telemetry…</span>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={98}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {riskDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} stroke="rgba(2,6,23,0.6)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <ReTooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                      {total}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      Total Cases
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alert Trends / Severity Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Severity Breakdown — Daily</CardTitle>
            <CardDescription>Daily evaluated cases categorized by risk severity level.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-signal-blue" />
                  <span className="text-xs">Loading live telemetry…</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ReTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="low" fill="#10B981" name="Low Risk" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="med" fill="#F59E0B" name="Medium Risk" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="high" fill="#EF4444" name="High Risk" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Types Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Document Types Distribution</CardTitle>
              <Badge variant="default" className="text-[10px] font-mono">{documentTypes.length} Types</Badge>
            </div>
            <CardDescription>Screened credentials by document category and high-risk flags.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-signal-blue" />
                  <span className="text-xs">Loading live telemetry…</span>
                </div>
              ) : documentTypes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  No documents screened yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={documentTypes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis dataKey="type" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ReTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" fill="#0EA5FF" name="Total Screened" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="highRisk" fill="#EF4444" name="High Risk Flagged" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
