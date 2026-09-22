# TRUSTGATE AI — EVIDENCE MANIFEST SPECIFICATION
**SIH Problem Statement 26188: AI-Based Fake Identity & Document Screening System**  
**Document Reference:** TG-SPEC-2026-09-MAN  
**Specification Version:** 1.0.0 (Normative)  
**Schema URI:** `https://trustgate.gov.in/schemas/evidence-manifest-v1.json`

---

## 1. Scope and Objective

This normative specification defines the canonical structure, validation rules, privacy constraints, and serialization requirements for the **TRUSTGATE AI Cryptographic Evidence Manifest**.

The evidence manifest is the central data object hashed and anchored to the permissioned blockchain ledger. It creates an immutable cryptographic binding between:
1. The physical travel document scanned at the border checkpoint.
2. The multi-stage AI inference results and Bayesian risk verdict.
3. The cryptographic checkpoint weight hashes of the AI models utilized.
4. The station attestation and digital signature of the inspecting border official.

---

## 2. Privacy & Data Minimization Invariants (Zero PII Guarantee)

In compliance with India's Digital Personal Data Protection (DPDP) Act 2023, Aadhaar Act §29, and international privacy standards:

### 2.1 FORBIDDEN ON-CHAIN ATTRIBUTES:
The manifest and ledger **MUST NEVER** contain:
- Traveler plaintext name (First Name, Surname, Given Names)
- Date of Birth (DOB) or Age
- Gender or Sex
- National Identity Numbers (Aadhaar Number, Virtual ID, PAN, Voter ID, Passport Number, Visa Number)
- Facial Biometric Feature Vectors / Embeddings
- Raw high-resolution document images or cropped portrait photos

### 2.2 PERMITTED ON-CHAIN ATTRIBUTES:
- Cryptographic SHA-256 binary hash of the raw document (`document_hash`)
- Institutional Case UUID and Human-Readable Case Code (e.g., `TG-MUCJRW6O-EA34A210`)
- Document archetype class (e.g., `passport`, `visa`, `aadhaar`, `pan`)
- Country code ISO-3166-1 alpha-3 (e.g., `IND`, `NPL`, `BGD`)
- Risk score (0–100 integer), risk level (`LOW`, `MEDIUM`, `HIGH`), and verdict (`PASS`, `FAIL`, `REVIEW`)
- AI model provenance Merkle root digest (`models_provenance_hash`)
- Border station ID (e.g., `ICP-RAXAUL-01`)
- Timestamp (UTC ISO-8601 string)
- Cryptographic digital signature (`officer_signature`) and public key (`signer_public_key`)

---

## 3. Normative JSON Schema (`v1.0.0`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://trustgate.gov.in/schemas/evidence-manifest-v1.json",
  "title": "TrustGateEvidenceManifest",
  "type": "object",
  "required": [
    "$schema",
    "manifest_version",
    "case",
    "document",
    "ai_pipeline",
    "verdict",
    "officer_attestation"
  ],
  "properties": {
    "$schema": { "type": "string" },
    "manifest_version": { "type": "string", "enum": ["1.0.0"] },
    "case": {
      "type": "object",
      "required": ["case_id", "case_code", "document_type", "priority", "is_demo"],
      "properties": {
        "case_id": { "type": "string", "format": "uuid" },
        "case_code": { "type": "string" },
        "document_type": { "type": "string" },
        "country_code": { "type": ["string", "null"] },
        "priority": { "type": "string" },
        "is_demo": { "type": "boolean" }
      }
    },
    "document": {
      "type": "object",
      "required": ["document_id", "document_hash", "processing_run_id", "file_size_bytes", "mime_type"],
      "properties": {
        "document_id": { "type": "string" },
        "document_hash": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
        "processing_run_id": { "type": "string" },
        "file_size_bytes": { "type": "integer", "minimum": 0 },
        "mime_type": { "type": "string" }
      }
    },
    "ai_pipeline": {
      "type": "object",
      "required": ["models_provenance_hash", "pipeline_latency_ms", "models"],
      "properties": {
        "models_provenance_hash": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
        "pipeline_latency_ms": { "type": "integer", "minimum": 0 },
        "models": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["key", "version", "weights_hash"],
            "properties": {
              "key": { "type": "string" },
              "version": { "type": "string" },
              "weights_hash": { "type": "string" }
            }
          }
        }
      }
    },
    "verdict": {
      "type": "object",
      "required": ["risk_score", "risk_level", "final_decision", "ai_confidence", "verdict_hash"],
      "properties": {
        "risk_score": { "type": "integer", "minimum": 0, "maximum": 100 },
        "risk_level": { "type": "string", "enum": ["LOW", "MEDIUM", "HIGH"] },
        "final_decision": { "type": "string", "enum": ["PASS", "FAIL", "REVIEW", "INCONCLUSIVE"] },
        "ai_confidence": { "type": "integer", "minimum": 0, "maximum": 100 },
        "verdict_hash": { "type": "string", "pattern": "^[0-9a-f]{64}$" }
      }
    },
    "officer_attestation": {
      "type": "object",
      "required": ["officer_id", "station_id", "decision", "timestamp_iso"],
      "properties": {
        "officer_id": { "type": "string" },
        "station_id": { "type": "string" },
        "decision": { "type": "string" },
        "timestamp_iso": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

---

## 4. Deterministic Canonicalization (RFC 8785)

Before computing `manifest_hash`, the JSON object **MUST** be normalized using the JSON Canonicalization Scheme (JCS):
1. **Key Ordering:** Lexicographical by UTF-16 code units.
2. **Whitespace:** Zero extra whitespace, no trailing spaces or newlines.
3. **Numbers:** Standard IEEE 754 without trailing zeroes.

```typescript
const canonicalString = canonicalizeJson(manifest);
const manifestHash = await computeSha256(new TextEncoder().encode(canonicalString));
```

The resulting `manifest_hash` is a uniform 64-character lowercase hexadecimal string that forms the cryptographic anchor on the blockchain ledger.
