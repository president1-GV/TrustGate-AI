/**
 * TRUSTGATE AI — Blockchain Evidence Integrity & Provenance Test Suite
 * AI-Based Fake Identity & Document Screening System
 * 
 * Tests:
 * 1. RFC 8785 JSON Canonicalization Scheme (JCS)
 * 2. Asymmetric Station Digital Attestations & Signature Verification
 * 3. Merkle Tree Root Computation & Inclusion Proofs
 * 4. Privacy-Preserving Evidence Manifest Generation (Zero PII Guarantee)
 * 5. Sequential Block Chaining & Idempotency
 * 6. Hostile Database Mutation & Evidentiary Tamper Detection
 * 7. Asynchronous Queue Worker Resilience & Bounded Retry
 */

import { describe, it, expect } from "vitest";
import { canonicalizeJson } from "@/lib/blockchain/canonicalize";
import {
  getStationPublicKey,
  signManifestHash,
  verifyManifestSignature,
} from "@/lib/blockchain/signing";
import { MerkleTree } from "@/lib/blockchain/merkle";
import { ModelManifestService, PRODUCTION_MODEL_SNAPSHOTS } from "@/lib/blockchain/modelProvenance";
import { EvidenceManifestService } from "@/lib/blockchain/manifest";
import { PermissionedBlockchainAdapter } from "@/lib/blockchain/adapter";
import { BlockchainQueueWorker } from "@/lib/blockchain/queue";

describe("TRUSTGATE AI — BLOCKCHAIN INTEGRITY & PROVENANCE SUITE", () => {
  // --------------------------------------------------------------------------
  // Group 1: RFC 8785 JSON Canonicalization Scheme (JCS)
  // --------------------------------------------------------------------------
  describe("Group 1: Deterministic JSON Canonicalization (RFC 8785)", () => {
    it("CANONICAL-01: Normalizes key ordering regardless of object insertion order", () => {
      const objA = { z: 1, a: "test", m: true, d: { beta: 2, alpha: 1 } };
      const objB = { m: true, d: { alpha: 1, beta: 2 }, a: "test", z: 1 };

      const canonA = canonicalizeJson(objA);
      const canonB = canonicalizeJson(objB);

      expect(canonA).toBe(canonB);
      expect(canonA).toBe('{"a":"test","d":{"alpha":1,"beta":2},"m":true,"z":1}');
    });

    it("CANONICAL-02: Handles arrays, numbers, booleans, and null values deterministically", () => {
      const complex = {
        tags: ["border", "biometrics", "passport"],
        count: 42,
        active: false,
        missing: null,
      };

      const result = canonicalizeJson(complex);
      expect(result).toBe('{"active":false,"count":42,"missing":null,"tags":["border","biometrics","passport"]}');
    });
  });

  // --------------------------------------------------------------------------
  // Group 2: Station Cryptographic Signing & Verification
  // --------------------------------------------------------------------------
  describe("Group 2: Border Station Cryptographic Attestation & Signatures", () => {
    it("SIGN-01: Generates deterministic public key for designated border checkpoint", async () => {
      const pubKey1 = await getStationPublicKey("ICP-RAXAUL-01");
      const pubKey2 = await getStationPublicKey("ICP-RAXAUL-01");

      expect(pubKey1).toBe(pubKey2);
      expect(pubKey1).toMatch(/^0xPUB_ICPRAXAUL01_[0-9a-f]{32}$/);
    });

    it("SIGN-02: Signs manifest hash and verifies signature successfully", async () => {
      const dummyManifestHash = "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069";
      const { signature, publicKey } = await signManifestHash(
        dummyManifestHash,
        "ICP-RAXAUL-01",
        "SSB-OFFICER-44"
      );

      expect(signature).toMatch(/^SIG-TG-ED25519-[0-9a-f]{64}$/);

      const isValid = await verifyManifestSignature(
        dummyManifestHash,
        signature,
        publicKey,
        "ICP-RAXAUL-01",
        "SSB-OFFICER-44"
      );
      expect(isValid).toBe(true);
    });

    it("SIGN-03: Rejects forged or altered manifest hash", async () => {
      const originalHash = "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069";
      const tamperedHash = "1111111111111111111111111111111111111111111111111111111111111111";

      const { signature, publicKey } = await signManifestHash(originalHash, "ICP-RAXAUL-01", "SYSTEM");

      const isTamperedValid = await verifyManifestSignature(
        tamperedHash,
        signature,
        publicKey,
        "ICP-RAXAUL-01",
        "SYSTEM"
      );
      expect(isTamperedValid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Group 3: Merkle Tree & Inclusion Proofs
  // --------------------------------------------------------------------------
  describe("Group 3: AI Model Provenance Merkle Tree", () => {
    it("MERKLE-01: Computes deterministic Merkle root across 8 production models", async () => {
      const { rootHash, models } = await ModelManifestService.computeModelsProvenanceHash(
        PRODUCTION_MODEL_SNAPSHOTS
      );

      expect(models.length).toBe(8);
      expect(rootHash).toMatch(/^[0-9a-f]{64}$/);

      // Re-running produces identical root hash
      const { rootHash: rootHash2 } = await ModelManifestService.computeModelsProvenanceHash(
        PRODUCTION_MODEL_SNAPSHOTS
      );
      expect(rootHash).toBe(rootHash2);
    });

    it("MERKLE-02: Generates and validates cryptographic inclusion proof for a model leaf", async () => {
      const leaves = await Promise.all(
        PRODUCTION_MODEL_SNAPSHOTS.map((m) => ModelManifestService.computeModelLeafHash(m))
      );

      const tree = await MerkleTree.create(leaves);
      const root = tree.getRoot();

      // Check inclusion proof for model index 2 ('identity')
      const targetIndex = 2;
      const targetLeaf = leaves[targetIndex];
      const proof = tree.getProof(targetIndex);

      expect(proof.length).toBeGreaterThan(0);
      const proofValid = await MerkleTree.verifyProof(targetLeaf, proof, root);
      expect(proofValid).toBe(true);

      // Tampered leaf fails verification
      const fakeLeaf = "9999999999999999999999999999999999999999999999999999999999999999";
      const fakeProofValid = await MerkleTree.verifyProof(fakeLeaf, proof, root);
      expect(fakeProofValid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Group 4: Privacy-Preserving Evidence Manifest Construction
  // --------------------------------------------------------------------------
  describe("Group 4: Zero-PII Evidence Manifest Construction", () => {
    it("MANIFEST-01: Generates normalized manifest without any PII or biometric embeddings", async () => {
      const params = {
        caseId: "84c8f5bb-f273-455b-bb66-cfbf878021cb",
        caseCode: "TG-MUCJRW6O-EA34A210",
        documentType: "passport",
        countryCode: "IND",
        priority: "NORMAL",
        isDemo: false,
        documentId: "DOC-7F83B1657FF1",
        documentHash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        processingRunId: "RUN-MUCJRW6O-8X9Y",
        fileSizeBytes: 1048576,
        mimeType: "image/jpeg",
        riskScore: 12,
        riskLevel: "LOW" as const,
        finalDecision: "PASS" as const,
        aiConfidence: 96,
        pipelineLatencyMs: 1420,
        officerId: "SSB-OFFICER-8842",
        stationId: "ICP-RAXAUL-01",
      };

      const { manifest, canonicalJson, manifestHash } = await EvidenceManifestService.buildManifest(params);

      // Manifest structure tests
      expect(manifest.manifest_version).toBe("1.0.0");
      expect(manifest.case.case_code).toBe("TG-MUCJRW6O-EA34A210");
      expect(manifest.document.document_hash).toBe(params.documentHash);
      expect(manifest.verdict.risk_score).toBe(12);
      expect(manifest.verdict.final_decision).toBe("PASS");

      // Verify zero PII: no names, dates of birth, biometric vectors
      const jsonString = JSON.stringify(manifest);
      expect(jsonString).not.toContain("Aadhaar");
      expect(jsonString).not.toContain("passportNumber");
      expect(jsonString).not.toContain("dateOfBirth");
      expect(jsonString).not.toContain("faceEmbedding");

      expect(manifestHash).toMatch(/^[0-9a-f]{64}$/);
      expect(canonicalJson).toContain('"manifest_version":"1.0.0"');
    });

    it("MANIFEST-02: Computes identical manifest hash for identical input", async () => {
      const params = {
        caseId: "84c8f5bb-f273-455b-bb66-cfbf878021cb",
        caseCode: "TG-TEST-CASE-1",
        documentType: "passport",
        documentId: "DOC-112233",
        documentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        processingRunId: "RUN-TEST-01",
        riskScore: 45,
        riskLevel: "MEDIUM" as const,
        finalDecision: "REVIEW" as const,
        timestampIso: "2026-09-22T16:00:00.000Z",
      };

      const res1 = await EvidenceManifestService.buildManifest(params);
      const res2 = await EvidenceManifestService.buildManifest(params);

      expect(res1.manifestHash).toBe(res2.manifestHash);
      expect(res1.canonicalJson).toBe(res2.canonicalJson);
    });
  });

  // --------------------------------------------------------------------------
  // Group 5: Permissioned Blockchain Adapter & Sequential Chaining
  // --------------------------------------------------------------------------
  describe("Group 5: Permissioned Blockchain Sequential Chaining & Anchoring", () => {
    it("ANCHOR-01: Anchors evidence manifest and links previous block hash", async () => {
      const adapter = PermissionedBlockchainAdapter.getInstance();

      const manifestParams = {
        caseId: `test-case-${Date.now()}`,
        caseCode: `TG-CHAIN-${Date.now()}`,
        documentType: "passport",
        documentId: "DOC-CHAIN-01",
        documentHash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        processingRunId: `RUN-CHAIN-${Date.now()}`,
        riskScore: 8,
        riskLevel: "LOW" as const,
        finalDecision: "PASS" as const,
      };

      const { manifest, manifestHash, verdictHash, modelsProvenanceHash } =
        await EvidenceManifestService.buildManifest(manifestParams);

      const anchor = await adapter.anchorEvidence({
        manifest,
        manifestHash,
        documentHash: manifest.document.document_hash,
        modelsProvenanceHash,
        verdictHash,
        stationId: "ICP-RAXAUL-01",
        officerId: "TEST-OFFICER",
      });

      expect(anchor).toBeDefined();
      expect(anchor.manifest_hash).toBe(manifestHash);
      expect(anchor.document_hash).toBe(manifest.document.document_hash);
      expect(anchor.block_sequence).toBeGreaterThanOrEqual(1);
      expect(anchor.block_hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(anchor.transaction_id).toMatch(/^0x[0-9a-f]{64}$/);
      expect(anchor.parent_block_hash).toBeDefined();
      expect(anchor.officer_signature).toMatch(/^SIG-TG-ED25519-/);
    });
  });

  // --------------------------------------------------------------------------
  // Group 6: Hostile Mutation & Tamper Detection Simulation
  // --------------------------------------------------------------------------
  describe("Group 6: Hostile Mutation & Evidentiary Tamper Detection", () => {
    it("TAMPER-01: Altering risk score in manifest creates diverging hash", async () => {
      const baseParams = {
        caseId: "84c8f5bb-f273-455b-bb66-cfbf878021cb",
        caseCode: "TG-TAMPER-CASE-1",
        documentType: "passport",
        documentId: "DOC-ORIGINAL",
        documentHash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        processingRunId: "RUN-ORIGINAL",
        riskScore: 12,
        riskLevel: "LOW" as const,
        finalDecision: "PASS" as const,
        timestampIso: "2026-09-22T16:00:00.000Z",
      };

      const sealed = await EvidenceManifestService.buildManifest(baseParams);

      // Rogue insider manipulates risk score to 85 (HIGH risk)
      const tamperedParams = {
        ...baseParams,
        riskScore: 85,
        riskLevel: "HIGH" as const,
        finalDecision: "FAIL" as const,
      };

      const tampered = await EvidenceManifestService.buildManifest(tamperedParams);

      // Hashes must diverge completely
      expect(tampered.manifestHash).not.toBe(sealed.manifestHash);
      expect(tampered.verdictHash).not.toBe(sealed.verdictHash);
    });

    it("TAMPER-02: Document substitution attack alters manifest hash", async () => {
      const baseParams = {
        caseId: "84c8f5bb-f273-455b-bb66-cfbf878021cb",
        caseCode: "TG-SUBST-CASE-1",
        documentType: "passport",
        documentId: "DOC-ORIGINAL",
        documentHash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        processingRunId: "RUN-ORIGINAL",
        riskScore: 10,
        riskLevel: "LOW" as const,
        finalDecision: "PASS" as const,
        timestampIso: "2026-09-22T16:00:00.000Z",
      };

      const sealed = await EvidenceManifestService.buildManifest(baseParams);

      // Attacker swaps the original document with a forged document image
      const substitutedParams = {
        ...baseParams,
        documentHash: "bad0000000000000000000000000000000000000000000000000000000000bad",
      };

      const substituted = await EvidenceManifestService.buildManifest(substitutedParams);

      expect(substituted.manifestHash).not.toBe(sealed.manifestHash);
    });

    it("TAMPER-03: Model checkpoint modification alters AI model provenance root", async () => {
      const normalRoot = (await ModelManifestService.computeModelsProvenanceHash(PRODUCTION_MODEL_SNAPSHOTS)).rootHash;

      // Attacker silently replaced FaceForensics weights
      const modifiedSnapshots = PRODUCTION_MODEL_SNAPSHOTS.map((m) =>
        m.key === "face"
          ? { ...m, weights_hash: "sha256:forged_checkpoint_weights_000000000000000000000000" }
          : m
      );

      const modifiedRoot = (await ModelManifestService.computeModelsProvenanceHash(modifiedSnapshots)).rootHash;

      expect(modifiedRoot).not.toBe(normalRoot);
    });
  });

  // --------------------------------------------------------------------------
  // Group 7: Asynchronous Queue Worker
  // --------------------------------------------------------------------------
  describe("Group 7: Asynchronous Queue Worker Resilience", () => {
    it("QUEUE-01: Enqueues and drains items asynchronously without throwing", async () => {
      const queue = BlockchainQueueWorker.getInstance();

      const manifestParams = {
        caseId: `test-q-${Date.now()}`,
        caseCode: `TG-Q-${Date.now()}`,
        documentType: "passport",
        documentId: "DOC-Q-01",
        documentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        processingRunId: `RUN-Q-${Date.now()}`,
        riskScore: 20,
        riskLevel: "LOW" as const,
        finalDecision: "PASS" as const,
      };

      const { manifest, manifestHash } = await EvidenceManifestService.buildManifest(manifestParams);

      const qId = queue.enqueue({
        caseId: manifestParams.caseId,
        documentId: manifestParams.documentId,
        processingRunId: manifestParams.processingRunId,
        manifest,
        manifestHash,
      });

      expect(qId).toBeDefined();

      // Enqueueing the exact same item again returns the deduplication key
      const dupId = queue.enqueue({
        caseId: manifestParams.caseId,
        documentId: manifestParams.documentId,
        processingRunId: manifestParams.processingRunId,
        manifest,
        manifestHash,
      });
      expect(dupId).toContain(manifestParams.caseId);
    });
  });
});
