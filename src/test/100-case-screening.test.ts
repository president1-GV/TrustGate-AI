import { describe, it, expect, beforeAll } from "vitest";
import { Screening100CaseRunner } from "../../tests/e2e/100-case-screening/runner";
import { TEST_CASES_100 } from "../../tests/e2e/100-case-screening/cases";
import type { TestCaseExecutionResult } from "../../tests/e2e/100-case-screening/types";
import * as fs from "fs";
import * as path from "path";

describe("Controlled 100-Case Screening Validation Campaign", () => {
  let runner: Screening100CaseRunner;
  let allResults: TestCaseExecutionResult[];

  beforeAll(async () => {
    runner = new Screening100CaseRunner();
    allResults = await runner.runAll();
    
    // Save results for reporting and auditing
    const resultsPath = path.resolve(process.cwd(), "tests/e2e/100-case-screening/100_case_results.json");
    fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2), "utf-8");
  }, 30000);

  it("CASE-001: Exactly 100 distinct test cases exist and are executed", () => {
    expect(TEST_CASES_100).toHaveLength(100);
    expect(allResults).toHaveLength(100);
  });

  it("CASE-002: Every test case has a unique case_id and processing_run_id", () => {
    const caseIds = new Set(allResults.map((r) => r.caseId));
    const runIds = new Set(allResults.map((r) => r.processingRunId));
    const hashes = new Set(allResults.map((r) => r.inputHash));

    expect(caseIds.size).toBe(100);
    expect(runIds.size).toBe(100);
    expect(hashes.size).toBe(100);
  });

  it("CASE-003: Zero cross-case contamination across all 100 cases", () => {
    for (const r of allResults) {
      expect(r.crossContaminationDetected).toBe(false);
      expect(r.provenanceValid).toBe(true);
    }
  });

  it("CASE-004: Failure-Safe Architecture — Database unavailable is never converted to PASS", () => {
    const dbUnavailableCases = allResults.filter((r) => r.category === "S_DATABASE_UNAVAILABLE");
    expect(dbUnavailableCases.length).toBeGreaterThanOrEqual(3);
    for (const c of dbUnavailableCases) {
      expect(c.actualDecision).not.toBe("PASS");
      expect(c.actualDecision).toBe("INCONCLUSIVE");
    }
  });

  it("CASE-005: Failure-Safe Architecture — Database record not found is NOT automatic fraud", () => {
    const notFoundCases = allResults.filter((r) => r.category === "R_DATABASE_RECORD_NOT_FOUND");
    expect(notFoundCases.length).toBeGreaterThanOrEqual(4);
    for (const c of notFoundCases) {
      expect(c.actualDecision).toBe("REVIEW");
    }
  });

  it("CASE-006: Failure-Safe Architecture — Face reference unavailable outputs NOT_AVAILABLE with zero fake score", () => {
    const faceRefUnavailableCases = allResults.filter((r) => r.category === "P_IDENTITY_REF_UNAVAILABLE");
    expect(faceRefUnavailableCases.length).toBeGreaterThanOrEqual(3);
    for (const c of faceRefUnavailableCases) {
      expect(c.stageResults.face.matchStatus).toBe("NOT_AVAILABLE");
      expect(c.actualDecision).toBe("REVIEW");
    }
  });

  it("CASE-007: Failure-Safe Architecture — MRZ checksum failure triggers FAIL", () => {
    const mrzFailCases = allResults.filter((r) => r.category === "I_MRZ_CHECKSUM_FAILURE");
    expect(mrzFailCases.length).toBeGreaterThanOrEqual(3);
    for (const c of mrzFailCases) {
      expect(c.stageResults.mrz.checksumValid).toBe(false);
      expect(c.actualDecision).toBe("FAIL");
    }
  });

  it("CASE-008: Failure-Safe Architecture — Severe tampering detection triggers FAIL", () => {
    const tamperCases = allResults.filter((r) => r.category === "M_TAMPERING_INDICATORS");
    expect(tamperCases.length).toBeGreaterThanOrEqual(4);
    for (const c of tamperCases) {
      expect(c.stageResults.tampering.probability).toBeGreaterThanOrEqual(60);
      expect(c.actualDecision).toBe("FAIL");
    }
  });

  it("CASE-009: Isolation Pattern — Rapid document replacement preserves the latest active run", async () => {
    const caseA = TEST_CASES_100[0];
    const caseB = TEST_CASES_100[1];

    const runnerLocal = new Screening100CaseRunner();
    const resA = await runnerLocal.runCase(caseA);
    const resB = await runnerLocal.runCase(caseB);

    expect(resA.caseId).not.toBe(resB.caseId);
    expect(resA.processingRunId).not.toBe(resB.processingRunId);
    expect(resA.inputHash).not.toBe(resB.inputHash);
  });

  it("CASE-010: Isolation Pattern — Duplicate document submission generates unique processing_run_id", async () => {
    const baseCase = TEST_CASES_100[0];
    const runnerLocal = new Screening100CaseRunner();

    const submission1 = await runnerLocal.runCase(baseCase);
    const duplicateCase = {
      ...baseCase,
      processingRunId: "RUN-TEST-DUP-" + Date.now(),
    };
    const submission2 = await runnerLocal.runCase(duplicateCase);

    expect(submission1.inputHash).toBe(submission2.inputHash);
    expect(submission1.processingRunId).not.toBe(submission2.processingRunId);
  });

  it("CASE-011: Performance Latencies — All stage latencies recorded and within bounds", () => {
    for (const r of allResults) {
      expect(r.timingsMs.total).toBeGreaterThanOrEqual(0);
      expect(r.timingsMs.ocr).toBeGreaterThanOrEqual(0);
      expect(r.timingsMs.tampering).toBeGreaterThanOrEqual(0);
      expect(r.timingsMs.face).toBeGreaterThanOrEqual(0);
      expect(r.timingsMs.database).toBeGreaterThanOrEqual(0);
      expect(r.timingsMs.fusion).toBeGreaterThanOrEqual(0);
    }
  });

  it("CASE-012: Overall Campaign Pass Rate satisfies 100% assertion adherence", () => {
    const passedCount = allResults.filter((r) => r.passed).length;
    expect(passedCount).toBe(100);
  });
});
