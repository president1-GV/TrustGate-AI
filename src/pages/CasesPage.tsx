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
import { listCasesForManagement, type CaseRow, type CaseStatus, type RiskLevel } from "@/lib/db";
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
    staleTime: 20_000,
  });

  const cases = data ?? [];

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
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Case Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
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
              <div className="relative flex items-center gap-2 h-10 rounded-lg border border-ink-border bg-ink-card/60 px-3 text-sm">
                <CalendarDays className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 bg-transparent text-slate-300 outline-none text-sm"
                  placeholder="From date"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <div className="relative flex items-center gap-2 h-10 rounded-lg border border-ink-border bg-ink-card/60 px-3 text-sm">
                <CalendarDays className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 bg-transparent text-slate-300 outline-none text-sm"
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
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-all",
                      riskFilter === r.value
                        ? r.value === "LOW"
                          ? "bg-risk-low/15 text-risk-low border-risk-low/40"
                          : r.value === "MEDIUM"
                          ? "bg-risk-medium/15 text-risk-medium border-risk-medium/40"
                          : r.value === "HIGH"
                          ? "bg-risk-high/15 text-risk-high border-risk-high/40"
                          : "bg-signal-blue/15 text-signal-blue border-signal-blue/40"
                        : "bg-ink-card/40 text-slate-400 border-ink-border hover:text-slate-200 hover:border-slate-600/50"
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
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-all",
                      statusFilter === s.value
                        ? "bg-signal-blue/15 text-signal-blue border-signal-blue/40"
                        : "bg-ink-card/40 text-slate-400 border-ink-border hover:text-slate-200 hover:border-slate-600/50"
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
                  : `Showing ${cases.length} case${cases.length !== 1 ? "s" : ""}`}
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
                  {cases.length === 0 ? (
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
                    cases.map((c) => {
                      const rc = c.risk_level ? riskColor(c.risk_level) : null;
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-ink-border/60 last:border-none hover:bg-ink-raised/30 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-signal-cyan">{c.case_code}</span>
                              {c.is_demo && (
                                <Badge variant="warning" className="text-[9px] py-0">DEMO</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-200 capitalize">
                            {c.document_type}
                          </td>
                          <td className="px-5 py-3.5 text-slate-300">
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
                              {c.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300">
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
