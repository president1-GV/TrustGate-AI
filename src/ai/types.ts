export type PipelineStatus = "IDLE" | "PROCESSING" | "PASS" | "WARNING" | "FAIL";

export interface PipelineModule {
  id: string;
  index: number;
  label: string;
  status: PipelineStatus;
  score?: number;
  message?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface BBox { x: number; y: number; w: number; h: number; }

export interface ImageQualityResult {
  score: number;
  blur: number;
  brightness: number;
  contrast: number;
  noise?: number;
  resolutionScore: number;
  glare: number;
  perspectiveScore?: number;
  croppingScore?: number;
  grade: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
}

export interface DocDetectResult {
  documentType: "passport" | "visa" | "id" | "permit" | "unknown";
  confidence: number;
  boundingBox?: BBox;
}

export interface OcrField {
  fieldName: string;
  fieldValue?: string | null;
  confidence: number;
  boundingBox?: BBox;
  source: "ocr";
  validationStatus?: "UNVALIDATED" | "PASS" | "WARNING" | "FAIL";
}

export interface OcrResult {
  provider: "tesseract.js" | "PaddleOCR 3.7.0" | string;
  rawText?: string;
  overallConfidence: number;
  fields: OcrField[];
  executionMs?: number;
}

export interface MrzResult {
  present: boolean;
  format?: "TD1" | "TD2" | "TD3" | "MRVA" | "MRVB";
  documentNumber?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  nationality?: string;
  sex?: string;
  names?: { primary?: string; secondary?: string };
  checkDigitsValid?: boolean;
  compositeValid?: boolean;
  rawLines?: string[];
  mismatches?: {
    field: string;
    ocr: string;
    mrz: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
  }[];
}

export interface ValidationIssue {
  ruleCode: string;
  severity: "PASS" | "WARNING" | "HIGH" | "CRITICAL";
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  summaryPass: number;
  summaryWarn: number;
  summaryHigh: number;
  summaryCritical: number;
}

export interface TamperingRegion {
  manipulationType: string;
  regionLabel: string;
  boundingBox?: BBox;
  evidence: string;
  probability: number;
}

export interface TamperingResult {
  probability: number;
  confidence: number;
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  regions: TamperingRegion[];
}

export interface FaceResult {
  detected: boolean;
  quality?: number;
  similarity?: number;
  poseYaw?: number;
  posePitch?: number;
  blurScore?: number;
  resultLabel?: "NO_FACE" | "POSSIBLE_MATCH" | "LIKELY_MATCH" | "MISMATCH" | "FACE_DETECTED";
  boundingBox?: BBox;
  boundaryGradientDelta?: number;
  cornealReflectionDelta?: number;
  spectralEnergyRatio?: number;
  landmarkAsymmetry?: number;
  livenessScore?: number;
  deepfakeProbability?: number;
  faceForensicsVerdict?: "GENUINE_AUTHENTIC" | "SUSPICIOUS_MANIPULATION" | "DEEPFAKE_DETECTED";
}

export interface IdentityConsistencyResult {
  score: number;
  perField: {
    field: string;
    status: "PASS" | "WARNING" | "FAIL";
    note?: string;
  }[];
}

export interface RiskFactor {
  code: string;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface RiskResult {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  recommendedAction: string;
  engineVersion: string;
  factors: RiskFactor[];
}

export interface Finding {
  id: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "PASS";
  location?: string;
  confidence?: number;
  evidence?: string;
  modelName?: string;
  recommendation?: string;
}

export interface DocumentProvenance {
  documentId: string;
  documentVersion: number;
  processingRunId: string;
  documentHash: string; // SHA-256 hex string
  source: "LIVE_CAMERA" | "FILE_UPLOAD";
  mimeType: string;
  fileSizeBytes: number;
  dimensions?: { width: number; height: number };
  timestamp: string; // ISO-8601 string
}

export interface FullPipelineResult {
  imageQuality: ImageQualityResult;
  docDetect: DocDetectResult;
  ocr: OcrResult;
  mrz: MrzResult;
  validation: ValidationResult;
  tampering: TamperingResult;
  face: FaceResult;
  identity: IdentityConsistencyResult;
  risk: RiskResult;
  findings: Finding[];
  modules: PipelineModule[];
  startedAt: number;
  finishedAt: number;
  totalMs: number;
  provenance?: DocumentProvenance;
}

export type StepCallback = (
  mod: PipelineModule,
  resultPartial: Partial<FullPipelineResult>
) => void;

export interface DemoSample {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  seed: Partial<FullPipelineResult>;
}
