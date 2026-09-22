# INITIAL AI SYSTEM AUDIT — TRUSTGATE AI
**SIH Problem Statement 26188: AI-Based Fake Identity & Document Screening System**
**Audit Date**: September 22, 2026
**Auditor**: Principal AI/ML Engineer, Computer Vision Engineer, Security Lead

---

## 1. Executive Summary

This audit establishes the baseline technical state of the **TrustGate AI** codebase prior to integrating the 3,000-image Indian KYC dataset (Aadhaar, PAN, Passport, Visa, Voter ID) and transitioning to an end-to-end production AI pipeline.

### System Architecture Overview
- **Frontend**: React 18.3, TypeScript, Vite, Tailwind CSS 3.4, Lucide Icons, Recharts.
- **Backend-as-a-Service**: InsForge / PostgreSQL (`TrustGate AI Billion-1` at `https://i8yy29ec.us-east.insforge.app`).
- **Python Inference Layer**: Python 3.14 virtual environment with PaddleOCR 3.7.0, PaddleX 3.7.2, OpenCV 4.10, ONNX Runtime 1.29.0, FastAPI 0.141, Uvicorn 0.52.
- **Microservices**:
  - `midv_llm_engine.server` / `ai.inference.service` on port 8000.
  - Endpoints: `/health`, `/datasets/catalog`, `/model/status`, `/model/train`, `/model/predict`, `/verify`, `/api/v1/ocr`, `/api/v1/forensics`, `/api/v1/deepfake`.

---

## 2. Current Flow Analysis

### 2.1 Current Data Flow
- **Capture**: User captures document via live web camera (`src/components/camera/CameraCapture.tsx`) or file upload (`src/pages/ScreeningPage.tsx`).
- **Hashing**: SHA-256 computed on client/service layer.
- **Routing**: Payload forwarded to Python backend via `fetch` or processed client-side if offline.
- **Storage**: Telemetry and results saved to InsForge PostgreSQL tables (`cases`, `documents`, `risk_scores`, `findings`, `validation_results`, `ocr_results`, `mrz_results`).

### 2.2 Current AI Flow
- **OCR Engine**: PaddleOCR 3.7.0 (`ai/paddleocr/engine.py`) performs text detection (DBNet) and text recognition (CRNN/SVTR).
- **Forensics Engine**: `DocumentForensicsEngine` (`ai/document_forensics/tampering.py`) computes Error Level Analysis (ELA), 2D-FFT high-frequency spectral energy, and Laplacian noise variance.
- **Deepfake Detector**: `DeepfakePresentationAttackDetector` (`ai/deepfake_detection/detector.py`) computes spatial Moiré residuals, radial gradient variance, and cosine similarity.
- **Trust Fusion**: `runClientNeuralInference` and Bayesian weighted scoring combines signals.

### 2.3 Current Database Flow
- Direct PostgREST API access via `@insforge/sdk` using `anonKey` from `.env.local`.
- 52 operational cases currently recorded in `public.cases`.
- Zero-mock policy actively enforced for operational charts and case listings.

### 2.4 Current Authentication Flow
- Session managed through `AuthProvider` and Supabase/InsForge Auth tokens (`access_token`, `refresh_token`).
- Demo persona login bypasses external email confirmation while generating signed database sessions.

### 2.5 Current Realtime Flow
- PostgreSQL WebSocket subscriptions on `cases`, `findings`, `audit_events` via `@insforge/sdk`.
- Fallback auto-polling every 10 seconds ensures live state synchronization.

### 2.6 Current Camera Flow
- `useCameraStream.ts` requests permissions via standard `navigator.mediaDevices.getUserMedia()`.
- Resolution: Native video stream (1280x720 / 1920x1080) rendered on `<video>` with overlay `<canvas>` for boundary guidance.

### 2.7 Current Trust Fusion Flow
- 16-feature vector evaluated across boundary gradient delta, corneal reflection, spectral ratio, landmark asymmetry, compression delta, liveness micro-motion, aspect ratio conformity, homography error, tampering probability, copy-move score, font anomaly, microprint integrity, MRZ validity, visual-MRZ concordance, and date logic consistency.

---

## 3. Identified Defects & Gaps

| ID | Component | Defect Description | Severity | Root Cause | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | Datasets | Indian KYC dataset (3,000 images: Aadhaar, PAN, Passport, Visa, Voter ID) not yet localized in `ai/datasets/`. | **P0** | Dataset was stored in external zip on Desktop. | Extract into `ai/datasets/kyc_uploaded/`, generate SHA-256 checksums, verify zero corruption, split into train/val/test. |
| **DEF-02** | PaddleOCR | Lack of dedicated Indian KYC field extraction schema (Aadhaar UID, PAN 10-char alphanumeric, Voter EPIC ID). | **P1** | Pipeline previously prioritized ICAO Doc 9303 international passports. | Implement `ai/paddleocr/field_extractor.py` tailored for Aadhaar, PAN, Voter ID, Indian Passport, and Visa. |
| **DEF-03** | Subsystem Modularity | Forensics and Deepfake modules located in legacy folder names (`ai/document_forensics`, `ai/deepfake_detection`). | **P1** | Historical folder naming. | Create dedicated `ai/forensics/` and `ai/deepfake/` modules as specified in architecture rules. |
| **DEF-04** | UI Contamination | Archetype inspector displays international archetypes (Azerbaijan, Germany, France, Spain) as default reference cards. | **P1** | Static reference specimens hardcoded in `src/lib/midvService.ts`. | Decouple reference standards from live production screening, prioritizing Indian KYC documents with clear badge indicating reference vs live capture. |
| **DEF-05** | Identity Chain | Incomplete end-to-end propagation of `processing_run_id` and `image_hash` across certain legacy client evaluation paths. | **P1** | Client-side fallback occasionally defaulted hashes. | Enforce strict cryptographic validation: if `image_hash` does not match current capture, reject result immediately. |
| **DEF-06** | LLM/VLM Reasoning | LLM evidence reasoning lacks strict JSON schema validation gate prior to database insertion. | **P2** | Unstructured text output handling. | Implement JSON Schema validator enforcing `{decision, risk_score, confidence, passed, failed, warnings, uncertainties, evidence, recommended_action}`. |

---

## 4. Remediation Plan

1. **Localize and Audit Indian KYC Dataset**: Extract the 3,000 images from the Desktop zip, generate SHA-256 hashes, verify image integrity, and build disjoint splits.
2. **Create Governance Documentation**: Publish `docs/KYC_DATASET_GOVERNANCE.md`.
3. **Restructure AI Subsystems**: Establish `ai/paddleocr/`, `ai/forensics/`, `ai/deepfake/`, `ai/models/`, `ai/model_registry/`, `ai/training/`, `ai/inference/`.
4. **Implement KYC Extraction & Baseline**: Build field extraction for Aadhaar (12 digits), PAN (5 letters + 4 digits + 1 letter), Passport (letter + 7 digits + MRZ), Visa (8 digits), Voter ID (3 letters + 7 digits), and evaluate baseline CER/WER/F1.
5. **Enforce Absolute Data Integrity**: Ensure all live UI flows derive exclusively from current document captures with SHA-256 provenance.
6. **Run Comprehensive 100-Case Validation**: Execute 100 Indian KYC + synthetic edge cases across the unified pipeline.
