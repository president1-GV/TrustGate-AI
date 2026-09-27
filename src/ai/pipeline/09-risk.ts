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
  const { imageQuality, docDetect, ocr, mrz, validation, tampering, face, identity } = input;

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

  const rawTextUpper = (ocr.rawText || "").toUpperCase();
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
    ocr.fields.some((f) => f.fieldName === "ISSUING_AUTHORITY" && f.fieldValue?.includes("UIDAI")) ||
    (ocr.fields.some((f) => f.fieldName === "NATIONALITY" && f.fieldValue === "IND") &&
      ocr.fields.some((f) => f.fieldName === "DOCUMENT_NUMBER" && /\d{4}/.test(f.fieldValue || "")));

  const mrzValid = isAadhaar
    ? 100
    : mrz.present && mrz.compositeValid
      ? 100
      : mrz.present
        ? 40
        : 0;

  const notExpiredIssue = validation.issues.find((i) => i.ruleCode === "not_expired");
  const expiryValid = isAadhaar
    ? 100
    : !notExpiredIssue || notExpiredIssue.severity === "PASS"
      ? 100
      : notExpiredIssue.severity === "CRITICAL"
        ? 0
        : 50;

  const components: Record<string, number> = {
    imageQuality: imageQuality.score,
    docDetectConf: docDetect.confidence * 100,
    ocrConf: ocr.overallConfidence * 100,
    mrzValid,
    expiryValid,
    tamperingProb: tampering.probability,
    faceQuality: face.detected ? (face.quality ?? 0) : 0,
    faceSimilarity: face.detected ? (face.similarity ?? 0) : 0,
    identityScore: identity.score,
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
    weights.faceSimilarity * (face.detected && face.similarity != null ? (100 - components.faceSimilarity) : (face.detected ? 20 : 50)) +
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

  let rawScore = clamp(rawSum / totalWeights, 0, 100);

  // If the document is classified as unknown, enforce high risk
  if ((docDetect.documentType === "unknown" && !isAadhaar) || (!isAadhaar && docDetect.confidence < 0.4)) {
    rawScore = Math.max(rawScore, 88);
  }

  // If credential has NO MRZ and NO face portrait, enforce high risk rejection
  if (!mrz.present && !face.detected && !isAadhaar) {
    rawScore = Math.max(rawScore, 90);
  }

  // If critical validation issues occurred
  if (validation.summaryCritical > 0) {
    rawScore = Math.max(rawScore, 85);
  }

  factors.push({
    code: "image_quality",
    weight: weights.imageQuality * 100,
    contribution: weights.imageQuality * (100 - components.imageQuality),
    explanation: `Image quality score ${components.imageQuality.toFixed(0)}/100 — ${
      components.imageQuality >= 70 ? "clear, suitable for downstream analysis" : "reduced fidelity may impact extraction accuracy"
    }.`,
  });

  factors.push({
    code: "doc_detect",
    weight: weights.docDetectConf * 100,
    contribution: weights.docDetectConf * (100 - components.docDetectConf),
    explanation: docDetect.documentType === "unknown" && !isAadhaar
      ? `Document classifier failed to identify standard credential format (${components.docDetectConf.toFixed(0)}% confidence).`
      : `Document classifier confidence ${components.docDetectConf.toFixed(0)}% — type="${isAadhaar ? "aadhaar" : docDetect.documentType}".`,
  });

  factors.push({
    code: "ocr_confidence",
    weight: weights.ocrConf * 100,
    contribution: weights.ocrConf * (100 - components.ocrConf),
    explanation: ocr.fields.length > 0
      ? `OCR confidence ${components.ocrConf.toFixed(0)}% — ${ocr.fields.length} field(s) extracted.`
      : "No visual text fields identified by OCR engine.",
  });

  factors.push({
    code: "mrz_validity",
    weight: weights.mrzValid * 100,
    contribution: weights.mrzValid * (100 - components.mrzValid),
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
    contribution: weights.expiryValid * (100 - components.expiryValid),
    explanation: isAadhaar
      ? "Aadhaar credential is a permanent lifelong document with no expiration date."
      : notExpiredIssue?.message || "Expiry date not evaluated.",
  });

  factors.push({
    code: "tampering_risk",
    weight: weights.tamperingProb * 100,
    contribution: weights.tamperingProb * components.tamperingProb,
    explanation: tampering.regions.length > 0
      ? `Tampering probability ${components.tamperingProb.toFixed(0)}% — ${tampering.severity} severity with ${tampering.regions.length} anomalous region(s).`
      : "ELA analysis found no pixel alteration anomalies.",
  });

  factors.push({
    code: "face_analysis",
    weight: weights.faceQuality * 100,
    contribution: weights.faceQuality * (100 - components.faceQuality),
    explanation: face.detected
      ? `Portrait quality ${components.faceQuality.toFixed(0)}/100 (similarity=${components.faceSimilarity.toFixed(0)}%).`
      : "No facial portrait detected in current document.",
  });

  factors.push({
    code: "identity_consistency",
    weight: weights.identityScore * 100,
    contribution: weights.identityScore * (100 - components.identityScore),
    explanation: `Cross-field identity consistency score ${components.identityScore.toFixed(0)}/100 across ${identity.perField?.length ?? 0} assertions.`,
  });

  let level: RiskResult["level"];
  if (rawScore < 30) level = "LOW";
  else if (rawScore < 70) level = "MEDIUM";
  else level = "HIGH";

  let recommendedAction: string;
  if (docDetect.documentType === "unknown" && !isAadhaar) {
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

  return {
    score: Math.round(rawScore),
    level,
    recommendedAction,
    engineVersion: "explainable-v1",
    factors,
  };
}
