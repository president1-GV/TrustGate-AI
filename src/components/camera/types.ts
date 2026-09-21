/**
 * TrustGate AI — Laptop Camera Capture Types & State Machine
 */

export type CameraCaptureState =
  | "IDLE"
  | "REQUESTING_PERMISSION"
  | "INITIALIZING"
  | "READY"
  | "DETECTING"
  | "STABILIZING"
  | "CAPTURING"
  | "CAPTURED"
  | "VALIDATING"
  | "ACCEPTED"
  | "UPLOADING"
  | "PROCESSING"
  | "ERROR"
  | "STOPPED";

export type QualityLevel = "POOR" | "FAIR" | "GOOD";
export type FocusLevel = "BLUR" | "FAIR" | "SHARP";
export type PositionLevel = "ADJUST" | "CENTERING" | "GOOD";
export type DocumentDetectionLevel = "SEARCHING" | "DETECTED" | "ALIGNED";

export interface FrameQualityMetrics {
  /** Average luminance from 0 to 255 scaled to 0-100 */
  brightness: number;
  /** Contrast standard deviation scaled to 0-100 */
  contrast: number;
  /** Laplacian edge variance scaled to 0-100 */
  sharpness: number;
  /** Subject bounding box alignment & framing score 0-100 */
  framingScore: number;
  /** Percentage of frame occupied by detected document (0-100%) */
  occupancyPercent: number;
  /** Whether document corners/edges are within the target reticle */
  isCentered: boolean;
  /** Strictly computed overall quality score from 0 to 100 */
  overallScore: number;
  /** Measured frame resolution */
  width: number;
  height: number;
  /** High-level indicator flags */
  lightIndicator: QualityLevel;
  focusIndicator: FocusLevel;
  positionIndicator: PositionLevel;
  docIndicator: DocumentDetectionLevel;
  /** User-friendly guidance message */
  guidanceMessage: string;
  /** Whether all quality criteria for auto-capture are satisfied */
  isQualityAcceptable: boolean;
}

export interface CameraDeviceOption {
  deviceId: string;
  label: string;
  isDefault?: boolean;
}

export interface CaptureResult {
  file: File;
  previewUrl: string;
  metrics: FrameQualityMetrics;
  capturedAt: string;
  mode: "document" | "portrait";
  isMirrored: boolean; // Output is always false
}

export interface StorageUploadResult {
  bucket: string;
  key: string;
  url: string;
  fileSizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
  qualityScore: number;
}
