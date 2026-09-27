# TrustGate AI - Dataset Provenance & Isolation Registry
**System**: Smart India Hackathon (Border Gateway 2024 / National Border Security Standard)  
**Security Standard**: Strict Benchmark Isolation & Zero Contamination Contract  
**Last Updated**: 2026-09-08

---

## 1. Executive Policy: Benchmark Isolation vs Live Authority

TrustGate AI adheres to a strict physical and logical boundary between **Training/Evaluation Benchmark Datasets** and **Live Officer Screenings**:

1. **Benchmark Datasets Are Evaluation-Only**:
   - Datasets such as MIDV-500, MIDV-2020, and FaceForensics++ are used exclusively in `ai/evaluation/` for stress-testing, metric calibration, and algorithm benchmarking.
   - **Prohibition**: No benchmark record or synthetic profile shall ever be injected into the live border database or return a false "pass" for an arbitrary document.

2. **Live Document Authoritative Contract**:
   - The officer's current document capture (accompanied by its cryptographic SHA-256 hash `image_hash`, `capture_id`, and `processing_run_id`) is the **sole authoritative visual input**.
   - Database verification is executed exclusively against authorized live records in the PostgreSQL identity database.

---

## 2. Registered Benchmark Datasets

### A. MIDV-500 (Mobile Identity Documents Video Dataset)
- **Source**: Institute for Information Transmission Problems (IITP RAS)
- **License**: CC BY 4.0
- **Primary Use**: Synthetic distortion benchmarking (glare, blur, perspective warping)
- **Document Classes**: Passports, National Identity Cards, Driving Licenses across 50 nationalities.
- **Role in TrustGate**:
  - Evaluation of DBNet text detection under variable optical tilts.
  - Calibration of `01-image-quality.ts` (Laplacian sharpness & brightness thresholds).
  - Benchmark tests `TG-TEST-0021` to `TG-TEST-0040`.
- **Contamination Safeguard**: Offline evaluation only; directory path `ai/datasets/midv500_eval/` ignored from runtime production paths.

---

### B. MIDV-2020 (Identity Documents in Uncontrolled Conditions)
- **Source**: Smart Engines / IITP RAS
- **License**: CC BY 4.0
- **Primary Use**: Testing multi-spectral tampering, physical copy attacks, and low-light degradation.
- **Resolution**: High-resolution sensor captures under complex indoor/outdoor lighting.
- **Role in TrustGate**:
  - Benchmark verification for `DocumentForensicsEngine` Error Level Analysis (ELA) and Laplacian noise variance.
  - Calibration of synthetic splice detection thresholds.
  - Benchmark tests `TG-TEST-0041` to `TG-TEST-0060`.
- **Contamination Safeguard**: Strictly sandboxed to synthetic artifact generation in validation suites.

---

### C. FaceForensics++ (Deepfake & Facial Manipulation Benchmark)
- **Source**: Technical University of Munich (TUM)
- **License**: Academic Research License
- **Primary Use**: Benchmark evaluation of facial synthesis artifacts, DeepFakes, Face2Face, FaceSwap, and NeuralTextures.
- **Role in TrustGate**:
  - Anti-spoofing calibration for spatial moiré frequency residuals.
  - Facial gradient edge variance scoring in `DeepfakePresentationAttackDetector`.
  - Benchmark tests `TG-TEST-0061` to `TG-TEST-0080`.
- **Contamination Safeguard**: No facial embeddings from FaceForensics++ are ever stored in the live officer watchlists.

---

### D. ICAO Doc 9303 Machine Readable Travel Documents Reference Standard
- **Source**: International Civil Aviation Organization (ICAO)
- **Status**: Official Open Standard (Part 3, 4, 7)
- **Primary Use**: Deterministic specification of OCR-B fonts, TD1, TD2, TD3, and MRVA/MRVB check digits with the 7-3-1 modulo 10 algorithm.
- **Role in TrustGate**:
  - Ground truth reference for all check digit calculations in `04-mrz.ts` and `ai/paddleocr/engine.py`.
  - Deterministic evaluation test cases `TG-TEST-0081` to `TG-TEST-0100`.

---

## 3. Contamination Audit Checklist

| Checkpoint | Requirement | Verification Mechanism | Status |
| :--- | :--- | :--- | :--- |
| **P-101** | Zero Synthetic Personas in Live Database | SQL table check on `identity_documents` | **VERIFIED CLEAN** |
| **P-102** | No Static Passcodes or Bypasses | Codebase scan for hardcoded document numbers | **VERIFIED CLEAN** |
| **P-103** | Runtime Hash Binding | Current image SHA-256 attached to all pipeline modules | **VERIFIED ACTIVE** |
| **P-104** | Stale Cache Discard | Session mismatch or timestamp divergence terminates run | **VERIFIED ACTIVE** |
| **P-105** | Dataset Isolation | Evaluation scripts isolated to `ai/evaluation/` | **VERIFIED ISOLATED** |
