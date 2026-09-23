/**
 * TRUSTGATE AI — CurrentScreeningContext
 * Single Source of Truth for Real Document Screening.
 * 
 * Guarantees that EVERY screening interface (Unified Hub and Screens 1–7)
 * reads strictly from the CURRENT document explicitly provided by the officer
 * via LIVE_CAMERA or FILE_UPLOAD.
 * 
 * Enforces strict execution modes:
 * - PRODUCTION (Strict real-world mode: zero mock/demo/synthetic contamination)
 * - DEMO (Visually flagged [DEMO / SYNTHETIC] test mode for jury evaluation)
 * - TRAINING (Model training and dataset preparation)
 * - EVALUATION (Offline benchmark evaluation against reference corpuses)
 */

import * as React from "react";
import type {
  FullPipelineResult,
  PipelineModule,
  PipelineStatus,
  DocumentProvenance,
} from "@/ai/types";
import { PIPELINE_STEPS, runPipeline } from "@/ai/pipeline/orchestrator";
import { computeSha256, createDocumentProvenance } from "@/lib/provenance";
import { validateUploadedFile, sanitizeErrorMessage } from "@/lib/security";
import {
  checkDatabaseIdentity,
  saveScreeningCase,
  type DatabaseIdentityCheckResult,
} from "@/lib/db";
import {
  verifyWithMidvLlm,
  verifyWithFaceForensics,
  checkMidvHealth,
  type MidvVerificationResult,
  type FaceForensicsResult,
} from "@/lib/midvService";
import { genCaseCode, uploadScreeningDocument } from "@/lib/insforge";
import { useAuthStore } from "@/store/auth";
import {
  BlockchainQueueWorker,
  IndependentVerificationEngine,
  type BlockchainAnchorRecord,
  type VerificationResult,
} from "@/lib/blockchain";

export type ExecutionMode = "PRODUCTION" | "DEMO" | "TRAINING" | "EVALUATION";

export interface AuditEventItem {
  id: string;
  time: string;
  msg: string;
  action?: string;
  eventType?: string;
  documentHash?: string;
  processingRunId?: string;
}

export interface ScreeningContextValue {
  // Execution Mode
  mode: ExecutionMode;
  setMode: (mode: ExecutionMode) => void;
  isRealDocumentMode: boolean;

  // Single Source of Truth Identifiers
  caseId: string | null;
  documentId: string | null;
  processingRunId: string | null;
  documentHash: string | null;
  captureId: string | null;
  captureSource: "LIVE_CAMERA" | "FILE_UPLOAD" | null;
  documentImage: string | null;
  documentMimeType: string | null;
  documentTimestamp: string | null;
  provenance: DocumentProvenance | null;

  // Status & Progress
  pipelineStatus: PipelineStatus;
  isProcessing: boolean;
  error: string | null;
  stageModules: PipelineModule[];
  overallProgress: number;

  // Real Multi-Stage Analysis Results
  pipelineResult: FullPipelineResult | null;
  databaseResult: DatabaseIdentityCheckResult | null;
  midvResult: MidvVerificationResult | null;
  faceForensicsResult: FaceForensicsResult | null;
  midvOnline: boolean;

  // Decision & Fusion
  compositeRisk: number | null;
  aiConfidence: number | null;
  finalDecision: "PASS" | "FAIL" | "REVIEW" | "INCONCLUSIVE" | null;
  verdictText: string;
  verdictTone: "pass" | "warning" | "critical" | "default";

  // Audit Events
  auditEvents: AuditEventItem[];
  addAuditEvent: (msg: string, action?: string, eventType?: string) => void;

  // Blockchain Anchor & Provenance
  blockchainAnchor: BlockchainAnchorRecord | null;
  blockchainStatus: "IDLE" | "PENDING" | "CONFIRMED" | "ERROR";
  verifyIntegrity: () => Promise<VerificationResult | null>;

  // Actions
  ingestDocument: (
    file: File,
    source: "LIVE_CAMERA" | "FILE_UPLOAD",
    storage?: { url?: string; key?: string; bucket?: string; width?: number; height?: number }
  ) => Promise<void>;
  resetScreening: () => void;
  loadDemoScenario: (scenarioKey: string, scenarioData: any) => void;
}

const ScreeningContext = React.createContext<ScreeningContextValue | null>(null);

export function ScreeningProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ExecutionMode>("PRODUCTION");
  const isRealDocumentMode = mode === "PRODUCTION";

  // Document Identifiers
  const [caseId, setCaseId] = React.useState<string | null>(null);
  const [documentId, setDocumentId] = React.useState<string | null>(null);
  const [processingRunId, setProcessingRunId] = React.useState<string | null>(null);
  const [documentHash, setDocumentHash] = React.useState<string | null>(null);
  const [captureId, setCaptureId] = React.useState<string | null>(null);
  const [captureSource, setCaptureSource] = React.useState<"LIVE_CAMERA" | "FILE_UPLOAD" | null>(null);
  const [documentImage, setDocumentImage] = React.useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] = React.useState<string | null>(null);
  const [documentTimestamp, setDocumentTimestamp] = React.useState<string | null>(null);
  const [provenance, setProvenance] = React.useState<DocumentProvenance | null>(null);

  // Pipeline Status & Results
  const [pipelineStatus, setPipelineStatus] = React.useState<PipelineStatus>("IDLE");
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stageModules, setStageModules] = React.useState<PipelineModule[]>(() =>
    PIPELINE_STEPS.map((s) => ({
      id: s.id,
      index: s.index,
      label: s.label,
      status: "IDLE",
    }))
  );

  const [pipelineResult, setPipelineResult] = React.useState<FullPipelineResult | null>(null);
  const [databaseResult, setDatabaseResult] = React.useState<DatabaseIdentityCheckResult | null>(null);
  const [midvResult, setMidvResult] = React.useState<MidvVerificationResult | null>(null);
  const [faceForensicsResult, setFaceForensicsResult] = React.useState<FaceForensicsResult | null>(null);
  const [midvOnline, setMidvOnline] = React.useState<boolean>(false);

  // Decision & Fusion
  const [compositeRisk, setCompositeRisk] = React.useState<number | null>(null);
  const [aiConfidence, setAiConfidence] = React.useState<number | null>(null);
  const [finalDecision, setFinalDecision] = React.useState<"PASS" | "FAIL" | "REVIEW" | "INCONCLUSIVE" | null>(null);

  // Audit Events
  const [auditEvents, setAuditEvents] = React.useState<AuditEventItem[]>([]);

  // Blockchain Anchor & Integrity State
  const [blockchainAnchor, setBlockchainAnchor] = React.useState<BlockchainAnchorRecord | null>(null);
  const [blockchainStatus, setBlockchainStatus] = React.useState<"IDLE" | "PENDING" | "CONFIRMED" | "ERROR">("IDLE");

  // Subscribe to BlockchainQueueWorker confirmations
  React.useEffect(() => {
    const unsub = BlockchainQueueWorker.getInstance().onConfirmed((anchor) => {
      if (
        (caseId && anchor.case_id === caseId) ||
        (documentHash && anchor.document_hash === documentHash)
      ) {
        setBlockchainAnchor(anchor);
        setBlockchainStatus("CONFIRMED");
      }
    });
    return unsub;
  }, [caseId, documentHash]);

  const verifyIntegrity = React.useCallback(async (): Promise<VerificationResult | null> => {
    if (!caseId) return null;
    return IndependentVerificationEngine.verifyCaseIntegrity(caseId);
  }, [caseId]);

  // Concurrency Guard Refs
  const activeRunIdRef = React.useRef<string | null>(null);
  const blobUrlRef = React.useRef<string | null>(null);

  // Check Python MIDV-2020 LLM Engine connectivity
  React.useEffect(() => {
    let active = true;
    checkMidvHealth().then((res) => {
      if (active) setMidvOnline(res.online);
    });
    return () => {
      active = false;
    };
  }, []);

  // Cleanup blob URLs on unmount
  React.useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const addAuditEvent = React.useCallback((msg: string, action?: string, eventType?: string) => {
    const item: AuditEventItem = {
      id: `EVT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString(),
      msg,
      action,
      eventType: eventType || "SCREENING_EVENT",
      documentHash: documentHash ?? undefined,
      processingRunId: processingRunId ?? undefined,
    };
    setAuditEvents((prev) => [item, ...prev.slice(0, 49)]);
  }, [documentHash, processingRunId]);

  // HARD RESET: Immediately clears all results, modules, and transient state
  const resetScreening = React.useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setCaseId(null);
    setDocumentId(null);
    setProcessingRunId(null);
    setDocumentHash(null);
    setCaptureId(null);
    setCaptureSource(null);
    setDocumentImage(null);
    setDocumentMimeType(null);
    setDocumentTimestamp(null);
    setProvenance(null);

    setPipelineStatus("IDLE");
    setIsProcessing(false);
    setError(null);
    setStageModules(
      PIPELINE_STEPS.map((s) => ({
        id: s.id,
        index: s.index,
        label: s.label,
        status: "IDLE",
      }))
    );
    setPipelineResult(null);
    setDatabaseResult(null);
    setMidvResult(null);
    setFaceForensicsResult(null);
    setCompositeRisk(null);
    setAiConfidence(null);
    setFinalDecision(null);
    setBlockchainAnchor(null);
    setBlockchainStatus("IDLE");
  }, []);

  // Mode Switcher: Enforces complete state clearing upon switching
  const setMode = React.useCallback((newMode: ExecutionMode) => {
    setModeState(newMode);
    resetScreening();
    addAuditEvent(`Execution Mode changed to ${newMode}. Screening context hard reset.`, "MODE_CHANGE");
  }, [resetScreening, addAuditEvent]);

  // PRIMARY INGESTION: Ingests a real document from camera or upload
  const ingestDocument = React.useCallback(
    async (
      file: File,
      source: "LIVE_CAMERA" | "FILE_UPLOAD",
      storage?: { url?: string; key?: string; bucket?: string; width?: number; height?: number }
    ) => {
      // 1. Concurrency Token Generation
      const runId = `RUN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      activeRunIdRef.current = runId;

      // 2. Immediate Hard Reset
      resetScreening();
      setIsProcessing(true);
      setPipelineStatus("PROCESSING");
      setError(null);
      setCaptureSource(source);

      const generatedCaseCode = genCaseCode();
      const generatedCaptureId = `CAP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setCaseId(generatedCaseCode);
      setCaptureId(generatedCaptureId);
      setProcessingRunId(runId);

      try {
        // 3. Security Validation (MIME type, magic bytes, dimensions, traversal)
        const validation = await validateUploadedFile(file);
        if (activeRunIdRef.current !== runId) return;

        if (!validation.valid) {
          setError(validation.error ?? "File validation failed.");
          setIsProcessing(false);
          setPipelineStatus("FAIL");
          setFinalDecision("FAIL");
          return;
        }

        // 4. SHA-256 Cryptographic Digest from Raw File Bytes
        const hash = await computeSha256(file);
        if (activeRunIdRef.current !== runId) return;
        setDocumentHash(hash);

        // 5. Immutable Provenance Record
        const prov = createDocumentProvenance({
          documentHash: hash,
          processingRunId: runId,
          source,
          fileSizeBytes: file.size,
          mimeType: validation.detectedMime ?? file.type,
          fileName: file.name,
          dimensions: storage?.width && storage?.height ? { width: storage.width, height: storage.height } : undefined,
        });
        setProvenance(prov);
        setDocumentId(prov.documentId);
        setDocumentMimeType(prov.mimeType);
        setDocumentTimestamp(prov.timestamp);

        // 6. Object URL for Preview & Durable Base64 Cache
        const previewUrl = storage?.url || URL.createObjectURL(file);
        blobUrlRef.current = previewUrl;
        setDocumentImage(previewUrl);

        try {
          const reader = new FileReader();
          reader.onload = () => {
            const dUrl = reader.result as string;
            if (dUrl) {
              try {
                sessionStorage.setItem("tg_doc_img_" + generatedCaseCode, dUrl);
                sessionStorage.setItem("tg_doc_img_" + prov.documentId, dUrl);
              } catch {}
            }
          };
          reader.readAsDataURL(file);
        } catch {}

        addAuditEvent(
          `Ingested ${source} (${prov.documentId}) · SHA-256: ${hash.substring(0, 16)}...`,
          "INGESTION_START"
        );

        // 7. Execute Local Screening Pipeline
        const pipeRes = await runPipeline(file, {
          provenance: prov,
          minStepMs: 100,
          onStep: (mod, partial) => {
            if (activeRunIdRef.current !== runId) return;
            setStageModules((prev) =>
              prev.map((m) =>
                m.id === mod.id ? { ...m, ...mod } : partial.modules?.find((p) => p.id === m.id) ?? m
              )
            );
          },
        });

        // Concurrency Guard Check
        if (activeRunIdRef.current !== runId) {
          console.warn("[TRUSTGATE][INTEGRITY] RESULT_REJECTED_STALE_OR_MISMATCHED (Run ID mismatch after pipeline)");
          return;
        }

        setPipelineResult(pipeRes);

        // 8. Real Database Verification (InsForge / PostgreSQL Source)
        const mrzDocNum = pipeRes.mrz?.documentNumber;
        const mrzName = pipeRes.mrz?.names
          ? typeof pipeRes.mrz.names === "string"
            ? pipeRes.mrz.names
            : [pipeRes.mrz.names.secondary, pipeRes.mrz.names.primary].filter(Boolean).join(" ")
          : null;
        const ocrDocNum = (pipeRes.ocr?.fields.find((f) => f.fieldName === "DOCUMENT_NUMBER")?.fieldValue as string) || null;
        const fullName = (pipeRes.ocr?.fields.find((f) => f.fieldName === "FULL_NAME")?.fieldValue as string) || mrzName || null;

        const dbCheck = await checkDatabaseIdentity({
          documentNumber: mrzDocNum || ocrDocNum || null,
          fullName,
        });

        if (activeRunIdRef.current !== runId) return;
        setDatabaseResult(dbCheck);

        // 9. Forensic Audit via Python LLM Engine
        const countryField = pipeRes.ocr?.fields?.find(
          (f) =>
            f.fieldName?.toLowerCase() === "country" ||
            f.fieldName?.toLowerCase() === "nationality" ||
            f.fieldName?.toLowerCase() === "issuing_state"
        );

        const auditRes = await verifyWithMidvLlm({
          doc_type: pipeRes.docDetect?.documentType,
          country: countryField?.fieldValue ?? undefined,
          aspect_ratio:
            storage?.width && storage?.height ? storage.width / storage.height : undefined,
          fields: (pipeRes.ocr?.fields || []).reduce((acc: Record<string, string>, f) => {
            if (f.fieldName && f.fieldValue) acc[f.fieldName] = f.fieldValue;
            return acc;
          }, {}),
          mrz_lines: pipeRes.mrz?.rawLines || [],
          tampering: {
            probability: pipeRes.tampering?.probability,
            regions: pipeRes.tampering?.regions,
          },
          face: {
            detected: !!pipeRes.face?.detected,
            quality: pipeRes.face?.quality,
            corneal_delta: pipeRes.face?.cornealReflectionDelta,
            landmark_asymmetry: pipeRes.face?.landmarkAsymmetry,
            liveness: pipeRes.face?.livenessScore,
          },
          capture_source: source,
          document_hash: hash,
          document_id: prov.documentId,
          processing_run_id: runId,
        });

        if (activeRunIdRef.current !== runId) return;
        setMidvResult(auditRes);

        if (auditRes.faceforensics) {
          setFaceForensicsResult(auditRes.faceforensics);
        } else {
          const ffRes = await verifyWithFaceForensics({
            face: {
              detected: !!pipeRes.face?.detected,
              quality: pipeRes.face?.quality,
            },
            tampering: {
              probability: pipeRes.tampering?.probability,
              regions: pipeRes.tampering?.regions,
            },
            capture_source: source,
            document_hash: hash,
            document_id: prov.documentId,
            processing_run_id: runId,
          });
          if (activeRunIdRef.current !== runId) return;
          setFaceForensicsResult(ffRes);
        }

        // 10. Multi-Signal Fusion & Decision Synthesis
        const computedRisk = Math.round(pipeRes.risk.score);
        const computedAiConf = pipeRes.ocr.overallConfidence > 0 ? Math.round(pipeRes.ocr.overallConfidence * 100) : 0;
        setCompositeRisk(computedRisk);
        setAiConfidence(computedAiConf);

        let decision: "PASS" | "FAIL" | "REVIEW" | "INCONCLUSIVE" = "PASS";
        if (pipeRes.risk.level === "HIGH" || computedRisk >= 70) {
          decision = "FAIL";
        } else if (pipeRes.risk.level === "MEDIUM" || computedRisk >= 35 || dbCheck.watchlistHit || dbCheck.recommendedAction === "ESCALATE_ALERT") {
          decision = "REVIEW";
        } else if (pipeRes.docDetect.documentType === "unknown" && pipeRes.ocr.fields.length === 0) {
          decision = "INCONCLUSIVE";
        }
        setFinalDecision(decision);
        setPipelineStatus(decision === "FAIL" ? "FAIL" : decision === "REVIEW" ? "WARNING" : "PASS");

        addAuditEvent(
          `Screening Completed (${runId}) · Verdict: ${decision} (Risk: ${computedRisk}/100)`,
          "SCREENING_COMPLETE"
        );

        // 11. Auto-Persist Real Case to PostgreSQL Database
        try {
          let storageUrl = storage?.url;
          let storageKey = storage?.key;
          let storageBucket = storage?.bucket;

          // If online and no cloud storage URL yet, upload original document to private InsForge storage
          if (typeof navigator !== "undefined" && navigator.onLine && file && !storageUrl) {
            try {
              const uploaded = await uploadScreeningDocument(file, generatedCaseCode);
              if (uploaded?.url) {
                storageUrl = uploaded.url;
                storageKey = uploaded.key;
                storageBucket = uploaded.bucket;
              }
            } catch (upErr) {
              console.warn("[TrustGate Storage] Direct upload notice:", upErr);
            }
          }

          const currentUserId = useAuthStore.getState().user?.id || "d78d7bfa-d033-412d-8d20-987e0019467c";
          const savedCaseId = await saveScreeningCase({
            userId: currentUserId,
            caseCode: generatedCaseCode,
            result: pipeRes,
            isDemo: false,
            storageUrl: storageUrl && !storageUrl.startsWith("blob:") ? storageUrl : undefined,
            storageKey,
            storageBucket,
            mime: validation.detectedMime ?? file.type,
            fileSizeBytes: file.size,
            imageWidth: storage?.width,
            imageHeight: storage?.height,
            countryCode: countryField?.fieldValue ?? undefined,
          });

          if (savedCaseId) {
            try {
              const cached = sessionStorage.getItem("tg_doc_img_" + generatedCaseCode);
              if (cached) {
                sessionStorage.setItem("tg_doc_img_" + savedCaseId, cached);
              }
            } catch {}
          }

          addAuditEvent(
            `Case #${generatedCaseCode} saved to live database (ID: ${savedCaseId})`,
            "DATABASE_PERSIST_SUCCESS"
          );
        } catch (saveErr) {
          console.warn("[TrustGate] Auto-persist case to PostgreSQL error:", saveErr);
        }
      } catch (err: any) {
        if (activeRunIdRef.current === runId) {
          const msg = sanitizeErrorMessage(err?.message || "Screening pipeline encountered an error");
          setError(msg);
          setPipelineStatus("FAIL");
          setFinalDecision("REVIEW");
          addAuditEvent(`Screening Pipeline Failed: ${msg}`, "SCREENING_ERROR");
        }
      } finally {
        if (activeRunIdRef.current === runId) {
          setIsProcessing(false);
        }
      }
    },
    [resetScreening, addAuditEvent]
  );

  // DEMO MODE SCENARIO LOADER (Only active when mode === "DEMO")
  const loadDemoScenario = React.useCallback(
    (scenarioKey: string, scenarioData: any) => {
      if (mode !== "DEMO") {
        console.warn("[TRUSTGATE] Cannot load demo scenario in PRODUCTION mode.");
        return;
      }
      resetScreening();

      const runId = `DEMO-RUN-${Date.now().toString(36).toUpperCase()}`;
      activeRunIdRef.current = runId;
      const fakeHash = `demo_hash_${scenarioKey}_${Date.now()}`;

      setCaseId(`DEMO-${Date.now().toString().slice(-6)}`);
      setProcessingRunId(runId);
      setDocumentId(`DEMO-DOC-${scenarioKey.toUpperCase()}`);
      setDocumentHash(fakeHash);
      setCaptureSource("FILE_UPLOAD");
      setDocumentMimeType("image/jpeg");
      setDocumentTimestamp(new Date().toISOString());

      setCompositeRisk(scenarioData.compositeRisk ?? 25);
      setAiConfidence(scenarioData.aiConfidence ?? 95);
      setFinalDecision(scenarioData.verdict ?? "PASS");
      setPipelineStatus(scenarioData.verdict === "FAIL" ? "FAIL" : scenarioData.verdict === "REVIEW" ? "WARNING" : "PASS");

      addAuditEvent(`Loaded [DEMO] benchmark scenario: ${scenarioData.title || scenarioKey}`, "DEMO_LOAD");
    },
    [mode, resetScreening, addAuditEvent]
  );

  // Progress percentage
  const overallProgress = React.useMemo(() => {
    const done = stageModules.filter((m) => m.status !== "IDLE" && m.status !== "PROCESSING").length;
    return Math.round((done / stageModules.length) * 100);
  }, [stageModules]);

  // Verdict presentation details
  const { verdictText, verdictTone } = React.useMemo(() => {
    if (!finalDecision) {
      return { verdictText: "AWAITING DOCUMENT INPUT", verdictTone: "default" as const };
    }
    switch (finalDecision) {
      case "PASS":
        return { verdictText: "LOW RISK / CLEAR", verdictTone: "pass" as const };
      case "REVIEW":
        return { verdictText: "SECONDARY HUMAN INSPECTION", verdictTone: "warning" as const };
      case "FAIL":
        return { verdictText: "HIGH RISK ESCALATION", verdictTone: "critical" as const };
      case "INCONCLUSIVE":
      default:
        return { verdictText: "INCONCLUSIVE / RE-SCAN REQUIRED", verdictTone: "warning" as const };
    }
  }, [finalDecision]);

  const value: ScreeningContextValue = {
    mode,
    setMode,
    isRealDocumentMode,
    caseId,
    documentId,
    processingRunId,
    documentHash,
    captureId,
    captureSource,
    documentImage,
    documentMimeType,
    documentTimestamp,
    provenance,
    pipelineStatus,
    isProcessing,
    error,
    stageModules,
    overallProgress,
    pipelineResult,
    databaseResult,
    midvResult,
    faceForensicsResult,
    midvOnline,
    compositeRisk,
    aiConfidence,
    finalDecision,
    verdictText,
    verdictTone,
    auditEvents,
    addAuditEvent,
    blockchainAnchor,
    blockchainStatus,
    verifyIntegrity,
    ingestDocument,
    resetScreening,
    loadDemoScenario,
  };

  return <ScreeningContext.Provider value={value}>{children}</ScreeningContext.Provider>;
}

export function useScreeningContext(): ScreeningContextValue {
  const ctx = React.useContext(ScreeningContext);
  if (!ctx) {
    throw new Error("useScreeningContext must be used within a ScreeningProvider");
  }
  return ctx;
}
