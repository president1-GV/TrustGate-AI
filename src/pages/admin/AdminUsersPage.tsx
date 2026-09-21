import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowLeft,
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

async function fetchUsers(): Promise<UserProfile[]> {
  const { data, error } = await insforge.database
    .from("profiles")
    .select(
      "id,display_name,badge_id,station,team,created_at,roles:user_roles(role:roles(name))"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((u) => ({
    ...u,
    roles: (Array.isArray(u.roles) ? u.roles : [])
      .map((r: any) => {
        const role = Array.isArray(r.role) ? r.role[0] : r.role;
        return role ? { name: role.name } : null;
      })
      .filter(Boolean),
  }));
}

function roleBadge(roles: { name: string }[]) {
  const names = roles.map((r) => r.name);
  if (names.includes("admin"))
    return <Badge variant="high">Admin</Badge>;
  if (names.includes("supervisor"))
    return <Badge variant="warning">Supervisor</Badge>;
  return <Badge variant="default">Officer</Badge>;
}

export function AdminUsersPage() {
  const [search, setSearch] = React.useState("");

  const { data, isLoading, error } = useQuery<UserProfile[]>({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    staleTime: 30_000,
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
        u.id.toLowerCase().includes(s)
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-signal-blue" />
            User Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            View and manage platform officers, supervisors, and administrators.
          </p>
        </div>
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
              placeholder="Name, badge ID, station…"
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
              <CardTitle className="text-base">All Users</CardTitle>
              <CardDescription>
                {isLoading ? "Loading…" : `${users.length} user${users.length !== 1 ? "s" : ""}`}
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
              <div className="text-sm">No users found.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-border">
                    <th className="text-left font-medium px-5 py-3">User</th>
                    <th className="text-left font-medium px-5 py-3">Badge ID</th>
                    <th className="text-left font-medium px-5 py-3">Station</th>
                    <th className="text-left font-medium px-5 py-3">Team</th>
                    <th className="text-left font-medium px-5 py-3">Role</th>
                    <th className="text-left font-medium px-5 py-3">Joined</th>
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
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-signal-blue/50 to-signal-purple/50 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {(u.display_name ?? "?")
                              .split(" ")
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-100">
                              {u.display_name ?? <span className="text-slate-500 italic">No name</span>}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {u.id.slice(0, 8)}…
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-300">
                        {u.badge_id ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">{u.station ?? "—"}</td>
                      <td className="px-5 py-3.5 text-slate-300">{u.team ?? "—"}</td>
                      <td className="px-5 py-3.5">{roleBadge(u.roles)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
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
