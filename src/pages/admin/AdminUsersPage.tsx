import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Shield,
  Building2,
  RefreshCw,
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
import { Input } from "@/components/ui/Input";
import { Separator } from "@/components/ui/Separator";
import { insforge } from "@/lib/insforge";
import { formatDate } from "@/lib/utils";

interface UserProfile {
  id: string;
  display_name: string | null;
  badge_id: string | null;
  station: string | null;
  team: string | null;
  created_at: string;
  roles: { name: string }[];
}

const CANONICAL_PERSONAS: Record<
  string,
  { badgeId: string; name: string; station: string; team: string; role: string }
> = {
  "d78d7bfa-d033-412d-8d20-987e0019467c": {
    badgeId: "ADM-001",
    name: "Admin",
    station: "Central Command · Headquarters",
    team: "Border Command & System Administration",
    role: "admin",
  },
  "e49cf4a5-e63d-4cac-a54a-436f47da9e52": {
    badgeId: "SUP-4402",
    name: "Supervisor",
    station: "Indo-Nepal ICP Raxaul · Command & Escalation Desk",
    team: "Border Defense Rapid Response",
    role: "supervisor",
  },
  "06d9077b-2a97-460e-b6ed-38d6a16581c3": {
    badgeId: "FO-8921",
    name: "Officer",
    station: "Indo-Nepal ICP Raxaul · Lane 04 (Primary Ingestion)",
    team: "First-Line Border Screening Roster",
    role: "officer",
  },
  "59119414-9a9b-4b00-bade-16e0b1e11ed1": {
    badgeId: "FOR-1109",
    name: "Analyst",
    station: "Indo-Nepal ICP Raxaul · Forensic Document Lab",
    team: "Forensics & Biometric Intelligence",
    role: "analyst",
  },
  "b1e31d7e-cd98-46a1-97ba-ce395c3a6b34": {
    badgeId: "AIRGAP-001",
    name: "Debug Officer (Air-Gapped)",
    station: "Indo-Nepal ICP Raxaul · Terminal 01 (Offline)",
    team: "Border Defense Rapid Response",
    role: "admin",
  },
};

async function fetchUsers(): Promise<UserProfile[]> {
  try {
    // Step 1: Attempt the PostgREST joined select query
    const { data, error } = await insforge.database
      .from("profiles")
      .select(
        "id,display_name,badge_id,station,team,created_at,roles:user_roles(role:roles(name))"
      )
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((u: any) => {
        const canon = CANONICAL_PERSONAS[u.id];
        const roles = (Array.isArray(u.roles) ? u.roles : [])
          .map((r: any) => {
            const role = Array.isArray(r.role) ? r.role[0] : r.role;
            return role ? { name: role.name } : null;
          })
          .filter(Boolean);

        const resolvedRoles =
          roles.length > 0
            ? roles
            : canon?.role
            ? [{ name: canon.role }]
            : [{ name: "officer" }];

        return {
          id: u.id,
          display_name: u.display_name || canon?.name || "Officer",
          badge_id: u.badge_id || canon?.badgeId || null,
          station: u.station || canon?.station || null,
          team: u.team || canon?.team || null,
          created_at: u.created_at || new Date().toISOString(),
          roles: resolvedRoles,
        };
      });
    }
  } catch (joinErr) {
    console.warn("PostgREST joined profiles query fell back to two-step fetch:", joinErr);
  }

  // Step 2: Fallback to separate queries (profiles + user_roles)
  try {
    const [profilesRes, rolesRes] = await Promise.all([
      insforge.database
        .from("profiles")
        .select("id,display_name,badge_id,station,team,created_at")
        .order("created_at", { ascending: false }),
      insforge.database.from("user_roles").select("user_id, role:roles(name)"),
    ]);

    const roleMap: Record<string, { name: string }[]> = {};
    for (const ur of (rolesRes.data ?? []) as any[]) {
      const roleObj = Array.isArray(ur.role) ? ur.role[0] : ur.role;
      if (ur.user_id && roleObj?.name) {
        if (!roleMap[ur.user_id]) roleMap[ur.user_id] = [];
        roleMap[ur.user_id].push({ name: roleObj.name });
      }
    }

    const profiles = (profilesRes.data ?? []) as any[];
    if (profiles.length > 0) {
      return profiles.map((p) => {
        const canon = CANONICAL_PERSONAS[p.id];
        const resolvedRoles =
          roleMap[p.id] || (canon?.role ? [{ name: canon.role }] : [{ name: "officer" }]);
        return {
          id: p.id,
          display_name: p.display_name || canon?.name || "Officer",
          badge_id: p.badge_id || canon?.badgeId || null,
          station: p.station || canon?.station || null,
          team: p.team || canon?.team || null,
          created_at: p.created_at || new Date().toISOString(),
          roles: resolvedRoles,
        };
      });
    }
  } catch (fallbackErr) {
    console.warn(
      "Database profiles query fallback failed, using canonical demo roster:",
      fallbackErr
    );
  }

  // Step 3: Offline / zero-latency demo roster fallback
  return Object.entries(CANONICAL_PERSONAS).map(([id, meta]) => ({
    id,
    display_name: meta.name,
    badge_id: meta.badgeId,
    station: meta.station,
    team: meta.team,
    created_at: new Date().toISOString(),
    roles: [{ name: meta.role }],
  }));
}

function roleBadge(roles: { name: string }[]) {
  const names = roles.map((r) => r.name.toLowerCase());
  if (names.includes("admin"))
    return (
      <Badge variant="high" className="font-semibold tracking-wide uppercase text-[10px]">
        Admin
      </Badge>
    );
  if (names.includes("supervisor"))
    return (
      <Badge variant="warning" className="font-semibold tracking-wide uppercase text-[10px]">
        Supervisor
      </Badge>
    );
  if (names.includes("analyst"))
    return (
      <Badge
        variant="default"
        className="font-semibold tracking-wide uppercase text-[10px] border-signal-purple/40 text-signal-purple bg-signal-purple/10"
      >
        Analyst
      </Badge>
    );
  return (
    <Badge variant="default" className="font-semibold tracking-wide uppercase text-[10px]">
      Officer
    </Badge>
  );
}

export function AdminUsersPage() {
  const [search, setSearch] = React.useState("");

  const { data, isLoading, error, refetch, isRefetching } = useQuery<UserProfile[]>({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    staleTime: 15_000,
  });

  const users = React.useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const s = search.trim().toLowerCase();
    return data.filter(
      (u) =>
        (u.display_name ?? "").toLowerCase().includes(s) ||
        (u.badge_id ?? "").toLowerCase().includes(s) ||
        (u.station ?? "").toLowerCase().includes(s) ||
        (u.team ?? "").toLowerCase().includes(s) ||
        u.roles.some((r) => r.name.toLowerCase().includes(s)) ||
        u.id.toLowerCase().includes(s)
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-signal-blue" />
              User Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              View and manage active platform officers, supervisors, analysts, and administrators.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="gap-2 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh Roster
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search Users</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by name, badge ID, station, team…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-signal-blue" />
                All Platform Users & Personas
              </CardTitle>
              <CardDescription>
                {isLoading ? "Loading…" : `${users.length} registered user${users.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-3 px-5 py-10 text-risk-high text-sm">
              <AlertTriangle className="h-5 w-5" />
              {(error as Error).message}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-signal-blue" />
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Users className="h-10 w-10 opacity-30" />
              <div className="text-sm">No users match your search criteria.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-border bg-ink-card/40">
                    <th className="text-left font-medium px-5 py-3">Officer / User</th>
                    <th className="text-left font-medium px-5 py-3">Badge ID</th>
                    <th className="text-left font-medium px-5 py-3">Station & Facility</th>
                    <th className="text-left font-medium px-5 py-3">Team / Division</th>
                    <th className="text-left font-medium px-5 py-3">Role</th>
                    <th className="text-left font-medium px-5 py-3">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-ink-border/60 last:border-none hover:bg-ink-raised/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-signal-blue/50 to-signal-purple/50 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm border border-white/10">
                            {(u.display_name ?? "?")
                              .split(" ")
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-2">
                              {u.display_name ?? <span className="text-slate-500 italic">No name</span>}
                              {CANONICAL_PERSONAS[u.id] && (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                  Demo Persona
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              ID: {u.id.slice(0, 8)}…{u.id.slice(-4)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs">
                        {u.badge_id ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-signal-blue/15 text-signal-cyan border border-signal-blue/30 font-semibold tracking-wider">
                            {u.badge_id}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Building2 className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{u.station ?? "Indo-Nepal ICP Raxaul"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 text-xs">
                        <span className="truncate max-w-[180px] block">{u.team ?? "Border Defense Rapid Response"}</span>
                      </td>
                      <td className="px-5 py-3.5">{roleBadge(u.roles)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {formatDate(u.created_at, "MMM d, yyyy")}
                        </div>
                      </td>
                    </tr>
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
