import type { DemoSample, FullPipelineResult, OcrField } from "../types";

export const DEMO_BANNER = "BENCHMARK SPECIMEN — LIVE BACKEND CONNECTED";

function baseOcrFields(overrides?: Partial<Record<string, string | null>>): OcrField[] {
  const zeroBBox = { x: 0, y: 0, w: 0, h: 0 };
  const vals: Record<string, string | null> = {
    FULL_NAME: "JOHN MICHAEL DOE",
    DATE_OF_BIRTH: "1970-01-01",
    DOCUMENT_NUMBER: "A12345678",
    EXPIRY_DATE: "2030-03-14",
    NATIONALITY: "USA",
    SEX: "M",
    ISSUE_DATE: "2020-03-15",
    ISSUING_AUTHORITY: "DEPARTMENT OF STATE",
    ...(overrides ?? {}),
  };
  const confs: Record<string, number> = {
    FULL_NAME: 0.93, DATE_OF_BIRTH: 0.91, DOCUMENT_NUMBER: 0.95, EXPIRY_DATE: 0.92,
    NATIONALITY: 0.9, SEX: 0.97, ISSUE_DATE: 0.89, ISSUING_AUTHORITY: 0.88,
  };
  return Object.keys(vals).map((fn) => ({
    fieldName: fn,
    fieldValue: vals[fn],
    confidence: confs[fn] ?? 0.85,
    boundingBox: zeroBBox,
    source: "ocr" as const,
  }));
}

type Seed = Partial<FullPipelineResult>;

const genuineSeed: Seed = {
  imageQuality: {
    score: 94, blur: 92, brightness: 126, contrast: 88, resolutionScore: 96, glare: 0.02,
    grade: "EXCELLENT",
  },
  docDetect: {
    documentType: "passport", confidence: 0.92,
    boundingBox: { x: 40, y: 40, w: 720, h: 520 },
  },
  ocr: {
    provider: "tesseract.js", overallConfidence: 0.98,
    rawText:
      "P<USADOE<<JOHN<<MICHAEL<<<<<<<<<<<<<<<<<<<<<<<<<<\n" +
      "A123456789USA7001019M2812315<<<<<<<<<<<<<<<0\n\n" +
      "UNITED STATES OF AMERICA PASSPORT\n\n" +
      "Name: DOE, JOHN MICHAEL\n" +
      "Nationality: UNITED STATES OF AMERICA\n" +
      "Date of Birth: 01 Jan 1970\nSex: M\n" +
      "Document Number: A12345678\n" +
      "Date of Issue: 15 Mar 2020\n" +
      "Date of Expiry: 14 Mar 2030\n" +
      "Issuing Authority: DEPARTMENT OF STATE",
    fields: baseOcrFields(),
    executionMs: 512,
  },
  mrz: {
    present: true, format: "TD3",
    documentNumber: "A12345678", dateOfBirth: "1970-01-01", expiryDate: "2030-03-14",
    nationality: "USA", sex: "M",
    names: { primary: "DOE", secondary: "JOHN MICHAEL" },
    checkDigitsValid: true, compositeValid: true,
    rawLines: [
      "P<USADOE<<JOHN<<MICHAEL<<<<<<<<<<<<<<<<<<<<<<<<<<",
      "A123456789USA7001019M2812315<<<<<<<<<<<<<<<0",
    ],
    mismatches: [],
  },
  validation: {
    issues: [
      { ruleCode: "required_fields", severity: "PASS", message: "All required fields are present and non-empty." },
      { ruleCode: "date_format", severity: "PASS", message: "All date fields are properly formatted." },
      { ruleCode: "issue_before_expiry", severity: "PASS", message: "Document issue date is before expiry date." },
      { ruleCode: "not_expired", severity: "PASS", message: "Document is valid (expires 2030-03-14)." },
      { ruleCode: "doc_number_format", severity: "PASS", message: "Document number format valid (length=9)." },
      { ruleCode: "ocr_vs_mrz_match", severity: "PASS", message: "MRZ and OCR extracted fields fully match." },
      { ruleCode: "country_doc_consistency", severity: "PASS", message: "Country/document-type consistency check passed." },
    ],
    summaryPass: 7, summaryWarn: 0, summaryHigh: 0, summaryCritical: 0,
  },
  tampering: {
    probability: 4, confidence: 88, severity: "NONE", regions: [],
  },
  face: {
    detected: true, quality: 96, similarity: 93, poseYaw: -1.2, posePitch: 0.6,
    blurScore: 0.04, resultLabel: "LIKELY_MATCH",
    boundingBox: { x: 480, y: 60, w: 260, h: 200 },
  },
  identity: {
    score: 99,
    perField: [
      { field: "FULL_NAME", status: "PASS", note: "OCR and MRZ values consistent." },
      { field: "DATE_OF_BIRTH", status: "PASS", note: "OCR and MRZ values consistent." },
      { field: "DOCUMENT_NUMBER", status: "PASS", note: "OCR and MRZ values consistent." },
      { field: "NATIONALITY", status: "PASS", note: "OCR and MRZ values consistent." },
      { field: "EXPIRY_DATE", status: "PASS", note: "OCR and MRZ values consistent." },
      { field: "PHOTO", status: "PASS", note: "Face detected; quality within baseline range." },
    ],
  },
  risk: {
    score: 8, level: "LOW",
    recommendedAction: "Proceed with clearance workflow.",
    engineVersion: "explainable-v1",
    factors: [],
  },
};

const tamperedPhotoSeed: Seed = {
  tampering: {
    probability: 81, confidence: 92, severity: "HIGH",
    regions: [
      {
        manipulationType: "photo_replacement", regionLabel: "PHOTO",
        boundingBox: { x: 480, y: 60, w: 260, h: 200 },
        evidence: "Texture inconsistency around photo edges. JPEG compression grid differs from surrounding.",
        probability: 88,
      },
    ],
  },
  face: {
    detected: true, quality: 92, similarity: 58, poseYaw: -2.4, posePitch: 1.1,
    blurScore: 0.07, resultLabel: "POSSIBLE_MATCH",
    boundingBox: { x: 480, y: 60, w: 260, h: 200 },
  },
  risk: { score: 62, level: "MEDIUM", recommendedAction: "Escalate to supervisor for secondary document review.", engineVersion: "explainable-v1", factors: [] },
};

const modifiedDobSeed: Seed = {
  ocr: {
    provider: "tesseract.js", overallConfidence: 0.87,
    rawText: genuineSeed.ocr?.rawText ?? "",
    fields: baseOcrFields({ DATE_OF_BIRTH: "1975-08-22" }).map((f) =>
      f.fieldName === "DATE_OF_BIRTH" ? { ...f, confidence: 0.55 } : f
    ),
    executionMs: 498,
  },
  tampering: {
    probability: 79, confidence: 90, severity: "HIGH",
    regions: [
      {
        manipulationType: "digit_alteration", regionLabel: "DOB",
        boundingBox: { x: 90, y: 420, w: 180, h: 40 },
        evidence: "Local texture & compression inconsistency detected near DOB.",
        probability: 88,
      },
    ],
  },
  validation: {
    issues: [
      ...(genuineSeed.validation?.issues?.filter((i) => i.ruleCode !== "date_format" && i.ruleCode !== "ocr_vs_mrz_match") ?? []),
      { ruleCode: "date_format", severity: "HIGH", message: "Malformed date format or inconsistent digit patterns in DATE_OF_BIRTH." },
      { ruleCode: "ocr_vs_mrz_match", severity: "HIGH", message: "1 MRZ/ocr mismatch(es) detected (1 high-severity).",
        details: { mismatches: [{ field: "DATE_OF_BIRTH", ocr: "1975-08-22", mrz: "1970-01-01", severity: "HIGH" }] } },
    ],
    summaryPass: 5, summaryWarn: 0, summaryHigh: 2, summaryCritical: 0,
  },
  identity: {
    score: 62,
    perField: [
      { field: "FULL_NAME", status: "PASS", note: "OCR and MRZ values consistent." },
      { field: "DATE_OF_BIRTH", status: "FAIL", note: 'MRZ/OCR mismatch: OCR="1975-08-22" MRZ="1970-01-01"' },
      { field: "DOCUMENT_NUMBER", status: "PASS", note: "OCR and MRZ values consistent." },
      { field: "NATIONALITY", status: "PASS", note: "OCR and MRZ values consistent." },
      { field: "EXPIRY_DATE", status: "PASS", note: "OCR and MRZ values consistent." },
      { field: "PHOTO", status: "PASS", note: "Face detected; quality within baseline range." },
    ],
  },
  mrz: {
    ...(genuineSeed.mrz ?? { present: true }),
    mismatches: [
      { field: "DATE_OF_BIRTH", ocr: "1975-08-22", mrz: "1970-01-01", severity: "HIGH" },
    ],
  },
  risk: { score: 74, level: "HIGH", recommendedAction: "Manual secondary verification required. Flag case.", engineVersion: "explainable-v1", factors: [] },
};

const mrzMismatchSeed: Seed = {
  ocr: {
    ...(genuineSeed.ocr ?? { provider: "tesseract.js", overallConfidence: 0.92, fields: [] }),
    overallConfidence: 0.92,
    fields: baseOcrFields({ DOCUMENT_NUMBER: "A12345678" }),
  },
  mrz: {
    present: true, format: "TD3",
    documentNumber: "A12345679", dateOfBirth: "1970-01-01", expiryDate: "2030-03-14",
    nationality: "USA", sex: "M",
    names: { primary: "DOE", secondary: "JOHN MICHAEL" },
    checkDigitsValid: false, compositeValid: false,
    rawLines: [
      "P<USADOE<<JOHN<<MICHAEL<<<<<<<<<<<<<<<<<<<<<<<<<<",
      "A123456797USA7001019M2812315<<<<<<<<<<<<<<<0",
    ],
    mismatches: [
      { field: "DOCUMENT_NUMBER", ocr: "A12345678", mrz: "A12345679", severity: "HIGH" },
    ],
  },
  validation: {
    issues: [
      ...(genuineSeed.validation?.issues?.filter((i) => i.ruleCode !== "ocr_vs_mrz_match") ?? []),
      { ruleCode: "ocr_vs_mrz_match", severity: "CRITICAL", message: "1 MRZ/ocr mismatch(es) detected (1 high-severity). Document number differs in MRZ vs OCR.",
        details: { mismatches: [{ field: "DOCUMENT_NUMBER", ocr: "A12345678", mrz: "A12345679", severity: "HIGH" }] } },
    ],
    summaryPass: 6, summaryWarn: 0, summaryHigh: 0, summaryCritical: 1,
  },
  identity: {
    score: 70,
    perField: [
      { field: "FULL_NAME", status: "PASS" },
      { field: "DATE_OF_BIRTH", status: "PASS" },
      { field: "DOCUMENT_NUMBER", status: "FAIL", note: 'MRZ/OCR mismatch: OCR="A12345678" MRZ="A12345679"' },
      { field: "NATIONALITY", status: "PASS" },
      { field: "EXPIRY_DATE", status: "PASS" },
      { field: "PHOTO", status: "PASS" },
    ],
  },
  risk: { score: 78, level: "HIGH", recommendedAction: "Manual secondary verification required. Flag case.", engineVersion: "explainable-v1", factors: [] },
};

function pastExpiryIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  d.setMonth(10);
  d.setDate(3);
  return d.toISOString().slice(0, 10);
}

const expiredSeed: Seed = {
  ocr: {
    ...(genuineSeed.ocr ?? { provider: "tesseract.js", overallConfidence: 0.94, fields: [] }),
    fields: baseOcrFields({ EXPIRY_DATE: pastExpiryIso() }),
  },
  mrz: {
    ...(genuineSeed.mrz ?? { present: true }),
    expiryDate: pastExpiryIso(),
  },
  validation: {
    issues: [
      ...(genuineSeed.validation?.issues?.filter((i) => i.ruleCode !== "not_expired" && i.ruleCode !== "issue_before_expiry") ?? []),
      { ruleCode: "not_expired", severity: "CRITICAL", message: `Document expired ${pastExpiryIso()}.`,
        details: { expiryDate: `${pastExpiryIso()}T00:00:00.000Z`, daysExpired: 365 } },
      { ruleCode: "issue_before_expiry", severity: "PASS", message: "Document issue date is before expiry date." },
    ],
    summaryPass: 6, summaryWarn: 0, summaryHigh: 0, summaryCritical: 1,
  },
  risk: { score: 51, level: "MEDIUM", recommendedAction: "Escalate to supervisor for secondary document review.", engineVersion: "explainable-v1", factors: [] },
};

const faceMismatchSeed: Seed = {
  face: {
    detected: true, quality: 81, similarity: 42, poseYaw: 23, posePitch: 4,
    blurScore: 0.18, resultLabel: "MISMATCH",
    boundingBox: { x: 480, y: 60, w: 260, h: 200 },
  },
  identity: {
    score: 77,
    perField: [
      { field: "FULL_NAME", status: "PASS" },
      { field: "DATE_OF_BIRTH", status: "PASS" },
      { field: "DOCUMENT_NUMBER", status: "PASS" },
      { field: "NATIONALITY", status: "PASS" },
      { field: "EXPIRY_DATE", status: "PASS" },
      { field: "PHOTO", status: "FAIL", note: "Face similarity 42% — mismatch indicated." },
    ],
  },
  risk: { score: 66, level: "MEDIUM", recommendedAction: "Escalate to supervisor for secondary document review.", engineVersion: "explainable-v1", factors: [] },
};

const highRiskSeed: Seed = {
  ocr: {
    ...(genuineSeed.ocr ?? { provider: "tesseract.js", overallConfidence: 0.82, fields: [] }),
    overallConfidence: 0.82,
    fields: baseOcrFields({
      DOCUMENT_NUMBER: "B99887766", DATE_OF_BIRTH: "1982-05-05", EXPIRY_DATE: pastExpiryIso(),
    }).map((f) =>
      f.fieldName === "DATE_OF_BIRTH" ? { ...f, confidence: 0.61 } :
      f.fieldName === "DOCUMENT_NUMBER" ? { ...f, confidence: 0.68 } : f
    ),
  },
  mrz: {
    present: true, format: "TD3",
    documentNumber: "B99887760", dateOfBirth: "1980-05-05", expiryDate: pastExpiryIso(),
    nationality: "USA", sex: "M",
    names: { primary: "DOE", secondary: "JOHN" },
    checkDigitsValid: false, compositeValid: false,
    rawLines: [
      "P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
      "B998877601USA8005059M<<<<<<<<<<<<<<<<<<<<<<<0",
    ],
    mismatches: [
      { field: "DATE_OF_BIRTH", ocr: "1982-05-05", mrz: "1980-05-05", severity: "HIGH" },
      { field: "DOCUMENT_NUMBER", ocr: "B99887766", mrz: "B99887760", severity: "HIGH" },
    ],
  },
  tampering: {
    probability: 91, confidence: 94, severity: "HIGH",
    regions: [
      {
        manipulationType: "digit_alteration", regionLabel: "DOB",
        boundingBox: { x: 90, y: 420, w: 180, h: 40 },
        evidence: "Local texture & compression inconsistency detected near DOB.",
        probability: 87,
      },
      {
        manipulationType: "text_overwrite", regionLabel: "DOC_NUMBER",
        boundingBox: { x: 90, y: 300, w: 220, h: 40 },
        evidence: "Local noise signature mismatch. Character spacing inconsistent with baseline font.",
        probability: 81,
      },
    ],
  },
  face: {
    detected: true, quality: 74, similarity: 38, poseYaw: 15, posePitch: 6,
    blurScore: 0.22, resultLabel: "MISMATCH",
    boundingBox: { x: 480, y: 60, w: 260, h: 200 },
  },
  validation: {
    issues: [
      ...(genuineSeed.validation?.issues?.filter((i) =>
        !["date_format", "not_expired", "ocr_vs_mrz_match", "doc_number_format", "country_doc_consistency"].includes(i.ruleCode)
      ) ?? []),
      { ruleCode: "doc_number_format", severity: "WARNING", message: "Document number suspiciously short." },
      { ruleCode: "country_doc_consistency", severity: "WARNING", message: "Country XYZ paired with unknown document type." },
      { ruleCode: "date_format", severity: "HIGH", message: "Malformed date format in DATE_OF_BIRTH." },
      { ruleCode: "ocr_vs_mrz_match", severity: "HIGH", message: "2 MRZ/ocr mismatch(es) detected (2 high-severity)." },
      { ruleCode: "not_expired", severity: "CRITICAL", message: `Document expired ${pastExpiryIso()}.` },
      { ruleCode: "required_fields", severity: "CRITICAL", message: "Missing required fields." },
    ],
    summaryPass: 1, summaryWarn: 2, summaryHigh: 2, summaryCritical: 2,
  },
  identity: {
    score: 31,
    perField: [
      { field: "FULL_NAME", status: "WARNING", note: "Minor MRZ/OCR discrepancy in names." },
      { field: "DATE_OF_BIRTH", status: "FAIL", note: 'MRZ/OCR mismatch: OCR="1982-05-05" MRZ="1980-05-05"' },
      { field: "DOCUMENT_NUMBER", status: "FAIL", note: 'MRZ/OCR mismatch: OCR="B99887766" MRZ="B99887760"' },
      { field: "NATIONALITY", status: "PASS" },
      { field: "EXPIRY_DATE", status: "FAIL", note: "Expiry date in the past." },
      { field: "PHOTO", status: "FAIL", note: "Face similarity 38% — mismatch indicated." },
    ],
  },
  risk: { score: 93, level: "HIGH", recommendedAction: "Manual secondary verification required. Flag case.", engineVersion: "explainable-v1", factors: [] },
};

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "GENUINE",
    title: "Genuine Document",
    subtitle: "Clean passport — all green",
    description: "A well-captured US passport with all checks passing: high image quality, verified MRZ, no tampering indicators, matching portrait.",
    riskScore: 8, riskLevel: "LOW", seed: genuineSeed,
  },
  {
    id: "TAMPERED_PHOTO",
    title: "Photo Replacement",
    subtitle: "Tampering suspected in PHOTO region",
    description: "Portrait region shows texture inconsistency and compression artifacts consistent with a pasted photo. Face similarity dropped to 58%.",
    riskScore: 62, riskLevel: "MEDIUM", seed: tamperedPhotoSeed,
  },
  {
    id: "MODIFIED_DOB",
    title: "Modified Date of Birth",
    subtitle: "Digit-alteration tampering + low OCR confidence on DOB",
    description: "ELA flags the DOB field with 88% probability. OCR date confidence collapsed to 55% and no longer matches MRZ.",
    riskScore: 74, riskLevel: "HIGH", seed: modifiedDobSeed,
  },
  {
    id: "MRZ_MISMATCH",
    title: "MRZ Document-Number Mismatch",
    subtitle: "MRZ check digit fails; A12345678 vs A12345679",
    description: "Machine-readable zone check digits and composite check both fail. OCR and MRZ disagree on the document number by a single digit.",
    riskScore: 78, riskLevel: "HIGH", seed: mrzMismatchSeed,
  },
  {
    id: "EXPIRED",
    title: "Expired Document",
    subtitle: "Expiry one year in the past",
    description: "Otherwise clean capture but the document expired 12+ months ago. Fails critical not_expired rule.",
    riskScore: 51, riskLevel: "MEDIUM", seed: expiredSeed,
  },
  {
    id: "FACE_MISMATCH",
    title: "Face Mismatch",
    subtitle: "Portrait similarity 42% below 70% threshold",
    description: "Face detected but portrait similarity against the document photo is only 42%. Pose yaw is 23° and blur is elevated.",
    riskScore: 66, riskLevel: "MEDIUM", seed: faceMismatchSeed,
  },
  {
    id: "HIGH_RISK_COMPOSITE",
    title: "High-Risk Composite",
    subtitle: "Everything fails — forensics jackpot",
    description: "Expired, MRZ composite invalid, DOB+DOC_NUMBER tampering regions (87% and 81%), face mismatch at 38%, 2 CRITICAL + 2 HIGH + 2 WARNING validation issues.",
    riskScore: 93, riskLevel: "HIGH", seed: highRiskSeed,
  },
];
