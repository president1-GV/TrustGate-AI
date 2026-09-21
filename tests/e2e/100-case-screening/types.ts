export type ScenarioCategory =
  | "A_VALID_DOCUMENT"
  | "B_OCR_FAILURE"
  | "C_LOW_IMAGE_QUALITY"
  | "D_BLUR"
  | "E_GLARE"
  | "F_PERSPECTIVE_DISTORTION"
  | "G_PARTIAL_DOCUMENT"
  | "H_INVALID_MRZ"
  | "I_MRZ_CHECKSUM_FAILURE"
  | "J_CROSS_FIELD_INCONSISTENCY"
  | "K_EXPIRED_DOCUMENT"
  | "L_MISSING_FIELDS"
  | "M_TAMPERING_INDICATORS"
  | "N_FACE_NOT_DETECTED"
  | "O_FACE_QUALITY_INSUFFICIENT"
  | "P_IDENTITY_REF_UNAVAILABLE"
  | "Q_DATABASE_RECORD_FOUND"
  | "R_DATABASE_RECORD_NOT_FOUND"
  | "S_DATABASE_UNAVAILABLE"
  | "T_MULTIPLE_DATABASE_MATCHES"
  | "U_CONFLICTING_DATABASE_INFO"
  | "V_AI_UNAVAILABLE"
  | "W_LLM_UNAVAILABLE"
  | "X_PROCESSING_TIMEOUT"
  | "Y_MALFORMED_API_RESPONSE"
  | "Z_DUPLICATE_SUBMISSION"
  | "AA_CONCURRENT_SUBMISSIONS"
  | "AB_STALE_RESULT_SCENARIO"
  | "AC_REFRESH_DURING_PROCESSING"
  | "AD_NETWORK_INTERRUPTION"
  | "AE_REALTIME_RECONNECT"
  | "AF_REPORT_GENERATION_FAILURE"
  | "AG_AUTHORIZATION_FAILURE"
  | "AH_UNAUTHORIZED_CASE_ACCESS"
  | "AI_INVALID_DOCUMENT_FORMAT"
  | "AJ_OVERSIZED_UPLOAD";

export interface TestCaseDefinition {
  testCaseNumber: number;
  caseId: string;
  documentId: string;
  processingRunId: string;
  category: ScenarioCategory;
  categoryCode: string;
  title: string;
  description: string;
  expectedDecision: "PASS" | "FAIL" | "REVIEW" | "INCONCLUSIVE";
  expectedRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  inputSource: "TEST_DATA" | "FILE_UPLOAD" | "LIVE_CAMERA";
  inputHash: string;
  qualityScore: number;
  ocrSuccess: boolean;
  mrzValid: boolean;
  tamperScore: number;
  faceDetected: boolean;
  faceMatchScore: number | null;
  databaseStatus: "FOUND" | "NOT_FOUND" | "UNAVAILABLE" | "CONFLICT" | "MULTIPLE";
  environment: "TEST";
  notProduction: true;
}

export interface TestCaseExecutionResult {
  testCaseNumber: number;
  caseId: string;
  documentId: string;
  processingRunId: string;
  inputHash: string;
  category: ScenarioCategory;
  title: string;
  passed: boolean;
  actualDecision: "PASS" | "FAIL" | "REVIEW" | "INCONCLUSIVE";
  actualRiskScore: number;
  actualAiConfidence: number;
  stageResults: {
    imageQuality: { status: string; score: number };
    docDetect: { status: string; docType: string };
    ocr: { status: string; fieldsCount: number };
    mrz: { status: string; checksumValid: boolean };
    validation: { status: string; issueCount: number };
    tampering: { status: string; probability: number };
    face: { status: string; matchStatus: string };
    database: { status: string; matchResult: string };
    fusion: { status: string; verdict: string };
    audit: { status: string; eventCount: number };
    report: { status: string; reportId: string };
  };
  provenanceValid: boolean;
  crossContaminationDetected: boolean;
  timingsMs: {
    total: number;
    ocr: number;
    tampering: number;
    face: number;
    database: number;
    fusion: number;
  };
  failureReason?: string;
}
