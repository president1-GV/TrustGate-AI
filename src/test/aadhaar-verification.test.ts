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
    expect(mrz.rawLines.length).toBe(0);
    expect(mrz.mismatches.length).toBe(0);
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
      confidence: 0.95,
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
      confidence: 0.92,
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
      risk: { score: 14, level: "LOW", recommendedAction: "Proceed with clearance workflow." },
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
    expect(detected.realFields.fullName).toBe("Vinitbhai Mukeshbhai Chaudhari");
    expect(detected.confidence).toBeGreaterThanOrEqual(90);
  });
});
