/**
 * TrustGate AI — useAutoCapture Hook
 * Manages frame sampling, stability window verification, and countdown triggers
 * for seamless automatic document capture.
 */

import * as React from "react";
import { CameraQualityAnalyzer } from "./qualityAnalyzer";
import type { FrameQualityMetrics, CameraCaptureState } from "./types";

export interface UseAutoCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  active: boolean;
  captureState: CameraCaptureState;
  mode?: "document" | "portrait";
  stabilityThreshold?: number; // Number of consecutive acceptable frames (default: 3)
  sampleIntervalMs?: number;   // Sampling interval (default: 200ms)
  onAutoCapture: () => void;
}

export interface UseAutoCaptureReturn {
  metrics: FrameQualityMetrics | null;
  countdown: number | null;
  consecutiveStableFrames: number;
  autoCaptureEnabled: boolean;
  setAutoCaptureEnabled: (enabled: boolean) => void;
  resetStability: () => void;
}

export function useAutoCapture({
  videoRef,
  active,
  captureState,
  mode = "document",
  stabilityThreshold = 3,
  sampleIntervalMs = 200,
  onAutoCapture,
}: UseAutoCaptureProps): UseAutoCaptureReturn {
  const [metrics, setMetrics] = React.useState<FrameQualityMetrics | null>(null);
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [consecutiveStableFrames, setConsecutiveStableFrames] = React.useState<number>(0);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = React.useState<boolean>(true);

  const countdownTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCapturingRef = React.useRef<boolean>(false);

  // Synchronize ref to prevent stale closures
  isCapturingRef.current =
    captureState === "CAPTURING" ||
    captureState === "CAPTURED" ||
    captureState === "UPLOADING" ||
    captureState === "PROCESSING";

  const resetStability = React.useCallback(() => {
    setConsecutiveStableFrames(0);
    setCountdown(null);
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // Frame Sampling & Quality Analysis Loop
  React.useEffect(() => {
    if (!active || isCapturingRef.current) {
      resetStability();
      return;
    }

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      // Analyze downsampled frame
      const currentMetrics = CameraQualityAnalyzer.analyzeFrame(video, mode);
      setMetrics(currentMetrics);

      if (!autoCaptureEnabled || isCapturingRef.current) {
        return;
      }

      if (currentMetrics.isQualityAcceptable) {
        setConsecutiveStableFrames((prev) => {
          const nextCount = prev + 1;
          // When stability threshold met and countdown hasn't started, initiate countdown
          if (nextCount >= stabilityThreshold && countdown === null) {
            setCountdown(2); // Short, crisp 2-second countdown
          }
          return nextCount;
        });
      } else {
        // Condition broken: reset stability and abort countdown
        if (consecutiveStableFrames > 0 || countdown !== null) {
          resetStability();
        }
      }
    }, sampleIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [
    active,
    autoCaptureEnabled,
    countdown,
    consecutiveStableFrames,
    mode,
    resetStability,
    sampleIntervalMs,
    stabilityThreshold,
    videoRef,
  ]);

  // Countdown Progression
  React.useEffect(() => {
    if (countdown === null || isCapturingRef.current) {
      return;
    }

    if (countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 800);
      return () => {
        if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      };
    } else if (countdown === 0) {
      // Trigger auto-capture
      resetStability();
      onAutoCapture();
    }
  }, [countdown, onAutoCapture, resetStability]);

  return {
    metrics,
    countdown,
    consecutiveStableFrames,
    autoCaptureEnabled,
    setAutoCaptureEnabled,
    resetStability,
  };
}
