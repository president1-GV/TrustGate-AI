# TRUSTGATE AI BILLION — 100-CASE BUG REGISTER
**SIH Problem Statement 26188: AI-Based Fake Identity & Document Screening System**
**Audit Date**: 2026-09-05 23:45:41 UTC
**Total Bugs Cataloged**: 8
**Total Bugs Resolved**: 8 (100% Fixed & Verified)

---

## Summary Table of Discovered & Resolved Defects

| Bug ID | Component | Severity | Description | Status | Verification Test |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **BUG-001** | `09-risk.ts` | **CRITICAL** | Mathematical flaw in `computeRisk()` (inverted negative weights and baseline 50 prevented clean docs from achieving `PASS`) | **RESOLVED** | `100-case-screening.test.ts` (CASE-012) |
| **BUG-002** | `09-risk.ts` | **HIGH** | `TypeError: Cannot read properties of undefined (reading 'length')` when `identity.perField` was undefined | **RESOLVED** | `100-case-screening.test.ts` (CASE-001) |
| **BUG-003** | `runner.ts` | **HIGH** | Decision mapping prioritized generic risk score threshold over specific non-fraud review categories (`B_OCR_FAILURE`, `G_PARTIAL_DOCUMENT`) | **RESOLVED** | `100-case-screening.test.ts` (CASE-012) |
| **BUG-004** | `runner.ts` | **MEDIUM** | Hardcoded `docDetect.documentType = "unknown"` on OCR failure instead of preserving recognized credential geometry | **RESOLVED** | `100-case-screening.test.ts` (CASE-004) |
| **BUG-005** | `types.ts` vs `runner.ts` | **MEDIUM** | TypeScript type drift between `src/ai/types.ts` (`grade`, `BBox` coordinates, `OcrField`) and runner simulation objects | **RESOLVED** | `tsc -b` (Zero Errors) |
| **BUG-006** | `ScreeningView.tsx` | **CRITICAL** | Direct DOM `innerHTML` injection of unescaped reasoning text creating stored/DOM XSS vector | **RESOLVED** | `security.test.ts` (SEC-004) |
| **BUG-007** | `04-mrz.ts` | **HIGH** | Missing check digit bounds validation allowing malformed MRZ strings to throw uncaught RangeErrors | **RESOLVED** | `data-integrity.test.ts` (INT-003) |
| **BUG-008** | PostgREST / InsForge | **HIGH** | Cross-tenant screening run query leakage without tenant-scoped RLS policies | **RESOLVED** | `001_enterprise_audit_hardening.sql` |

---

## Detailed Bug Root-Cause & Remediation Profiles

### BUG-001: Mathematical Flaw in `computeRisk()` Defect Weighting
- **Symptom**: Clean, 100% authentic identity documents consistently failed to achieve `PASS` clearance and received risk scores of 50 or higher (`MEDIUM` / `REVIEW`).
- **Root Cause**: The calculation formula in `src/ai/pipeline/09-risk.ts` started at an arbitrary baseline of `50`, and assigned negative weights (`-0.10`, `-0.15`) that subtracted points from 50. This inverted the risk scale and bounded minimum risk scores at 50, making it mathematically impossible for any document to score below the 30-point `PASS` threshold.
- **Remediation**: Refactored `computeRisk()` to evaluate positive defect terms:
  ```typescript
  const rawSum =
    (100 - components.imageQuality) * weights.imageQuality +
    (100 - components.docDetectConf) * weights.docDetectConf +
    (100 - components.ocrConf) * weights.ocrConf +
    (100 - components.mrzValid) * weights.mrzValid +
    (100 - components.expiryValid) * weights.expiryValid +
    components.tamperingProb * weights.tamperingProb +
    (100 - components.faceQuality) * weights.faceQuality +
    (100 - components.identityScore) * weights.identityScore;
  let rawScore = rawSum / totalWeights;
  ```
- **Verification**: Genuine documents now score `~4` (`LOW` / `PASS`), while tampered credentials score `>60` (`HIGH` / `FAIL`). Verified across 100 cases.

### BUG-002: Null Reference on Undefined `identity.perField`
- **Symptom**: Uncaught `TypeError: Cannot read properties of undefined (reading 'length')` crashing the pipeline when identity consistency verification returned an object without `perField`.
- **Root Cause**: Line 152 in `src/ai/pipeline/09-risk.ts` directly accessed `identity.perField.length` without optional chaining or null checking.
- **Remediation**: Added optional chaining and safe fallback: `const fieldCount = identity.perField?.length ?? 0;`.
- **Verification**: Verified in Vitest campaign suite.

### BUG-003: Review Routing Precedence Inversion
- **Symptom**: Test cases with OCR failures (`B_OCR_FAILURE`) and partial crop occlusions (`G_PARTIAL_DOCUMENT`) were erroneously categorized as `FAIL` (fraud) instead of `REVIEW` (manual secondary inspection).
- **Root Cause**: The decision mapper checked `if (riskResult.score >= 60) decision = "FAIL"` before evaluating category-specific handling for degraded image inputs.
- **Remediation**: Reordered decision evaluation tree to ensure edge-case classification rules for unreadable/partial inputs route to `REVIEW` before high-risk fallback thresholds apply.
- **Verification**: Cases 6-8 and 21-22 now correctly route to `REVIEW`.

### BUG-004: Inappropriate "unknown" Document Type Assignment on OCR Failure
- **Symptom**: Low contrast or blurry scans were classified as `documentType: "unknown"`, which triggered an automated high-risk floor (`rawScore = Math.max(rawScore, 85)`).
- **Root Cause**: Document detector was coupled to OCR text readability. A document whose visual boundaries and passport layout are recognized should retain `documentType: "passport"` even if OCR text extraction fails.
- **Remediation**: Decoupled document type geometry detection from OCR text completeness. Only `AI_INVALID_DOCUMENT_FORMAT` yields `documentType: "unknown"`.
- **Verification**: `tsc -b` and 100-case suite pass.

### BUG-005: TypeScript Simulation Interface Drift
- **Symptom**: `tsc -b` compilation errors in `runner.ts` due to mismatch with `src/ai/types.ts` (`grade: "A"` instead of `"EXCELLENT"`, `boundingBox: { width }` instead of `{ w }`, `OcrField.name` instead of `fieldName`).
- **Root Cause**: Test runner stubbed objects using outdated informal shapes rather than importing the canonical types from `src/ai/types.ts`.
- **Remediation**: Replaced informal stubs with strictly typed instances of `ImageQualityResult`, `DocDetectResult`, `OcrResult`, `MrzResult`, `ValidationResult`, and `TamperingResult`.
- **Verification**: Clean `npx tsc -b` with zero compilation errors.
