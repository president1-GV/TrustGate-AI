import * as React from "react";
import { Search, Filter, CalendarDays, Eye, Plus, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { Separator } from "@/components/ui/Separator";
import { listCasesForManagement, getUserScannedSpecimens, type CaseRow, type CaseStatus, type RiskLevel } from "@/lib/db";
import { insforge } from "@/lib/insforge";
import { resolveSpecimenUrl } from "@/lib/specimenResolver";
import { cn, formatDate, statusColor, riskColor } from "@/lib/utils";

const RISK_FILTERS: { label: string; value: RiskLevel | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
];

const STATUS_FILTERS: { label: string; value: CaseStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Analyzing", value: "ANALYZING" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Cleared", value: "CLEARED" },
  { label: "Flagged", value: "FLAGGED" },
  { label: "Escalated", value: "ESCALATED" },
  { label: "Closed", value: "CLOSED" },
];

export function CasesPage() {
  const [riskFilter, setRiskFilter] = React.useState<RiskLevel | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = React.useState<CaseStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const [searchDebounced, setSearchDebounced] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [syncTick, setSyncTick] = React.useState(0);

  React.useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 380);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<CaseRow[]>({
    queryKey: ["cases", riskFilter, statusFilter, searchDebounced, dateFrom, dateTo],
    queryFn: () =>
      listCasesForManagement({
        risk: riskFilter,
        status: statusFilter,
        search: searchDebounced,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  React.useEffect(() => {
    let active = true;

    const onUpdate = () => {
      if (active) {
        setSyncTick((t) => t + 1);
        refetch();
      }
    };

    window.addEventListener("trustgate:case_saved", onUpdate);
    window.addEventListener("cases_changed", onUpdate);
    window.addEventListener("tg:db_updated", onUpdate);
    window.addEventListener("tg:new_alert", onUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("trustgate_live_events");
        bc.onmessage = () => onUpdate();
      }
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key === "tg:last_db_change") onUpdate();
    };
    window.addEventListener("storage", onStorage);

    async function setupRealtime() {
      try {
        if ((insforge as any).realtime?.connect) {
          await (insforge as any).realtime.connect();
          await (insforge as any).realtime.subscribe("cases");
          (insforge as any).realtime.on("case_created", onUpdate);
          (insforge as any).realtime.on("case_updated", onUpdate);
          (insforge as any).realtime.on("cases_changed", onUpdate);
        }
      } catch (e) {
        console.info("[TrustGate] Cases Realtime WebSocket operating with active live polling:", e);
      }
    }
    setupRealtime();

    return () => {
      active = false;
      window.removeEventListener("trustgate:case_saved", onUpdate);
      window.removeEventListener("cases_changed", onUpdate);
      window.removeEventListener("tg:db_updated", onUpdate);
      window.removeEventListener("tg:new_alert", onUpdate);
      window.removeEventListener("storage", onStorage);
      if (bc) bc.close();
    };
  }, [refetch]);

  const liveCases = React.useMemo(() => {
    const userScanned = getUserScannedSpecimens();
    const remoteCases = data ?? [];
    const list: CaseRow[] = [];
    const existingCodes = new Set<string>();
    const existingIds = new Set<string>();

    // 1. User-scanned cases from live inspection scanner take top priority
    for (const u of userScanned) {
      if (existingCodes.has(u.case_code) || existingIds.has(u.id)) continue;
      existingCodes.add(u.case_code);
      existingIds.add(u.id);

      const resolvedImg = resolveSpecimenUrl(u.image_url, u.case_code, u.document_type);
      const row: CaseRow = {
        id: u.id,
        case_code: u.case_code,
        created_by: "d78d7bfa-d033-412d-8d20-987e0019467c",
        created_at: u.created_at,
        updated_at: u.created_at,
        document_type: u.document_type,
        country_code: u.country_code ?? null,
        status: u.risk_level === "HIGH" ? "FLAGGED" : "CLEARED",
        risk_score: u.risk_level === "HIGH" ? 85 : u.risk_level === "MEDIUM" ? 50 : 15,
        risk_level: u.risk_level,
        processing_time_ms: 1250,
        review_status: u.risk_level === "HIGH" ? "IN_REVIEW" : "COMPLETED",
        priority: u.risk_level === "HIGH" ? "HIGH" : "NORMAL",
        is_demo: false,
        officer_decision: u.risk_level === "HIGH" ? "FLAGGED" : "CLEARED",
        decision_timestamp: u.created_at,
        notes: "Live evaluated biometric document screening.",
        storage_url: resolvedImg,
        image_url: resolvedImg,
        profiles: { display_name: "Field Officer (Active)", badge_id: "TG-OFF-702" },
        assigned: { display_name: "Field Officer (Active)" },
      };

      // Apply active filters to user-scanned cases
      let matches = true;
      if (riskFilter !== "ALL" && row.risk_level !== riskFilter) matches = false;
      if (statusFilter !== "ALL" && row.status !== statusFilter) matches = false;
      if (dateFrom && row.created_at < dateFrom) matches = false;
      if (dateTo && row.created_at > dateTo) matches = false;
      if (searchDebounced.trim()) {
        const s = searchDebounced.trim().toLowerCase();
        const hay = [
          row.case_code,
          row.document_type,
          row.country_code ?? "",
          row.status,
          row.profiles?.display_name ?? "",
        ].join(" ").toLowerCase();
        if (!hay.includes(s)) matches = false;
      }
      if (matches) list.push(row);
    }

    // 2. Cases returned from PostgreSQL / backend
    for (const c of remoteCases) {
      if (existingCodes.has(c.case_code) || existingIds.has(c.id)) continue;
      existingCodes.add(c.case_code);
      existingIds.add(c.id);

      const resolved = resolveSpecimenUrl(c.storage_url || c.image_url, c.case_code, c.document_type);
      list.push({
        ...c,
        storage_url: resolved,
        image_url: resolved,
      });
    }

    // Sort strictly by created_at DESC so newest scans appear at Row 1
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [data, riskFilter, statusFilter, searchDebounced, dateFrom, dateTo, syncTick]);

  function resetFilters() {
    setRiskFilter("ALL");
    setStatusFilter("ALL");
    setSearch("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Case Management
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Review, triage, and track all screening cases across checkpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Link to="/screening">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              New Screening
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-slate-400" />
            Filters
          </CardTitle>
          <CardDescription>Narrow cases by risk, status, date, or keywords.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search case ID, document, country, officer…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="md:col-span-3">
              <div className="relative flex items-center gap-2 h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm shadow-2xs">
                <CalendarDays className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 outline-none text-sm"
                  placeholder="From date"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <div className="relative flex items-center gap-2 h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm shadow-2xs">
                <CalendarDays className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 outline-none text-sm"
                  placeholder="To date"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Button variant="outline" className="w-full" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Risk Level
              </div>
              <div className="flex flex-wrap gap-2">
                {RISK_FILTERS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRiskFilter(r.value)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border transition-colors select-none",
                      riskFilter === r.value
                        ? r.value === "LOW"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
                          : r.value === "MEDIUM"
                          ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold"
                          : r.value === "HIGH"
                          ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-bold"
                          : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-bold"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Status
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatusFilter(s.value)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border transition-colors select-none",
                      statusFilter === s.value
                        ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-bold"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">All Cases</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading…"
                  : `Showing ${liveCases.length} case${liveCases.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-3 px-5 py-10 text-risk-high text-sm">
              <AlertTriangle className="h-5 w-5" />
              {(error as Error).message ?? "Failed to load cases"}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-signal-blue" />
              Loading cases…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 border-b border-ink-border">
                    <th className="px-5 py-3">Case ID</th>
                    <th className="px-5 py-3">Doc Type</th>
                    <th className="px-5 py-3">Country</th>
                    <th className="px-5 py-3">Risk</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Officer</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {liveCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                          <Search className="h-8 w-8 opacity-30" />
                          <div className="text-sm">No cases match the current filters.</div>
                          <Link to="/screening">
                            <Button variant="primary" size="sm">
                              <Plus className="h-4 w-4" /> New Screening
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    liveCases.map((c) => {
                      const rc = c.risk_level ? riskColor(c.risk_level) : null;
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-slate-100 dark:border-slate-800/80 last:border-none hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">{c.case_code}</span>
                              {c.is_demo && (
                                <Badge variant="warning" className="text-[9px] py-0">DEMO</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-900 dark:text-slate-100 font-medium capitalize">
                            {c.document_type}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {c.country_code ?? "—"}
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
                              {(c.status || "").replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {c.profiles?.display_name ?? "—"}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400 text-xs tabular-nums">
                            {formatDate(c.created_at, "MMM d, HH:mm")}
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
