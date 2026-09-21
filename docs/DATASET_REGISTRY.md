# TrustGate AI — Dataset Provenance & Benchmark Isolation Catalog
**Smart India Hackathon (SIH 2024 / Problem Statement 26188)**  
**Document**: Dataset Registry & Anti-Contamination Catalog  
**Status**: ACTIVE PRODUCTION  

---

## 1. Zero-Contamination Architecture

TrustGate AI enforces strict separation between benchmark research datasets and live officer screening sessions:

1. **Benchmark Datasets Are Strictly Non-Operational**:
   - Datasets such as MIDV-500, MIDV-2020, and FaceForensics++ are restricted to `ai/datasets/` and `ai/evaluation/` for metric evaluation, stress testing, and calibration.
   - **Absolute Boundary**: Under no circumstances does the live screening workflow query or cross-reference evaluation benchmark records to establish personal identity.

2. **Live Identity Authority**:
   - Every live screening query executes solely against the officer's current document capture and authentic, authorized government/immigration records hosted on PostgreSQL (`identity_documents`, `mrz_records`, `watchlists`).

---

## 2. Benchmark Dataset Inventory

| Dataset Name | Source / Institution | License | Primary Purpose | Role in Pipeline | Status in Production |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MIDV-500** | IITP RAS | CC BY 4.0 | Mobile ID degradation testing | Optical blur & glare stress-testing | **EVALUATION ONLY** |
| **MIDV-2020** | Smart Engines / IITP | CC BY 4.0 | Uncontrolled capture conditions | ELA & noise variance calibration | **EVALUATION ONLY** |
| **FaceForensics++** | Technical Univ. Munich (TUM)| Academic Research | Deepfake & facial synthesis | Moiré & texture smoothing validation | **EVALUATION ONLY** |
| **CASIA-SURF** | CASIA / CBSR | Academic Research | Face anti-spoofing benchmarks | Replay attack spectral calibration | **EVALUATION ONLY** |
| **ICAO Doc 9303 Standard**| ICAO Open Standard | Public Standard | MRTD specifications | Ground-truth check digit verification | **STANDARDIZED RULESET**|

---

## 3. Contamination Audit Verification

- [x] **No Synthetic Passcodes**: The codebase contains zero backdoor passwords or hardcoded document numbers.
- [x] **Hash-Bound Artifacts**: Every processing run requires an active SHA-256 digest matching the officer's current capture.
- [x] **Database Isolation**: The PostgreSQL live database contains only authorized immigration and customs records.
