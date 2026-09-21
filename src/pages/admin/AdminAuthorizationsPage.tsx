import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  ArrowLeft,
  Clock,
  Building2,
  Copy,
  Check,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";
import {
  fetchMemberAccessRequests,
  admitMemberRequest,
  denyMemberRequest,
  subscribeToAccessRequests,
} from "@/lib/authRequests";
import { useAuthStore } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { formatDate } from "@/lib/utils";

export function AdminAuthorizationsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = React.useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [processingRowId, setProcessingRowId] = React.useState<string | null>(null);

  // Fetch all requests with real-time sync
  const { data: requests = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["admin-member-access-requests"],
    queryFn: () => fetchMemberAccessRequests("all"),
    refetchInterval: 2000, // Real-time poll every 2 seconds
  });

  // Listen to live database events via InsForge Realtime WebSocket
  React.useEffect(() => {
    const unsub = subscribeToAccessRequests(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-member-access-requests"] });
    });
    return unsub;
  }, [queryClient]);

  // Admit Mutation (Admin accepts member)
  const admitMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return admitMemberRequest(requestId, currentUser?.id);
    },
    onSuccess: (data) => {
      setProcessingRowId(null);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-member-access-requests"] });
      setActionSuccess(`Access APPROVED for ${data.request.display_name} (${data.request.process_id}). Member is admitted to the dashboard.`);
      setTimeout(() => setActionSuccess(null), 6000);
    },
    onError: (err: any) => {
      setProcessingRowId(null);
      setActionError(err?.message || "Failed to admit member. Please try again.");
      setTimeout(() => setActionError(null), 8000);
    },
  });

  // Deny Mutation (Admin rejects member)
  const denyMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      return denyMemberRequest(requestId, reason, currentUser?.id);
    },
    onSuccess: (data) => {
      setProcessingRowId(null);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-member-access-requests"] });
      setRejectingId(null);
      setRejectReason("");
      setActionSuccess(`Access REJECTED for ${data.request.display_name} (${data.request.process_id}). Admission blocked.`);
      setTimeout(() => setActionSuccess(null), 6000);
    },
    onError: (err: any) => {
      setProcessingRowId(null);
      setActionError(err?.message || "Failed to reject member request. Please try again.");
      setTimeout(() => setActionError(null), 8000);
    },
  });

  const handleCopyProcessId = (pid: string) => {
    navigator.clipboard.writeText(pid);
    setCopiedId(pid);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Counts
  const counts = React.useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  // Filtered list
  const filteredRequests = React.useMemo(() => {
    let list = requests;
    if (activeTab !== "all") {
      list = list.filter((r) => r.status === activeTab);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.display_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.process_id.toLowerCase().includes(q) ||
          (r.station && r.station.toLowerCase().includes(q)) ||
          (r.badge_id && r.badge_id.toLowerCase().includes(q))
      );
    }
    return list;
  }, [requests, activeTab, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="h-6 w-6 text-signal-blue" />
              Member Access Authority Panel
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live authorization control. Admit or reject incoming border security officer login attempts in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            REALTIME DATABASE LIVE
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-signal-cyan" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Success / Alert Banner */}
      {actionSuccess && (
        <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 animate-in fade-in slide-in-from-top-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <AlertTitle className="text-emerald-300 font-semibold">Authority Action Executed</AlertTitle>
          <AlertDescription className="text-emerald-200/90 text-xs">
            {actionSuccess}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert Banner */}
      {actionError && (
        <Alert className="border-rose-500/40 bg-rose-500/10 text-rose-300 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          <AlertTitle className="text-rose-300 font-semibold">Authority Action Failed</AlertTitle>
          <AlertDescription className="text-rose-200/90 text-xs">
            {actionError}
          </AlertDescription>
        </Alert>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all ${activeTab === "pending" ? "ring-2 ring-amber-500/60 bg-amber-500/5" : "hover:bg-ink-raised/30"}`}
          onClick={() => setActiveTab("pending")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                Pending Approval
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{counts.pending}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${activeTab === "approved" ? "ring-2 ring-emerald-500/60 bg-emerald-500/5" : "hover:bg-ink-raised/30"}`}
          onClick={() => setActiveTab("approved")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Admitted Members
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{counts.approved}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${activeTab === "rejected" ? "ring-2 ring-rose-500/60 bg-rose-500/5" : "hover:bg-ink-raised/30"}`}
          onClick={() => setActiveTab("rejected")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                Denied Requests
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{counts.rejected}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <UserX className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${activeTab === "all" ? "ring-2 ring-signal-blue/60 bg-signal-blue/5" : "hover:bg-ink-raised/30"}`}
          onClick={() => setActiveTab("all")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Total Audit Log
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{counts.all}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-signal-blue/15 border border-signal-blue/30 flex items-center justify-center text-signal-blue">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Request Control Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>Access Authorization Queue</span>
                <span className="text-xs font-normal text-slate-400">
                  ({filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""})
                </span>
              </CardTitle>
              <CardDescription>
                Review officer credentials, match against duty rosters, and authorize access.
              </CardDescription>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Search name, ID, station…"
                className="pl-8 text-xs h-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-ink-border/60">
            {(
              [
                { id: "pending", label: "Pending Admission", count: counts.pending, color: "text-amber-400" },
                { id: "approved", label: "Admitted", count: counts.approved, color: "text-emerald-400" },
                { id: "rejected", label: "Rejected", count: counts.rejected, color: "text-rose-400" },
                { id: "all", label: "All Records", count: counts.all, color: "text-slate-400" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-signal-blue/20 text-signal-cyan border border-signal-blue/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-ink-raised/40"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full bg-ink-raised/60 ${tab.color}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-signal-blue" />
              Loading real-time authority requests…
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <ShieldCheck className="h-10 w-10 opacity-30 text-signal-blue" />
              <div className="text-sm font-medium text-slate-400">
                {activeTab === "pending"
                  ? "No pending login requests in queue."
                  : "No requests found matching criteria."}
              </div>
              <p className="text-xs text-slate-500 max-w-sm text-center">
                When new officers sign up or attempt login, their cryptographic credentials will appear here instantly for administrator clearance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-ink-border bg-ink-card/40">
                    <th className="text-left font-semibold px-5 py-3.5">Officer &amp; Credentials</th>
                    <th className="text-left font-semibold px-5 py-3.5">Login Process ID</th>
                    <th className="text-left font-semibold px-5 py-3.5">Station &amp; Post</th>
                    <th className="text-left font-semibold px-5 py-3.5">Role</th>
                    <th className="text-left font-semibold px-5 py-3.5">Status</th>
                    <th className="text-left font-semibold px-5 py-3.5">Timestamp</th>
                    <th className="text-right font-semibold px-5 py-3.5">Admin Authority</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const isPending = req.status === "pending";
                    const isRejectingThis = rejectingId === req.id;

                    return (
                      <React.Fragment key={req.id}>
                        <tr className="border-b border-ink-border/50 hover:bg-ink-raised/20 transition-colors">
                          {/* Officer info */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-signal-blue/50 to-signal-purple/60 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                {req.display_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                  <span>{req.display_name}</span>
                                  {req.badge_id && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-raised text-slate-300 border border-ink-border">
                                      {req.badge_id}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 truncate">{req.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Process ID */}
                          <td className="px-5 py-4">
                            <div className="inline-flex items-center gap-1.5 bg-ink-card/90 px-2.5 py-1 rounded border border-ink-border/80 font-mono text-xs font-bold text-signal-cyan">
                              <span>{req.process_id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyProcessId(req.process_id)}
                                className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors cursor-pointer"
                                title="Copy Process ID"
                              >
                                {copiedId === req.process_id ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Station */}
                          <td className="px-5 py-4">
                            <div className="text-xs text-slate-300 flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-signal-blue flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{req.station || "Indo-Nepal ICP Raxaul"}</span>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-5 py-4">
                            <Badge variant="default" className="text-[10px] uppercase font-mono">
                              {req.requested_role}
                            </Badge>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <Badge
                              variant={
                                req.status === "approved"
                                  ? "pass"
                                  : req.status === "rejected"
                                  ? "critical"
                                  : "warning"
                              }
                              className="capitalize text-[11px] font-semibold"
                            >
                              {req.status === "approved"
                                ? "Admitted"
                                : req.status === "rejected"
                                ? "Rejected"
                                : "Pending"}
                            </Badge>
                          </td>

                          {/* Time */}
                          <td className="px-5 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              {formatDate(req.created_at, "MMM d, HH:mm")}
                            </div>
                          </td>

                          {/* Admin Action Buttons: Admit & Reject */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            {isPending ? (
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    setActionError(null);
                                    setProcessingRowId(req.id);
                                    admitMutation.mutate(req.id);
                                  }}
                                  disabled={
                                    (admitMutation.isPending && processingRowId === req.id) ||
                                    (denyMutation.isPending && processingRowId === req.id)
                                  }
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 px-3 shadow-sm disabled:opacity-60 cursor-pointer"
                                >
                                  {admitMutation.isPending && processingRowId === req.id ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Admitting…
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      Admit / Accept
                                    </>
                                  )}
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setActionError(null);
                                    setRejectingId(isRejectingThis ? null : req.id);
                                    setRejectReason("");
                                  }}
                                  disabled={
                                    (admitMutation.isPending && processingRowId === req.id) ||
                                    (denyMutation.isPending && processingRowId === req.id)
                                  }
                                  className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs gap-1.5 px-2.5 cursor-pointer"
                                >
                                  <ShieldX className="h-3.5 w-3.5" />
                                  Deny / Reject
                                </Button>
                              </div>
                            ) : req.status === "approved" ? (
                              <span className="text-xs text-emerald-400 font-semibold inline-flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" /> Admitted
                              </span>
                            ) : (
                              <span className="text-xs text-rose-400 font-semibold inline-flex items-center gap-1">
                                <ShieldX className="h-3.5 w-3.5" /> Rejected
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Inline Rejection Reason Form */}
                        {isRejectingThis && (
                          <tr className="bg-rose-500/5 border-b border-rose-500/20 animate-in fade-in slide-in-from-top-1">
                            <td colSpan={7} className="px-5 py-3">
                              <div className="flex items-center gap-3 max-w-3xl">
                                <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                                <span className="text-xs font-semibold text-rose-300 whitespace-nowrap">
                                  Denial Reason:
                                </span>
                                <Input
                                  placeholder="e.g. Identity verification incomplete, duty roster mismatch, or invalid badge ID"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  className="h-8 text-xs border-rose-500/40 bg-ink-card text-slate-100 placeholder:text-slate-500"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setActionError(null);
                                    setProcessingRowId(req.id);
                                    denyMutation.mutate({
                                      requestId: req.id,
                                      reason: rejectReason,
                                    });
                                  }}
                                  disabled={denyMutation.isPending && processingRowId === req.id}
                                  className="gap-1 text-xs whitespace-nowrap cursor-pointer"
                                >
                                  {denyMutation.isPending && processingRowId === req.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Rejecting…
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-3 w-3" />
                                      Confirm Denial
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason("");
                                  }}
                                  className="text-xs text-slate-400 cursor-pointer"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
