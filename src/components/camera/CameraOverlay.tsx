/**
 * TrustGate AI — CameraOverlay Component
 * Renders the HUD reticle, alignment frame, and MRZ guide
 * adhering to the dark security command-center design language.
 */

import { cn } from "@/lib/utils";

export interface CameraOverlayProps {
  mode?: "document" | "portrait";
  isAligned?: boolean;
  isStable?: boolean;
  guidanceText?: string;
  className?: string;
}

export function CameraOverlay({
  mode = "document",
  isAligned = false,
  isStable = false,
  guidanceText,
  className,
}: CameraOverlayProps) {
  const isReady = isAligned && isStable;

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none flex items-center justify-center p-6 sm:p-10 select-none",
        className
      )}
    >
      {mode === "portrait" ? (
        // Biometric Face Reticle
        <div
          className={cn(
            "relative w-64 h-84 sm:w-72 sm:h-96 rounded-[50%] border-2 transition-all duration-300",
            isReady
              ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.35)] bg-emerald-500/[0.04]"
              : "border-signal-cyan/60 shadow-[0_0_20px_rgba(14,165,255,0.2)] bg-signal-blue/[0.03]"
          )}
        >
          {/* Eye Level Reference Line */}
          <div className="absolute inset-x-8 top-[38%] border-t border-dashed border-signal-cyan/60 flex items-center justify-between px-2 text-[9px] font-mono text-signal-cyan">
            <span>EYE LEVEL</span>
            <span>EYE LEVEL</span>
          </div>

          {/* Chin Reference Line */}
          <div className="absolute inset-x-16 bottom-[14%] border-b border-dashed border-signal-blue/50 text-[9px] font-mono text-center text-slate-400">
            CHIN GUIDE
          </div>

          {/* Top Pill */}
          <div className="absolute -top-9 inset-x-0 flex justify-center">
            <span
              className={cn(
                "text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full border shadow-lg backdrop-blur-md transition-colors",
                isReady
                  ? "bg-emerald-950/90 border-emerald-500/80 text-emerald-300"
                  : "bg-slate-900/90 border-slate-700/80 text-slate-300"
              )}
            >
              {guidanceText || "Position Face Within Biometric Oval"}
            </span>
          </div>
        </div>
      ) : (
        // Document Alignment Frame (ICAO 9303 TD3 standard 1.42/1 aspect ratio)
        <div
          className={cn(
            "relative w-full max-w-[560px] aspect-[1.42/1] rounded-xl border-2 transition-all duration-300",
            isReady
              ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.35)] bg-emerald-500/[0.03]"
              : "border-signal-blue/50 shadow-[0_0_25px_rgba(14,165,255,0.15)] bg-signal-blue/[0.02]"
          )}
        >
          {/* Precision Corner Reticles */}
          <div
            className={cn(
              "absolute -top-1.5 -left-1.5 w-6 h-6 border-t-3 border-l-3 rounded-tl-md transition-colors",
              isReady ? "border-emerald-400" : "border-signal-cyan"
            )}
          />
          <div
            className={cn(
              "absolute -top-1.5 -right-1.5 w-6 h-6 border-t-3 border-r-3 rounded-tr-md transition-colors",
              isReady ? "border-emerald-400" : "border-signal-cyan"
            )}
          />
          <div
            className={cn(
              "absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-3 border-l-3 rounded-bl-md transition-colors",
              isReady ? "border-emerald-400" : "border-signal-cyan"
            )}
          />
          <div
            className={cn(
              "absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-3 border-r-3 rounded-br-md transition-colors",
              isReady ? "border-emerald-400" : "border-signal-cyan"
            )}
          />

          {/* Central Horizontal Register Mark */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-dashed border-signal-blue/25" />

          {/* ICAO 9303 Machine Readable Zone (MRZ) Alignment Band */}
          <div
            className={cn(
              "absolute inset-x-2.5 bottom-2.5 h-[26%] rounded-lg border border-dashed flex items-center justify-between px-3 text-[10px] font-mono transition-colors",
              isReady
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                : "border-slate-700 bg-slate-900/40 text-slate-400"
            )}
          >
            <span className="uppercase tracking-wider font-semibold">
              [ICAO 9303 MRZ ZONE]
            </span>
            <span className="opacity-80 hidden sm:inline">Align 2-Line Machine Readable Zone</span>
          </div>

          {/* Top Instruction Pill */}
          <div className="absolute -top-8.5 inset-x-0 flex justify-center">
            <span
              className={cn(
                "text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider px-3.5 py-0.5 rounded-full border shadow-lg backdrop-blur-md transition-colors",
                isReady
                  ? "bg-emerald-950/90 border-emerald-500/80 text-emerald-300"
                  : "bg-slate-900/90 border-slate-700/80 text-slate-300"
              )}
            >
              {guidanceText || "Align Document Within Frame"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
