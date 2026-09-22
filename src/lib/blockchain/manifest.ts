/**
 * TRUSTGATE AI — Privacy-Preserving Evidence Manifest Service
 * 
 * Synthesizes screening context, AI results, and officer attestation into
 * a canonical, zero-PII cryptographic evidence manifest compliant with
 * the DPDP Act 2023 and Indian Evidence Act §65B.
 */

import { computeSha256 } from "@/lib/provenance";
import { canonicalizeJson } from "./canonicalize";
import { ModelManifestService } from "./modelProvenance";
import type {
  EvidenceManifest,
  ManifestCaseContext,
  ManifestDocumentContext,
  ManifestVerdictContext,
  ManifestOfficerAttestation,
} from "./types";

export interface CreateManifestParams {
  caseId: string;
  caseCode: string;
  documentType: string;
  countryCode?: string | null;
  priority?: string;
  isDemo?: boolean;

  documentId: string;
  documentHash: string;
  processingRunId: string;
  fileSizeBytes?: number;
  mimeType?: string;

  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  finalDecision: "PASS" | "FAIL" | "REVIEW" | "INCONCLUSIVE";
  aiConfidence?: number;
  pipelineLatencyMs?: number;

  officerId?: string;
  stationId?: string;
  officerDecision?: string;
  timestampIso?: string;
}

export class EvidenceManifestService {
  /**
   * Computes the deterministic hash of the canonical clearance verdict tuple.
   */
  public static async computeVerdictHash(
    riskScore: number,
    riskLevel: string,
    finalDecision: string,
    aiConfidence: number
  ): Promise<string> {
    const raw = `VERDICT:${riskScore}:${riskLevel}:${finalDecision}:${aiConfidence}`;
    return computeSha256(new TextEncoder().encode(raw));
  }

  /**
   * Builds the complete EvidenceManifest struct.
   */
  public static async buildManifest(params: CreateManifestParams): Promise<{
    manifest: EvidenceManifest;
    canonicalJson: string;
    manifestHash: string;
    verdictHash: string;
    modelsProvenanceHash: string;
  }> {
    const { rootHash, models } = await ModelManifestService.computeModelsProvenanceHash();

    const normalizedConfidence = Math.round(params.aiConfidence ?? 90);
    const verdictHash = await this.computeVerdictHash(
      Math.round(params.riskScore),
      params.riskLevel,
      params.finalDecision,
      normalizedConfidence
    );

    const manifestCase: ManifestCaseContext = {
      case_id: params.caseId,
      case_code: params.caseCode,
      document_type: params.documentType || "unknown",
      country_code: params.countryCode || null,
      priority: params.priority || "NORMAL",
      is_demo: !!params.isDemo,
    };

    const manifestDocument: ManifestDocumentContext = {
      document_id: params.documentId,
      document_hash: params.documentHash,
      processing_run_id: params.processingRunId,
      file_size_bytes: params.fileSizeBytes ?? 0,
      mime_type: params.mimeType || "image/jpeg",
    };

    const manifestVerdict: ManifestVerdictContext = {
      risk_score: Math.round(params.riskScore),
      risk_level: params.riskLevel,
      final_decision: params.finalDecision,
      ai_confidence: normalizedConfidence,
      verdict_hash: verdictHash,
    };

    const manifestOfficer: ManifestOfficerAttestation = {
      officer_id: params.officerId || "SYSTEM",
      station_id: params.stationId || "ICP-RAXAUL-01",
      decision: params.officerDecision || params.finalDecision,
      timestamp_iso: params.timestampIso || new Date().toISOString(),
    };

    const manifest: EvidenceManifest = {
      $schema: "https://trustgate.gov.in/schemas/evidence-manifest-v1.json",
      manifest_version: "1.0.0",
      case: manifestCase,
      document: manifestDocument,
      ai_pipeline: {
        models_provenance_hash: rootHash,
        pipeline_latency_ms: Math.round(params.pipelineLatencyMs ?? 1200),
        models,
      },
      verdict: manifestVerdict,
      officer_attestation: manifestOfficer,
    };

    // Serialize strictly using RFC 8785 JSON Canonicalization Scheme (JCS)
    const canonicalJson = canonicalizeJson(manifest);
    const manifestHash = await computeSha256(new TextEncoder().encode(canonicalJson));

    return {
      manifest,
      canonicalJson,
      manifestHash,
      verdictHash,
      modelsProvenanceHash: rootHash,
    };
  }
}
