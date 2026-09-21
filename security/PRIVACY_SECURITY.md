# TrustGate AI Billion — Privacy Architecture & Biometric Data Security

**Platform:** TRUSTGATE AI BILLION  
**Document Type:** Privacy & Data Protection Architecture  
**Standards Alignment:** GDPR, India Digital Personal Data Protection (DPDP) Act 2023, ISO/IEC 27701  
**Audience:** Compliance Officers, Privacy Engineers, System Auditors  

---

## 1. Privacy-by-Design Principles

TrustGate AI Billion processes identity documents, biometric portraits, and personal identifiable information (PII) for sovereign border control and high-assurance verification. The platform enforces the following core privacy principles:

1. **Strict Data Minimization**: Only information essential for identity verification and document authenticity screening is extracted and processed.
2. **Zero Biometric Vector Persistence**: Raw high-dimensional biometric facial embeddings are never stored in persistent database tables.
3. **Purpose Limitation**: Data collected during screening is isolated to verification and fraud detection and cannot be repurposed.
4. **Automated Lifecycle Expiration**: Case documents and screening metadata are governed by strict retention periods (default 7 days).
5. **Deny-by-Default Access Scoping**: PII and extracted document attributes are protected by multi-level database Row Level Security (RLS) linked to case assignment.

---

## 2. Biometric Data Protection Architecture

Facial analysis and cross-matching are critical components of document tampering and impostor detection. Biometrics are handled through a zero-retention ephemeral pipeline:

```
[Document Image] + [Live Face / Photo]
            │
            ▼
┌──────────────────────────────┐
│ Ephemeral Client Memory      │
│ (Canvas / WASM Model)        │
├──────────────────────────────┤
│ 1. Extract 128-d Vector      │ (In-memory Float32Array only)
│ 2. Compute Cosine Distance   │
│ 3. Score Liveness & Pose     │
└──────────────┬───────────────┘
               │
               ▼ Emits scalar verification scores only
┌──────────────────────────────┐
│ Persistent Database Record   │
│ (public.face_results)        │
├──────────────────────────────┤
│ • match_score (0-100)        │
│ • liveness_passed (boolean)  │
│ • quality_score (0-100)      │
│ • NO raw embedding vector    │
└──────────────────────────────┘
```

### 2.1 Database Protections for Biometrics
- **Table `face_embeddings_metadata`**: Contains an explicit safety flag `stored = false`.
- **Hardened RLS Policy**: An explicit database policy `WITH CHECK (false)` prevents all database roles (officer, supervisor, admin) from inserting raw biometric vector data into persistent storage.
- **Audit Exclusion**: Automated audit serialization strips any field named `embedding`, `vector`, or `biometric_template` before committing metadata to `audit_logs`.

---

## 3. PII Handling & Document Confidentiality

### 3.1 OCR & MRZ Data Scoping
- Optical Character Recognition (OCR) and Machine Readable Zone (MRZ) extraction parses standard ICAO Doc 9303 fields (e.g. document number, nationality, date of birth, expiration date, name).
- Extracted fields are stored in `ocr_fields` and `mrz_results` child tables.
- **Access Control**: These tables require multi-table `JOIN` validation against `cases.created_by = auth.uid() OR cases.assigned_to = auth.uid()` or supervisor/admin clearance. Unauthorized officers cannot query PII across unassigned cases.

### 3.2 Private Document Storage
- Document images uploaded during screening are stored in private InsForge Storage buckets (`public: false`).
- Direct URL fetching is blocked.
- Viewing identity documents in the Case Detail interface requires authenticated streaming via `fetchSecureBlobUrl()`. Resulting `blob:http...` object URLs are kept in browser memory and explicitly revoked when navigating away.

---

## 4. Retention & Disposal Lifecycle

| Data Category | Tables / Buckets | Retention Period | Disposal Mechanism |
|---|---|---|---|
| **Raw Uploaded Images** | `screening-documents` bucket | 7 days (Configurable) | Scheduled cleanup job via InsForge Storage API |
| **OCR & MRZ Attributes** | `ocr_fields`, `mrz_results` | 7 days | Cascading delete on parent case record |
| **Screening Results** | `cases`, `screenings`, `risk_scores` | 30 days / Enterprise policy | Soft-deletion flag -> hard purge after retention window |
| **Audit Logs** | `audit_logs` | 365 days / Regulatory standard | Immutable ledger; archived to cold compliance vault |

---

## 5. Privacy Compliance & Audit Readiness

- **Right to Erasure (GDPR Art. 17 / DPDP)**: Supports single-command case deletion triggers that cascade through `cases`, `documents`, `screenings`, and child verification tables.
- **Audit Logging of Access**: Every view, status alteration, or report export produces an entry in `audit_logs` identifying the accessing officer, timestamp, and purpose.
- **Third-Party Evaluation Notice**: Formal certification under ISO 27701 and DPDP third-party audit assessments are categorized as **NOT YET EVALUATED** pending formal independent accredited lab certification.
