# TRUSTGATE AI BILLION — COMPLETE SYSTEM ARCHITECTURE
**Document Reference**: `SYSTEM_ARCHITECTURE.md`  
**Classification**: High-Assurance National Border Control Architecture  
**Standard**: NIST FIPS 180-4 / ICAO Doc 9303 / Zero-Trust Defense-in-Depth  
**Last Verified**: 2026-09-05T23:45:00Z  

---

## 1. Master Logical Architecture

The end-to-end logical architecture strictly follows the authoritative zero-trust verification topology:

```
                    OFFICER
                       │
                       ▼
                AUTHENTICATION
                       │
                       ▼
              AUTHENTICATED SESSION
                       │
                       ▼
                AUTHORIZATION (RBAC)
                       │
                       ▼
                    CASE (UUID)
                       │
                       ▼
                  DOCUMENT (UUID)
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        LIVE CAMERA           UPLOAD
             │                   │
             └─────────┬─────────┘
                       ▼
                  IMAGE HASH (SHA-256)
                       │
                       ▼
               PROCESSING RUN (UUID)
                       │
                       ▼
              SCREENING PIPELINE
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
     OCR              MRZ          Document Analysis
       │               │                │
       └───────────────┼────────────────┘
                       ▼
                 VALIDATION
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
      TAMPERING                   FACE
          │                         │
          └────────────┬────────────┘
                       ▼
            AUTHORIZED DB CHECK
                       │
                       ▼
                AI / LLM ANALYSIS
                       │
                       ▼
              TRUSTGATE FUSION
                       │
                       ▼
             FINAL DECISION
                       │
              ┌────────┴────────┐
              ▼                 ▼
          DATABASE            REALTIME
              │                 │
              └────────┬────────┘
                       ▼
                  FRONTEND
```

---

## 2. Cryptographic Provenance Equation

The system enforces strict provenance where every authoritative decision satisfies:

$$\text{AUTHENTICATED USER} + \text{AUTHORIZED CASE} + \text{CURRENT DOCUMENT} + \text{CURRENT RUN} + \text{IMAGE HASH} + \text{ACTUAL MODEL OUTPUT} + \text{DATABASE EVIDENCE} + \text{EXPLAINABLE FUSION} = \text{TRUSTWORTHY RESULT}$$

If any link in this chain is missing, expired, or mismatched, the result is rejected as untrusted.

---

## 3. Tier-by-Tier Implementation Mapping

| Logical Tier | Concrete Component | Implementation Files | Operational Responsibility |
| :--- | :--- | :--- | :--- |
| **Officer / Session** | InsForge Auth JWT | `src/providers/AuthProvider.tsx`, `src/lib/insforge.ts` | Manages verified officer identity, role permissions, token lifecycle |
| **Case / Document** | InsForge PostgREST | `src/lib/db.ts`, `migrations/*` | Relational persistence of screening cases and credential metadata |
| **Image Acquisition** | WebRTC Hardware Stream | `src/components/camera/useCameraStream.ts`, `CameraCapture.tsx` | Unmirrored 1080p frame acquisition with Laplacian blur gates |
| **Document Hash** | Web Crypto SHA-256 | `src/lib/provenance.ts` | Deterministic 64-char hex digest computed directly from file bytes |
| **Processing Run** | Concurrency State Machine | `src/providers/ScreeningContext.tsx` | Manages `activeRunIdRef`, atomic hard resets, and run scoping |
| **OCR / MRZ Engine** | Tesseract.js & ICAO Engine | `src/ai/pipeline/03-ocr.ts`, `04-mrz.ts`, `midv_llm_engine/mrz_engine.py` | Optical extraction and 7-3-1 cyclic weighting checksum validation |
| **Tampering Engine** | Error Level Analysis | `src/ai/pipeline/06-tampering.ts`, `midv_llm_engine/neural_classifier.py` | Recompression DCT error analysis, clone detection, pixel variance |
| **Biometric Face** | Facial Forensics | `src/ai/pipeline/07-face.ts`, `midv_llm_engine/faceforensics_engine.py` | Skin chromaticity locus, 3D liveness, deepfake artifact evaluation |
| **Database Check** | Law Enforcement DB | `src/ai/pipeline/08-identity.ts`, `src/lib/db.ts` | Watchlist check and authoritative identity record reconciliation |
| **AI / LLM Analysis**| Optical Archetype LLM | `midv_llm_engine/llm_verifier.py`, `server.py` | Deep MIDV-2020 archetype comparison and conformity level audit |
| **TrustGate Fusion** | Multi-Signal Risk Engine | `src/ai/pipeline/09-risk.ts`, `src/models/trustgate_fusionnet_weights.json` | Weighted non-linear risk fusion producing final PASS / FAIL / REVIEW |
| **Realtime / Audit** | InsForge WebSocket Pub/Sub| `src/hooks/useRealtimeScreeningEvents.ts`, `audit_logs` table | Tamper-evident append-only event broadcast and deduplication |
| **Frontend UI** | Dual Screening Dashboards | `ScreeningPage.tsx` (9-Stage), `SihScreeningDashboard.tsx` (7-Screen Hub) | Synchronized border officer workstations |
