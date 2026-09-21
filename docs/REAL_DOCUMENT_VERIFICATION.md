# TRUSTGATE AI BILLION — REAL DOCUMENT VERIFICATION SPECIFICATION
**Document Reference**: TG-VERIFY-2026-09-05  
**Version**: 2.0.0-PROD  
**Target Subsystems**: /screening, /sih-screening, Forensic Engine

---

## 1. Principles of Honest Verification

TrustGate AI adheres to three inviolable operational principles:
1. **NO RESULT is better than a WRONG RESULT**.
2. **INCONCLUSIVE is better than a FABRICATED CONFIDENCE**.
3. **AI UNAVAILABLE is better than a FAKE AI SCORE**.

Under no circumstances does the system present sample, benchmark, or cached values as the current document's attributes.

---

## 2. Test Suite Specifications (DOC-001 through DOC-008)

| Test ID | Test Scenario | Verified System Behavior | Status |
|---|---|---|---|
| **DOC-001** | Non-Document Image Submission | Edge density filter classifies as `documentType: "unknown"`, `confidence <= 0.35`. Never defaults to `"passport"`. | **PASS** |
| **DOC-002** | OCR Absence & Field Extraction | Zero synthetic names. `fields: []`, `overallConfidence: 0`. No `"JOHN MICHAEL DOE"` or `"A12345678"`. | **PASS** |
| **DOC-003** | MRZ Zone Absence | Reports `present: false`, `compositeValid: false`, `checkDigitsValid: false`. No fake TD3 parsing. | **PASS** |
| **DOC-004** | Missing Required Fields | Validation flags `CRITICAL` / `HIGH` on unknown document type and absent identity data. No false PASS. | **PASS** |
| **DOC-005** | Biometric Portrait Absence | ITU-R BT.601 chrominance check fails on non-faces. Returns `detected: false`, `NO_FACE_DETECTED`, and no fake 0% deepfake scores. | **PASS** |
| **DOC-006** | Tampering Calibration | Dynamic thresholding on nominal images returns `regions: []`, `severity: "NONE"`, `probability <= 25%`. | **PASS** |
| **DOC-007** | Archetype Honesty | Verifier returns `archetype_id: "unmatched"` when country is unknown. Never defaults to Azerbaijan or Germany. | **PASS** |
| **DOC-008** | Cryptographic Provenance | Computes deterministic SHA-256 hash. Binds `documentHash`, `processingRunId`, and `source` to screening state. | **PASS** |

---

## 3. Document Category Behaviors

### 3.1 Unrecognized Images (Screenshots, Landscapes, Code)
- **Document Detection**: `documentType: "unknown"`, `confidence <= 0.35`.
- **OCR**: `fields: []`, `overallConfidence: 0`.
- **MRZ**: `present: false`.
- **Validation**: `doc_type_valid: CRITICAL`, `required_fields: CRITICAL`.
- **Risk Assessment**: `score >= 85`, `level: HIGH`, directive: `"REJECT: Unrecognized credential format"`.
- **Archetype**: `unmatched`, `"No MIDV-2020 Archetype Correlation Found"`.

### 3.2 Authentic Passports (ICAO Doc 9303 TD3)
- **Document Detection**: `documentType: "passport"`, `confidence >= 0.70`.
- **MRZ**: 2 lines of 44 characters, starting with `P<`. 7-3-1 check digit validation.
- **Face Detection**: Detected via ITU-R BT.601 skin locus in standard left-hand photo zone.
- **Biometric Audit**: Evaluated against FaceForensics++ c23 standards for boundary seams, corneal specular reflections, and compression rate discrepancy.

### 3.3 National Identity Cards (ID-1 / TD1)
- **Document Detection**: `documentType: "id_card"`, `aspect_ratio ~ 1.586`.
- **MRZ**: 3 lines of 30 characters (if present) or biometric barcode.
- **Validation**: Validates document number, nationality, and birth date consistency.
