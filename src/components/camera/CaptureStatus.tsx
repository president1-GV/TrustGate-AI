/**
 * TrustGate AI — CaptureStatus Component
 * Displays system status, auto-capture countdown indicator, and stability notices.
 */

import { cn } from "@/lib/utils";

export interface CaptureStatusProps {
  countdown: number | null;
  isStable: boolean;
  autoCaptureEnabled: boolean;
  statusText?: string;
  className?: string;
}

export function CaptureStatus({
  countdown,
  isStable,
  autoCaptureEnabled,
  statusText,
  className,
}: CaptureStatusProps) {
  return (
    <div
      aria-live="polite"
      className={cn("flex items-center justify-between gap-3 text-xs flex-wrap", className)}
    >
      {/* Camera Ready & Capture Status */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          CAMERA READY
        </span>

        {autoCaptureEnabled && (
          <span
            className={cn(
              "font-mono text-[11px] px-2.5 py-1 rounded-md border transition-colors",
              isStable
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 font-semibold"
                : "bg-slate-900/80 border-slate-800 text-slate-400"
            )}
          >
            {isStable ? "READY FOR AUTOMATIC CAPTURE" : "ALIGNING FOR AUTO-CAPTURE"}
          </span>
        )}
      </div>

      {/* Countdown Ring Indicator */}
      {countdown !== null && countdown > 0 && (
        <div className="flex items-center gap-2 bg-signal-blue/20 border border-signal-blue/60 text-signal-blue px-3 py-1 rounded-lg backdrop-blur-md shadow-lg shadow-signal-blue/20 animate-pulse">
          <span className="h-5 w-5 rounded-full bg-signal-blue text-white font-bold text-xs flex items-center justify-center">
            {countdown}
          </span>
          <span className="font-semibold text-xs text-white">
            Capturing in {countdown}s… Hold steady
          </span>
        </div>
      )}

      {/* Optional Custom Status */}
      {statusText && (
        <span className="text-slate-400 font-mono text-[11px]">
          {statusText}
        </span>
      )}
    </div>
  );
}
