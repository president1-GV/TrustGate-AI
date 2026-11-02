import { describe, it, expect } from "vitest";
import { parseMrz } from "@/ai/pipeline/04-mrz";
import { validateCase } from "@/ai/pipeline/05-validation";
import { identityConsistency } from "@/ai/pipeline/08-identity";
import { computeRisk } from "@/ai/pipeline/09-risk";
import { detectCredential } from "@/lib/documentDetector";
import type { OcrResult, FaceResult, TamperingResult, ImageQualityResult, DocDetectResult, FullPipelineResult } from "@/ai/types";

describe("Aadhaar Card End-to-End Verification Pipeline", () => {
  const realAadhaarRawText = `roa
4 CNN.
Et [UTHTT
HRT Th
Government of India
HRA Re ea sitar
Unique Identification Authority of India
Atefvarar wh / Enrolment No. 0000/00112/90265
RT p—
RATE Fee wher
TOTARAM MANDIR GALI
VTC: Prakasha, PO: Prakash
District: Nandurbar,
Stato: Maharashia, PIN Code: 425422
Mobile: 8960387663
[IAAI a
KF889230565F| = a 2
pti Be a
HTYAT TUR FAT / Your Aadhaar No.
7208 5852 3813
ATF MUR, ABT Hea
z Z
Ee
I facia sens dd
SL Vinitbhai Mukeshbhai Chaudhari
Fat St it DOB: 210772006
on Mole
7208 5852 3813
oo 08atacsol ENE
rey arene. JE 3a`;

  const realAadhaarOcr: OcrResult = {
    provider: "tesseract.js",
    rawText: realAadhaarRawText,
    overallConfidence: 0.88,
    fields: [
      { fieldName: "DOCUMENT_NUMBER", fieldValue: "7208 5852 3813", confidence: 0.95, source: "ocr" },
      { fieldName: "FULL_NAME", fieldValue: "Vinitbhai Mukeshbhai Chaudhari", confidence: 0.92, source: "ocr" },
      { fieldName: "DATE_OF_BIRTH", fieldValue: "2006-07-21", confidence: 0.90, source: "ocr" },
      { fieldName: "NATIONALITY", fieldValue: "IND", confidence: 0.98, source: "ocr" },
      { fieldName: "SEX", fieldValue: "M", confidence: 0.92, source: "ocr" },
      { fieldName: "ISSUING_AUTHORITY", fieldValue: "UIDAI (Govt of India)", confidence: 0.98, source: "ocr" },
    ],
  };

  it("AADHAAR-01: Does not extract false positive TD1 MRZ from Indian Aadhaar raw text", async () => {
    const dummyCanvas = {} as HTMLCanvasElement;
    const mrz = await parseMrz(realAadhaarOcr, dummyCanvas);

    expect(mrz.present).toBe(false);
    expect((mrz.rawLines || []).length).toBe(0);
    expect((mrz.mismatches || []).length).toBe(0);
  });

  it("AADHAAR-02: Validates Aadhaar without requiring expiration date or ICAO MRZ", async () => {
    const dummyCanvas = {} as HTMLCanvasElement;
    const mrz = await parseMrz(realAadhaarOcr, dummyCanvas);

    const validation = await validateCase({
      ocr: realAadhaarOcr,
      mrz,
      docType: "aadhaar",
      countryCode: "IND",
    });

    expect(validation.summaryCritical).toBe(0);
    expect(validation.summaryHigh).toBe(0);
    expect(validation.summaryPass).toBeGreaterThanOrEqual(5);

    const notExpired = validation.issues.find((i) => i.ruleCode === "not_expired");
    expect(notExpired?.severity).toBe("PASS");

    const mrzIssue = validation.issues.find((i) => i.ruleCode === "mrz_presence");
    expect(mrzIssue?.severity).toBe("PASS");
  });

  it("AADHAAR-03: Yields high identity consistency score for valid Aadhaar fields", async () => {
    const dummyCanvas = {} as HTMLCanvasElement;
    const mrz = await parseMrz(realAadhaarOcr, dummyCanvas);
    const validation = await validateCase({
      ocr: realAadhaarOcr,
      mrz,
      docType: "aadhaar",
      countryCode: "IND",
    });

    const face: FaceResult = {
      detected: true,
      quality: 92,
      similarity: 90,
      livenessScore: 0.96,
    };

    const identity = await identityConsistency({
      ocr: realAadhaarOcr,
      mrz,
      face,
      validation,
    });

    // Should NOT deduct 25 points for missing MRZ
    expect(identity.score).toBeGreaterThanOrEqual(85);
  });

  it("AADHAAR-04: Computes genuine LOW risk score for authentic Aadhaar card", async () => {
    const dummyCanvas = {} as HTMLCanvasElement;
    const mrz = await parseMrz(realAadhaarOcr, dummyCanvas);

    const docDetect: DocDetectResult = {
      documentType: "aadhaar",
      confidence: 0.95,
    };

    const imageQuality: ImageQualityResult = {
      score: 82,
      blur: 15,
      brightness: 75,
      contrast: 80,
      resolutionScore: 85,
      glare: 10,
      grade: "GOOD",
    };

    const validation = await validateCase({
      ocr: realAadhaarOcr,
      mrz,
      docType: docDetect.documentType,
      countryCode: "IND",
    });

    const tampering: TamperingResult = {
      probability: 3,
      confidence: 0.95,
      severity: "NONE",
      regions: [],
    };

    const face: FaceResult = {
      detected: true,
      quality: 88,
      similarity: 89,
      livenessScore: 0.94,
    };

    const identity = await identityConsistency({
      ocr: realAadhaarOcr,
      mrz,
      face,
      validation,
    });

    const risk = await computeRisk({
      imageQuality,
      docDetect,
      ocr: realAadhaarOcr,
      mrz,
      validation,
      tampering,
      face,
      identity,
    });

    // Original Authentic Aadhaar MUST be low risk and approved
    expect(risk.level).toBe("LOW");
    expect(risk.score).toBeLessThanOrEqual(25);
    expect(risk.recommendedAction).toContain("Proceed with clearance workflow");
  });

  it("AADHAAR-05: detectCredential correctly identifies country IND and archetype ind_aadhaar", () => {
    const fullPipe: FullPipelineResult = {
      imageQuality: { score: 85, blur: 10, brightness: 75, contrast: 80, resolutionScore: 90, glare: 5, grade: "GOOD" },
      docDetect: { documentType: "aadhaar", confidence: 0.95 },
      ocr: realAadhaarOcr,
      mrz: { present: false, rawLines: [], mismatches: [] },
      validation: { issues: [], summaryPass: 6, summaryWarn: 0, summaryHigh: 0, summaryCritical: 0 },
      tampering: { probability: 2, confidence: 0.98, severity: "NONE", regions: [] },
      face: { detected: true, quality: 90 },
      identity: { score: 95, perField: [] },
      risk: {
        score: 14,
        level: "LOW",
        recommendedAction: "Proceed with clearance workflow.",
        engineVersion: "2.1.0",
        factors: [],
      },
      findings: [],
      modules: [],
      startedAt: Date.now() - 300,
      finishedAt: Date.now(),
      totalMs: 300,
    };

    const detected = detectCredential(fullPipe, null, { width: 1080, height: 1920 });

    expect(detected.isDetected).toBe(true);
    expect(detected.countryCode).toBe("IND");
    expect(detected.documentType).toBe("aadhaar");
    expect(detected.matchedArchetypeId).toBe("ind_aadhaar");
    expect(detected.realFields.documentNumber).toBe("7208 5852 3813");
    expect(detected.realFields.maskedDocumentNumber).toBe("XXXX XXXX 3813");
    expect(detected.realFields.fullName).toBe("Vinitbhai Mukeshbhai Chaudhari");
    expect(detected.confidence).toBeGreaterThanOrEqual(90);
  });

  it("AADHAAR-06: parseMrz returns NOT_APPLICABLE status for Aadhaar", async () => {
    const dummyCanvas = {} as HTMLCanvasElement;
    const mrz = await parseMrz(realAadhaarOcr, dummyCanvas);

    expect(mrz.present).toBe(false);
    expect(mrz.applicability).toBe("NOT_APPLICABLE");
    expect(mrz.status).toBe("NOT_APPLICABLE");
    expect(mrz.nonApplicableReason).toContain("Domestic Smart Card");
  });

  it("AADHAAR-07: Inconclusive OCR (0 fields) produces INSUFFICIENT_EVIDENCE without false CRITICAL fraud", async () => {
    const emptyOcr: OcrResult = {
      provider: "tesseract.js",
      rawText: "",
      overallConfidence: 0.46,
      fields: [],
    };
    const dummyCanvas = {} as HTMLCanvasElement;
    const mrz = await parseMrz(emptyOcr, dummyCanvas);

    const validation = await validateCase({
      ocr: emptyOcr,
      mrz,
      docType: "id",
      countryCode: undefined,
    });

    // Zero extracted fields must NOT produce CRITICAL severity
    expect(validation.summaryCritical).toBe(0);
    expect(validation.status).toBe("INSUFFICIENT_EVIDENCE");

    const tampering: TamperingResult = {
      probability: 0,
      confidence: 85,
      severity: "NONE",
      regions: [],
      verdict: "NO_ANOMALY_DETECTED",
    };
    const face: FaceResult = { detected: false };
    const docDetect: DocDetectResult = { documentType: "id", confidence: 0.88, isRotated: true, correctedAspectRatio: 1.782 };
    const imageQuality: ImageQualityResult = { score: 67, blur: 20, brightness: 70, contrast: 75, resolutionScore: 70, glare: 15, grade: "FAIR" };
    const identity = await identityConsistency({ ocr: emptyOcr, mrz, face, validation });

    const risk = await computeRisk({
      imageQuality,
      docDetect,
      ocr: emptyOcr,
      mrz,
      validation,
      tampering,
      face,
      identity,
    });

    // Inconclusive evidence must NOT result in automatic 85/100 fraud score
    expect(risk.score).toBeLessThan(75);
    expect(risk.factors.some((f) => f.code === "ocr_confidence")).toBe(true);
  });

  it("AADHAAR-08: Rotated portrait card (335 x 597) uses corrected aspect ratio in detectCredential", () => {
    const fullPipe: FullPipelineResult = {
      imageQuality: { score: 67, blur: 20, brightness: 70, contrast: 75, resolutionScore: 70, glare: 15, grade: "FAIR" },
      docDetect: {
        documentType: "aadhaar",
        confidence: 0.88,
        isRotated: true,
        detectedOrientation: "PORTRAIT_ROTATED_90_CCW",
        rotationDegreesNeeded: 270,
        rawAspectRatio: 0.561,
        correctedAspectRatio: 1.782,
      },
      ocr: realAadhaarOcr,
      mrz: { present: false, applicability: "NOT_APPLICABLE", status: "NOT_APPLICABLE", rawLines: [], mismatches: [] },
      validation: { issues: [], summaryPass: 5, summaryWarn: 0, summaryHigh: 0, summaryCritical: 0, status: "PASS" },
      tampering: { probability: 0, confidence: 85, severity: "NONE", regions: [] },
      face: { detected: true, quality: 85 },
      identity: { score: 90, perField: [] },
      risk: { score: 18, level: "LOW", recommendedAction: "Clearance approved.", engineVersion: "2.1.0", factors: [] },
      findings: [],
      modules: [],
      startedAt: Date.now(),
      finishedAt: Date.now(),
      totalMs: 100,
    };

    const detected = detectCredential(fullPipe, null, { width: 335, height: 597 });
    expect(detected.isDetected).toBe(true);
    expect(detected.documentType).toBe("aadhaar");
    // Nominal is 1.586, corrected aspect 1.782 has deviation ~12.4%, NOT 64.6%
    expect(detected.aspectRatioDeviationPercent).toBeLessThan(20.0);
  });
});
