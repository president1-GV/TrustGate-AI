# TRUSTGATE AI — Result Provenance, Stale State Elimination & Cryptographic Binding
**Document ID:** TG-SEC-PROV-2026-004  
**Date:** October 16, 2026  
**Auditor:** Principal Security Engineer & Database Architect

---

## 1. Threat Model & Concurrency Hazards

In high-throughput border screening checkpoints, asynchronous network calls, cached database records, and rapid traveler queue switching introduce three critical security hazards:

1. **Stale Result Overwrite (Race Conditions):**  
   An inference request dispatched for Passenger $A$ resolves after Passenger $B$'s credential has already been placed on the inspection scanner. Without run-binding, Passenger $A$'s biometric score could overwrite Passenger $B$'s screening verdict.
2. **Database Cache Contamination:**  
   When an officer selects a historical database case, the persisted case summary record might contain outdated or unverified default attributes that mask a newly arrived traveler's live biometric feed.
3. **Ghost Ingestion:**  
   Clearing a document or clearing a camera portrait fails to invalidate downstream risk fusion outputs, leaving an unearned `PASS` or previous match score in memory.

---

## 2. Authoritative Screening Context & Provenance Contract

To address these vulnerabilities, TRUSTGATE AI establishes a strict **Single Source of Truth Screening Context** (`ScreeningContext.tsx` & `SihScreeningDashboard.tsx`):

### 2.1 The Cryptographic Provenance Tuple
Every biometric inference request and response is tied to an authoritative tuple:
$$\mathcal{P} = \langle \text{case\_id}, \text{document\_id}, \text{processing\_run\_id}, \mathcal{H}_{\text{doc}}, \mathcal{H}_{\text{crop}}, \mathcal{H}_{\text{live}}, \mathcal{M}_{\text{id}}, \mathcal{M}_{\text{ver}}, t_{\text{ISO}} \rangle$$

Where:
- $\mathcal{H}_{\text{doc}} = \text{SHA-256}(\text{Raw Document Canvas})$
- $\mathcal{H}_{\text{crop}} = \text{SHA-256}(\text{Normalized 112x112 Document Portrait Crop})$
- $\mathcal{H}_{\text{live}} = \text{SHA-256}(\text{Normalized 112x112 Live Camera Frame})$
- $\mathcal{M}_{\text{id}} = \text{"TrustGate-BioForensic-GradientNet"}$
- $\mathcal{M}_{\text{ver}} = \text{"2.4.0"}$

```mermaid
sequenceDiagram
    participant Officer as Border Officer / UI
    participant Ctx as Screening Context
    participant Engine as Biometric Engine
    participant DB as PostgreSQL Audit Log

    Officer->>Ctx: Ingest Travel Document
    Ctx->>Ctx: Generate fresh processing_run_id & compute H(doc)
    Officer->>Ctx: Capture Live Traveler Selfie
    Ctx->>Engine: performFaceVerification(doc, live, runId, H(doc))
    
    alt In-Flight Abort or Context Changed
        Note over Ctx,Engine: Officer clears document or selects new case
        Ctx->>Ctx: activeRunIdRef invalidated; resetScreening()
        Engine-->>Ctx: Returns old response
        Ctx->>Ctx: DISCARD response (runId mismatch)
    else Context Matches Active Run
        Engine-->>Ctx: Valid FaceVerificationResult
        Ctx->>Ctx: Update biometricVerification & recalculate TrustFusion
        Ctx->>DB: Persist immutable audit log with cryptographic hashes
    end
```

---

## 3. Stale State Invalidation Rules

1. **Immediate Downstream Cascade on Document Ingestion:**  
   Uploading a new document or capturing a new document frame immediately sets `biometricVerification` to `null` and invalidates any existing live facial comparison.
2. **Immediate Downstream Cascade on Face Ingestion:**  
   Capturing a new live facial snapshot or clearing the webcam stream immediately resets `biometricVerification` and triggers re-verification against the currently loaded document portrait.
3. **Strict Reset Specimen Action:**  
   Clicking `handleClearDocument` or `handleClearFace` revokes all object URLs, resets file input DOM references, sets `selectedDbCaseId` to `"NEW_INGESTION"`, and creates a new cryptographic case identifier (`TG-LIVE-YYYYMMDD-XXXX`).
4. **Active Run Guard:**  
   Every asynchronous pipeline callback checks:
   ```typescript
   if (activeRunIdRef.current !== runId) {
     console.warn("[TrustGate Provenance] Discarding stale inference result for run", runId);
     return;
   }
   ```
   Ensuring out-of-order asynchronous responses can never overwrite the active screening context.
