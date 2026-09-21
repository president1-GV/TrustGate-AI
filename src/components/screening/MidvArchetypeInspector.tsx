import * as React from "react";
import {
  BrainCircuit,
  RefreshCw,
  Scan,
  Sliders,
  ShieldCheck,
  Zap,
  FileCheck,
  AlertTriangle,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { FullPipelineResult } from "@/ai/types";
import {
  getMidvArchetypes,
  checkMidvHealth,
  type MidvArchetype,
  type MidvVerificationResult,
} from "@/lib/midvService";
import { detectCredential, type DetectedCredential } from "@/lib/documentDetector";

interface MidvArchetypeInspectorProps {
  midvResult: MidvVerificationResult | null;
  pipelineResult?: FullPipelineResult | null;
  captureSource?: "camera" | "upload" | null;
  storageInfo?: { width?: number; height?: number; [k: string]: any } | null;
  className?: string;
}

export function MidvArchetypeInspector({
  midvResult,
  pipelineResult,
  captureSource,
  storageInfo,
  className,
}: MidvArchetypeInspectorProps) {
  const [archetypes, setArchetypes] = React.useState<MidvArchetype[]>([]);
  const [engineOnline, setEngineOnline] = React.useState(false);
  const [selectedArchId, setSelectedArchId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"archetypes" | "parameters">("archetypes");
  const [pinging, setPinging] = React.useState(false);

  // 1. Autonomous Real-Time Credential Detector (Strictly real data only, zero fake fallbacks)
  const detected: DetectedCredential = React.useMemo(() => {
    return detectCredential(pipelineResult || null, midvResult || null, storageInfo, captureSource);
  }, [pipelineResult, midvResult, storageInfo, captureSource]);

  const loadData = React.useCallback(async () => {
    setPinging(true);
    try {
      const [health, archs] = await Promise.all([
        checkMidvHealth(),
        getMidvArchetypes(),
      ]);
      setEngineOnline(health.online);
      setArchetypes(archs);
    } catch {
      setEngineOnline(false);
    } finally {
      setPinging(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Autonomous Selection: Auto-select and lock matching archetype immediately upon real detection
  React.useEffect(() => {
    if (detected.matchedArchetypeId) {
      setSelectedArchId(detected.matchedArchetypeId);
    } else if (midvResult?.benchmark?.archetype_id && midvResult.benchmark.archetype_id !== "unmatched") {
      setSelectedArchId(midvResult.benchmark.archetype_id);
    }
  }, [detected.matchedArchetypeId, midvResult]);

  const selectedArch =
    archetypes.find((a) => a.id === selectedArchId) ||
    (detected.matchedArchetypeId ? archetypes.find((a) => a.id === detected.matchedArchetypeId) : null) ||
    null;

  return (
    <div className={cn("space-y-3 w-full max-w-full overflow-hidden", className)}>
      {/* LOCAL LLM ENGINE STATUS BADGE */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-ink-card/90 p-3 shadow-xs overflow-hidden w-full box-border">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              {engineOnline ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 min-w-0">
                <BrainCircuit className="h-3.5 w-3.5 text-signal-blue dark:text-signal-cyan shrink-0" />
                <span className="truncate">Reference Dataset Archetypes</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate font-medium">
                {engineOnline
                  ? "http://localhost:8000 · CONNECTED"
                  : "http://localhost:8000 · OFFLINE / STANDBY"}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={pinging}
            className="h-7 px-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shrink-0"
            title="Ping local LLM server"
          >
            <RefreshCw className={cn("h-3 w-3", pinging && "animate-spin text-signal-blue dark:text-signal-cyan")} />
          </Button>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-1 text-[11px] min-w-0">
          <span className="text-amber-800 dark:text-amber-400 font-mono text-[9.5px] flex items-center gap-1 truncate font-bold">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            STRICT REAL-DATA PIPELINE
          </span>
          <span className="text-[9.5px] font-mono text-signal-blue dark:text-signal-cyan bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800 font-semibold shrink-0">
            Auto Detection
          </span>
        </div>
      </div>

      {/* AUTONOMOUS DOCUMENT DETECTION CARD (REAL-TIME STREAM) */}
      <div
        className={cn(
          "rounded-xl border p-3.5 transition-all duration-300 overflow-hidden w-full max-w-full box-border shadow-xs",
          detected.isDetected && detected.matchedArchetypeId
            ? "border-emerald-400 bg-emerald-50/90 dark:border-emerald-500/50 dark:bg-gradient-to-br dark:from-emerald-950/20 dark:via-slate-900/90 dark:to-slate-900/95 shadow-md shadow-emerald-950/10"
            : detected.isDetected
            ? "border-amber-400 bg-amber-50/90 dark:border-amber-500/50 dark:bg-gradient-to-br dark:from-amber-950/20 dark:via-slate-900/90 dark:to-slate-900/95 shadow-md shadow-amber-950/10"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-ink-card/70"
        )}
      >
        {/* Top sub-row: Credential Detection & Ingestion Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800/60 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "p-1.5 rounded-lg border shrink-0",
                detected.isDetected && detected.matchedArchetypeId
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : detected.isDetected
                  ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400"
                  : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400"
              )}
            >
              {detected.isDetected ? (
                <Zap className="h-4 w-4 animate-pulse" />
              ) : (
                <Scan className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200 block truncate">
                Credential Detection
              </span>
              <span className="text-[9.5px] font-mono text-slate-600 dark:text-slate-400 block font-medium">
                MIDV Real-Time Stream
              </span>
            </div>
          </div>

          <Badge
            className={cn(
              "text-[9.5px] font-bold tracking-wide shrink-0 px-2 py-0.5 whitespace-nowrap",
              detected.isDetected && detected.matchedArchetypeId
                ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                : detected.isDetected
                ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40"
                : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
            )}
          >
            {detected.isDetected && detected.matchedArchetypeId
              ? "⚡ AUTODETECTED"
              : detected.isDetected
              ? "⚠️ NON-STANDARD"
              : "AWAITING INGESTION"}
          </Badge>
        </div>

        {/* Document Title & Capture Source sub-row */}
        <div className="mt-2.5 flex items-center justify-between gap-2 min-w-0">
          <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate min-w-0" title={detected.documentTitle}>
            {detected.documentTitle}
          </div>
          {detected.source && (
            <Badge
              variant="default"
              className="text-[9px] font-bold py-0.5 px-2 border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              {detected.source === "camera" ? (
                <>
                  <Camera className="h-2.5 w-2.5 text-signal-blue dark:text-signal-cyan" />
                  Live Camera
                </>
              ) : (
                <>
                  <Upload className="h-2.5 w-2.5 text-signal-blue" />
                  Upload
                </>
              )}
            </Badge>
          )}
        </div>

        {/* REAL DETECTED EVIDENCE PARAMETERS - High Contrast Cards */}
        {detected.isDetected ? (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <div className="rounded-lg bg-white dark:bg-slate-950/60 p-2 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">Issuing Country:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-xs block mt-0.5 truncate">
                  {detected.countryCode ? `${detected.countryCode} · ${detected.countryName}` : "Unspecified"}
                </span>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-950/60 p-2 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">Document Standard:</span>
                <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs block mt-0.5 truncate">{detected.standard}</span>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-950/60 p-2 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">Document Number:</span>
                <span className="text-signal-blue dark:text-signal-cyan font-extrabold text-xs block mt-0.5 truncate">
                  {detected.realFields.documentNumber || "—"}
                </span>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-950/60 p-2 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">Holder Full Name:</span>
                <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs truncate block mt-0.5" title={detected.realFields.fullName}>
                  {detected.realFields.fullName || "—"}
                </span>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-950/60 p-2 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">Detected Aspect Ratio:</span>
                <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs block mt-0.5 truncate">
                  {detected.detectedAspectRatio ? detected.detectedAspectRatio.toFixed(3) : "—"}{" "}
                  {detected.aspectRatioDeviationPercent !== null && (
                    <span
                      className={cn(
                        "font-bold",
                        detected.aspectRatioDeviationPercent <= 4.0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      )}
                    >
                      (Δ {detected.aspectRatioDeviationPercent.toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-950/60 p-2 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">MRZ Validation:</span>
                <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs flex items-center gap-1 mt-0.5 truncate">
                  {detected.realFields.mrzCheckDigitsValid === true ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-emerald-700 dark:text-emerald-400">7-3-1 Valid</span>
                    </>
                  ) : detected.realFields.mrzFormat ? (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="text-rose-700 dark:text-rose-400">Checksum Error</span>
                    </>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400">No MRZ (VIZ Format)</span>
                  )}
                </span>
              </div>
            </div>

            {detected.matchedArchetypeId ? (
              <div className="flex items-center justify-between text-[10.5px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="flex items-center gap-1.5 min-w-0">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">
                    Matched MIDV Archetype:{" "}
                    <strong className="text-slate-900 dark:text-slate-100 font-extrabold">{selectedArch?.name || detected.matchedArchetypeId}</strong>
                  </span>
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-black shrink-0 ml-2">{detected.confidence}% Match</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10.5px] text-amber-900 dark:text-amber-300/90 bg-amber-100/90 dark:bg-amber-950/20 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800/40 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                <span>
                  No predefined archetype directly matched this credential geometry. Evaluated under general ICAO 9303 rules.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 font-medium">
            <span>
              Upload a document image or click <strong>Live Laptop Camera</strong> to trigger automatic document recognition.
            </span>
          </div>
        )}
      </div>

      {/* ACTIVE VERIFICATION CONFORMANCE INDICATOR (WHEN LLM AUDIT COMPLETES) */}
      {midvResult && (
        <div className="rounded-xl border border-sky-300 bg-sky-50/90 dark:border-signal-cyan/40 dark:bg-signal-cyan/5 p-3 animate-fadeIn shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sky-900 dark:text-signal-cyan flex items-center gap-1.5">
              <Scan className="h-3.5 w-3.5" />
              Verified MIDV-2020 Standard:
            </span>
            <Badge
              className={cn(
                "text-[10px] font-bold px-2 py-0.5",
                midvResult.evaluation.conformity_level === "CONFORMANT"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                  : midvResult.evaluation.conformity_level === "SUSPICIOUS"
                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                  : "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
              )}
            >
              {midvResult.evaluation.conformity_level}
            </Badge>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1">
            {midvResult.benchmark.archetype_name}
          </div>
          <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 flex flex-wrap gap-2">
            <span>Standard: <strong className="text-slate-900 dark:text-slate-100 font-bold">{midvResult.benchmark.standard}</strong></span>
            <span>Ratio: <strong className="text-slate-900 dark:text-slate-100 font-bold">{midvResult.benchmark.expected_aspect_ratio}</strong></span>
            <span>Score: <strong className="text-signal-blue dark:text-signal-cyan font-black">{midvResult.evaluation.overall_score}/100</strong></span>
          </div>
        </div>
      )}

      {/* PARAMETER INSPECTOR TABS */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-ink-card p-3 space-y-3 overflow-hidden w-full max-w-full box-border shadow-xs">
        {/* Title Header */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5 min-w-0">
            <Sliders className="h-3.5 w-3.5 text-signal-blue shrink-0" />
            <span className="truncate">Reference Standards &amp; Biometrics</span>
          </div>
        </div>

        {/* Full-width 2-Column Tabs (Strictly inside the border line) */}
        <div className="grid grid-cols-2 rounded-lg bg-slate-100 dark:bg-ink-raised/80 p-1 border border-slate-200 dark:border-slate-800 gap-1 w-full box-border">
          <button
            type="button"
            onClick={() => setActiveTab("archetypes")}
            className={cn(
              "w-full py-1.5 px-2 text-[10.5px] rounded-md transition-all text-center truncate cursor-pointer",
              activeTab === "archetypes"
                ? "bg-signal-blue text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40 font-semibold"
            )}
            title={`Archetypes (${archetypes.length})`}
          >
            Archetypes ({archetypes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("parameters")}
            className={cn(
              "w-full py-1.5 px-2 text-[10.5px] rounded-md transition-all text-center truncate cursor-pointer",
              activeTab === "parameters"
                ? "bg-signal-blue text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40 font-semibold"
            )}
            title="Biometrics & Rules"
          >
            Biometrics &amp; Rules
          </button>
        </div>

        {activeTab === "archetypes" ? (
          <div className="space-y-2 min-w-0 overflow-hidden">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-1 font-medium">
              <span className="truncate">Ground-truth constraints (<code className="text-signal-blue dark:text-signal-cyan font-bold text-[10px]">dataset.py</code>):</span>
              {detected.matchedArchetypeId && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold flex items-center gap-1 shrink-0">
                  <Zap className="h-3 w-3" /> Auto-selected
                </span>
              )}
            </div>

            {/* ARCHETYPE SELECTOR GRID WITH AUTODETECT HIGHLIGHT */}
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {archetypes.map((arch) => {
                const isSelected = selectedArch?.id === arch.id;
                const isAutodetected = detected.matchedArchetypeId === arch.id;
                return (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => setSelectedArchId(arch.id)}
                    className={cn(
                      "text-left p-2 rounded-lg border text-[11px] transition-all flex flex-col justify-between relative overflow-hidden min-w-0 cursor-pointer shadow-2xs",
                      isAutodetected && isSelected
                        ? "border-emerald-500 bg-emerald-50 text-slate-900 shadow-sm ring-1 ring-emerald-500/40 dark:border-emerald-500/80 dark:bg-emerald-950/20 dark:text-slate-100"
                        : isSelected
                        ? "border-signal-blue/60 bg-sky-50 text-slate-900 shadow-sm dark:border-signal-cyan/60 dark:bg-signal-cyan/10 dark:text-slate-100"
                        : isAutodetected
                        ? "border-emerald-300 bg-emerald-50/60 text-slate-800 dark:border-emerald-500/40 dark:bg-emerald-950/10 dark:text-slate-300"
                        : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 dark:border-slate-800 dark:bg-ink-raised/30 dark:hover:bg-ink-raised dark:hover:border-slate-700 dark:text-slate-400"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-slate-200 truncate">
                        {arch.country}
                      </div>
                      {isAutodetected && (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 text-[8px] font-mono px-1 rounded font-bold shrink-0">
                          AUTO
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                      {arch.name}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[9px] font-mono gap-1 font-semibold">
                      <span className="text-signal-blue dark:text-signal-cyan truncate">{arch.standard.split(" ")[0]}</span>
                      <span className="text-slate-600 dark:text-slate-400 shrink-0">{arch.aspect_ratio.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* EXPANDED ARCHETYPE DETAILS */}
            {selectedArch && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700/50 dark:bg-ink-raised/40 p-2.5 text-[11px] space-y-2 overflow-hidden min-w-0 shadow-2xs">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="font-extrabold text-slate-900 dark:text-slate-200 truncate">{selectedArch.name}</span>
                  <Badge variant="default" className="text-[9px] font-bold border-signal-blue/40 text-signal-blue dark:border-signal-cyan/40 dark:text-signal-cyan shrink-0">
                    {selectedArch.standard}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="rounded-lg bg-white dark:bg-black/40 p-2 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                    <span className="text-slate-600 dark:text-slate-400 block text-[9px] font-bold">Aspect Ratio:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-black truncate block mt-0.5">{selectedArch.aspect_ratio.toFixed(3)} (±4%)</span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-black/40 p-2 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                    <span className="text-slate-600 dark:text-slate-400 block text-[9px] font-bold">MRZ Format:</span>
                    <span className="text-slate-900 dark:text-slate-200 font-extrabold truncate block mt-0.5">
                      {selectedArch.mrz_format === "NONE"
                        ? "VIZ Only"
                        : `${selectedArch.mrz_format}`}
                    </span>
                  </div>
                </div>

                {selectedArch.fields && Object.keys(selectedArch.fields).length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider block">
                      Local Regex Validation Rules:
                    </span>
                    <div className="rounded-lg bg-white dark:bg-black/50 p-2 border border-slate-200 dark:border-slate-800/80 max-h-24 overflow-y-auto overflow-x-hidden space-y-1 font-mono text-[9px] shadow-2xs">
                      {Object.entries(selectedArch.fields).map(([k, pattern]) => (
                        <div key={k} className="flex items-start justify-between gap-1 text-slate-800 dark:text-slate-300 min-w-0">
                          <span className="text-signal-blue dark:text-signal-cyan font-bold shrink-0">{k}:</span>
                          <span className="text-slate-600 dark:text-slate-400 truncate text-[8.5px] font-medium" title={String(pattern)}>
                            {String(pattern)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* FORENSIC BIOMETRIC PARAMETERS TAB (Strictly inside border lines) */
          <div className="space-y-2 text-[11px] min-w-0 overflow-hidden">
            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-semibold">
              FaceForensics++ &amp; ICAO 9303 thresholds:
            </div>

            <div className="space-y-1.5">
              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-ink-raised/30 p-2 flex items-center justify-between gap-2 overflow-hidden min-w-0 shadow-2xs">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-[10.5px] truncate">Boundary Blending Discontinuity</div>
                  <div className="text-[9.5px] text-slate-600 dark:text-slate-400 truncate">Poisson edge gradient along facial seam</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-[9.5px] font-bold shrink-0 whitespace-nowrap">
                  &lt; 14.0 ΔE
                </Badge>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-ink-raised/30 p-2 flex items-center justify-between gap-2 overflow-hidden min-w-0 shadow-2xs">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-[10.5px] truncate">Corneal Specular Disparity</div>
                  <div className="text-[9.5px] text-slate-600 dark:text-slate-400 truncate">Iris reflection vector divergence</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-[9.5px] font-bold shrink-0 whitespace-nowrap">
                  &lt; 20.0°
                </Badge>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-ink-raised/30 p-2 flex items-center justify-between gap-2 overflow-hidden min-w-0 shadow-2xs">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-[10.5px] truncate">Spectral Energy Ratio (FFT)</div>
                  <div className="text-[9.5px] text-slate-600 dark:text-slate-400 truncate">High-frequency GAN grid artifacts</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-[9.5px] font-bold shrink-0 whitespace-nowrap">
                  &lt; 1.30
                </Badge>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-ink-raised/30 p-2 flex items-center justify-between gap-2 overflow-hidden min-w-0 shadow-2xs">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-[10.5px] truncate">Landmark Asymmetry Index</div>
                  <div className="text-[9.5px] text-slate-600 dark:text-slate-400 truncate">Facial reenactment warp</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-[9.5px] font-bold shrink-0 whitespace-nowrap">
                  &lt; 8.0
                </Badge>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-ink-raised/30 p-2 flex items-center justify-between gap-2 overflow-hidden min-w-0 shadow-2xs">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-[10.5px] truncate">Liveness Micro-Motion</div>
                  <div className="text-[9.5px] text-slate-600 dark:text-slate-400 truncate">Webcam ocular micro-flutter</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-[9.5px] font-bold shrink-0 whitespace-nowrap">
                  &gt; 50.0%
                </Badge>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-ink-raised/30 p-2 flex items-center justify-between gap-2 overflow-hidden min-w-0 shadow-2xs">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-[10.5px] truncate">ICAO 9303 Checksum Weights</div>
                  <div className="text-[9.5px] text-slate-600 dark:text-slate-400 truncate">Modulo 10 check digit sequence</div>
                </div>
                <Badge className="bg-signal-blue/10 text-signal-blue border-signal-blue/30 text-[9.5px] font-bold shrink-0 whitespace-nowrap">
                  7 - 3 - 1
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
