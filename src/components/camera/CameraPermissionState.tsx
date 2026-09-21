/**
 * TrustGate AI — CameraPermissionState Component
 * Displays secure permission requests, hardware diagnosis, and accessible fallback buttons
 * when webcam access is prompt, denied, blocked, disabled in Windows, or unavailable.
 *
 * CRITICAL SECURITY RULE:
 * Strictly complies with browser security standards.
 * Never attempts to bypass permissions or synthesize mock bypasses.
 */

import { Camera, CameraOff, RefreshCw, Upload, ShieldCheck, Lock, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface CameraPermissionStateProps {
  errorMessage?: string | null;
  permissionStatus?: "granted" | "prompt" | "denied" | "unknown";
  onRetry: () => void;
  onUploadFallback: () => void;
  className?: string;
}

export function CameraPermissionState({
  errorMessage,
  permissionStatus = "unknown",
  onRetry,
  onUploadFallback,
  className,
}: CameraPermissionStateProps) {
  const isDenied =
    permissionStatus === "denied" ||
    (errorMessage &&
      (errorMessage.toLowerCase().includes("denied") ||
        errorMessage.toLowerCase().includes("blocked") ||
        errorMessage.toLowerCase().includes("permission")));

  const isNotFound =
    errorMessage &&
    (errorMessage.toLowerCase().includes("no camera") ||
      errorMessage.toLowerCase().includes("no active camera") ||
      errorMessage.toLowerCase().includes("not detected") ||
      errorMessage.toLowerCase().includes("disabled") ||
      errorMessage.toLowerCase().includes("code 22") ||
      errorMessage.toLowerCase().includes("hardware"));

  const isInUse =
    errorMessage &&
    (errorMessage.toLowerCase().includes("in use") ||
      errorMessage.toLowerCase().includes("another application"));

  return (
    <div
      className={cn(
        "max-w-lg mx-auto p-6 sm:p-8 text-center space-y-5 select-none",
        className
      )}
    >
      {/* Visual State Icon */}
      <div
        className={cn(
          "h-16 w-16 mx-auto rounded-2xl border flex items-center justify-center shadow-lg transition-colors",
          isDenied
            ? "bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-950/30"
            : isNotFound || isInUse
            ? "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-950/30"
            : "bg-signal-blue/15 border-signal-blue/30 text-signal-blue shadow-signal-blue/20"
        )}
      >
        {isDenied ? (
          <Lock className="h-8 w-8" />
        ) : isNotFound || isInUse ? (
          <CameraOff className="h-8 w-8" />
        ) : (
          <Camera className="h-8 w-8" />
        )}
      </div>

      {/* Header & Explicit Explanations */}
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-slate-100 tracking-tight">
          {isDenied
            ? "Camera Permission Required"
            : isNotFound
            ? "Webcam Disabled or Not Detected"
            : isInUse
            ? "Camera Currently in Use"
            : "Camera Access Required"}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
          {isDenied
            ? "Camera permission was denied or blocked. Allow camera access for this site in your browser settings and try again."
            : isNotFound
            ? (errorMessage || "The physical webcam is disabled in Windows or turned off via a privacy switch.")
            : isInUse
            ? "The camera is currently being used by another application. Please close other camera apps and retry."
            : errorMessage ||
              "TRUSTGATE AI needs camera access to capture the document for screening. Only the camera is requested. Microphone access is never requested."}
        </p>
      </div>

      {/* Windows Hardware Fix Instructions (shown when hardware disabled / not found) */}
      {isNotFound && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-left space-y-2 text-xs text-slate-300">
          <div className="font-semibold text-amber-300 flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-amber-400" />
            <span>How to enable your webcam in Windows:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
            <li>
              <strong>Physical Switch / Fn Key:</strong> Check if your laptop has a webcam shutter slider above the screen, or press your camera hotkey (e.g. <code>Fn + F10</code>, <code>Fn + F6</code>, or <code>F10</code>).
            </li>
            <li>
              <strong>Windows Device Manager:</strong> Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[10px]">Win + X</kbd> &rarr; select <strong>Device Manager</strong> &rarr; expand <strong>Cameras</strong> &rarr; right-click <strong>USB2.0 HD UVC WebCam</strong> &rarr; click <strong>Enable device</strong>.
            </li>
            <li>
              <strong>Windows Privacy Settings:</strong> Open <strong>Windows Settings</strong> &rarr; <strong>Privacy &amp; security</strong> &rarr; <strong>Camera</strong> &rarr; ensure <em>"Camera access"</em> and <em>"Let apps access your camera"</em> are turned <strong>ON</strong>.
            </li>
          </ol>
        </div>
      )}

      {/* Browser Unblock Instructions (shown when permission is blocked) */}
      {isDenied && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-left space-y-1 text-xs text-slate-300">
          <div className="font-semibold text-rose-300 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>How to unblock camera access in browser:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 pt-1">
            <li>Click the camera or lock/tune icon in your browser address bar (URL bar).</li>
            <li>Select <strong>Allow</strong> for camera access on this site.</li>
            <li>Click <strong>Check Again / Retry</strong> below to resume capture.</li>
          </ol>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-signal-blue" />
          <span>Security &amp; Privacy Notice</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Camera access is strictly used to capture the document required for this screening.
          Audio/microphone is never requested. Video frames are analyzed locally in-memory.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
        <Button
          variant="primary"
          size="sm"
          onClick={onRetry}
          className="w-full sm:w-auto bg-signal-blue hover:bg-signal-blue/90 text-white font-semibold text-xs shadow-lg shadow-signal-blue/25 gap-1.5 px-4"
        >
          {isDenied ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Check Again / Retry
            </>
          ) : isNotFound ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Check Again After Enabling
            </>
          ) : (
            <>
              <Camera className="h-3.5 w-3.5" />
              Enable Camera
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onUploadFallback}
          className="w-full sm:w-auto border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-1.5 px-4"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Image Instead
        </Button>
      </div>
    </div>
  );
}
