import * as React from "react";
import {
  LayoutDashboard,
  ScanLine,
  Files,
  FileText,
  BarChart3,
  Cpu,
  Database,
  Search,
  LogOut,
  User,
  Shield,
  ChevronRight,
  Settings,
  BookOpen,
  Users,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Moon,
} from "lucide-react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuthStore, useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { roleAtLeast, hasPermission, type AppRole, type Permission } from "@/lib/insforge";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { OfficerSwitcherModal } from "@/components/layout/OfficerSwitcherModal";
import { SystemConnectivityBar } from "@/components/layout/SystemConnectivityBar";

const SIDEBAR_WIDTH = 240;

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  minRole?: AppRole;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Screening", href: "/screening", icon: ScanLine, permission: "cases:create" },
  { label: "Border Gateway Portal", href: "/sih-screening", icon: ShieldAlert, permission: "cases:create" },
  { label: "Cases", href: "/cases", icon: Files, permission: "cases:view_assigned" },
  { label: "Reports", href: "/reports", icon: FileText, permission: "reports:access" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, permission: "analytics:view" },
  { label: "Audit Log", href: "/audit", icon: BookOpen, permission: "audit:view" },
  { label: "Security", href: "/security", icon: Shield, permission: "security:view" },
  { label: "Models", href: "/models", icon: Cpu, permission: "models:inspect" },
  { label: "Datasets", href: "/datasets", icon: Database, permission: "datasets:review" },
  { label: "Authorizations", href: "/admin/authorizations", icon: ShieldCheck, minRole: "admin" },
  { label: "Admin", href: "/admin", icon: Users, permission: "users:manage" },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [sidebarSearch, setSidebarSearch] = React.useState("");
  const [officerModalOpen, setOfficerModalOpen] = React.useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (!user) return false;
    if (item.permission && !hasPermission(user.role, item.permission)) return false;
    if (item.minRole && !roleAtLeast(user.role, item.minRole)) return false;
    return true;
  });


  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch {
      /* noop */
    }
  }

  // Session inactivity timeout tracker (configured in Settings by Admin / Supervisor)
  React.useEffect(() => {
    if (!user) return;

    let timeoutMins = parseInt(localStorage.getItem("tg_session_timeout_mins") || "30", 10);
    if (isNaN(timeoutMins)) timeoutMins = 30;

    let lastActivity = Date.now();

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    const handleTimeoutChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number") {
        timeoutMins = customEvent.detail;
      } else {
        const stored = parseInt(localStorage.getItem("tg_session_timeout_mins") || "30", 10);
        timeoutMins = isNaN(stored) ? 30 : stored;
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((ev) => window.addEventListener(ev, updateActivity, { passive: true }));
    window.addEventListener("tg:session_timeout_changed", handleTimeoutChange);

    const interval = setInterval(() => {
      if (timeoutMins > 0) {
        const elapsedMs = Date.now() - lastActivity;
        const maxMs = timeoutMins * 60 * 1000;
        if (elapsedMs > maxMs) {
          clearInterval(interval);
          logout()
            .catch(() => {})
            .finally(() => {
              navigate("/login?reason=inactivity");
            });
        }
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      events.forEach((ev) => window.removeEventListener(ev, updateActivity));
      window.removeEventListener("tg:session_timeout_changed", handleTimeoutChange);
    };
  }, [user, logout, navigate]);

  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "U";

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* ── Sidebar ── */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-30 flex flex-col border-r border-ink-border bg-ink-card/80 backdrop-blur-xl no-print print:hidden"
        style={{ width: SIDEBAR_WIDTH }}
      >
        {/* Brand */}
        <Link
          to="/dashboard"
          className="flex h-16 items-center gap-3 px-6 border-b border-ink-border hover:bg-ink-raised/30 transition-colors"
        >
          <img
            src="/trustgate-logo.png"
            alt="TrustGate AI"
            className="h-9 w-9 rounded-xl object-cover shadow-glow flex-shrink-0 border border-signal-blue/40"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tracking-[0.18em] text-gradient-signal">
              TRUSTGATE
            </span>
            <span className="text-[10px] tracking-[0.22em] text-signal-cyan font-mono font-semibold">
              AI BORDER
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/dashboard"}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-signal-blue/12 text-signal-blue shadow-sm"
                      : "text-slate-400 hover:bg-ink-raised/60 hover:text-slate-100"
                  )
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0 transition-colors" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User chip - Interactive Duty Officer Switcher */}
        <div className="p-3 border-t border-ink-border">
          {user && (
            <button
              type="button"
              onClick={() => setOfficerModalOpen(true)}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 bg-ink-raised/40 hover:bg-ink-raised/80 border border-ink-border/70 hover:border-signal-blue/50 transition-all text-left group cursor-pointer shadow-sm"
              title="Click to switch active duty officer profile"
              aria-label="Officer Profile & Duty Switcher"
            >
              <div className="relative flex-shrink-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-signal-blue/70 to-signal-purple/70 flex items-center justify-center text-xs font-bold text-white shadow-sm group-hover:scale-105 transition-transform">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-ink-card animate-pulse" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-signal-cyan transition-colors truncate">
                    {user.name ?? "Officer"}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-signal-cyan group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-signal-blue/15 text-signal-cyan border border-signal-blue/30">
                    {user.role}
                  </span>
                  {user.badgeId && (
                    <span className="text-[10px] font-mono text-slate-400 truncate">
                      {user.badgeId}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="app-shell-main min-h-screen flex flex-col min-w-0 max-w-[calc(100vw-240px)] overflow-x-hidden md:ml-[240px] print:!ml-0 print:!max-w-none print:!w-full print:!overflow-visible">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 border-b border-ink-border bg-ink/70 backdrop-blur-xl flex items-center px-6 gap-4 no-print print:hidden">
          <div className="flex-1 flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase px-3 py-1.5 rounded-lg bg-signal-blue/15 text-signal-cyan border border-signal-blue/30 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Border Gateway · Indo-Nepal ICP Raxaul
              </span>
            </div>
            {/* Global search */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search cases, documents, officers…"
                aria-label="Global search"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && sidebarSearch.trim()) {
                    navigate(`/cases?q=${encodeURIComponent(sidebarSearch.trim())}`);
                    setSidebarSearch("");
                  }
                }}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-ink-border bg-ink-card/60 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue/40 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg border border-ink-border bg-ink-card/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-ink-raised transition-colors cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-signal-blue" />
              )}
            </button>

            <NotificationBell />

            {/* User menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 px-2"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="User menu"
                aria-expanded={menuOpen}
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-signal-blue/60 to-signal-purple/60 flex items-center justify-center text-[11px] font-bold text-white">
                  {initials}
                </div>
                <span className="text-sm text-slate-200 hidden lg:inline">
                  {user?.name ?? "User"}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500 rotate-90" />
              </Button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-64 z-20 glass-card rounded-card shadow-panel border border-ink-border py-2">
                    <div className="px-4 py-3 border-b border-ink-border mb-1">
                      <div className="text-sm font-medium text-slate-100">
                        {user?.name ?? "User"}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                      <div className="mt-1">
                        <Badge variant="default" className="text-[10px] uppercase">
                          {user?.role ?? "officer"}
                        </Badge>
                      </div>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-ink-raised/60 hover:text-white transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile & Settings
                    </Link>
                    {user?.role === "admin" && (
                      <>
                        <Link
                          to="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-ink-raised/60 hover:text-white transition-colors"
                        >
                          <Users className="h-4 w-4" />
                          Admin Panel
                        </Link>
                        <Link
                          to="/admin/authorizations"
                          onClick={() => setMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-ink-raised/60 hover:text-white transition-colors"
                        >
                          <ShieldCheck className="h-4 w-4 text-emerald-400" />
                          Member Authorizations
                        </Link>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Air-Gapped / Online Operational Status Strip */}
        <div className="no-print print:hidden">
          <SystemConnectivityBar />
        </div>

        <main className="flex-1 p-6 min-w-0 max-w-full overflow-x-hidden print:!p-0 print:!m-0 print:!max-w-none print:!w-full print:!overflow-visible">{children}</main>
      </div>
      <OfficerSwitcherModal open={officerModalOpen} onClose={() => setOfficerModalOpen(false)} />
    </div>
  );
}
