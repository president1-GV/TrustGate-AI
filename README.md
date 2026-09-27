# TRUSTGATE AI

> **See Beyond the Document.**  
> AI-assisted identity and document security screening for border operations and mission-critical verification.

---

## Overview

TRUSTGATE AI is an enterprise-grade document authenticity screening and identity verification platform engineered for authorized security and border-control personnel. It assists screeners in detecting forged, tampered, expired, or fraudulent identity and travel credentials through a multi-stage forensic analysis pipeline combined with explainable risk evaluation and tamper-evident audit logging.

**Human-in-the-Loop Principle**: The system serves as an investigative assistant. It extracts evidence and computes calibrated risk factors; final legal and operational determinations remain strictly with authorized human personnel.

---

## System Architecture

TRUSTGATE AI is architected with clear physical and logical separation across presentation, inference, persistence, and audit layers:

```text
Operator Client (React / TypeScript / Vite)
        │
        ├── Authentication & Authorization (InsForge Auth / JWT / RBAC)
        ├── Persistence Tier (PostgreSQL / Row-Level Security / 25 Tables)
        ├── Storage Tier (Private Buckets / Document Vault)
        │
        ├── Client-Side Pre-Screening & Document Geometry
        │       ├── Image Quality & Glare Assessment
        │       └── Aspect Ratio & Document Type Classification
        │
        ├── Forensic Inference Service (FastAPI / PaddleOCR / Vision Models)
        │       ├── Text Detection & Multilingual OCR (PP-OCRv6 ONNX)
        │       ├── ICAO Doc 9303 MRZ Checksum & Parsing Engine
        │       ├── Error Level Analysis (ELA) & Tampering Detection
        │       ├── Facial Feature Detection & Quality Analysis
        │       └── Sovereign Cross-Field Consistency Validation
        │
        └── TrustGate Fusion & Integrity Layer
                ├── Calibrated Multi-Factor Risk Synthesis
                ├── Deterministic Canonical Evidence Manifest
                ├── SHA-256 Digest Generation & Digital Signing
                └── Immutable Audit Trail (PostgreSQL RLS / Blockchain Anchor)
```

---

## Core Capabilities

- **High-Resolution OCR**: Multilingual text detection and bounding-box extraction across passports, visas, national ID cards, and permits.
- **Document & Field Validation**: Sovereign format validation rules verifying required attributes, logical date structures, and authority markers.
- **ICAO Doc 9303 MRZ Analysis**: Formal parsing and 7-3-1 modulo-10 checksum validation for TD1, TD2, TD3, and MRV travel documents.
- **Forensic Tampering Analysis**: Multi-spectral and Error Level Analysis (ELA) detecting localized digital manipulation, portrait substitution, and text overwriting.
- **Facial Quality & Biometric Alignment**: Pose, blur, illumination, and landmark consistency checks between document portraits and live operator captures.
- **Authorized Database Verification**: Schema-governed verification against authorized border control records, watchlists, and reference registries.
- **AI Evidence Analysis**: Structured, schema-validated forensic factor synthesis preventing prompt injection and hallucinated conclusions.
- **TrustGate Fusion Engine**: Deterministic evidence fusion combining independent signal vectors into an explainable 0–100 risk score with clear recommendations.
- **Immutable Audit Trail**: Append-only event journaling capturing every operator decision, system state change, and forensic finding.
- **Evidence Integrity & Anchoring**: Canonical cryptographic serialization generating verifiable digital signatures and tamper-evident audit anchors.

---

## Security

TRUSTGATE AI is built upon defense-in-depth principles:

| Layer | Security Controls |
| :--- | :--- |
| **Authentication** | Server-side JWT session validation, hardened password policies (12+ characters, complexity requirements), and secure session termination. |
| **Authorization & IDOR** | Strict Row-Level Security (RLS) policies at the PostgreSQL database layer ensuring strict tenancy isolation between operators, cases, and documents. |
| **Input Hardening** | Magic-byte signature verification (JPEG, PNG), MIME validation, decompression limits, and 20MB payload caps. |
| **Zero Client Trust** | Risk scores, case identifiers, document hashes, and authentication claims are strictly validated and generated server-side. |
| **Secret Management** | Zero production credentials, private signing keys, or service-role tokens in source code or client bundles. |

For security policies and vulnerability disclosure procedures, see [SECURITY.md](SECURITY.md).

---

## Data Provenance

TRUSTGATE AI maintains rigorous operational data integrity:

```text
REAL INPUT (Live Camera / Certified Upload)
     ↓
PROCESSING RUN (Unique processing_run_id + SHA-256 document hash)
     ↓
STRUCTURED EVIDENCE (OCR fields, MRZ results, ELA metrics, biometric data)
     ↓
TRUSTGATE FUSION (Traceable, deterministic multi-factor calculation)
     ↓
CANONICAL AUDIT (Immutable audit log + digital signature anchor)
```

- **Production Screening vs. Training Separation**: Authentic screening operations ingest only live camera feeds or genuine operator uploads. Benchmark datasets (MIDV-500, MIDV-2020, KYC academic corpora) remain strictly segregated for offline validation.
- **Processing Run Isolation**: Every screening event binds to a distinct `case_id`, `document_id`, `processing_run_id`, and `document_hash` to prevent cross-document contamination.

---

## Third-Party Components

TRUSTGATE AI incorporates selected open-source libraries, neural frameworks, and research benchmark standards under their respective licenses.

All third-party components remain governed exclusively by their original licenses (including Apache 2.0, MIT, CC BY 4.0, and ISC). No ownership is claimed over any third-party software, models, or datasets.

For detailed third-party attributions, licenses, and statutory notices, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

## License

**TRUSTGATE AI is proprietary software.**

Original TRUSTGATE AI software, models, architecture, workflows, documentation, and source code are protected by copyright law and distributed under the terms of the proprietary view-only license.

For complete license terms, see the [LICENSE](LICENSE) file.

---

## Important Notice

**Proprietary and Confidential — View-Only Distribution.**

No license or permission is granted to reproduce, modify, adapt, redistribute, republish, sublicense, sell, commercially exploit, or create derivative works from Licensor-owned materials without prior written authorization, subject to applicable law and GitHub Terms of Service.

*AI-generated screening assistance. Final determination remains with authorized personnel.*
