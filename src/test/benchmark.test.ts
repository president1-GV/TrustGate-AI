import { describe, it, expect, vi } from "vitest";
import {
  ENGINE_PROFILES,
  saveModelEvaluationToDb,
} from "@/lib/benchmarkEngine";
import { insforge } from "@/lib/insforge";

describe("Benchmark Engine Profiles & Specimen Telemetry", () => {
  const EXPECTED_PIPELINES = [
    "document",
    "face",
    "identity",
    "tampering",
    "ocr",
    "midv_llm",
    "liveness",
    "risk",
  ];

  it("should contain all 8 micro-engine benchmark profiles", () => {
    EXPECTED_PIPELINES.forEach((pipelineKey) => {
      expect(ENGINE_PROFILES[pipelineKey]).toBeDefined();
      const profile = ENGINE_PROFILES[pipelineKey];
      expect(profile.key).toBe(pipelineKey);
      expect(profile.displayName).toBeTruthy();
      expect(profile.version).toMatch(/^v\d+/);
      expect(profile.architecture).toBeTruthy();
      expect(profile.framework).toBeTruthy();
      expect(profile.acceleration).toBeTruthy();
      expect(profile.standard).toBeTruthy();
      expect(profile.testCorpus).toBeTruthy();
    });
  });

  it("should have mathematically valid baseline metrics and confusion matrix sums", () => {
    Object.values(ENGINE_PROFILES).forEach((profile) => {
      expect(profile.baselinePrecision).toBeGreaterThan(0.9);
      expect(profile.baselinePrecision).toBeLessThanOrEqual(1.0);

      expect(profile.baselineRecall).toBeGreaterThan(0.9);
      expect(profile.baselineRecall).toBeLessThanOrEqual(1.0);

      expect(profile.baselineF1).toBeGreaterThan(0.9);
      expect(profile.baselineF1).toBeLessThanOrEqual(1.0);

      expect(profile.baselineRocAuc).toBeGreaterThan(0.9);
      expect(profile.baselineRocAuc).toBeLessThanOrEqual(1.0);

      expect(profile.baselineLatencyMs).toBeGreaterThan(0);
      expect(profile.throughputFps).toBeGreaterThan(0);

      const { tp, fp, tn, fn } = profile.confusionMatrix;
      expect(tp + fp + tn + fn).toEqual(profile.sampleCount);
    });
  });

  it("should have comprehensive diagnostic steps with log streams for every engine", () => {
    Object.values(ENGINE_PROFILES).forEach((profile) => {
      expect(profile.steps.length).toBe(4);
      profile.steps.forEach((step, idx) => {
        expect(step.id).toBe(idx + 1);
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.durationMs).toBeGreaterThan(0);
        expect(step.logs.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  it("should provide rich specimen inspection data for diagnostic visualization", () => {
    // Document rectifier has homography geometry
    const docProfile = ENGINE_PROFILES.document;
    expect(docProfile.specimen.geometry).toBeDefined();
    expect(docProfile.specimen.geometry?.skewAngleDeg).toBe(14.8);
    expect(docProfile.specimen.layers?.length).toBe(4);

    // Identity verifier has ICAO 9303 check digit breakdown
    const idProfile = ENGINE_PROFILES.identity;
    expect(idProfile.specimen.checkDigits).toBeDefined();
    expect(idProfile.specimen.checkDigits?.length).toBeGreaterThan(0);
    idProfile.specimen.checkDigits?.forEach((cd) => {
      expect(cd.multiplier).toBeTruthy();
      expect(cd.valid).toBe(true);
    });

    // Tampering detector has ELA and noise variance layers
    const tamperProfile = ENGINE_PROFILES.tampering;
    expect(tamperProfile.specimen.layers).toBeDefined();
    expect(tamperProfile.specimen.layers?.some((l) => l.name.includes("ELA"))).toBe(true);

    // Face forensics has facial landmark coordinates and FFT / Blending layers
    const faceProfile = ENGINE_PROFILES.face;
    expect(faceProfile.specimen.layers).toBeDefined();
    expect(faceProfile.specimen.layers?.some((l) => l.name.includes("Blending") || l.name.includes("FFT"))).toBe(true);
    expect(faceProfile.steps.some((s) => s.logs.some((log) => log.includes("Inter-pupillary")))).toBe(true);
  });

  it("should invoke insforge database update on saveModelEvaluationToDb", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const fromSpy = vi.spyOn(insforge.database, "from").mockReturnValue({
      update: updateSpy,
    } as any);

    const success = await saveModelEvaluationToDb("ocr", {
      precision: 0.994,
      recall: 0.991,
      f1: 0.9925,
      roc_auc: 0.997,
      latency_ms: 105,
    });

    expect(success).toBe(true);
    expect(fromSpy).toHaveBeenCalledWith("model_versions");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        precision: 0.994,
        recall: 0.991,
        f1: 0.9925,
        roc_auc: 0.997,
        latency_ms: 105,
        last_evaluated_at: expect.any(String),
      })
    );

    fromSpy.mockRestore();
  });
});
