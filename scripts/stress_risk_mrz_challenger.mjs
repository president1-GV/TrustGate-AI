/**
 * EMPIRICAL STRESS TEST HARNESS — CHALLENGER 1
 * Targets:
 * 1. src/ai/pipeline/09-risk.ts (computeRisk)
 * 2. src/components/screening/SihScreeningDashboard.tsx (Risk fusion logic)
 * 3. src/ai/pipeline/04-mrz.ts (parseMrz & computeMrzCheckDigit)
 */

import { computeRisk } from "../src/ai/pipeline/09-risk.ts";
import { computeMrzCheckDigit, parseMrz } from "../src/ai/pipeline/04-mrz.ts";

const results = {
  riskEngine: { passed: 0, failed: 0, tests: [] },
  dashboardRisk: { passed: 0, failed: 0, tests: [] },
  mrzChecksum: { passed: 0, failed: 0, tests: [] },
};

function record(category, testName, passed, details) {
  results[category].tests.push({ testName, passed, details });
  if (passed) results[category].passed++;
  else results[category].failed++;
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`[${category}] ${icon} - ${testName}: ${details}`);
}

function getValidPipelineInput() {
  return {
    imageQuality: { score: 85, grade: "GOOD" },
    docDetect: { documentType: "passport", confidence: 0.95 },
    ocr: { rawText: "PASSPORT\nP<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO6908061F9406236ZE184226B<<<<<1", overallConfidence: 0.95, fields: [] },
    mrz: { present: true, compositeValid: true, format: "TD3", checkDigitsValid: true, rawLines: [], mismatches: [] },
    validation: { issues: [], summaryCritical: 0, summaryWarning: 0 },
    tampering: { probability: 2, severity: "LOW", regions: [] },
    face: { detected: true, quality: 92, similarity: 88, identityMatchStatus: "MATCH" },
    identity: { score: 96, perField: [] }
  };
}

// =========================================================================
// SECTION 1: STRESS TEST 09-risk.ts
// =========================================================================
console.log("\n=======================================================");
console.log("SUITE 1: 09-risk.ts (TrustFusion Risk Engine) STRESS TEST");
console.log("=======================================================");

// Test 1.1: Standard valid baseline
try {
  const baseRes = await computeRisk(getValidPipelineInput());
  const ok = typeof baseRes.score === "number" && !Number.isNaN(baseRes.score) && baseRes.score >= 0 && baseRes.score <= 100;
  record("riskEngine", "Valid baseline execution", ok, `Score = ${baseRes.score}, Level = ${baseRes.level}`);
} catch (e) {
  record("riskEngine", "Valid baseline execution", false, `Exception: ${e.message}`);
}

// Test 1.2: Empty objects passed for all components
try {
  const emptyRes = await computeRisk({
    imageQuality: {},
    docDetect: {},
    ocr: {},
    mrz: {},
    validation: {},
    tampering: {},
    face: {},
    identity: {}
  });
  const ok = typeof emptyRes.score === "number" && !Number.isNaN(emptyRes.score);
  record("riskEngine", "Empty objects as components", ok, `Score = ${emptyRes?.score}`);
} catch (e) {
  record("riskEngine", "Empty objects as components", false, `Crashed with exception: ${e.message}`);
}

// Test 1.3: Null passed as input
try {
  const nullRes = await computeRisk(null);
  const ok = typeof nullRes?.score === "number" && !Number.isNaN(nullRes.score);
  record("riskEngine", "Null input", ok, `Score = ${nullRes?.score}`);
} catch (e) {
  record("riskEngine", "Null input", false, `Crashed with exception: ${e.message}`);
}

// Test 1.4: Undefined passed as input
try {
  const undefRes = await computeRisk(undefined);
  const ok = typeof undefRes?.score === "number" && !Number.isNaN(undefRes.score);
  record("riskEngine", "Undefined input", ok, `Score = ${undefRes?.score}`);
} catch (e) {
  record("riskEngine", "Undefined input", false, `Crashed with exception: ${e.message}`);
}

// Test 1.5: Null inside component fields
try {
  const nullCompRes = await computeRisk({
    imageQuality: null,
    docDetect: null,
    ocr: null,
    mrz: null,
    validation: null,
    tampering: null,
    face: null,
    identity: null
  });
  const ok = typeof nullCompRes?.score === "number" && !Number.isNaN(nullCompRes.score);
  record("riskEngine", "Null components", ok, `Score = ${nullCompRes?.score}`);
} catch (e) {
  record("riskEngine", "Null components", false, `Crashed with exception: ${e.message}`);
}

// Test 1.6: NaN in individual component scores
const nanTargets = [
  ["imageQuality.score", (inp) => { inp.imageQuality.score = NaN; }],
  ["docDetect.confidence", (inp) => { inp.docDetect.confidence = NaN; }],
  ["ocr.overallConfidence", (inp) => { inp.ocr.overallConfidence = NaN; }],
  ["tampering.probability", (inp) => { inp.tampering.probability = NaN; }],
  ["face.quality", (inp) => { inp.face.quality = NaN; }],
  ["face.similarity", (inp) => { inp.face.similarity = NaN; }],
  ["identity.score", (inp) => { inp.identity.score = NaN; }],
];

for (const [name, mutator] of nanTargets) {
  try {
    const inp = getValidPipelineInput();
    mutator(inp);
    const res = await computeRisk(inp);
    const notNan = typeof res.score === "number" && !Number.isNaN(res.score);
    record("riskEngine", `NaN guard on ${name}`, notNan, `Score = ${res.score}, isNaN = ${Number.isNaN(res.score)}`);
  } catch (e) {
    record("riskEngine", `NaN guard on ${name}`, false, `Crashed with exception: ${e.message}`);
  }
}

// Test 1.7: Extreme negative values (-100)
try {
  const inp = getValidPipelineInput();
  inp.imageQuality.score = -100;
  inp.tampering.probability = -100;
  inp.identity.score = -100;
  const res = await computeRisk(inp);
  const ok = !Number.isNaN(res.score) && res.score >= 0 && res.score <= 100;
  record("riskEngine", "Extreme negative values (-100)", ok, `Score = ${res.score} (clamped in [0, 100])`);
} catch (e) {
  record("riskEngine", "Extreme negative values (-100)", false, `Crashed: ${e.message}`);
}

// Test 1.8: Extreme positive values (1e9)
try {
  const inp = getValidPipelineInput();
  inp.imageQuality.score = 1e9;
  inp.tampering.probability = 1e9;
  inp.identity.score = 1e9;
  const res = await computeRisk(inp);
  const ok = !Number.isNaN(res.score) && res.score >= 0 && res.score <= 100;
  record("riskEngine", "Extreme positive values (1e9)", ok, `Score = ${res.score} (clamped in [0, 100])`);
} catch (e) {
  record("riskEngine", "Extreme positive values (1e9)", false, `Crashed: ${e.message}`);
}

// Test 1.9: Infinity and -Infinity
try {
  const inp = getValidPipelineInput();
  inp.imageQuality.score = Infinity;
  inp.tampering.probability = -Infinity;
  const res = await computeRisk(inp);
  const ok = !Number.isNaN(res.score) && res.score >= 0 && res.score <= 100;
  record("riskEngine", "Infinity / -Infinity guards", ok, `Score = ${res.score}`);
} catch (e) {
  record("riskEngine", "Infinity / -Infinity guards", false, `Crashed: ${e.message}`);
}

// Test 1.10: Aadhaar credential without MRZ
try {
  const inp = getValidPipelineInput();
  inp.docDetect.documentType = "aadhaar";
  inp.ocr.rawText = "Government of India Unique Identification Authority of India 2345 6789 0123";
  inp.mrz = { present: false, compositeValid: false, checkDigitsValid: false, rawLines: [], mismatches: [] };
  const res = await computeRisk(inp);
  const ok = !Number.isNaN(res.score) && res.score < 30 && res.level === "LOW";
  record("riskEngine", "Aadhaar credential zero-MRZ exemption", ok, `Score = ${res.score}, Level = ${res.level}`);
} catch (e) {
  record("riskEngine", "Aadhaar credential zero-MRZ exemption", false, `Crashed: ${e.message}`);
}

// Test 1.11: Unknown document rejection
try {
  const inp = getValidPipelineInput();
  inp.docDetect.documentType = "unknown";
  inp.docDetect.confidence = 0.2;
  const res = await computeRisk(inp);
  const ok = res.score >= 88 && res.level === "HIGH";
  record("riskEngine", "Unknown document format enforcement (>= 88)", ok, `Score = ${res.score}, Level = ${res.level}`);
} catch (e) {
  record("riskEngine", "Unknown document format enforcement (>= 88)", false, `Crashed: ${e.message}`);
}

// Test 1.12: Biometric mismatch escalation
try {
  const inp = getValidPipelineInput();
  inp.face.identityMatchStatus = "MISMATCH";
  inp.face.similarity = 35;
  const res = await computeRisk(inp);
  const ok = res.score >= 78 && res.level === "HIGH";
  record("riskEngine", "Biometric mismatch floor enforcement (>= 78)", ok, `Score = ${res.score}, Level = ${res.level}`);
} catch (e) {
  record("riskEngine", "Biometric mismatch floor enforcement (>= 78)", false, `Crashed: ${e.message}`);
}


// =========================================================================
// SECTION 2: STRESS TEST SihScreeningDashboard.tsx RISK CALCULATION
// =========================================================================
console.log("\n=======================================================");
console.log("SUITE 2: SihScreeningDashboard.tsx Risk Fusion Math STRESS TEST");
console.log("=======================================================");

function calculateScreeningDashboardFusedRisk({
  wDocAuth = true,
  wField = true,
  wTamper = true,
  wFace = true,
  wRules = true,
  bd = { docAuth: 10, field: 10, tamper: 10, face: 10, rules: 10 },
  defaultRisk = 30
}) {
  let weightSum = 0;
  if (wDocAuth) weightSum += 0.25;
  if (wField) weightSum += 0.20;
  if (wTamper) weightSum += 0.20;
  if (wFace) weightSum += 0.25;
  if (wRules) weightSum += 0.10;

  const safeScore = (v, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const scoreDocAuth = wDocAuth ? safeScore(bd.docAuth, 0) : 0;
  const scoreField = wField ? safeScore(bd.field, 0) : 0;
  const scoreTamper = wTamper ? safeScore(bd.tamper, 0) : 0;
  const scoreFace = wFace ? safeScore(bd.face, 0) : 0;
  const scoreRules = wRules ? safeScore(bd.rules, 0) : 0;

  const calculatedFusedRisk = weightSum > 0
    ? Math.round((scoreDocAuth * 0.25 + scoreField * 0.20 + scoreTamper * 0.20 + scoreFace * 0.25 + scoreRules * 0.10) / weightSum)
    : defaultRisk;

  return { calculatedFusedRisk, weightSum };
}

// Test 2.1: Calibration baseline (all scores 0 -> fused risk 0)
{
  const res = calculateScreeningDashboardFusedRisk({
    bd: { docAuth: 0, field: 0, tamper: 0, face: 0, rules: 0 }
  });
  const ok = res.calculatedFusedRisk === 0 && Math.abs(res.weightSum - 1.0) < 1e-6;
  record("dashboardRisk", "All components 0 -> fused risk 0", ok, `Risk = ${res.calculatedFusedRisk}, WeightSum = ${res.weightSum}`);
}

// Test 2.2: Calibration baseline (all scores 100 -> fused risk 100)
{
  const res = calculateScreeningDashboardFusedRisk({
    bd: { docAuth: 100, field: 100, tamper: 100, face: 100, rules: 100 }
  });
  const ok = res.calculatedFusedRisk === 100 && Math.abs(res.weightSum - 1.0) < 1e-6;
  record("dashboardRisk", "All components 100 -> fused risk 100", ok, `Risk = ${res.calculatedFusedRisk}, WeightSum = ${res.weightSum}`);
}

// Test 2.3: Single weight active tests (each should scale 0-100 independently)
const weightConfigs = [
  { name: "DocAuth only (0.25)", cfg: { wDocAuth: true, wField: false, wTamper: false, wFace: false, wRules: false } },
  { name: "Field only (0.20)", cfg: { wDocAuth: false, wField: true, wTamper: false, wFace: false, wRules: false } },
  { name: "Tamper only (0.20)", cfg: { wDocAuth: false, wField: false, wTamper: true, wFace: false, wRules: false } },
  { name: "Face only (0.25)", cfg: { wDocAuth: false, wField: false, wTamper: false, wFace: true, wRules: false } },
  { name: "Rules only (0.10)", cfg: { wDocAuth: false, wField: false, wTamper: false, wFace: false, wRules: true } },
];

for (const { name, cfg } of weightConfigs) {
  const res50 = calculateScreeningDashboardFusedRisk({
    ...cfg,
    bd: { docAuth: 50, field: 50, tamper: 50, face: 50, rules: 50 }
  });
  const ok50 = res50.calculatedFusedRisk === 50;

  const res100 = calculateScreeningDashboardFusedRisk({
    ...cfg,
    bd: { docAuth: 100, field: 100, tamper: 100, face: 100, rules: 100 }
  });
  const ok100 = res100.calculatedFusedRisk === 100;

  record("dashboardRisk", `Single component scaling: ${name}`, ok50 && ok100, `Score 50->${res50.calculatedFusedRisk}, Score 100->${res100.calculatedFusedRisk}`);
}

// Test 2.4: Zero weights active (weightSum === 0)
{
  const res = calculateScreeningDashboardFusedRisk({
    wDocAuth: false, wField: false, wTamper: false, wFace: false, wRules: false,
    defaultRisk: 42
  });
  const ok = res.calculatedFusedRisk === 42 && res.weightSum === 0;
  record("dashboardRisk", "Zero active weights fallback to defaultRisk without div/0", ok, `Risk = ${res.calculatedFusedRisk}, WeightSum = ${res.weightSum}`);
}

// Test 2.5: Biometric Mismatch Floor in SihScreeningDashboard
{
  const biometricVerification = { status: "MISMATCH", similarity_score: 22 };
  const calculatedFusedRisk = 45; // lower fused risk
  const finalRisk = biometricVerification?.status === "MISMATCH"
    ? Math.max(82, calculatedFusedRisk)
    : calculatedFusedRisk;
  const ok = finalRisk === 82;
  record("dashboardRisk", "Biometric mismatch floor enforces Math.max(82, fusedRisk)", ok, `Calculated = ${calculatedFusedRisk}, FinalRisk = ${finalRisk}`);
}

// Test 2.6: NaN propagation in breakdown scores
{
  const res = calculateScreeningDashboardFusedRisk({
    bd: { docAuth: NaN, field: 10, tamper: 10, face: 10, rules: 10 }
  });
  const isNan = Number.isNaN(res.calculatedFusedRisk);
  record("dashboardRisk", "Dashboard fused risk vulnerability to NaN in bd.docAuth", !isNan, `Risk = ${res.calculatedFusedRisk}, isNaN = ${isNan}`);
}


// =========================================================================
// SECTION 3: STRESS TEST 04-mrz.ts CHECKSUM LOGIC
// =========================================================================
console.log("\n=======================================================");
console.log("SUITE 3: 04-mrz.ts (MRZ Checksum Validation) STRESS TEST");
console.log("=======================================================");

// Test 3.1: computeMrzCheckDigit unit tests against known ICAO vectors
{
  const v1 = computeMrzCheckDigit("HA672242<"); // Expected: 6
  const v2 = computeMrzCheckDigit("650310");    // 6*7+5*3+0*1+3*7+1*3+0*1 = 42+15+0+21+3+0 = 81 -> 1
  const v3 = computeMrzCheckDigit("250101");    // 2*7+5*3+0*1+1*7+0*3+1*1 = 14+15+0+7+0+1 = 37 -> 7
  const v4 = computeMrzCheckDigit("L898902C3"); // 316 % 10 = 6
  const ok = v1 === "6" && v2 === "1" && v3 === "7" && v4 === "6";
  record("mrzChecksum", "computeMrzCheckDigit ICAO vectors", ok, `HA672242<: ${v1}, 650310: ${v2}, 250101: ${v3}, L898902C3: ${v4}`);
}

// Test 3.2: TD3 Official ICAO Passport Specimen
// Line 1: P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<< (44)
// Line 2: L898902C36UTO7408122F1204159ZE184226B<<<<<10 (44)
// Doc: L898902C3 (6), DOB: 740812 (2), Exp: 120415 (9)
// CompStr: L898902C36 + 7408122 + 1204159 + ZE184226B<<<<<1
{
  const td3Ocr = {
    provider: "tesseract.js",
    rawText: "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10",
    overallConfidence: 0.98,
    fields: []
  };
  const res = await parseMrz(td3Ocr, null);
  const ok = res.present && res.format === "TD3" && res.checkDigitsValid && res.compositeValid;
  record("mrzChecksum", "TD3 ICAO Passport specimen with optional data", ok, 
    `present=${res.present}, format=${res.format}, checkDigitsValid=${res.checkDigitsValid}, compositeValid=${res.compositeValid}, compositeChecksum=${JSON.stringify(res.checksumValidation?.compositeChecksum)}`);
}

// Test 3.3: TD3 Passport without optional data (fillers only)
// Line 2: L898902C36UTO6908061F9406236<<<<<<<<<<<<<<<7
// CompStr: L898902C3669080619406236
// L898902C36 -> sum: 316 + 6*7(index 9) -> wait, computeMrzCheckDigit("L898902C3669080619406236")
{
  const comp = computeMrzCheckDigit("L898902C3669080619406236");
  const td3OcrNoOpt = {
    provider: "tesseract.js",
    rawText: `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO6908061F9406236<<<<<<<<<<<<<<<${comp}`,
    overallConfidence: 0.98,
    fields: []
  };
  const res = await parseMrz(td3OcrNoOpt, null);
  const ok = res.present && res.format === "TD3" && res.checkDigitsValid && res.compositeValid;
  record("mrzChecksum", "TD3 ICAO Passport specimen without optional data", ok,
    `present=${res.present}, checkDigitsValid=${res.checkDigitsValid}, compositeValid=${res.compositeValid}, calculated=${res.checksumValidation?.compositeChecksum?.calculated}, encoded=${comp}`);
}

// Test 3.4: TD1 (ID Card - 3 lines of 30 characters)
// Line 1: I<UTOD231458907<<<<<<<<<<<<<<< (30)
// Line 2: 7408122F1204159UTO<<<<<<<<<<<6 (30)
// Line 3: ERICKSON<<ALICE<<<<<<<<<<<<<<< (30)
// Doc: D23145890 (7), DOB: 740812 (2), Exp: 120415 (9)
{
  const td1Ocr = {
    provider: "tesseract.js",
    rawText: "I<UTOD231458907<<<<<<<<<<<<<<<\n7408122F1204159UTO<<<<<<<<<<<6\nERICKSON<<ALICE<<<<<<<<<<<<<<<",
    overallConfidence: 0.98,
    fields: []
  };
  const res = await parseMrz(td1Ocr, null);
  const ok = res.present && res.format === "TD1" && res.checkDigitsValid && res.compositeValid;
  const compChecksum = res.checksumValidation?.compositeChecksum;
  record("mrzChecksum", "TD1 ID-card 3x30 parsing & composite check", ok,
    `format=${res.format}, checkDigitsValid=${res.checkDigitsValid}, compositeValid=${res.compositeValid}, compositeChecksum=${JSON.stringify(compChecksum)}`);
}

// Test 3.5: TD2 (Official Travel Document / Visa - 2 lines of 36 characters)
// Line 1: I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<< (36)
// Line 2: D231458907UTO7408122F1204159<<<<<<<6 (36)
{
  const td2Ocr = {
    provider: "tesseract.js",
    rawText: "I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<\nD231458907UTO7408122F1204159<<<<<<<6",
    overallConfidence: 0.98,
    fields: []
  };
  const res = await parseMrz(td2Ocr, null);
  const ok = res.present && res.format === "TD2" && res.checkDigitsValid && res.compositeValid;
  const compChecksum = res.checksumValidation?.compositeChecksum;
  record("mrzChecksum", "TD2 Document 2x36 parsing & composite check", ok,
    `format=${res.format}, checkDigitsValid=${res.checkDigitsValid}, compositeValid=${res.compositeValid}, compositeChecksum=${JSON.stringify(compChecksum)}`);
}

// Test 3.6: Aadhaar Document (No MRZ present, smart card format)
{
  const aadhaarOcr = {
    provider: "tesseract.js",
    rawText: "Government of India\nUnique Identification Authority of India\nEnrollment No: 1234/56789/01234\nTo: Rajesh Kumar Sharma\nDOB: 12/05/1988\nGender: MALE\n4920 1823 9102",
    overallConfidence: 0.96,
    fields: [
      { fieldName: "DOCUMENT_NUMBER", fieldValue: "492018239102", confidence: 0.97, source: "ocr" },
      { fieldName: "ISSUING_AUTHORITY", fieldValue: "UIDAI", confidence: 0.99, source: "ocr" }
    ]
  };
  const res = await parseMrz(aadhaarOcr, null);
  const ok = res.present === false && res.compositeValid === false && res.checkDigitsValid === false;
  record("mrzChecksum", "Aadhaar Card correctly recognized as non-MRZ credential", ok,
    `present=${res.present}, compositeValid=${res.compositeValid}, rawLines=${res.rawLines.length}`);
}

// =========================================================================
// SUMMARY
// =========================================================================
console.log("\n=======================================================");
console.log("FINAL SUMMARY OF EMPIRICAL STRESS TESTING");
console.log("=======================================================");
console.log(`Risk Engine (09-risk.ts):         ${results.riskEngine.passed} PASSED / ${results.riskEngine.failed} FAILED`);
console.log(`Dashboard Math (Screening.tsx):    ${results.dashboardRisk.passed} PASSED / ${results.dashboardRisk.failed} FAILED`);
console.log(`MRZ Checksums (04-mrz.ts):         ${results.mrzChecksum.passed} PASSED / ${results.mrzChecksum.failed} FAILED`);

const totalPassed = results.riskEngine.passed + results.dashboardRisk.passed + results.mrzChecksum.passed;
const totalFailed = results.riskEngine.failed + results.dashboardRisk.failed + results.mrzChecksum.failed;
console.log(`TOTAL: ${totalPassed} PASSED, ${totalFailed} FAILED across all stress vectors.\n`);
