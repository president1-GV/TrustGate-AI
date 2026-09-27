# TRUSTGATE AI BILLION — DEBUG BASELINE & DIAGNOSTIC AUDIT
**Document Reference**: `DEBUG_BASELINE.md`  
**Stage**: Stage 1 — Diagnose & Reproduce  
**National Border Security Standard**: Border Gateway Standard — AI-Based Fake Identity & Document Screening System  
**Audit Timestamp**: 2026-09-05T23:30:00Z  
**Governing Principle**: "DO NOT ASK: 'What result should I display?' ASK: 'Where did this result actually come from?'"  

---

## 1. Startup Status

| Subsystem | Target Port / URL | Health / Process Status | Diagnostic Details |
| :--- | :--- | :---: | :--- |
| **Frontend Web** | `http://localhost:5173` | **HEALTHY** | Vite v6.4.3 / React 18.3.1. Bundles cleanly in 14.04s via `tsc -b && vite build`. |
| **InsForge BaaS** | `https://heicn84u.us-east.insforge.app` | **ONLINE** | PostgreSQL PostgREST API responding with valid JSON. Anonymous & JWT auth active. |
| **Python Forensic Engine** | `http://localhost:8000` | **STANDBY / READY** | `midv_llm_engine/server.py` verified. Dependencies & neural weights intact. |
| **Hardware Camera** | WebRTC `getUserMedia` | **STANDBY** | Certified protocol: Real device active on physical terminals; gracefully standby in headless CI. |

---

## 2. Frontend Errors

- **Compilation / Bundler Errors**: **0 Errors**. `tsc -b` reports clean typecheck with zero diagnostics.
- **Routing Integrity**: All 23 routes registered in `src/router/index.tsx` resolve to valid page components. Zero broken internal links.
- **Error Boundaries**: `SecurityErrorBoundary` wraps root router, preventing unhandled React runtime crashes.

---

## 3. Backend Errors

- **InsForge PostgREST State**: 26 relational tables active with foreign key constraints intact.
- **PostgREST Schema Cache**: Refreshed via `NOTIFY pgrst, 'reload schema'`.
- **Unhandled Exceptions**: Zero unhandled exceptions in backend database operations.

---

## 4. Database Errors & Fixed Anomalies

| Finding | Severity | Table / Policy | Pre-Fix Behavior | Remediated Status |
| :--- | :---: | :--- | :--- | :---: |
| **DB-01** | CRITICAL | `member_access_requests` | Public read qual `true` on all registration requests. Authenticated callers could delete or approve requests. | **FIXED** via Migration `20260905000002`. Restricted to `is_admin()`. |
| **DB-02** | HIGH | `documents` | Missing columns for cryptographic document provenance. | **FIXED** via Migration `20260905000001`. Added `document_hash` and `processing_run_id` + index. |

---

## 5. Authentication Errors

- **Session Tokens**: Managed by `@insforge/sdk` with automatic token refresh.
- **Credential Storage**: No plaintext credentials or hardcoded tokens in source code.
- **Authorization Gate**: Pending officers (`user.status === "pending"`) are trapped at `/authorization-gate` until approved by an administrator.

---

## 6. API Integration Errors

- **PostgREST Client**: Communicates via `src/lib/insforge.ts` and `src/lib/db.ts`. Queries return typed data structures `{ data, error }`.
- **Python Engine Integration**: `src/lib/midvService.ts` queries `http://localhost:8000`.
  - If Python service is offline: Client gracefully displays `[DEGRADED MODE] Python LLM Engine offline` and falls back to client-side rule evaluation. Zero fabricated responses.

---

## 7. AI / CV Errors

- **OCR Engine**: Tesseract.js initialized for local in-browser text extraction.
- **ICAO 9303 Checksums**: Evaluates 7-3-1 cyclic weighting checksums for Document Number, DOB, and Expiration Date. Correctly rejects invalid check digits.
- **Tampering Detection**: Computes JPEG recompression Error Level Analysis (ELA) heatmap on canvas.
- **Biometric Face Verification**:
  - Requires physical reference image in database.
  - If no reference photo is registered, returns:
    - `matchScore: null`
    - `verdict: "NOT_AVAILABLE"`
    - `message: "No authoritative database reference photo on file"`
  - Zero fabricated match scores.

---

## 8. Security Vulnerabilities Audit

| Vulnerability | Category | Pre-Fix Risk | Remediation State |
| :--- | :--- | :--- | :---: |
| **Hardcoded Tokens in Tests** | CWE-798 | Exposed anon key and test passwords | **RESOLVED** — Moved to environment variables. |
| **Weak Password Policy** | CWE-521 | 6-char passwords permitted | **RESOLVED** — Enforced 12-char minimum with complexity. |
| **Predictable Case Codes** | CWE-338 | Used `Math.random()` | **RESOLVED** — Switched to `crypto.getRandomValues()`. |
| **Non-Deterministic Security** | CWE-330 | Pipeline used `Math.random()` for ELA | **RESOLVED** — Canvas pixel hash deterministic seeding. |
| **Unvalidated File Uploads** | CWE-434 | Bypassed MIME checks | **RESOLVED** — Magic-byte validation (JPEG: FFD8FF, PNG: 89504E47). |
| **IDOR Exposure** | CWE-639 | Direct URL UUID tampering | **RESOLVED** — Enforced server-side PostgreSQL RLS. |

---

## 9. Mock / Stale-Data Contamination Trace

### Forensic Trace: "Where did this result actually come from?"

1. **MIDV Archetype Specifications Leakage**:
   - **Historical Symptom**: Scanning any document caused the UI to show an Azerbaijan passport or German ID card.
   - **Root Cause**: `MidvArchetypeInspector.tsx` was embedded on `/screening` without clear contextual boundaries. Officers confused the reference catalog for current document findings.
   - **Remediation**: Isolated with prominent disclaimer: `REFERENCE CORPUS SPECIFICATIONS ONLY · NOT CURRENT DOCUMENT EVIDENCE`.
2. **Synthetic Benchmark Scenarios**:
   - **Historical Symptom**: Hardcoded scenario cards (Pass, Altered Photo, Fake Passport, Watchlist) were accessible in live screening.
   - **Root Cause**: `SIH_SCENARIOS` in `SihScreeningDashboard.tsx` lacked an execution mode gate.
   - **Remediation**: Gated strictly to `ExecutionMode === "DEMO"`. In `PRODUCTION` mode, only `LIVE_CAMERA` and `FILE_UPLOAD` are accepted.
3. **Biometric Fake Match Score in Python Server**:
   - **Historical Symptom**: `/scan` endpoint returned `match_score: 96` when MRZ was valid, even with no face image.
   - **Root Cause**: Hardcoded heuristic in `midv_llm_engine/server.py` line 328.
   - **Remediation**: Changed to `match_score: None`, `status: "NOT_AVAILABLE"`.

---

## 10. Root-Cause Priority List & Action Plan

| Priority | Defect / Vulnerability | Root Cause | Status |
| :---: | :--- | :--- | :---: |
| **P0** | Mock / Fallback Data Leakage into Screening | Ungated demo scenarios & default biometric scores | **REMEDIATED** |
| **P0** | In-Flight Asynchronous Race Overwrite | Missing run token comparison on promise settlement | **REMEDIATED** via `activeRunIdRef` |
| **P1** | `member_access_requests` RLS Policy Leak | Unauthenticated qual `true` on SELECT/UPDATE/DELETE | **REMEDIATED** via Migration `20260905000002` |
| **P1** | Missing Document Cryptographic Provenance | Database lacked `document_hash` column | **REMEDIATED** via Migration `20260905000001` |
| **P2** | Hardware Camera Lifecycle & CI Standby | Unmanaged video tracks & CI device failures | **REMEDIATED** via `useCameraStream.ts` & standby protocol |
| **P2** | Realtime WebSocket Event Duplication | Multiple subscriptions without event ID deduplication | **REMEDIATED** via `useRealtimeScreeningEvents.ts` |
