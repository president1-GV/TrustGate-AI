import { describe, it, expect } from "vitest";
import { detectCredential } from "@/lib/documentDetector";
import type { FullPipelineResult } from "@/ai/types";

function createMockPipelineResult(overrides: Partial<FullPipelineResult> = {}): FullPipelineResult {
  return {
    imageQuality: {
      score: 95,
      grade: "EXCELLENT",
      blurScore: 12,
      glareScore: 8,
      contrastScore: 88,
      brightnessScore: 78,
      metrics: {
        laplacianVariance: 450,
        brightnessMean: 130,
        contrastStdDev: 55,
        overexposedRatio: 0.02,
        underexposedRatio: 0.01,
      },
    },
    docDetect: {
      documentType: "passport",
      confidence: 0.95,
      boundingBox: { x: 10, y: 10, w: 1420, h: 1000 },
    },
    ocr: {
      provider: "tesseract.js",
      rawText: "PASSPORT REPUBLIC OF INDIA",
      overallConfidence: 0.94,
      fields: [
        { fieldName: "DOCUMENT_NUMBER", fieldValue: "Z1234567", confidence: 0.95, boundingBox: { x: 0, y: 0, w: 0, h: 0 }, source: "ocr" },
        { fieldName: "FULL_NAME", fieldValue: "RAHUL SHARMA", confidence: 0.92, boundingBox: { x: 0, y: 0, w: 0, h: 0 }, source: "ocr" },
      ],
      executionMs: 150,
    },
    mrz: {
      present: true,
      format: "TD3",
      nationality: "IND",
      documentNumber: "Z1234567",
      dateOfBirth: "1992-05-15",
      expiryDate: "2032-05-14",
      sex: "M",
      names: { primary: "SHARMA", secondary: "RAHUL" },
      checkDigitsValid: true,
      compositeValid: true,
      rawLines: [
        "P<INDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<",
        "Z1234567<8IND9205156M3205148<<<<<<<<<<<<<<<2",
      ],
      mismatches: [],
    },
    validation: {
      issues: [],
      summaryPass: 12,
      summaryWarn: 0,
      summaryHigh: 0,
      summaryCritical: 0,
    },
    tampering: {
      probability: 2,
      severity: "NONE",
      regions: [],
    },
    face: {
      detected: true,
      quality: 92,
      boundingBox: { x: 50, y: 50, w: 200, h: 250 },
      confidence: 0.96,
      cornealReflectionDelta: 4.5,
      landmarkAsymmetry: 2.1,
      spectralEnergyRatio: 1.02,
      boundaryGradientDelta: 3.2,
      livenessScore: 0.94,
    },
    identity: {
      score: 98,
      perField: [],
      criticalFailures: [],
    },
    risk: {
      score: 5,
      level: "LOW",
      recommendedAction: "APPROVE_CLEARANCE",
    },
    findings: [],
    modules: [],
    startedAt: Date.now() - 500,
    finishedAt: Date.now(),
    totalMs: 500,
    provenance: {
      documentId: "DOC-REAL-IND-001",
      documentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      processingRunId: "run_real_ind_1",
      timestamp: new Date().toISOString(),
      source: "FILE_UPLOAD",
      mimeType: "image/jpeg",
      fileSizeBytes: 102400,
      integrityStatus: "GENUINE_UNMODIFIED",
    },
    ...overrides,
  } as unknown as FullPipelineResult;
}

describe("Autonomous Document & Passport Credential Detector", () => {
  it("AUTODETECT-01: Autonomously detects Republic of India Passport from real MRZ stream and binds to ind_passport archetype", () => {
    const pipeResult = createMockPipelineResult();
    const detected = detectCredential(pipeResult, null, { width: 1420, height: 1000 }, "upload");

    expect(detected.isDetected).toBe(true);
    expect(detected.countryCode).toBe("IND");
    expect(detected.countryName).toBe("Republic of India");
    expect(detected.documentType).toBe("passport");
    expect(detected.documentTitle).toContain("Republic of India Passport");
    expect(detected.matchedArchetypeId).toBe("ind_passport");
    expect(detected.standard).toBe("ICAO 9303 TD3");
    expect(detected.realFields.documentNumber).toBe("Z1234567");
    expect(detected.realFields.fullName).toBe("RAHUL SHARMA");
    expect(detected.realFields.mrzCheckDigitsValid).toBe(true);
    expect(detected.detectedAspectRatio).toBe(1.42);
    expect(detected.aspectRatioDeviationPercent).toBe(0);
    expect(detected.confidence).toBeGreaterThanOrEqual(90);
  });

  it("AUTODETECT-02: Autonomously detects USA Passport from real MRZ stream and binds to usa_passport archetype", () => {
    const pipeResult = createMockPipelineResult({
      mrz: {
        present: true,
        format: "TD3",
        nationality: "USA",
        documentNumber: "123456789",
        names: { primary: "SMITH", secondary: "JOHN" },
        checkDigitsValid: true,
        compositeValid: true,
        rawLines: [
          "P<USASMITH<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
          "1234567897USA9001015M3001012<<<<<<<<<<<<<<<8",
        ],
        mismatches: [],
      },
      ocr: {
        provider: "tesseract.js",
        rawText: "PASSPORT UNITED STATES OF AMERICA",
        overallConfidence: 0.95,
        fields: [{ fieldName: "DOCUMENT_NUMBER", fieldValue: "123456789", confidence: 0.95, boundingBox: { x: 0, y: 0, w: 0, h: 0 }, source: "ocr" }],
        executionMs: 120,
      },
    });

    const detected = detectCredential(pipeResult, null, { width: 1420, height: 1000 }, "camera");

    expect(detected.isDetected).toBe(true);
    expect(detected.countryCode).toBe("USA");
    expect(detected.countryName).toBe("United States of America");
    expect(detected.documentType).toBe("passport");
    expect(detected.matchedArchetypeId).toBe("usa_passport");
    expect(detected.standard).toBe("ICAO 9303 TD3");
    expect(detected.source).toBe("camera");
    expect(detected.realFields.documentNumber).toBe("123456789");
  });

  it("AUTODETECT-03: Autonomously detects German National Identity Card (Personalausweis) from TD1 MRZ", () => {
    const pipeResult = createMockPipelineResult({
      docDetect: {
        documentType: "id",
        confidence: 0.92,
        boundingBox: { x: 10, y: 10, w: 1586, h: 1000 },
      },
      mrz: {
        present: true,
        format: "TD1",
        nationality: "DEU",
        documentNumber: "C01X00T47",
        names: { primary: "MUELLER", secondary: "HANS" },
        checkDigitsValid: true,
        compositeValid: true,
        rawLines: [
          "IDD<<C01X00T478<<<<<<<<<<<<<<<",
          "8408129M3008010DEU<<<<<<<<<<<6",
          "MUELLER<<HANS<<<<<<<<<<<<<<<<<",
        ],
        mismatches: [],
      },
      ocr: {
        provider: "tesseract.js",
        rawText: "BUNDESREPUBLIK DEUTSCHLAND PERSONALAUSWEIS",
        overallConfidence: 0.92,
        fields: [],
        executionMs: 120,
      },
    });

    const detected = detectCredential(pipeResult, null, { width: 1586, height: 1000 });

    expect(detected.isDetected).toBe(true);
    expect(detected.countryCode).toBe("DEU");
    expect(detected.countryName).toBe("Federal Republic of Germany");
    expect(detected.documentType).toBe("idcard");
    expect(detected.matchedArchetypeId).toBe("deu_idcard");
    expect(detected.standard).toBe("ICAO 9303 TD1");
  });

  it("AUTODETECT-04: Autonomously detects Indian PAN Card from OCR headers and binds to ind_pan archetype", () => {
    const pipeResult = createMockPipelineResult({
      docDetect: {
        documentType: "id",
        confidence: 0.91,
        boundingBox: { x: 10, y: 10, w: 1586, h: 1000 },
      },
      mrz: {
        present: false,
        rawLines: [],
        checkDigitsValid: false,
        compositeValid: false,
        mismatches: [],
      },
      ocr: {
        provider: "tesseract.js",
        rawText: "INCOME TAX DEPARTMENT GOVT OF INDIA PERMANENT ACCOUNT NUMBER ABCDE1234F VIKRAM MEHTA",
        overallConfidence: 0.91,
        fields: [
          { fieldName: "DOCUMENT_NUMBER", fieldValue: "ABCDE1234F", confidence: 0.95, boundingBox: { x: 0, y: 0, w: 0, h: 0 }, source: "ocr" },
          { fieldName: "FULL_NAME", fieldValue: "VIKRAM MEHTA", confidence: 0.92, boundingBox: { x: 0, y: 0, w: 0, h: 0 }, source: "ocr" },
        ],
        executionMs: 140,
      },
    });

    const detected = detectCredential(pipeResult, null, { width: 1586, height: 1000 });

    expect(detected.isDetected).toBe(true);
    expect(detected.countryCode).toBe("IND");
    expect(detected.documentType).toBe("pan");
    expect(detected.matchedArchetypeId).toBe("ind_pan");
    expect(detected.standard).toBe("ISO 7810 ID-1");
    expect(detected.realFields.documentNumber).toBe("ABCDE1234F");
  });

  it("AUTODETECT-05: Autonomously detects Indian Aadhaar Card from UIDAI header and binds to ind_aadhaar archetype", () => {
    const pipeResult = createMockPipelineResult({
      docDetect: {
        documentType: "id",
        confidence: 0.93,
        boundingBox: { x: 10, y: 10, w: 1586, h: 1000 },
      },
      mrz: {
        present: false,
        rawLines: [],
        checkDigitsValid: false,
        compositeValid: false,
        mismatches: [],
      },
      ocr: {
        provider: "tesseract.js",
        rawText: "UNIQUE IDENTIFICATION AUTHORITY OF INDIA AADHAAR 9876 5432 1098 PRIYA NAIR",
        overallConfidence: 0.93,
        fields: [
          { fieldName: "DOCUMENT_NUMBER", fieldValue: "9876 5432 1098", confidence: 0.96, boundingBox: { x: 0, y: 0, w: 0, h: 0 }, source: "ocr" },
          { fieldName: "FULL_NAME", fieldValue: "PRIYA NAIR", confidence: 0.94, boundingBox: { x: 0, y: 0, w: 0, h: 0 }, source: "ocr" },
        ],
        executionMs: 140,
      },
    });

    const detected = detectCredential(pipeResult, null, { width: 1586, height: 1000 });

    expect(detected.isDetected).toBe(true);
    expect(detected.countryCode).toBe("IND");
    expect(detected.documentType).toBe("aadhaar");
    expect(detected.matchedArchetypeId).toBe("ind_aadhaar");
    expect(detected.standard).toBe("National Smart Card Standard");
  });

  it("AUTODETECT-06: Strictly returns isDetected=false and matchedArchetypeId=null when no input exists (NEVER defaults to Azerbaijan)", () => {
    const detected = detectCredential(null, null);

    expect(detected.isDetected).toBe(false);
    expect(detected.countryCode).toBeNull();
    expect(detected.countryName).toBe("Awaiting Capture");
    expect(detected.matchedArchetypeId).toBeNull();
    expect(detected.documentTitle).toBe("Awaiting Credential Capture");
  });

  it("AUTODETECT-07: Unmatched non-credential image (e.g. desktop screenshot) yields matchedArchetypeId=null with zero fake data", () => {
    const pipeResult = createMockPipelineResult({
      docDetect: {
        documentType: "unknown",
        confidence: 0.2,
        boundingBox: { x: 0, y: 0, w: 1920, h: 1080 },
      },
      mrz: {
        present: false,
        rawLines: [],
        checkDigitsValid: false,
        compositeValid: false,
        mismatches: [],
      },
      ocr: {
        provider: "tesseract.js",
        rawText: "Google Search Chrome Browser Window Arbitrary Text",
        overallConfidence: 0.4,
        fields: [],
        executionMs: 80,
      },
    });

    const detected = detectCredential(pipeResult, null, { width: 1920, height: 1080 });

    expect(detected.countryCode).toBeNull();
    expect(detected.matchedArchetypeId).toBeNull();
    expect(detected.documentType).toBe("unknown");
    expect(detected.documentTitle).toBe("Unrecognized Credential Format");
  });
});
