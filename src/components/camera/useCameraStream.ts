/**
 * TrustGate AI — useCameraStream Hook
 * Securely manages laptop webcam media stream lifecycle:
 * - Strictly requests video only: audio: false (zero microphone permission)
 * - Safely stops all tracks on unmount, device switch, route change, or tab hide
 * - Inspects navigator.permissions.query to detect granted/prompt/denied state
 * - Automatic startup when active; triggers native browser permission dialog
 * - Handles camera resolution negotiation, device enumeration, and track disconnection
 * - Stabilized callbacks to prevent teardown race conditions
 */

import * as React from "react";
import type { CameraCaptureState, CameraDeviceOption } from "./types";

export interface UseCameraStreamProps {
  active: boolean;
  preferredDeviceId?: string;
  facingMode?: "user" | "environment";
  onError?: (err: Error) => void;
}

export interface UseCameraStreamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  state: CameraCaptureState;
  devices: CameraDeviceOption[];
  selectedDeviceId: string;
  resolution: { width: number; height: number } | null;
  errorMessage: string | null;
  hasPermission: boolean;
  permissionStatus: "granted" | "prompt" | "denied" | "unknown";
  startStream: (deviceId?: string) => Promise<void>;
  stopStream: () => void;
  switchDevice: (deviceId: string) => Promise<void>;
}

export function useCameraStream({
  active,
  preferredDeviceId,
  facingMode = "user",
  onError,
}: UseCameraStreamProps): UseCameraStreamReturn {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const isStartingRef = React.useRef<boolean>(false);

  // Stabilize props via refs to prevent re-creation of startStream
  const onErrorRef = React.useRef(onError);
  onErrorRef.current = onError;

  const facingModeRef = React.useRef(facingMode);
  facingModeRef.current = facingMode;

  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [state, setState] = React.useState<CameraCaptureState>("IDLE");
  const [devices, setDevices] = React.useState<CameraDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>(preferredDeviceId || "");
  const selectedDeviceIdRef = React.useRef(selectedDeviceId);
  selectedDeviceIdRef.current = selectedDeviceId;

  const [resolution, setResolution] = React.useState<{ width: number; height: number } | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [hasPermission, setHasPermission] = React.useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = React.useState<"granted" | "prompt" | "denied" | "unknown">("unknown");

  // Stop all active tracks on current stream
  const stopStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isStartingRef.current = false;
    setState("STOPPED");
  }, []);

  // Enumerate available videoinput devices (no audio devices exposed)
  const refreshDevices = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const allDevs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = allDevs
        .filter((d) => d.kind === "videoinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1} (${d.deviceId ? d.deviceId.slice(0, 8) : "Integrated Webcam"})`,
          isDefault: index === 0,
        }));
      setDevices(videoDevs);
      if (!selectedDeviceIdRef.current && videoDevs.length > 0 && videoDevs[0].deviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch {
      // ignore enumeration errors
    }
  }, []);

  // Inspect browser permission state via Permissions API if available
  const checkPermissionState = React.useCallback(async (): Promise<"granted" | "prompt" | "denied" | "unknown"> => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      return "unknown";
    }
    try {
      const permStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
      const current = permStatus.state as "granted" | "prompt" | "denied";
      setPermissionStatus(current);
      if (current === "granted") {
        setHasPermission(true);
      } else if (current === "denied") {
        setHasPermission(false);
      }

      // Listen to permission changes in browser settings
      permStatus.onchange = () => {
        const next = permStatus.state as "granted" | "prompt" | "denied";
        setPermissionStatus(next);
        if (next === "granted") {
          setHasPermission(true);
          setErrorMessage(null);
        } else if (next === "denied") {
          setHasPermission(false);
          setErrorMessage("Camera permission was denied or blocked. Allow camera access for this site and try again.");
          stopStream();
        }
      };

      return current;
    } catch {
      // Browsers not supporting query({ name: 'camera' })
      return "unknown";
    }
  }, [stopStream]);

  // Start webcam media stream with strict video-only constraints
  const startStream = React.useCallback(
    async (targetDeviceId?: string) => {
      // Prevent concurrent stream acquisition races
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      stopStream();
      setErrorMessage(null);
      setState("REQUESTING_PERMISSION");

      try {
        // Verify browser environment supports getUserMedia
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          const err = new Error("Your browser does not support camera access. Please upload an image instead.");
          setErrorMessage(err.message);
          setState("ERROR");
          onErrorRef.current?.(err);
          return;
        }

        const deviceIdToUse = targetDeviceId || selectedDeviceIdRef.current;
        const currentFacing = facingModeRef.current || "user";

        // Progressive constraint hierarchy:
        // STRICT SECURITY RULE (CAM-002 / CAM-005): audio is ALWAYS false — never request microphone access.
        const constraintOptions: MediaStreamConstraints[] = [];

        // 1. If target device specified
        if (deviceIdToUse) {
          constraintOptions.push({
            video: {
              deviceId: { ideal: deviceIdToUse },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            },
            audio: false,
          });
        }

        // 2. High-res with ideal facing mode
        constraintOptions.push({
          video: {
            facingMode: { ideal: currentFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        // 3. 720p fallback
        constraintOptions.push({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        // 4. Basic video constraint — guaranteed browser prompt without constraint rejections
        constraintOptions.push({
          video: true,
          audio: false,
        });

        let activeStream: MediaStream | null = null;
        let caughtError: any = null;

        for (const constraints of constraintOptions) {
          try {
            activeStream = await navigator.mediaDevices.getUserMedia(constraints);
            if (activeStream) break;
          } catch (e: any) {
            caughtError = e;
            // If permission explicitly denied or security error, stop trying other constraints
            if (
              e?.name === "NotAllowedError" ||
              e?.name === "PermissionDeniedError" ||
              e?.name === "SecurityError"
            ) {
              break;
            }
          }
        }

        if (!activeStream) {
          const errName = caughtError?.name;
          let mappedMsg = "Failed to initialize camera.";

          if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
            mappedMsg = "Camera permission was denied or blocked. Allow camera access for this site and try again.";
            setPermissionStatus("denied");
          } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
            mappedMsg = "No active camera was detected. Your webcam (USB2.0 HD UVC WebCam) is disabled in Windows Device Manager (Code 22) or turned off via a laptop privacy switch/hotkey.";
          } else if (errName === "NotReadableError" || errName === "TrackStartError") {
            mappedMsg = "The camera is currently being used by another application.";
          } else if (errName === "OverconstrainedError") {
            mappedMsg = "The requested camera resolution is not supported by your hardware.";
          } else if (errName === "SecurityError") {
            mappedMsg = "Camera access is unavailable in the current security context.";
          } else if (errName === "AbortError") {
            mappedMsg = "Camera access was interrupted. Please retry.";
          } else if (caughtError?.message) {
            mappedMsg = caughtError.message;
          }

          setErrorMessage(mappedMsg);
          setHasPermission(false);
          setState("ERROR");
          onErrorRef.current?.(new Error(mappedMsg));
          return;
        }

        // Stream successfully acquired
        streamRef.current = activeStream;
        setStream(activeStream);
        setHasPermission(true);
        setPermissionStatus("granted");
        setState("INITIALIZING");

        const track = activeStream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings?.();
          if (settings?.width && settings?.height) {
            setResolution({ width: settings.width, height: settings.height });
          }
          if (settings?.deviceId && !selectedDeviceIdRef.current) {
            setSelectedDeviceId(settings.deviceId);
          }

          // Detect unexpected camera disconnection
          track.onended = () => {
            setErrorMessage("Camera connection lost.");
            setState("ERROR");
            setHasPermission(false);
          };
        }

        // Attach to video element immediately if ready
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          try {
            await videoRef.current.play();
            setState("READY");
          } catch {
            setState("READY");
          }
        } else {
          setState("READY");
        }

        await refreshDevices();
      } catch (fatalErr: any) {
        setErrorMessage(fatalErr?.message || "Unexpected camera failure.");
        setState("ERROR");
        onErrorRef.current?.(fatalErr);
      } finally {
        isStartingRef.current = false;
      }
    },
    [refreshDevices, stopStream]
  );

  const switchDevice = React.useCallback(
    async (newDeviceId: string) => {
      setSelectedDeviceId(newDeviceId);
      await startStream(newDeviceId);
    },
    [startStream]
  );

  // Synchronize stream with video element whenever stream changes
  React.useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().catch(() => {
        // Autoplay policy fallback handled
      });
    }
  }, [stream]);

  // Synchronize stream lifecycle with active prop
  React.useEffect(() => {
    let isMounted = true;

    if (active) {
      checkPermissionState().then((perm) => {
        if (!isMounted) return;
        // Start stream: if granted, connects immediately; if prompt, requests user permission
        if (perm === "granted" || perm === "prompt" || perm === "unknown") {
          startStream();
        }
      });
    } else {
      stopStream();
    }

    return () => {
      isMounted = false;
      stopStream();
    };
  }, [active, checkPermissionState, startStream, stopStream]);

  // Handle tab visibility & page unload to ensure camera light turns off
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopStream();
      } else if (active && hasPermission) {
        startStream();
      }
    };

    const handleBeforeUnload = () => {
      stopStream();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [active, hasPermission, startStream, stopStream]);

  return {
    videoRef,
    stream,
    state,
    devices,
    selectedDeviceId,
    resolution,
    errorMessage,
    hasPermission,
    permissionStatus,
    startStream,
    stopStream,
    switchDevice,
  };
}
