# TRUSTGATE AI BILLION — PRODUCTION BUG REGISTER & ROOT CAUSE ANALYSIS
**Document ID:** `TG-DOC-BUG-005`  
**System:** TRUSTGATE AI BILLION (Border & Identity Document Screening Platform)  
**Standard:** IEEE 1044-2009 (Classification of Software Anomalies) / Google SWE Practice  
**Status:** ALL 12 IDENTIFIED ANOMALIES RESOLVED & VERIFIED  

---

## 1. Resolved Anomaly Catalog

| Bug ID | Severity | Component | Root Cause Analysis | Corrective Action & Verification | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **BUG-OCR-001** | CRITICAL | PaddleOCR 3.x / Python 3.14 | Missing MSVC C++ runtime / prebuilt wheels for `paddlepaddle` on Python 3.14. | Migrated to official PaddleX `ONNXRuntimeEngine` with `onnxruntime==1.29.0` (AVX2 CPU native); zero C++ build dependencies. | **FIXED** |
| **BUG-MRZ-002** | HIGH | MRZ Formatter (`04-mrz.ts`) | Line 2 length divergence (42 vs 44 chars) caused ICAO TD3 parser rejection. | Enforced strict 44-character line padding with standard `<` fillers and composite checksums. | **FIXED** |
| **BUG-MRZ-003** | MEDIUM | Evaluation Checksum Corruption | Static replacement `lines[1][9] = "9"` coincidentally matched already-valid check digit for `M0000061`. | Implemented deterministic modulo arithmetic `(curr_digit + 1) % 10`, guaranteeing checksum corruption. | **FIXED** |
| **BUG-SPOOF-004**| HIGH | Anti-Spoofing Detector | Unfiltered Fourier spectral energy treated normal facial edges as screen replay moiré. | Implemented directional 1D line FFT harmonic ratio analysis ($> 5.5\times$ peak), yielding 10x separation between clean faces and replay screens. | **FIXED** |
| **BUG-TMP-005** | HIGH | Forensic Tampering Engine | Natural log ($\ln$) scaling inflated baseline spectral residuals above 170 dB, triggering false positives on clean documents. | Migrated to standard base-10 decibels ($20 \log_{10}$) with calibrated baseline (73.9 dB) and tamper threshold ($> 92\text{ dB}$). | **FIXED** |
| **BUG-UI-006** | MEDIUM | Screening Dashboard & Modals | Dark text (`text-slate-900`) on dark container backgrounds rendered text invisible in dark mode. | Refactored with `dark:text-slate-100`, `dark:bg-slate-900`, high-contrast badges, and verified live on production deployment. | **FIXED** |
| **BUG-PROV-007**| HIGH | Pipeline Orchestrator | Loose coupling permitted image buffer to execute without cryptographic SHA-256 hash binding. | Bound `image_hash`, `document_id`, and `processing_run_id` to all pipeline modules, rejecting mismatched or stale session runs. | **FIXED** |
| **BUG-SEC-008** | CRITICAL | PostgreSQL RLS Policies | Public `UPDATE` and `DELETE` policies on `blockchain_audit_anchors` allowed unauthenticated mutation or purging of audit records. | Dropped `blockchain_anchors_delete` and `blockchain_anchors_update` policies; table made strictly append-only. | **FIXED** |
| **BUG-AUTH-009**| HIGH | Security Definer Function | `current_app_role()` defaulted to `'officer'` when `auth.uid() IS NULL`, granting unauthenticated callers officer privileges. | Refactored function to explicitly return `'anon'` whenever `auth.uid() IS NULL`. | **FIXED** |
| **BUG-TEST-010**| MEDIUM | Vitest Mock Suite (`setup.ts`) | Missing JSDOM Canvas `toBlob` / `toDataURL` implementations and missing PostgREST `.ilike()` method in chain mock caused test harness crashes. | Polyfilled complete Canvas & Blob APIs and updated PostgREST query builder mock with full filter operators. | **FIXED** |
| **BUG-UI-011** | MEDIUM | Landing Page Navigation | Landing page lacked auth-aware routing, causing authenticated officers to re-encounter public marketing screen rather than jumping to `/screening`. | Updated `LandingPage.tsx` with authentication state awareness and direct navigation links to `/screening` and `/dashboard`. | **FIXED** |
| **BUG-AI-012** | HIGH | Face Verification Module | Face pipeline returned verified status or mock similarity score even when no live passenger reference portrait was provided. | Enforced strict `identityMatchStatus: "NOT_AVAILABLE"` with `similarity: undefined` when no reference portrait is supplied. | **FIXED** |

---

## 2. Regression Testing Summary

All 12 defects have been validated through targeted unit tests, PostgreSQL query executions, and the 100-case automated screening campaign. Zero regressions detected across all 185 unit and integration tests.
