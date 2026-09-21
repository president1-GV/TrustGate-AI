/**
 * TrustGate AI — CameraQualityIndicator Component
 * Displays real-time measured indicators: LIGHT, FOCUS, POSITION, DOCUMENT, and calculated score.
 * Accessible with text labels and high-contrast styling.
 */

import type { FrameQualityMetrics } from "./types";
import { cn } from "@/lib/utils";

export interface CameraQualityIndicatorProps {
  metrics: FrameQualityMetrics | null;
  className?: string;
}

export function CameraQualityIndicator({
  metrics,
  className,
}: CameraQualityIndicatorProps) {
  if (!metrics) return null;

  const getStatusBadge = (
    label: string,
    value: string,
    status: "pass" | "warn" | "fail"
  ) => {
    const colorClasses = {
      pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      fail: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    };

    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono select-none",
          colorClasses[status]
        )}
      >
        <span className="text-slate-400 font-sans text-[10px] uppercase">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
    );
  };

  const lightStatus =
    metrics.lightIndicator === "GOOD"
      ? "pass"
      : metrics.lightIndicator === "FAIR"
      ? "warn"
      : "fail";

  const focusStatus =
    metrics.focusIndicator === "SHARP"
      ? "pass"
      : metrics.focusIndicator === "FAIR"
      ? "warn"
      : "fail";

  const positionStatus =
    metrics.positionIndicator === "GOOD"
      ? "pass"
      : metrics.positionIndicator === "CENTERING"
      ? "warn"
      : "fail";

  const docStatus =
    metrics.docIndicator === "ALIGNED"
      ? "pass"
      : metrics.docIndicator === "DETECTED"
      ? "warn"
      : "fail";

  const scoreColor =
    metrics.overallScore >= 75
      ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/40"
      : metrics.overallScore >= 50
      ? "text-amber-400 border-amber-500/50 bg-amber-950/40"
      : "text-rose-400 border-rose-500/50 bg-rose-950/40";

  return (
    <div
      aria-label="Camera Image Quality Diagnostics"
      className={cn(
        "flex items-center gap-2 flex-wrap bg-slate-950/85 border border-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg",
        className
      )}
    >
      {/* Indicator Pills */}
      {getStatusBadge("Light", metrics.lightIndicator, lightStatus)}
      {getStatusBadge("Focus", metrics.focusIndicator, focusStatus)}
      {getStatusBadge("Position", metrics.positionIndicator, positionStatus)}
      {getStatusBadge("Document", metrics.docIndicator, docStatus)}

      {/* Calculated Overall Score */}
      <div
        className={cn(
          "ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-mono font-bold select-none",
          scoreColor
        )}
        title="Real-time measured composite quality score"
      >
        <span className="text-slate-400 text-[10px] font-normal uppercase">Quality</span>
        <span>{metrics.overallScore} / 100</span>
      </div>
    </div>
  );
}
