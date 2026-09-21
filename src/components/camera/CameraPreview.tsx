/**
 * TrustGate AI — CameraPreview Component
 * Renders the live video feed with optional viewfinder mirroring.
 * CRITICAL REQUIREMENT (CAM-014): The captured output frame is GUARANTEED UNMIRRORED.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream?: MediaStream | null;
  isMirrored?: boolean;
  onLoadedMetadata?: () => void;
  className?: string;
}

export const CameraPreview = React.forwardRef<HTMLVideoElement, CameraPreviewProps>(
  ({ videoRef, stream, isMirrored = false, onLoadedMetadata, className }, _ref) => {
    // Automatically attach stream when stream or videoRef becomes available
    React.useEffect(() => {
      const video = videoRef.current;
      if (video && stream) {
        if (video.srcObject !== stream) {
          video.srcObject = stream;
        }
        video.play().catch((err) => {
          console.warn("[CameraPreview] Autoplay was prevented by browser policy:", err);
        });
      }
    }, [stream, videoRef]);

    return (
      <div className={cn("relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none", className)}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={onLoadedMetadata}
          className={cn(
            "w-full h-full object-contain pointer-events-none transition-transform duration-200",
            isMirrored ? "scale-x-[-1]" : "scale-x-100"
          )}
        />
      </div>
    );
  }
);

CameraPreview.displayName = "CameraPreview";

/**
 * Capture an authentic, high-resolution, strictly UNMIRRORED image from the video element.
 * Guarantees that OCR, MRZ, dates, and security features are never inverted.
 */
export async function captureUnmirroredFrame(
  video: HTMLVideoElement,
  mode: "document" | "portrait" = "document"
): Promise<File> {
  const width = video.videoWidth || 1920;
  const height = video.videoHeight || 1080;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Failed to initialize canvas context for unmirrored capture.");
  }

  // Draw video frame without any scale inversion (scale-x is strictly 1.0)
  ctx.save();
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.95);
  });

  if (!blob) {
    throw new Error("Failed to encode unmirrored video frame to JPEG.");
  }

  const timestamp = Date.now();
  const filename = `camera_capture_${mode}_${timestamp}.jpg`;
  return new File([blob], filename, {
    type: "image/jpeg",
    lastModified: timestamp,
  });
}
