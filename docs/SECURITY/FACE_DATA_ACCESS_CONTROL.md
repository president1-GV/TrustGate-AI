# TRUSTGATE AI — Biometric Face Data Protection & Access Control Specification
**Document ID:** TG-SEC-ACCESS-2026-003  
**Classification:** RESTRICTED // NATIONAL BORDER SECURITY  
**Standard Compliance:** ISO/IEC 24745 (Biometric Information Protection), GDPR Article 9 (Special Category Biometric Data), Digital Personal Data Protection (DPDP) Act 2023  
**Date:** October 16, 2026

---

## 1. Scope & Objective

This document governs the processing, memory lifecycle, cryptographic isolation, and access controls for all facial biometric data collected during border clearance screening at TRUSTGATE AI checkpoints.

---

## 2. Ephemeral In-Memory Lifecycle & Zero-Persistence Guarantee

### 2.1 Transient Memory Storage
1. **Raw Camera Frames:**
   - Captured webcam streams and user-uploaded passenger portraits are loaded into ephemeral browser heap memory (HTMLCanvasElement / blob URL).
   - Once feature extraction (`extractBiometricFeatureVector`) is completed, object URLs are revoked via `URL.revokeObjectURL()` within `handleClearFace()` and `handleClearDocument()`.
   - Raw facial image frames are never persisted to client localStorage or non-volatile browser storage.
2. **Vector Descriptors:**
   - Derived 128-dimensional spatial gradient vectors exist strictly in volatile memory during the active `performFaceVerification()` execution run.
   - Vectors are discarded immediately after computing the normalized cosine distance.
3. **Database Telemetry Storage:**
   - PostgreSQL audit logs store only non-reversible metadata:
     - `case_id`, `document_id`, `processing_run_id`
     - SHA-256 cryptographic hashes of the document portrait crop and live camera frame (`document_portrait_crop_hash`, `live_capture_hash`)
     - Calibrated similarity percentage, decision label, and timestamp.
   - Raw feature vectors are **never persisted in cleartext** to the database, preventing biometric template inversion attacks.

---

## 3. Cryptographic Binding & SHA-256 Provenance

Every facial comparison operation is strictly sealed by cryptographic hashes:
```json
{
  "document_image_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "document_portrait_crop_hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
  "live_capture_hash": "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
  "model_id": "TrustGate-BioForensic-GradientNet",
  "model_version": "2.4.0",
  "processing_run_id": "run_9f8a32b1e4"
}
```
Any mismatch between the current image buffer and its attested SHA-256 hash immediately aborts verification with status `ERROR` (`DOCUMENT_HASH_MISMATCH`).

---

## 4. Role-Based Access Control (RBAC) Matrix

| Operation | Clearance Officer (SSB-BOOTH) | Senior Supervisor (SSB-SUPERVISOR) | System Auditor |
|:---|:---:|:---:|:---:|
| **Execute Live Biometric Capture** | Yes | Yes | Read-Only |
| **View Similarity Score & Liveness** | Yes | Yes | Yes |
| **Clear Ephemeral Portraits** | Yes | Yes | No |
| **Override Biometric Mismatch** | **DENIED** | **Allowed with Digital Signature** | No |
| **Export Case Biometric Dossier** | Redacted | Full Audit | Full Audit |
| **Inspect System Audit Logs** | Local Booth Only | Station-Wide | Full Global |

---

## 5. Anti-Tampering & Client Score Spoofing Prevention
The engine architecture explicitly ignores any client-supplied match percentages. The function `performFaceVerification()` directly processes canvas image sources and executes independent gradient extraction, ensuring client-side tampering cannot inject artificial similarity values.
