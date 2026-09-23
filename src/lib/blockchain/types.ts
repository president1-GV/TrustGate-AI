/**
 * TRUSTGATE AI — Blockchain Provenance & Evidence Integrity Types
 * AI-Based Fake Identity & Document Screening System
 * 
 * Strict Zero-PII / Zero-Biometrics Guarantee:
 * Manifests contain ONLY cryptographic hashes, opaque institutional IDs,
 * AI model weight digests, and officer attestation signatures.
 */

export interface ModelSnapshot {
  key: string;
  version: string;
  weights_hash: string;
}

export interface ManifestCaseContext {
  case_id: string;
  case_code: string;
  document_type: string;
  country_code: string | null;
  priority: string;
  is_demo: boolean;
}

export interface ManifestDocumentContext {
  document_id: string;
  document_hash: string; // SHA-256 of raw document binary
  processing_run_id: string;
  file_size_bytes: number;
  mime_type: string;
}

export interface ManifestAiPipelineContext {
  models_provenance_hash: string; // Merkle root of active AI model weights
  pipeline_latency_ms: number;
  models: ModelSnapshot[];
}

export interface ManifestVerdictContext {
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  final_decision: "PASS" | "FAIL" | "REVIEW" | "INCONCLUSIVE";
  ai_confidence: number;
  verdict_hash: string; // SHA-256 of canonical verdict tuple
}

export interface ManifestOfficerAttestation {
  officer_id: string;
  station_id: string;
  decision: string;
  timestamp_iso: string;
}

/**
 * Normalized Privacy-Preserving Evidence Manifest
 * Fully compliant with DPDP Act 2023 and Aadhaar Act §29.
 */
export interface EvidenceManifest {
  $schema: string;
  manifest_version: string;
  case: ManifestCaseContext;
  document: ManifestDocumentContext;
  ai_pipeline: ManifestAiPipelineContext;
  verdict: ManifestVerdictContext;
  officer_attestation: ManifestOfficerAttestation;
}

/**
 * Database and Ledger Anchor Record
 */
export interface BlockchainAnchorRecord {
  id?: string;
  case_id: string;
  document_id?: string | null;
  processing_run_id: string;
  manifest_version: string;
  manifest_hash: string;
  document_hash: string;
  models_provenance_hash: string;
  verdict_hash: string;
  canonical_manifest: EvidenceManifest;
  officer_signature: string;
  signer_public_key: string;
  ledger_type: "PERMISSIONED_MERKLE_ANCHOR" | "PERMISSIONED_EVM_CONSORTIUM";
  block_sequence: number;
  block_hash: string;
  parent_block_hash: string;
  transaction_id: string;
  anchor_status: "PENDING" | "CONFIRMED" | "VERIFIED" | "TAMPER_DETECTED";
  anchored_at: string;
  created_at?: string;
}

export interface IntegrityCheckDetail {
  checkName: string;
  status: "PASS" | "FAIL" | "WARNING";
  description: string;
  expectedValue: string;
  actualValue: string;
  matched: boolean;
}

export interface VerificationResult {
  verified: boolean;
  tamperDetected: boolean;
  anchorFound: boolean;
  anchorRecord: BlockchainAnchorRecord | null;
  reconstructedManifestHash: string;
  storedManifestHash: string;
  checks: IntegrityCheckDetail[];
  tamperedFields: string[];
  explanation: string;
  verifiedAt: string;
}

export interface QueueItem {
  id: string;
  caseId: string;
  documentId?: string;
  processingRunId: string;
  manifest: EvidenceManifest;
  manifestHash: string;
  attempts: number;
  maxAttempts: number;
  status: "QUEUED" | "PROCESSING" | "CONFIRMED" | "FAILED";
  enqueuedAt: number;
  lastError?: string;
}

export interface BlockchainAdapterConfig {
  ledgerType?: "PERMISSIONED_MERKLE_ANCHOR" | "PERMISSIONED_EVM_CONSORTIUM";
  stationId?: string;
  rpcEndpoint?: string;
}
