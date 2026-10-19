import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Search,
  Clock,
  User,
  FileText,
  Activity,
  Loader2,
  AlertTriangle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
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
import { Separator } from "@/components/ui/Separator";
import { insforge } from "@/lib/insforge";
import { cn, formatDate, formatTimeAgo } from "@/lib/utils";
import { listAuditLogs, type AuditLogRow } from "@/lib/db";

const EVENT_TYPE_OPTIONS = [
  "ALL",
  "auth.login.success",
  "auth.login.offline",
  "auth.logout",
  "auth.role.switch",
  "screening.completed",
  "case.risk.override",
  "case.status.cleared",
  "case.status.flagged",
  "case.status.escalated",
  "case.updated",
  "case.notes.updated",
  "report.generated",
];

const ACTION_COLOR: Record<string, string> = {
  USER_LOGIN: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  USER_LOGOUT: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  ROLE_SWITCHED: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  RISK_OVERRIDE: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  CASE_CREATED: "bg-signal-blue/10 text-signal-blue border-signal-blue/30",
  CASE_NOTES_UPDATED: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  REPORT_GENERATED: "bg-signal-purple/10 text-signal-purple border-signal-purple/30",
  CASE_FLAGGED: "bg-risk-medium/10 text-risk-medium border-risk-medium/30",
  CASE_ESCALATED: "bg-risk-high/10 text-risk-high border-risk-high/30",
  CASE_CLEARED: "bg-risk-low/10 text-risk-low border-risk-low/30",
  DOCUMENT_ANALYZED: "bg-signal-cyan/10 text-signal-cyan border-signal-cyan/30",
};

function actionBadgeClass(action: string): string {
  return (
    ACTION_COLOR[action] ??
    "bg-slate-600/15 text-slate-300 border-slate-600/30"
  );
}

function MetadataRow({ meta }: { meta: unknown }) {
  if (!meta || typeof meta !== "object") return null;
  const entries = Object.entries(meta as Record<string, unknown>).slice(0, 6);
  if (!entries.length) return null;
  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-1.5 text-[10px]">
          <span className="text-slate-500 uppercase tracking-wide">{k}:</span>
          <span className="text-slate-300 truncate max-w-[120px]">
            {String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function AuditRow({ log }: { log: AuditLogRow }) {
  const [open, setOpen] = React.useState(false);
  return (
    <tr className="border-b border-ink-border/60 last:border-none hover:bg-ink-raised/20 transition-colors">
      <td className="px-5 py-3 tabular-nums text-xs text-slate-500 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span>{formatTimeAgo(log.created_at)}</span>
        </div>
        <div className="text-[10px] text-slate-600 mt-0.5">
          {formatDate(log.created_at, "MMM d, HH:mm:ss")}
        </div>
      </td>
      <td className="px-5 py-3">
        <Badge className={cn("text-[10px]", actionBadgeClass(log.action))}>
          {log.action.replace(/_/g, " ")}
        </Badge>
      </td>
      <td className="px-5 py-3 text-xs text-slate-400">
        {log.event_type}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <User className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
          {log.actor?.display_name ?? (
            <span className="text-slate-500 font-mono text-[11px]">
              {log.actor_id?.slice(0, 8) ?? "system"}
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3">
        {log.case_id ? (
          <a
            href={`/cases/${log.case_id}`}
            className="font-mono text-xs text-signal-cyan hover:underline"
          >
            {log.case_code || `${log.case_id.slice(0, 8)}…`}
          </a>
        ) : log.case_code ? (
          <span className="font-mono text-xs text-signal-cyan">{log.case_code}</span>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        )}
      </td>
      <td className="px-5 py-3">
        {log.result === "SUCCESS" ? (
          <Badge variant="pass">OK</Badge>
        ) : log.result ? (
          <Badge variant="high">{log.result}</Badge>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        {log.metadata ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-slate-500 hover:text-slate-200 transition-colors"
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </td>
      {open && (
        <tr className="bg-ink-card/30">
          <td colSpan={7} className="px-5 pb-3">
            <MetadataRow meta={log.metadata} />
          </td>
        </tr>
      )}
    </tr>
  );
}

export function AuditPage() {
  const [search, setSearch] = React.useState("");
  const [eventType, setEventType] = React.useState("ALL");
  const [searchDebounced, setSearchDebounced] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<
    AuditLogRow[]
  >({
    queryKey: ["audit-logs", searchDebounced, eventType],
    queryFn: () =>
      listAuditLogs({ search: searchDebounced, eventType, limit: 300 }),
    staleTime: 0,
    refetchInterval: 3000,
  });

  // Real-time synchronization
  React.useEffect(() => {
    const handleUpdate = () => {
      refetch();
    };

    window.addEventListener("trustgate:audit_log_added", handleUpdate);
    window.addEventListener("audit_logs_changed", handleUpdate);
    window.addEventListener("tg:db_updated", handleUpdate);
    window.addEventListener("trustgate:case_saved", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    async function setupRealtime() {
      try {
        if ((insforge as any).realtime?.connect) {
          await (insforge as any).realtime.connect();
          await (insforge as any).realtime.subscribe("audit_logs");
          (insforge as any).realtime.on("audit_log_created", handleUpdate);
          (insforge as any).realtime.on("audit_logs_changed", handleUpdate);
        }
      } catch (e) {
        console.info("[TrustGate Audit] Realtime WebSocket operating with active live polling:", e);
      }
    }
    setupRealtime();

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("trustgate_audit_channel");
      bc.onmessage = () => handleUpdate();
    } catch {}

    return () => {
      window.removeEventListener("trustgate:audit_log_added", handleUpdate);
      window.removeEventListener("audit_logs_changed", handleUpdate);
      window.removeEventListener("tg:db_updated", handleUpdate);
      window.removeEventListener("trustgate:case_saved", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, [refetch]);

  const logs = data ?? [];

  const stats = React.useMemo(() => {
    const actions: Record<string, number> = {};
    for (const l of logs) {
      actions[l.action] = (actions[l.action] ?? 0) + 1;
    }
    return { total: logs.length, topActions: Object.entries(actions).sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-signal-blue" />
            Audit Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable record of all security-relevant actions. INSERT-only — no modification permitted.
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
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Total Events</div>
            <div className="text-2xl font-bold tabular-nums text-slate-100">
              {isLoading ? "…" : stats.total}
            </div>
          </CardContent>
        </Card>
        {stats.topActions.map(([action, count]) => (
          <Card key={action}>
            <CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 truncate">
                {action.replace(/_/g, " ")}
              </div>
              <div className="text-xl font-bold tabular-nums text-slate-100">
                {count}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            Filters
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search action, actor, case ID…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="h-10 w-full rounded-lg border border-ink-border bg-ink-card/60 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
            >
              {EVENT_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o === "ALL" ? "All Event Types" : o}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-signal-cyan" />
                Audit Events
              </CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading…"
                  : `${logs.length} events matching current filters`}
              </CardDescription>
            </div>
            <Badge variant="default" className="border-signal-blue/40 text-signal-blue bg-signal-blue/10">
              INSERT-ONLY LEDGER
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-3 px-5 py-10 text-risk-high text-sm">
              <AlertTriangle className="h-5 w-5" />
              {(error as Error).message ?? "Failed to load audit logs"}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-signal-blue" />
              Loading audit trail…
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <FileText className="h-10 w-10 opacity-30" />
              <div className="text-sm">No audit events match the current filters.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-border">
                    <th className="text-left font-medium px-5 py-3 w-40">Time</th>
                    <th className="text-left font-medium px-5 py-3 w-48">Action</th>
                    <th className="text-left font-medium px-5 py-3">Event Type</th>
                    <th className="text-left font-medium px-5 py-3">Actor</th>
                    <th className="text-left font-medium px-5 py-3">Case</th>
                    <th className="text-left font-medium px-5 py-3 w-20">Result</th>
                    <th className="px-5 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <AuditRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
