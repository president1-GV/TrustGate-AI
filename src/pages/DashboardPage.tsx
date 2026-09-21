import * as React from "react";
import {
  FileText,
  ScanSearch,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Flag,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Eye,
  Loader2,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { insforge } from "@/lib/insforge";
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
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { listCasesForDashboard, type DashboardSummary, type CaseRow } from "@/lib/db";
import { cn, formatTimeAgo, statusColor, riskColor, formatDuration } from "@/lib/utils";



/* ─── Stat Card ─── */
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: string | number;
  delta?: { value: string; positive?: boolean };
  loading?: boolean;
}

function StatCard({ icon: Icon, iconClass, label, value, delta, loading }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          {delta && !loading && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold",
                delta.positive ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {delta.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {delta.value}
            </span>
          )}
        </div>
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400 mb-1">
            {label}
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-ink-raised/60 animate-pulse rounded-lg" />
          ) : (
            <div className="text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
              {value}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Dashboard Page ─── */
export function DashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: listCasesForDashboard,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  // Real-time WebSocket connection to PostgreSQL cases table
  React.useEffect(() => {
    let active = true;
    async function setupRealtime() {
      try {
        if ((insforge as any).realtime?.connect) {
          await (insforge as any).realtime.connect();
          await (insforge as any).realtime.subscribe("cases");
          const onUpdate = () => {
            if (active) {
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            }
          };
          (insforge as any).realtime.on("case_created", onUpdate);
          (insforge as any).realtime.on("case_updated", onUpdate);
          (insforge as any).realtime.on("cases_changed", onUpdate);
        }
      } catch (e) {
        console.info("[TrustGate] Realtime WebSocket operating with active live polling:", e);
      }
    }
    setupRealtime();
    return () => {
      active = false;
    };
  }, [queryClient]);

  /* Real-time live data computed directly from InsForge PostgreSQL */
  const riskDistribution = data?.riskDistribution ?? [];
  const screeningVolume = data?.dailyScreeningVolume ?? [];
  const alertTrends = data?.dailyAlertTrends ?? [];
  const documentTypes = data?.documentTypes ?? [];
  const statusFlow = data?.statusFlow ?? [];

  const statCards: StatCardProps[] = [
    {
      icon: FileText,
      iconClass: "bg-signal-blue/15 text-signal-blue",
      label: "Total Cases",
      value: data?.totalCases.toLocaleString() ?? "—",
      loading: isLoading,
    },
    {
      icon: ScanSearch,
      iconClass: "bg-signal-cyan/15 text-signal-cyan",
      label: "Today's Screenings",
      value: data?.todayCases.toLocaleString() ?? "—",
      loading: isLoading,
    },
    {
      icon: AlertOctagon,
      iconClass: "bg-risk-high/15 text-risk-high",
      label: "High Risk",
      value: data?.highRiskCount.toLocaleString() ?? "—",
      loading: isLoading,
    },
    {
      icon: AlertTriangle,
      iconClass: "bg-risk-medium/15 text-risk-medium",
      label: "Medium Risk",
      value: data?.mediumRiskCount.toLocaleString() ?? "—",
      loading: isLoading,
    },
    {
      icon: ShieldCheck,
      iconClass: "bg-risk-low/15 text-risk-low",
      label: "Low Risk",
      value: data?.lowRiskCount.toLocaleString() ?? "—",
      loading: isLoading,
    },
    {
      icon: Flag,
      iconClass: "bg-signal-purple/15 text-signal-purple",
      label: "Flagged",
      value: data?.flaggedCount.toLocaleString() ?? "—",
      loading: isLoading,
    },
    {
      icon: Clock,
      iconClass: "bg-slate-500/15 text-slate-300",
      label: "Avg Processing Time",
      value: data ? formatDuration(data.avgProcessingTimeMs) : "—",
      loading: isLoading,
    },
    {
      icon: Target,
      iconClass: "bg-emerald-500/15 text-emerald-400",
      label: "AI Risk Score Avg",
      value: data ? `${data.avgAiConfidencePct}/100` : "—",
      loading: isLoading,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Command Center
            </h1>
            <Badge variant="pass" className="text-[10px] font-mono tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              LIVE DATABASE FEED
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span>
              Real-time operations overview connected to live InsForge PostgreSQL database ({data?.totalCases ?? 0} active records).
            </span>
            {dataUpdatedAt > 0 && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Live Synced: {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Force immediate live database re-sync"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin text-signal-blue")} />
            {isFetching ? "Syncing..." : "Sync Live Data"}
          </Button>
          <Link to="/reports">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1.5" />
              Reports Registry
            </Button>
          </Link>
          <Link to="/screening">
            <Button variant="primary" size="sm">
              Start Screening
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Live Operational Pipeline & Decision Flow */}
      <Card className="border-signal-blue/20 bg-gradient-to-r from-ink-card via-slate-900/80 to-ink-card shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-signal-blue" />
                Screening & Officer Decision Flow
              </CardTitle>
              <CardDescription>
                Live operational pipeline status of all {data?.totalCases ?? 0} screened cases.
              </CardDescription>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              REAL-TIME INSFORGE TELEMETRY
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {statusFlow.map((step) => {
              const borderColors: Record<string, string> = {
                UNDER_REVIEW: "border-sky-500/40 bg-sky-500/10 text-sky-300",
                CLEARED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                FLAGGED: "border-amber-500/40 bg-amber-500/10 text-amber-300",
                ESCALATED: "border-rose-500/40 bg-rose-500/10 text-rose-300",
              };
              const cls =
                borderColors[step.status] ??
                "border-slate-700 bg-slate-800/40 text-slate-300";
              return (
                <Link
                  key={step.status}
                  to={`/cases?status=${step.status}`}
                  className={cn(
                    "rounded-xl border p-4 transition-all hover:scale-[1.02] hover:shadow-lg flex flex-col justify-between group",
                    cls
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {step.label}
                    </span>
                    <span className="text-xs font-black font-mono px-2 py-0.5 rounded-md bg-white/95 text-slate-900 border border-slate-300 dark:bg-black/60 dark:text-white dark:border-white/20 shadow-xs">
                      {step.percentage}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100 group-hover:text-signal-blue transition-colors">
                      {step.count}
                    </span>
                    <span className="text-xs opacity-75 font-medium">
                      of {data?.totalCases ?? 0} cases
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(step.percentage, step.count > 0 ? 6 : 0)}%`,
                        backgroundColor: step.color,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Screening Volume — Live Timeline */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Screening Volume — Last 14 Days</span>
              <Badge variant="pass" className="text-[10px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                Live Timeline
              </Badge>
            </CardTitle>
            <CardDescription>
              Daily throughput and officer clearance rate from active database records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-signal-blue" /> Loading live data…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={screeningVolume}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradScreenings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5FF" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#0EA5FF" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="gradCleared" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ReTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0]?.payload;
                          return (
                            <div className="chart-tooltip rounded-xl border p-3.5 shadow-2xl text-xs space-y-2 min-w-[170px]">
                              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 tooltip-header border-b border-slate-200 dark:border-slate-700 pb-1.5">
                                {label} ({p?.weekday})
                              </div>
                              <div className="flex items-center justify-between gap-4 text-slate-700 dark:text-slate-200">
                                <span className="font-medium">Total Screened:</span>
                                <span className="font-black font-mono text-sm text-sky-600 dark:text-sky-400">{p?.screenings ?? 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-emerald-700 dark:text-emerald-400">
                                <span className="font-medium">Cleared:</span>
                                <span className="font-black font-mono text-sm">{p?.cleared ?? 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-amber-700 dark:text-amber-400">
                                <span className="font-medium">Under Review:</span>
                                <span className="font-black font-mono text-sm">{p?.underReview ?? 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-rose-700 dark:text-rose-400">
                                <span className="font-medium">Flagged / Escalated:</span>
                                <span className="font-black font-mono text-sm">{p?.flagged ?? 0}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="screenings"
                      stroke="#0EA5FF"
                      strokeWidth={2}
                      fill="url(#gradScreenings)"
                      name="Total Screened"
                    />
                    <Area
                      type="monotone"
                      dataKey="cleared"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#gradCleared)"
                      name="Cleared"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Risk Distribution — Live Donut Chart */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Risk Distribution</CardTitle>
              <Badge variant="default" className="text-[10px] font-mono">
                {data?.totalCases ?? 0} Cases
              </Badge>
            </div>
            <CardDescription>Live case proportion by AI risk evaluation tier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative h-60 flex items-center justify-center">
              {isLoading ? (
                <div className="w-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-signal-blue" /> Loading live data…
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
                        outerRadius={96}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {riskDistribution.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                            stroke="rgba(2,6,23,0.8)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <ReTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const p = payload[0].payload;
                            return (
                              <div className="chart-tooltip rounded-xl border p-3 shadow-2xl text-xs min-w-[150px]">
                                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 tooltip-header border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                                    style={{ backgroundColor: p.color }}
                                  />
                                  <span className="text-sm">{p.name}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-200">
                                  <span className="font-medium">Total Cases:</span>
                                  <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                                    {p.value}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                  <span className="font-medium text-slate-600 dark:text-slate-400">Proportion:</span>
                                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                                    {p.percentage}%
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* High-tech Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                      {data?.totalCases ?? 0}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
                      Live Cases
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Custom stylized legend with high-contrast live percentages */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-ink-border/60">
              {riskDistribution.map((r) => {
                const isLow = r.name.toLowerCase().includes("low");
                const isMed = r.name.toLowerCase().includes("medium");
                const isHigh = r.name.toLowerCase().includes("high");

                const badgeCls = isLow
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                  : isMed
                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40"
                  : isHigh
                  ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40"
                  : "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";

                const dotCls = isLow
                  ? "bg-emerald-500 shadow-emerald-500/30"
                  : isMed
                  ? "bg-amber-500 shadow-amber-500/30"
                  : isHigh
                  ? "bg-rose-500 shadow-rose-500/30"
                  : "bg-signal-blue shadow-signal-blue/30";

                return (
                  <div
                    key={r.name}
                    className="rounded-xl bg-ink-card p-3 text-center border border-ink-border shadow-xs hover:border-signal-blue/30 transition-all flex flex-col items-center justify-between"
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 shadow-xs", dotCls)} />
                      <span>{r.name}</span>
                    </div>
                    <div className="my-1 text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {r.value}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center px-2 py-0.5 rounded-md font-mono text-xs font-black border shadow-xs tracking-wide",
                        badgeCls
                      )}
                    >
                      {r.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 3. Alert Trends — Live Risk Severity Bar Chart */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Alert Trends — Recent Days</CardTitle>
            <CardDescription>
              Daily evaluated screenings categorized by risk severity level.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-signal-blue" /> Loading live data…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={alertTrends}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ReTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0]?.payload;
                          return (
                            <div className="chart-tooltip rounded-xl border p-3.5 shadow-2xl text-xs space-y-2 min-w-[160px]">
                              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 tooltip-header border-b border-slate-200 dark:border-slate-700 pb-1.5">
                                {label} ({p?.date})
                              </div>
                              <div className="flex items-center justify-between gap-4 text-emerald-700 dark:text-emerald-400">
                                <span className="font-medium">Low Risk:</span>
                                <span className="font-black font-mono text-sm">{p?.low ?? 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-amber-700 dark:text-amber-400">
                                <span className="font-medium">Medium Risk:</span>
                                <span className="font-black font-mono text-sm">{p?.med ?? 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-rose-700 dark:text-rose-400">
                                <span className="font-medium">High Risk:</span>
                                <span className="font-black font-mono text-sm">{p?.high ?? 0}</span>
                              </div>
                              <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex items-center justify-between gap-4 text-slate-900 dark:text-slate-100 font-extrabold">
                                <span>Total Evaluated:</span>
                                <span className="font-mono text-sm">{p?.total ?? 0}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="low" fill="#10B981" name="Low" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="med" fill="#F59E0B" name="Medium" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="high" fill="#EF4444" name="High" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4. Document Types — Live Distribution Horizontal Bar Chart */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Document Types</CardTitle>
              <Badge variant="default" className="text-[10px] font-mono">
                {documentTypes.length} Categories
              </Badge>
            </div>
            <CardDescription>
              Live proportion of screened credentials by document category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-signal-blue" /> Loading live data…
                </div>
              ) : documentTypes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  No documents screened yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={documentTypes}
                    layout="vertical"
                    margin={{ top: 10, right: 25, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="type"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={125}
                    />
                    <ReTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="chart-tooltip rounded-xl border p-3.5 shadow-2xl text-xs space-y-2 min-w-[160px]">
                              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 tooltip-header border-b border-slate-200 dark:border-slate-700 pb-1.5">
                                {d.type}
                              </div>
                              <div className="flex items-center justify-between gap-4 text-slate-700 dark:text-slate-200">
                                <span className="font-medium">Total Docs:</span>
                                <span className="font-black font-mono text-sm text-sky-600 dark:text-sky-400">{d.count}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-slate-700 dark:text-slate-200">
                                <span className="font-medium">Proportion:</span>
                                <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                                  {d.percentage}%
                                </span>
                              </div>
                              {d.highRisk > 0 && (
                                <div className="text-rose-600 dark:text-rose-400 text-xs font-bold pt-1.5 border-t border-slate-200 dark:border-slate-700">
                                  ⚠ {d.highRisk} High Risk Flagged
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="#0EA5FF" radius={[0, 6, 6, 0]} name="Documents" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases — live */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Recent Cases</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading live cases…"
                  : `Latest ${(data?.recentCases ?? []).length} screenings requiring attention.`}
              </CardDescription>
            </div>
            <Link to="/cases">
              <Button variant="ghost" size="sm">
                View all cases
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-signal-blue" />
              Loading recent cases…
            </div>
          ) : (data?.recentCases ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <FileText className="h-10 w-10 opacity-30" />
              <div className="text-sm">No cases yet. Start a screening to create the first case.</div>
              <Link to="/screening">
                <Button variant="primary" size="sm">
                  <ScanSearch className="h-4 w-4" /> New Screening
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 border-b border-ink-border">
                    <th className="px-5 py-3">Case ID</th>
                    <th className="px-5 py-3">Document</th>
                    <th className="px-5 py-3">Risk</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Officer</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentCases ?? []).map((c: CaseRow) => {
                    const rc = c.risk_level ? riskColor(c.risk_level) : null;
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-ink-border/60 last:border-none hover:bg-ink-raised/30 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-signal-cyan">
                          {c.case_code}
                        </td>
                        <td className="px-5 py-3.5 text-slate-200 capitalize">
                          {c.document_type}{c.country_code ? ` — ${c.country_code}` : ""}
                          {c.is_demo && (
                            <Badge variant="warning" className="ml-2 text-[9px] py-0">
                              DEMO
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {rc && c.risk_level ? (
                            <Badge className={rc.badge}>{c.risk_level}</Badge>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={cn("uppercase", statusColor(c.status))}>
                            {c.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">
                          {c.profiles?.display_name ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 tabular-nums text-xs">
                          {formatTimeAgo(c.created_at)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link to={`/cases/${c.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
