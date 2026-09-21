import * as React from "react";
import {
  Wifi,
  WifiOff,
  Database,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { getOfflineDbStats } from "@/lib/db";
import { checkMidvHealth } from "@/lib/midvService";
import { cn } from "@/lib/utils";

export function SystemConnectivityBar() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [simulatedAirGap, setSimulatedAirGap] = React.useState(() => {
    return localStorage.getItem("tg_simulate_airgap") === "true";
  });
  const [dbStats, setDbStats] = React.useState({
    totalCases: 0,
    totalAuditLogs: 0,
    pendingSyncCount: 0,
    isAvailable: true,
  });
  const [engineStatus, setEngineStatus] = React.useState<{
    isDaemonRunning: boolean;
    provider: string;
    version: string;
  }>({
    isDaemonRunning: false,
    provider: "Client-Side Neural Heuristic Engine",
    version: "FaceForensics++ c23 & MIDV-2020",
  });

  const effectiveOnline = isOnline && !simulatedAirGap;

  const refreshDbStats = React.useCallback(async () => {
    try {
      const stats = await getOfflineDbStats();
      setDbStats(stats);
    } catch {
      /* noop */
    }
  }, []);

  const checkEngine = React.useCallback(async () => {
    try {
      const health = await checkMidvHealth();
      if (health.online && health.metadata) {
        setEngineStatus({
          isDaemonRunning: true,
          provider: "Localhost Python Daemon (Port 8000)",
          version: "MIDV-2020 & FF++ c23 Live Server",
        });
        return;
      }
    } catch {
      /* fallback */
    }
    setEngineStatus({
      isDaemonRunning: false,
      provider: "Air-Gapped Neural-Heuristic In-Memory Pipeline",
      version: "FaceForensics++ c23 & ICAO 9303",
    });
  }, []);

  React.useEffect(() => {
    refreshDbStats();
    checkEngine();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleDbChange = () => refreshDbStats();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("tg:db_updated", handleDbChange);

    const poll = setInterval(() => {
      refreshDbStats();
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("tg:db_updated", handleDbChange);
      clearInterval(poll);
    };
  }, [refreshDbStats, checkEngine]);

  const toggleAirGap = () => {
    const next = !simulatedAirGap;
    setSimulatedAirGap(next);
    localStorage.setItem("tg_simulate_airgap", String(next));
  };

  return (
    <div className="border-b border-ink-border bg-ink-card/40 px-6 py-2 flex items-center justify-between gap-3 flex-wrap text-xs">
      {/* Left: System Status Badges */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Network & Air-Gap status */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold border transition-all",
            effectiveOnline
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm"
          )}
        >
          {effectiveOnline ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span>ONLINE BORDER NETWORK</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              <span className="tracking-wide">AIR-GAPPED OFFLINE READY</span>
            </>
          )}
        </div>

        {/* Real-time Local Database */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] bg-sky-500/10 text-sky-300 border border-sky-500/30">
          <Database className="h-3.5 w-3.5 text-sky-400" />
          <span>REALTIME LOCAL DB</span>
          <span className="px-1 py-0.2 rounded bg-sky-500/20 text-[10px] text-sky-200">
            {dbStats.totalCases} {dbStats.totalCases === 1 ? "Case" : "Cases"}
          </span>
          {dbStats.pendingSyncCount > 0 && (
            <span className="px-1 py-0.2 rounded bg-amber-500/20 text-[10px] text-amber-300">
              {dbStats.pendingSyncCount} Sync
            </span>
          )}
        </div>

        {/* Active Engine */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
          <Cpu className="h-3.5 w-3.5 text-indigo-400" />
          <span>
            {engineStatus.isDaemonRunning
              ? "PYTHON DAEMON (8000)"
              : "NEURAL HEURISTIC ENGINE"}
          </span>
          <span className="text-[10px] text-indigo-400/80">· FF++ c23</span>
        </div>

        {/* Ground Truth Benchmark Badge */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700/60">
          <ShieldCheck className="h-3 w-3 text-signal-cyan" />
          <span>ICAO 9303 · MIDV-2020 · FF++</span>
        </div>
      </div>

      {/* Right: Operational Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAirGap}
          title={
            simulatedAirGap
              ? "Switch back to online mode"
              : "Simulate an air-gapped network disconnection to test 100% offline autonomy"
          }
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold border transition-all cursor-pointer",
            simulatedAirGap
              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30"
              : "bg-ink-raised text-slate-300 border-ink-border hover:text-white hover:border-slate-500"
          )}
        >
          <Sliders className="h-3 w-3" />
          <span>{simulatedAirGap ? "Air-Gap: ON" : "Air-Gap: OFF"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            refreshDbStats();
            checkEngine();
          }}
          className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-ink-raised transition-colors cursor-pointer"
          title="Refresh system status"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
