# TRUSTGATE AI — BLOCKCHAIN TECHNOLOGY ARCHITECTURE DECISION
**Border Gateway National Border Security Standard: AI-Based Fake Identity & Document Screening System**  
**Document Reference:** TG-ADR-2026-09-BC  
**Classification:** ARCHITECTURAL DECISION RECORD (ADR) — INSTITUTIONAL INTEGRITY  
**Date:** September 2026

---

## 1. Context and Problem Statement

Under Border Gateway Problem Border Gateway Standard, TRUSTGATE AI is deployed at national border checkpoints and transit hubs (e.g., Land Ports Authority of India / SSB ICP Raxaul) to screen travel credentials and identity documents in real-time.

To prevent evidence tampering, rogue insider deletion, retro-fitted verdict manipulation, or dispute over AI model version accountability during border prosecutions, TRUSTGATE AI requires an immutable, verifiable, cryptographically signed audit anchor layer.

The operational parameters demand:
1. **Sub-second checkpoint throughput:** Clearance decisions must not stall waiting for block confirmation.
2. **Zero cryptocurrency / Zero gas tokens:** Government and law enforcement agencies cannot hold volatile cryptocurrency or manage public gas wallets.
3. **Strict Zero-PII / Zero-Biometrics:** No Aadhaar, PAN, Passport, biometric embeddings, or images may ever touch the ledger (DPDP Act 2023 compliance).
4. **Air-gap & Offline resilience:** When border network connectivity is severed, screenings must continue with local cryptographic nonces and anchor automatically upon reconnection.
5. **Independent Judicial Verification:** Court magistrates, external forensic auditors, and border agency supervisors must be able to independently verify whether a screening record, AI model weight, or officer decision has been tampered with.

---

## 2. Comparative Evaluation Matrix

| Criterion | Public EVM (Ethereum / Polygon) | Hyperledger Fabric | Permissioned Enterprise EVM / Subnet (Besu/Quorum) | Verifiable Cryptographic Merkle State Accumulator (Enterprise Anchor) |
| :--- | :--- | :--- | :--- | :--- |
| **Token / Gas Speculation** | ❌ High risk, requires native gas tokens (ETH, MATIC) | ✅ Tokenless (Chaincode) | ✅ Tokenless (Zero gas / permissioned validators) | ✅ Completely Tokenless |
| **Throughput & Latency** | ❌ 12-15s block time, high fee volatility | ⚠️ Endorsement + Orderer ~1-2s | ✅ Sub-second (~400ms) deterministic finality | ✅ Immediate (<100ms) with batch/interval anchor |
| **Operational Simplicity** | ❌ Complex wallet & key management for officers | ❌ Complex multi-CA, MSP, Orderer infrastructure | ⚠️ Moderate (RPC node cluster) | ✅ High (Self-contained, verifiable, zero heavy node bloat) |
| **Air-Gap / Offline Tolerance** | ❌ None (Rejects offline state) | ⚠️ Local chaincode requires Raft ordering | ⚠️ Reconnection queue needed | ✅ Native store-and-forward with Merkle chain |
| **External Verifiability** | ✅ Publicly queryable | ❌ Requires org MSP credentials | ✅ Verifiable via JSON-RPC or public block explorer | ✅ Verifiable via standalone public Merkle root & signature |
| **DPDP Act / PII Compliance** | ⚠️ Risky if misconfigured | ✅ Private data collections | ✅ Smart contract access control | ✅ Strict privacy-preserving hash-only anchoring |

---

## 3. Decision: Hybrid Permissioned EVM & Verifiable Merkle State Accumulator

### 3.1 Architectural Choice
TRUSTGATE AI adopts a **Pluggable Enterprise Cryptographic Anchor Architecture** driven by a strict interface:
`BlockchainAuditAdapter`.

The architecture implements two complementary, production-grade modes:
1. **Verifiable Cryptographic State Accumulator (Primary In-Memory & Database-Backed Anchor):**
   - Implemented via `VerifiableMerkleAuditAnchor`.
   - Generates deterministic SHA-256 Merkle trees across discrete screening intervals or single high-priority cases.
   - Computes canonical `manifest_hash`, binds it to an asymmetric Ed25519/ECDSA server-side digital signature, and chains anchors sequentially using previous block hashes (`parent_block_hash`).
   - Enables instant, self-contained, air-gapped cryptographic verification without external cloud RPC dependencies.
2. **Permissioned EVM / RPC Integration Adapter (Secondary Distributed Settlement):**
   - Implemented via `PermissionedEvmAuditAdapter`.
   - Posts `recordAuditAnchor(bytes32 manifestHash, bytes32 documentHash, bytes32 modelRootHash, uint8 verdictCode, uint32 timestamp)` to a permissioned EVM ledger (e.g., Hyperledger Besu or Private Polygon Supernet / Avalanche Subnet) operated by institutional border consortium nodes (MHA, IB, NIC).
   - Zero gas configuration (`gasPrice = 0` via whitelisted validator permissioning).

### 3.2 Key Invariants & Guarantees
1. **Asynchronous Non-Blocking Execution:** The border screening pipeline writes to PostgreSQL immediately, returns clearance to the officer, and hands the evidence manifest off to an asynchronous in-memory & persistent queue (`BlockchainQueueWorker`).
2. **Idempotency:** Anchoring requests are keyed by `(case_id, processing_run_id, manifest_hash)`. Duplicate submissions are detected and short-circuited.
3. **Deterministic Canonicalization:** All manifest objects are serialized via RFC 8785 JSON Canonicalization Scheme (JCS) before hashing, ensuring cross-platform, cross-language reproducibility.
4. **Tamper Detection (Hostile Mutation Defense):** If any database field (`cases.risk_score`, `documents.document_hash`, `cases.officer_decision`, `model_versions.version`) is modified after anchoring, the recomputed manifest hash diverges from the stored ledger receipt, immediately triggering `TAMPERED_INTEGRITY_VIOLATION`.

---

## 4. Evidence Manifest Specification

```json
{
  "$schema": "https://trustgate.gov.in/schemas/evidence-manifest-v1.json",
  "manifest_version": "1.0.0",
  "case": {
    "case_id": "84c8f5bb-f273-455b-bb66-cfbf878021cb",
    "case_code": "TG-MUCJRW6O-EA34A210",
    "document_type": "passport",
    "country_code": "IND",
    "priority": "NORMAL",
    "is_demo": false
  },
  "document": {
    "document_id": "DOC-7F83B1657FF1",
    "document_hash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "processing_run_id": "RUN-MUCJRW6O-8X9Y",
    "file_size_bytes": 1048576,
    "mime_type": "image/jpeg"
  },
  "ai_pipeline": {
    "models_provenance_hash": "a1b2c3d4e5f6...",
    "pipeline_latency_ms": 1420,
    "models": [
      { "key": "document", "version": "v3.1.0-prod", "weights_hash": "sha256:88fa..." },
      { "key": "ocr", "version": "v2.4.1-prod", "weights_hash": "sha256:77bc..." },
      { "key": "mrz", "version": "v1.9.4-prod", "weights_hash": "sha256:99de..." },
      { "key": "tampering", "version": "v2.2.0-prod", "weights_hash": "sha256:33fa..." },
      { "key": "face", "version": "v4.0.2-c23", "weights_hash": "sha256:11ab..." },
      { "key": "risk", "version": "v2.5.0-prod", "weights_hash": "sha256:44ef..." }
    ]
  },
  "verdict": {
    "risk_score": 12,
    "risk_level": "LOW",
    "final_decision": "PASS",
    "verdict_hash": "e6c382f..."
  },
  "officer_attestation": {
    "officer_id": "d78d7bfa-d033-412d-8d20-987e0019467c",
    "station_id": "ICP-RAXAUL-01",
    "decision": "CLEARED",
    "timestamp_iso": "2026-09-22T16:20:00.000Z"
  }
}
```

---

## 5. Security & Legal Auditability

- **DPDP Act 2023:** Absolute data minimization. Zero PII stored on-chain.
- **Indian Evidence Act §65B:** The cryptographic receipt, server-side asymmetric signature, and immutable block sequence provide direct evidentiary admissibility for electronic border records.
- **Air-Gap Capability:** The offline Merkle tree builder operates identically in local IndexedDB and PostgreSQL, allowing border posts to synchronize sealed blocks upon reconnection.

---
*Architectural Decision Ratified and Adopted.*
