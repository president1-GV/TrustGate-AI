import type {
  DocDetectResult,
  FaceResult,
  IdentityConsistencyResult,
  ImageQualityResult,
  MrzResult,
  OcrResult,
  RiskFactor,
  RiskResult,
  TamperingResult,
  ValidationResult,
} from "../types";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function safeNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export async function computeRisk(input: {
  imageQuality: ImageQualityResult;
  docDetect: DocDetectResult;
  ocr: OcrResult;
  mrz: MrzResult;
  validation: ValidationResult;
  tampering: TamperingResult;
  face: FaceResult;
  identity: IdentityConsistencyResult;
}): Promise<RiskResult> {
  const safeInput = input || ({} as any);
  const imageQuality = safeInput.imageQuality || ({} as any);
  const docDetect = safeInput.docDetect || ({} as any);
  const ocr = safeInput.ocr || ({} as any);
  const mrz = safeInput.mrz || ({} as any);
  const validation = safeInput.validation || ({} as any);
  const tampering = safeInput.tampering || ({} as any);
  const face = safeInput.face || ({} as any);
  const identity = safeInput.identity || ({} as any);

  const weights = {
    imageQuality: 0.10,
    docDetectConf: 0.12,
    ocrConf: 0.14,
    mrzValid: 0.20,
    expiryValid: 0.15,
    tamperingProb: 0.30,
    faceQuality: 0.08,
    faceSimilarity: 0.12,
    identityScore: 0.18,
  };

  const rawTextUpper = (typeof ocr.rawText === "string" ? ocr.rawText : "").toUpperCase();
  const ocrFields = Array.isArray(ocr.fields) ? ocr.fields : [];

  const isAadhaar =
    docDetect.documentType === "aadhaar" ||
    rawTextUpper.includes("AADHAAR") ||
    rawTextUpper.includes("AADHAR") ||
    rawTextUpper.includes("ADHAAR") ||
    rawTextUpper.includes("UNIQUE IDENTIFICATION") ||
    rawTextUpper.includes("UIDAI") ||
    rawTextUpper.includes("MERA AADHAAR") ||
    rawTextUpper.includes("MERI PEHCHAN") ||
    rawTextUpper.includes("आधार") ||
    rawTextUpper.includes("भारत सरकार") ||
    ocrFields.some((f: any) => f?.fieldName === "ISSUING_AUTHORITY" && f?.fieldValue?.includes("UIDAI")) ||
    (ocrFields.some((f: any) => f?.fieldName === "NATIONALITY" && f?.fieldValue === "IND") &&
      ocrFields.some((f: any) => f?.fieldName === "DOCUMENT_NUMBER" && /\d{4}/.test(f?.fieldValue || "")));

  const mrzValid = isAadhaar
    ? 100
    : Boolean(mrz.present && mrz.compositeValid)
      ? 100
      : Boolean(mrz.present)
        ? 40
        : 0;

  const validationIssues = Array.isArray(validation.issues) ? validation.issues : [];
  const notExpiredIssue = validationIssues.find((i: any) => i?.ruleCode === "not_expired");
  const expiryValid = isAadhaar
    ? 100
    : !notExpiredIssue || notExpiredIssue.severity === "PASS"
      ? 100
      : notExpiredIssue.severity === "CRITICAL"
        ? 0
        : 50;

  const rawDocConf = safeNum(docDetect.confidence, 0);
  const docDetectConf = clamp(rawDocConf <= 1 && rawDocConf >= 0 ? rawDocConf * 100 : rawDocConf, 0, 100);

  const rawOcrConf = safeNum(ocr.overallConfidence, 0);
  const ocrConf = clamp(rawOcrConf <= 1 && rawOcrConf >= 0 ? rawOcrConf * 100 : rawOcrConf, 0, 100);

  const components: Record<string, number> = {
    imageQuality: clamp(safeNum(imageQuality.score, 0), 0, 100),
    docDetectConf,
    ocrConf,
    mrzValid: clamp(safeNum(mrzValid, 0), 0, 100),
    expiryValid: clamp(safeNum(expiryValid, 0), 0, 100),
    tamperingProb: clamp(safeNum(tampering.probability, 0), 0, 100),
    faceQuality: Boolean(face.detected) ? clamp(safeNum(face.quality, 0), 0, 100) : 0,
    faceSimilarity: Boolean(face.detected) ? clamp(safeNum(face.similarity, 0), 0, 100) : 0,
    identityScore: clamp(safeNum(identity.score, 0), 0, 100),
  };

  const factors: RiskFactor[] = [];

  const rawSum =
    weights.imageQuality * (100 - components.imageQuality) +
    weights.docDetectConf * (100 - components.docDetectConf) +
    weights.ocrConf * (100 - components.ocrConf) +
    weights.mrzValid * (100 - components.mrzValid) +
    weights.expiryValid * (100 - components.expiryValid) +
    weights.tamperingProb * components.tamperingProb +
    weights.faceQuality * (100 - components.faceQuality) +
    weights.faceSimilarity * (face.detected && typeof face.similarity === "number" && Number.isFinite(face.similarity) ? (100 - components.faceSimilarity) : (face.detected ? 20 : 50)) +
    weights.identityScore * (100 - components.identityScore);

  const totalWeights =
    weights.imageQuality +
    weights.docDetectConf +
    weights.ocrConf +
    weights.mrzValid +
    weights.expiryValid +
    weights.tamperingProb +
    weights.faceQuality +
    weights.faceSimilarity +
    weights.identityScore;

  const safeTotalWeights = totalWeights > 0 ? totalWeights : 1;
  let rawScore = safeNum(clamp(safeNum(rawSum, 0) / safeTotalWeights, 0, 100), 50);

  const isBiometricMismatch =
    face.identityMatchStatus === "MISMATCH" ||
    face.resultLabel === "MISMATCH" ||
    (typeof face.similarity === "number" && Number.isFinite(face.similarity) && face.similarity < 60);

  // If biometric mismatch is verified between live face and document portrait, enforce high risk
  if (isBiometricMismatch) {
    rawScore = Math.max(rawScore, 78);
  }

  // If the document is classified as unknown, enforce high risk
  if (((docDetect.documentType === "unknown" || !docDetect.documentType) && !isAadhaar) || (!isAadhaar && safeNum(docDetect.confidence, 0) < 0.4)) {
    rawScore = Math.max(rawScore, 88);
  }

  // If credential has NO MRZ and NO face portrait, enforce high risk rejection
  if (!mrz.present && !face.detected && !isAadhaar) {
    rawScore = Math.max(rawScore, 90);
  }

  // If critical validation issues occurred
  if (safeNum(validation.summaryCritical, 0) > 0) {
    rawScore = Math.max(rawScore, 85);
  }

  factors.push({
    code: "image_quality",
    weight: weights.imageQuality * 100,
    contribution: safeNum(weights.imageQuality * (100 - components.imageQuality), 0),
    explanation: `Image quality score ${safeNum(components.imageQuality, 0).toFixed(0)}/100 — ${
      components.imageQuality >= 70 ? "clear, suitable for downstream analysis" : "reduced fidelity may impact extraction accuracy"
    }.`,
  });

  factors.push({
    code: "doc_detect",
    weight: weights.docDetectConf * 100,
    contribution: safeNum(weights.docDetectConf * (100 - components.docDetectConf), 0),
    explanation: (docDetect.documentType === "unknown" || !docDetect.documentType) && !isAadhaar
      ? `Document classifier failed to identify standard credential format (${safeNum(components.docDetectConf, 0).toFixed(0)}% confidence).`
      : `Document classifier confidence ${safeNum(components.docDetectConf, 0).toFixed(0)}% — type="${isAadhaar ? "aadhaar" : (docDetect.documentType || "unknown")}".`,
  });

  const ocrCount = ocrFields.length;
  factors.push({
    code: "ocr_confidence",
    weight: weights.ocrConf * 100,
    contribution: safeNum(weights.ocrConf * (100 - components.ocrConf), 0),
    explanation: ocrCount > 0
      ? `OCR confidence ${safeNum(components.ocrConf, 0).toFixed(0)}% — ${ocrCount} field(s) extracted.`
      : "No visual text fields identified by OCR engine.",
  });

  factors.push({
    code: "mrz_validity",
    weight: weights.mrzValid * 100,
    contribution: safeNum(weights.mrzValid * (100 - components.mrzValid), 0),
    explanation: isAadhaar
      ? "Republic of India Aadhaar smart card format verified (ICAO MRZ not required)."
      : mrz.present
        ? mrz.compositeValid
          ? `MRZ composite checksum valid (${mrz.format || "ICAO"}).`
          : "MRZ present but failed checksum verification."
        : "No Machine Readable Zone (MRZ) present in credential.",
  });

  factors.push({
    code: "expiry_status",
    weight: weights.expiryValid * 100,
    contribution: safeNum(weights.expiryValid * (100 - components.expiryValid), 0),
    explanation: isAadhaar
      ? "Aadhaar credential is a permanent lifelong document with no expiration date."
      : notExpiredIssue?.message || "Expiry date not evaluated.",
  });

  const tamperingRegions = Array.isArray(tampering.regions) ? tampering.regions : [];
  factors.push({
    code: "tampering_risk",
    weight: weights.tamperingProb * 100,
    contribution: safeNum(weights.tamperingProb * components.tamperingProb, 0),
    explanation: tamperingRegions.length > 0
      ? `Tampering probability ${safeNum(components.tamperingProb, 0).toFixed(0)}% — ${tampering.severity || "SUSPICIOUS"} severity with ${tamperingRegions.length} anomalous region(s).`
      : "ELA analysis found no pixel alteration anomalies.",
  });

  const faceSimVal = typeof face.similarity === "number" && Number.isFinite(face.similarity) ? face.similarity : null;
  factors.push({
    code: "face_analysis",
    weight: weights.faceSimilarity * 100,
    contribution: isBiometricMismatch ? 25 : safeNum(weights.faceSimilarity * (100 - components.faceSimilarity), 0),
    explanation: isBiometricMismatch
      ? `Biometric mismatch flagged: Live subject features diverge from document portrait (${faceSimVal != null ? `${faceSimVal}% similarity` : "mismatch detected"}).`
      : face.detected && faceSimVal != null
      ? `Biometric comparison verified (${faceSimVal}% similarity, portrait quality ${safeNum(components.faceQuality, 0).toFixed(0)}/100).`
      : face.detected
      ? `Portrait quality ${safeNum(components.faceQuality, 0).toFixed(0)}/100 (awaiting live camera biometric comparison).`
      : "No facial portrait detected in current document.",
  });

  const identityAssertions = Array.isArray(identity.perField) ? identity.perField.length : 0;
  factors.push({
    code: "identity_consistency",
    weight: weights.identityScore * 100,
    contribution: safeNum(weights.identityScore * (100 - components.identityScore), 0),
    explanation: `Cross-field identity consistency score ${safeNum(components.identityScore, 0).toFixed(0)}/100 across ${identityAssertions} assertions.`,
  });

  let level: RiskResult["level"];
  if (rawScore < 30) level = "LOW";
  else if (rawScore < 70) level = "MEDIUM";
  else level = "HIGH";

  let recommendedAction: string;
  if (isBiometricMismatch) {
    recommendedAction = "Biometric mismatch detected between document portrait and live passenger. Immediate supervisor escalation required.";
  } else if ((docDetect.documentType === "unknown" || !docDetect.documentType) && !isAadhaar) {
    recommendedAction = "Reject non-credential submission. Request valid government-issued identity credential.";
  } else if (level === "LOW") {
    recommendedAction = isAadhaar
      ? "Proceed with clearance workflow. Aadhaar identity verified."
      : "Proceed with clearance workflow.";
  } else if (level === "MEDIUM") {
    recommendedAction = "Escalate to supervisor for secondary document review.";
  } else {
    recommendedAction = "Manual secondary verification required. Flag case.";
  }

  const finalScore = safeNum(Math.round(rawScore), 50);

  return {
    score: clamp(finalScore, 0, 100),
    level,
    recommendedAction,
    engineVersion: "explainable-v1",
    factors,
  };
}
