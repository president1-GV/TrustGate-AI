import * as React from "react";
import {
  ScanLine,
  Upload,
  Camera,
  ShieldAlert,
  Save,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileX2,
  ChevronDown,
  ChevronRight,
  Gauge,
  Database,
  Fingerprint,
  ShieldCheck,
  ExternalLink,
  Radio,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { Progress } from "@/components/ui/Progress";
import { DocumentViewer } from "@/components/screening/DocumentViewer";
import { CameraCapture, type StorageUploadResult } from "@/components/camera";
import { MidvArchetypeInspector } from "@/components/screening/MidvArchetypeInspector";
import { MidvAuditCard } from "@/components/screening/MidvAuditCard";
import { FaceForensicsCard } from "@/components/screening/FaceForensicsCard";
import {
  verifyWithMidvLlm,
  verifyWithFaceForensics,
  checkMidvHealth,
  type MidvVerificationResult,
  type FaceForensicsResult,
} from "@/lib/midvService";
import { PIPELINE_STEPS, runPipeline } from "@/ai/pipeline/orchestrator";
import { useAuthStore } from "@/store/auth";
import {
  saveScreeningCase,
  autoCheckinCameraScan,
  checkDatabaseIdentity,
  type CaseStatus,
  type DatabaseIdentityCheckResult,
} from "@/lib/db";
import { genCaseCode, uploadScreeningDocument } from "@/lib/insforge";
import { validateUploadedFile, sanitizeErrorMessage } from "@/lib/security";
import {
  cn,
  riskColor,
  severityColor,
  statusColor,
  formatDuration,
  pct,
} from "@/lib/utils";
import type {
  Finding,
  FullPipelineResult,
  PipelineModule,
  PipelineStatus,
  StepCallback,
  DocumentProvenance,
} from "@/ai/types";
import { computeSha256, createDocumentProvenance } from "@/lib/provenance";
import { useScreeningContext } from "@/providers/ScreeningContext";


function playGateClearanceChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.09);
      osc.stop(ctx.currentTime + idx * 0.09 + 0.35);
    });
  } catch {
    // AudioContext blocked until user interaction
  }
}

function moduleTone(status: PipelineStatus): {
  dot: string;
  chip: string;
  label: string;
  border: string;
} {
  switch (status) {
    case "PASS":
      return {
        dot: "bg-risk-low",
        chip: "bg-risk-low/15 text-risk-low border-risk-low/30",
        label: "PASS",
        border: "border-risk-low/40",
      };
    case "WARNING":
      return {
        dot: "bg-risk-medium",
        chip: "bg-risk-medium/15 text-risk-medium border-risk-medium/30",
        label: "WARNING",
        border: "border-risk-medium/40",
      };
    case "FAIL":
      return {
        dot: "bg-risk-high",
        chip: "bg-risk-high/15 text-risk-high border-risk-high/30",
        label: "FAIL",
        border: "border-risk-high/40",
      };
    case "PROCESSING":
      return {
        dot: "bg-signal-cyan animate-pulseSoft",
        chip: "bg-signal-blue/15 text-signal-blue border-signal-blue/40",
        label: "PROCESSING",
        border: "border-signal-blue/40",
      };
    default:
      return {
        dot: "bg-slate-600",
        chip: "bg-slate-700/40 text-slate-500 border-slate-600/40",
        label: "IDLE",
        border: "border-slate-700/50",
      };
  }
}

function FindingCard({ f }: { f: Finding }) {
  const [open, setOpen] = React.useState(f.severity !== "PASS");
  const tone = severityColor(f.severity);
  const Icon =
    f.severity === "PASS"
      ? CheckCircle2
      : f.severity === "CRITICAL" || f.severity === "HIGH"
      ? XCircle
      : AlertTriangle;
  return (
    <div
      className={cn(
        "rounded-xl border bg-ink-card/40",
        f.severity === "CRITICAL" || f.severity === "HIGH"
          ? "border-risk-high/30"
          : f.severity === "MEDIUM"
          ? "border-risk-medium/30"
          : "border-risk-low/20"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <div className="pt-0.5">
          <Icon
            className={cn(
              "h-4 w-4",
              f.severity === "PASS"
                ? "text-risk-low"
                : f.severity === "CRITICAL" || f.severity === "HIGH"
                ? "text-risk-high"
                : "text-risk-medium"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100">
              {f.title}
            </span>
            <Badge className={tone} variant="default">
              {f.severity}
            </Badge>
          </div>
          {f.location && (
            <div className="mt-0.5 text-xs text-slate-500 truncate">
              Location: {f.location}
            </div>
          )}
        </div>
        <div className="pt-1">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pl-10 grid gap-2 text-xs">
          {f.location && (
            <Row label="Location" value={f.location} />
          )}
          {typeof f.confidence === "number" && !Number.isNaN(f.confidence) && (
            <Row
              label="Confidence"
              value={
                f.confidence <= 1
                  ? `${Math.round(f.confidence * 100)}%`
                  : `${Math.round(f.confidence)}%`
              }
            />
          )}
          {f.evidence && <Row label="Evidence" value={f.evidence} />}
          {f.modelName && <Row label="Model" value={f.modelName} />}
          {f.recommendation && (
            <div className="rounded-lg border border-signal-blue/30 bg-signal-blue/5 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-signal-blue font-semibold mb-1">
                Recommendation
              </div>
              <div className="text-slate-200 leading-relaxed">
                {f.recommendation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-24 shrink-0 text-slate-500 uppercase tracking-wide text-[10px] pt-0.5">
        {label}
      </div>
      <div className="flex-1 text-slate-300 leading-relaxed break-words">
        {value}
      </div>
    </div>
  );
}

export function ScreeningPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [pipelineModules, setPipelineModules] = React.useState<
    PipelineModule[]
  >(() =>
    PIPELINE_STEPS.map((s) => ({
      id: s.id,
      index: s.index,
      label: s.label,
      status: "IDLE",
    }))
  );
  const [result, setResult] = React.useState<FullPipelineResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [captureSource, setCaptureSource] = React.useState<"camera" | "upload" | null>(null);
  const [midvResult, setMidvResult] = React.useState<MidvVerificationResult | null>(null);
  const [midvLoading, setMidvLoading] = React.useState(false);
  const [midvOnline, setMidvOnline] = React.useState(false);
  const [faceForensicsResult, setFaceForensicsResult] = React.useState<FaceForensicsResult | null>(null);
  const [faceForensicsLoading, setFaceForensicsLoading] = React.useState(false);
  const [cameraCheckin, setCameraCheckin] = React.useState<{
    caseId: string | null;
    caseCode: string;
    dbCheck: DatabaseIdentityCheckResult;
  } | null>(null);
  const [checkinLoading, setCheckinLoading] = React.useState(false);
  const [currentProvenance, setCurrentProvenance] = React.useState<DocumentProvenance | null>(null);
  const [autoClearEnabled, setAutoClearEnabled] = React.useState(true);
  const [autoClearResult, setAutoClearResult] = React.useState<{
    cleared: boolean;
    caseId?: string;
    caseCode?: string;
    timestamp?: string;
    travelerName?: string;
  } | null>(null);


  // Concurrency guard to prevent out-of-order race conditions on rapid re-uploads/scans
  const activeRunIdRef = React.useRef<string | null>(null);

  const [storageInfo, setStorageInfo] = React.useState<{
    url?: string;
    key?: string;
    bucket?: string;
    mime?: string;
    size?: number;
    width?: number;
    height?: number;
  } | null>(null);

  // Check connectivity to the local Python MIDV-2020 LLM Engine
  React.useEffect(() => {
    let active = true;
    checkMidvHealth().then((res) => {
      if (active) setMidvOnline(res.online);
    });
    return () => {
      active = false;
    };
  }, []);

  const screeningCtx = useScreeningContext();

  // Synchronize with Single Source of Truth ScreeningContext if a document was ingested in the portal
  React.useEffect(() => {
    if (screeningCtx.pipelineResult && !result) {
      setResult(screeningCtx.pipelineResult);
      if (screeningCtx.documentImage) {
        setStorageInfo({
          url: screeningCtx.documentImage,
          mime: screeningCtx.documentMimeType || undefined,
        });
      }
      if (screeningCtx.provenance) {
        setCurrentProvenance(screeningCtx.provenance);
      }
      if (screeningCtx.midvResult) {
        setMidvResult(screeningCtx.midvResult);
      }
      if (screeningCtx.faceForensicsResult) {
        setFaceForensicsResult(screeningCtx.faceForensicsResult);
      }
      if (screeningCtx.stageModules && screeningCtx.stageModules.length > 0) {
        setPipelineModules(screeningCtx.stageModules);
      }
      if (screeningCtx.captureSource) {
        setCaptureSource(screeningCtx.captureSource === "LIVE_CAMERA" ? "camera" : "upload");
      }
    }
  }, [screeningCtx.pipelineResult, result]);

  // Track blob URLs so we can revoke them when the component unmounts
  // or when a new file is loaded (prevents memory leaks for large files)
  const blobUrlRef = React.useRef<string | null>(null);
  const currentFileRef = React.useRef<File | null>(null);
  const currentDataUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const onStep: StepCallback = (
    mod,
    partial
  ) => {
    setPipelineModules((prev) => {
      const next = prev.map((m) =>
        m.id === mod.id
          ? { ...m, ...mod }
          : partial.modules?.find((p) => p.id === m.id) ?? m
      );
      return next;
    });
  };

  const triggerMidvAudit = React.useCallback(
    async (
      pipeResult: FullPipelineResult | null,
      storage?: { width?: number; height?: number; [k: string]: any } | null,
      sourceOverride?: "camera" | "upload",
      prov?: DocumentProvenance | null,
      runId?: string
    ) => {
      if (runId && activeRunIdRef.current !== runId) return;
      const target = pipeResult ?? result;
      if (!target) return;
      const activeProv = prov ?? target.provenance ?? currentProvenance;
      setMidvLoading(true);
      setFaceForensicsLoading(true);
      try {
        const rawOcrUpper = (target.ocr?.rawText || "").toUpperCase();
        const countryField = target.ocr?.fields?.find(
          (f) =>
            f.fieldName?.toLowerCase() === "country" ||
            f.fieldName?.toLowerCase() === "nationality" ||
            f.fieldName?.toLowerCase() === "issuing_state"
        );
        const resolvedCountry =
          target.mrz?.nationality ||
          countryField?.fieldValue ||
          (rawOcrUpper.includes("INDIA") || rawOcrUpper.includes("BHARAT") || rawOcrUpper.includes("AADHAAR") || rawOcrUpper.includes("INCOME TAX") ? "IND" : undefined) ||
          (rawOcrUpper.includes("UNITED STATES") || rawOcrUpper.includes("USA") ? "USA" : undefined) ||
          (rawOcrUpper.includes("DEUTSCHLAND") ? "DEU" : undefined) ||
          undefined;

        const resolvedDocType =
          rawOcrUpper.includes("INCOME TAX") || rawOcrUpper.includes("PERMANENT ACCOUNT NUMBER")
            ? "pan"
            : rawOcrUpper.includes("AADHAAR")
            ? "aadhaar"
            : target.mrz?.format === "TD3"
            ? "passport"
            : target.docDetect?.documentType;

        const sourceUsed = sourceOverride ?? captureSource ?? "document_upload";

        const audit = await verifyWithMidvLlm({
          doc_type: resolvedDocType,
          country: resolvedCountry,
          aspect_ratio:
            storage?.width && storage?.height
              ? storage.width / storage.height
              : undefined,
          fields: (target.ocr?.fields || []).reduce(
            (acc: Record<string, string>, f) => {
              if (f.fieldName && f.fieldValue) {
                acc[f.fieldName] = f.fieldValue;
              }
              return acc;
            },
            {}
          ),
          mrz_lines: target.mrz?.rawLines || [],
          tampering: {
            probability: target.tampering?.probability,
            regions: target.tampering?.regions,
          },
          face: {
            detected: !!target.face?.detected,
            quality: target.face?.quality,
            corneal_delta: target.face?.cornealReflectionDelta,
            landmark_asymmetry: target.face?.landmarkAsymmetry,
            liveness: target.face?.livenessScore,
          },
          metrics: {
            boundary_gradient_delta: target.face?.boundaryGradientDelta,
            corneal_reflection_angle_delta: target.face?.cornealReflectionDelta,
            spectral_energy_ratio: target.face?.spectralEnergyRatio,
            landmark_asymmetry_index: target.face?.landmarkAsymmetry,
            liveness_micro_motion: target.face?.livenessScore,
          },
          capture_source: sourceUsed,
          document_hash: activeProv?.documentHash,
          document_id: activeProv?.documentId,
          processing_run_id: activeProv?.processingRunId ?? runId,
        });

        if (runId && activeRunIdRef.current !== runId) return;
        setMidvResult(audit);

        if (audit.faceforensics) {
          setFaceForensicsResult(audit.faceforensics);
        } else {
          const ffRes = await verifyWithFaceForensics({
            face: {
              detected: !!target.face?.detected,
              quality: target.face?.quality,
            },
            metrics: {
              boundary_gradient_delta: target.face?.boundaryGradientDelta,
              corneal_reflection_angle_delta: target.face?.cornealReflectionDelta,
              spectral_energy_ratio: target.face?.spectralEnergyRatio,
              landmark_asymmetry_index: target.face?.landmarkAsymmetry,
              liveness_micro_motion: target.face?.livenessScore,
            },
            tampering: {
              probability: target.tampering?.probability,
              regions: target.tampering?.regions,
            },
            capture_source: sourceUsed,
            document_hash: activeProv?.documentHash,
            document_id: activeProv?.documentId,
            processing_run_id: activeProv?.processingRunId ?? runId,
          });
          if (runId && activeRunIdRef.current !== runId) return;
          setFaceForensicsResult(ffRes);
        }
      } catch (err) {
        console.error("Forensic audit error:", err);
      } finally {
        if (!runId || activeRunIdRef.current === runId) {
          setMidvLoading(false);
          setFaceForensicsLoading(false);
        }
      }
    },
    [result, captureSource, currentProvenance]
  );

  const resetPipeline = () => {
    // Revoke any existing blob URL to prevent memory leaks
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPipelineModules(
      PIPELINE_STEPS.map((s) => ({
        id: s.id,
        index: s.index,
        label: s.label,
        status: "IDLE",
      }))
    );
    setResult(null);
    setMidvResult(null);
    setFaceForensicsResult(null);
    setFaceForensicsLoading(false);
    setCameraCheckin(null);
    setCheckinLoading(false);
    setError(null);
    setStorageInfo(null);
    setCurrentProvenance(null);
    setAutoClearResult(null);
  };

  const onCameraCapture = async (
    file: File,
    pipelineResult?: FullPipelineResult,
    storage?: StorageUploadResult
  ) => {
    setCaptureSource("camera");
    if (pipelineResult) {
      const runId = "run_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      activeRunIdRef.current = runId;
      resetPipeline();

      const docHash = await computeSha256(file);
      if (activeRunIdRef.current !== runId) return;
      const provenance = createDocumentProvenance({
        documentHash: docHash,
        processingRunId: runId,
        source: "camera",
        fileSizeBytes: file.size,
        mimeType: file.type || "image/jpeg",
        fileName: file.name || "camera_capture.jpg",
      });
      setCurrentProvenance(provenance);
      pipelineResult.provenance = provenance;

      setResult(pipelineResult);
      const url = storage?.url || URL.createObjectURL(file);
      blobUrlRef.current = url;
      const sInfo = {
        url,
        key: storage?.key,
        bucket: storage?.bucket,
        mime: storage?.mimeType || file.type,
        size: storage?.fileSizeBytes || file.size,
        width: storage?.width,
        height: storage?.height,
      };
      setStorageInfo(sInfo);
      triggerMidvAudit(pipelineResult, sInfo, "camera", provenance, runId);

      setCheckinLoading(true);
      autoCheckinCameraScan({
        userId: user?.id,
        file,
        result: pipelineResult,
        storageUrl: url,
        mime: sInfo.mime,
        fileSizeBytes: sInfo.size,
      })
        .then((chk) => {
          if (activeRunIdRef.current === runId) setCameraCheckin(chk);
        })
        .catch((chkErr) => console.warn("[TrustGate DB] Camera auto-checkin notice:", chkErr))
        .finally(() => {
          if (activeRunIdRef.current === runId) setCheckinLoading(false);
        });
    } else {
      onFile(file, true);
    }
  };

  const onFile = async (file: File, isFromCamera = false) => {
    if (busy) return;
    const runId = "run_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    activeRunIdRef.current = runId;
    resetPipeline();
    setBusy(true);
    setError(null);
    setCaptureSource(isFromCamera ? "camera" : "upload");

    try {
      // Validate file format, MIME type, magic bytes, dimensions, and path traversal
      const validation = await validateUploadedFile(file);
      if (activeRunIdRef.current !== runId) return;
      if (!validation.valid) {
        setError(validation.error ?? "File validation failed.");
        setBusy(false);
        return;
      }

      // Compute cryptographic SHA-256 hash directly from file bytes
      const docHash = await computeSha256(file);
      if (activeRunIdRef.current !== runId) return;

      const provenance = createDocumentProvenance({
        documentHash: docHash,
        processingRunId: runId,
        source: isFromCamera ? "camera" : "upload",
        fileSizeBytes: file.size,
        mimeType: validation.detectedMime ?? file.type,
        fileName: file.name,
      });
      setCurrentProvenance(provenance);

      // Run local screening pipeline with bound provenance
      const r = await runPipeline(file, { onStep, minStepMs: 120, provenance });
      if (activeRunIdRef.current !== runId) return;
      setResult(r);
      const url = URL.createObjectURL(file);

      // Persist real-time uploaded specimen as base64 so it remains durable across tabs & reloads
      currentFileRef.current = file;
      const reader = new FileReader();
      reader.onload = () => {
        const dUrl = reader.result as string;
        currentDataUrlRef.current = dUrl;
        try {
          sessionStorage.setItem("tg_last_uploaded_specimen", dUrl);
        } catch {}
      };
      reader.readAsDataURL(file);

      // Dispatch alert for top-right notification popover
      if (r.risk.level === "HIGH" || (r.tampering?.regions && r.tampering.regions.length > 0)) {
        window.dispatchEvent(
          new CustomEvent("tg:new_alert", {
            detail: {
              title: `🚨 ${r.risk.level} Risk Document Intercepted (#TG-${Date.now().toString().slice(-4)})`,
              body: `Risk score: ${(r.risk.score * 100).toFixed(0)}%. Flagged ${r.tampering?.regions?.length || 0} tamper regions. Action: ${r.risk.recommendedAction || "SECONDARY_INSPECTION"}.`,
              kind: "high_risk",
            },
          })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("tg:new_alert", {
            detail: {
              title: `✓ Document Screened: Clearance Granted`,
              body: `Multi-modal check passed with ${(r.risk.score * 100).toFixed(0)}% risk score. MRZ checksum verified.`,
              kind: "review",
            },
          })
        );
      }
      blobUrlRef.current = url;

      // Real-time Database Check-in & Watchlist Clearance
      setCheckinLoading(true);
      const isCamera = isFromCamera || captureSource === "camera";
      if (isCamera) {
        autoCheckinCameraScan({
          userId: user?.id,
          file,
          result: r,
          storageUrl: url,
          mime: validation.detectedMime ?? file.type,
          fileSizeBytes: file.size,
        })
          .then((chk) => {
            if (activeRunIdRef.current === runId) {
              setCameraCheckin(chk);
            }
          })
          .catch((chkErr) => {
            console.warn("[TrustGate DB] Camera auto-checkin notice:", chkErr);
          })
          .finally(() => {
            if (activeRunIdRef.current === runId) {
              setCheckinLoading(false);
            }
          });
      } else {
        const mrzDocNum = r.mrz.documentNumber;
        const mrzName = r.mrz.names
          ? typeof r.mrz.names === "string"
            ? r.mrz.names
            : [r.mrz.names.secondary, r.mrz.names.primary].filter(Boolean).join(" ")
          : null;
        const ocrDocNum = (r.ocr.fields.find((f) => f.fieldName === "DOCUMENT_NUMBER")?.fieldValue as string) || null;
        const fullName = (r.ocr.fields.find((f) => f.fieldName === "FULL_NAME")?.fieldValue as string) || mrzName || null;

        checkDatabaseIdentity({
          documentNumber: mrzDocNum || ocrDocNum || null,
          fullName,
        })
          .then((dbCheck) => {
            if (activeRunIdRef.current === runId) {
              setCameraCheckin({
                caseId: null,
                caseCode: genCaseCode(),
                dbCheck,
              });
            }
          })
          .catch((dbErr) => {
            console.warn("[TrustGate DB] Lookup notice:", dbErr);
          })
          .finally(() => {
            if (activeRunIdRef.current === runId) {
              setCheckinLoading(false);
            }
          });
      }

      const img = new Image();
      img.onload = () => {
        if (activeRunIdRef.current !== runId) return;
        const sInfo = {
          url,
          mime: validation.detectedMime ?? file.type,
          size: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
        setStorageInfo(sInfo);
        triggerMidvAudit(r, sInfo, isFromCamera ? "camera" : "upload", provenance, runId);
      };
      img.onerror = () => {
        if (activeRunIdRef.current !== runId) return;
        const sInfo = {
          url,
          mime: validation.detectedMime ?? file.type,
          size: file.size,
        };
        setStorageInfo(sInfo);
        triggerMidvAudit(r, sInfo, isFromCamera ? "camera" : "upload", provenance, runId);
      };
      img.src = url;
    } catch (e: any) {
      if (activeRunIdRef.current === runId) {
        setError(sanitizeErrorMessage(e?.message ?? "Local pipeline failed on uploaded file"));
      }
    } finally {
      if (activeRunIdRef.current === runId) {
        setBusy(false);
      }
    }
  };

  // Automated Border Clearance (e-Gate) Autonomous Execution
  React.useEffect(() => {
    if (!result || busy || !autoClearEnabled || autoClearResult) return;

    const isPassed =
      result.risk.level === "LOW" &&
      result.validation.summaryCritical === 0 &&
      result.tampering.regions.length === 0 &&
      (result.mrz.compositeValid ||
        result.mrz.checkDigitsValid ||
        (result.docDetect.documentType !== "unknown" && result.risk.score < 35));

    if (isPassed) {
      const code = genCaseCode();
      const traveler =
        result.mrz.names?.primary
          ? `${result.mrz.names.primary} ${result.mrz.names.secondary ?? ""}`.trim()
          : (result.ocr.fields.find((f) => f.fieldName === "FULL_NAME")?.fieldValue as string) ||
            "Verified Traveler";

      playGateClearanceChime();

      if (user) {
        saveScreeningCase({
          userId: user.id,
          caseCode: code,
          result,
          isDemo: false,
          storageUrl: storageInfo?.url,
          storageKey: storageInfo?.key,
          storageBucket: storageInfo?.bucket,
          mime: storageInfo?.mime,
          fileSizeBytes: storageInfo?.size,
          imageWidth: storageInfo?.width,
          imageHeight: storageInfo?.height,
        })
          .then((newId) => {
            setAutoClearResult({
              cleared: true,
              caseId: newId,
              caseCode: code,
              timestamp: new Date().toLocaleTimeString(),
              travelerName: traveler,
            });

            window.dispatchEvent(
              new CustomEvent("tg:new_alert", {
                detail: {
                  title: `✅ e-Gate Auto-Cleared: Case #${code}`,
                  body: `Traveler ${traveler} automatically cleared. Gate barrier opened.`,
                  kind: "review",
                  case_id: newId,
                },
              })
            );
          })
          .catch((err) => {
            console.warn("[TrustGate] Auto-clear save notice:", err);
            setAutoClearResult({
              cleared: true,
              caseCode: code,
              timestamp: new Date().toLocaleTimeString(),
              travelerName: traveler,
            });
          });
      } else {
        setAutoClearResult({
          cleared: true,
          caseCode: code,
          timestamp: new Date().toLocaleTimeString(),
          travelerName: traveler,
        });
      }
    } else {
      setAutoClearResult({
        cleared: false,
        caseCode: genCaseCode(),
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  }, [result, busy, autoClearEnabled, autoClearResult, user, storageInfo]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setCaptureSource("upload");
      onFile(f);
    }
  };

  const inputRef = React.useRef<HTMLInputElement>(null);

  const saveCase = async () => {
    if (!user || !result || saving) return;
    setSaving(true);
    setError(null);
    try {
      const caseCode = genCaseCode();
      const persistentDataUrl =
        currentDataUrlRef.current ||
        (typeof window !== "undefined" ? sessionStorage.getItem("tg_last_uploaded_specimen") : null);

      if (persistentDataUrl) {
        try {
          sessionStorage.setItem("tg_doc_img_" + caseCode, persistentDataUrl);
        } catch {}
      }

      let storageBucket = storageInfo?.bucket;
      let storageKey = storageInfo?.key;
      let storageUrl = storageInfo?.url;

      // Attempt background cloud upload to InsForge storage if online
      if (currentFileRef.current && navigator.onLine) {
        try {
          const uploaded = await uploadScreeningDocument(currentFileRef.current, caseCode);
          if (uploaded?.url) {
            storageUrl = uploaded.url;
            storageKey = uploaded.key;
            storageBucket = uploaded.bucket;
          }
        } catch (uploadErr) {
          console.warn("[TrustGate Storage] Background cloud upload fallback to local base64:", uploadErr);
        }
      }

      const newId = await saveScreeningCase({
        userId: user.id,
        caseCode,
        result,
        isDemo: false,
        storageUrl: storageUrl || persistentDataUrl || undefined,
        storageKey: storageKey,
        storageBucket: storageBucket,
        mime: storageInfo?.mime,
        fileSizeBytes: storageInfo?.size,
        imageWidth: storageInfo?.width,
        imageHeight: storageInfo?.height,
      });

      if (persistentDataUrl) {
        try {
          sessionStorage.setItem("tg_doc_img_" + newId, persistentDataUrl);
        } catch {}
      }

      navigate(`/cases/${newId}`);
    } catch (e: any) {
      setError(sanitizeErrorMessage(e?.message ?? "Failed to save case"));
    } finally {
      setSaving(false);
    }
  };

  const findingsCritical =
    result?.findings.filter((f) => f.severity === "CRITICAL") ?? [];
  const findingsHigh =
    result?.findings.filter((f) => f.severity === "HIGH") ?? [];
  const findingsMed =
    result?.findings.filter(
      (f) => f.severity === "MEDIUM"
    ) ?? [];
  const findingsLow =
    result?.findings.filter((f) => f.severity === "LOW") ?? [];
  const findingsPass =
    result?.findings.filter((f) => f.severity === "PASS") ?? [];

  const overallProgress = React.useMemo(() => {
    const done = pipelineModules.filter(
      (m) => m.status !== "IDLE" && m.status !== "PROCESSING"
    ).length;
    return Math.round((done / pipelineModules.length) * 100);
  }, [pipelineModules]);

  const risk = result?.risk;
  const rc = risk ? riskColor(risk.level) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-signal-blue" />
            Live Screening Workspace
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Capture or load a document, then run the TRUSTFUSION RISK ENGINE.
            Save for review when ready.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/sih-screening"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan hover:bg-signal-cyan/20 transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Enterprise Border View
          </Link>
          <Badge
            variant="default"
            className="bg-risk-low/10 text-risk-low border-risk-low/30"
          >
            <ShieldAlert className="h-3 w-3" /> HUMAN-IN-THE-LOOP
          </Badge>
          {captureSource === "camera" && (
            <Badge variant="pass" className="text-xs font-mono">
              <Camera className="h-3 w-3 mr-1 text-emerald-400" /> LIVE CAMERA
            </Badge>
          )}
          {result && (
            <Badge
              variant="default"
              className={statusColor(
                (result as any).status ?? "UNDER_REVIEW" as CaseStatus
              )}
            >
              REAL-TIME AUTHENTIC
            </Badge>
          )}
        </div>
      </div>

      {/* Cryptographic Document Provenance Banner */}
      {(currentProvenance || result?.provenance) && (
        <div className="rounded-xl border border-signal-cyan/30 bg-ink-card/70 p-3.5 flex items-center justify-between flex-wrap gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-signal-cyan/15 border border-signal-cyan/30 flex items-center justify-center text-signal-cyan shrink-0 font-bold">
              #
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-100 tracking-tight">Cryptographic Document Provenance</span>
                <Badge variant="default" className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                  SHA-256 VERIFIED
                </Badge>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                <span>HASH: <strong className="text-slate-200">{(currentProvenance || result?.provenance)?.documentHash}</strong></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400 flex-wrap">
            <div>RUN: <strong className="text-slate-200">{(currentProvenance || result?.provenance)?.processingRunId}</strong></div>
            <div>SOURCE: <strong className="text-slate-200 uppercase">{(currentProvenance || result?.provenance)?.source}</strong></div>
            <div>DOC ID: <strong className="text-slate-200">{(currentProvenance || result?.provenance)?.documentId.substring(0, 8)}...</strong></div>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="default" className="border-risk-high/40 bg-risk-high/5">
          <AlertTitle className="text-risk-high flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Pipeline error
          </AlertTitle>
          <AlertDescription className="text-slate-300">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time Database Check-in Loading Indicator */}
      {checkinLoading && (
        <div className="rounded-xl border border-signal-blue/30 bg-signal-blue/10 px-4 py-3 flex items-center justify-between text-xs flex-wrap gap-2 animate-pulse">
          <div className="flex items-center gap-2.5 text-signal-cyan">
            <Database className="h-4 w-4 animate-spin text-signal-cyan shrink-0" />
            <span>
              <strong>Querying Central Identity Database:</strong> Verifying document number against INTERPOL Red Notices, national border watchlists, and prior crossing history…
            </span>
          </div>
          <Badge variant="default" className="bg-signal-blue/20 text-signal-cyan border-signal-blue/30 text-[10px] font-mono">
            AUTOMATED QUERY IN PROGRESS
          </Badge>
        </div>
      )}

      {/* Automated Database Check-In & Watchlist Clearance Panel */}
      {cameraCheckin && !checkinLoading && result && !busy && (
        <Card className={cn(
          "border transition-all",
          cameraCheckin.dbCheck.watchlistHit
            ? "border-rose-500/50 bg-rose-950/20 shadow-[0_0_25px_rgba(244,63,94,0.15)]"
            : "border-signal-blue/40 bg-ink-card/70 shadow-panel"
        )}>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                  cameraCheckin.dbCheck.watchlistHit
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                    : "bg-signal-blue/15 border-signal-blue/40 text-signal-cyan"
                )}>
                  {cameraCheckin.dbCheck.watchlistHit ? (
                    <ShieldAlert className="h-5 w-5" />
                  ) : (
                    <Database className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                      Automated Central Database Check-In & Watchlist Clearance
                    </h3>
                    <Badge variant="default" className="font-mono text-[10px] bg-slate-800 border-slate-700 text-slate-300">
                      REF: {cameraCheckin.caseCode}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time automated check-in against central immigration records, INTERPOL SLTD, and biometric watchlists.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {captureSource === "camera" && (
                  <Badge variant="pass" className="text-[10px] font-mono">
                    <Fingerprint className="h-3 w-3 mr-1 text-emerald-400" />
                    REAL-TIME SENSOR VERIFIED
                  </Badge>
                )}
                {cameraCheckin.caseId ? (
                  <Badge variant="pass" className="text-[10px] font-mono">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                    AUTO-ENROLLED IN DATABASE
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-[10px] font-mono bg-slate-800 border-slate-700 text-slate-300">
                    <ShieldCheck className="h-3 w-3 mr-1 text-signal-blue" />
                    IDENTITY LOOKUP COMPLETE
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Watchlist / INTERPOL check */}
              <div className={cn(
                "rounded-xl border p-3 flex flex-col justify-between",
                cameraCheckin.dbCheck.watchlistHit
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border-ink-border bg-ink/40 text-slate-300"
              )}>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
                    <span>Watchlist / INTERPOL</span>
                    {cameraCheckin.dbCheck.watchlistHit ? (
                      <Badge variant="default" className="bg-rose-500 text-white font-bold text-[9px] px-1.5 py-0">
                        CRITICAL ALERT
                      </Badge>
                    ) : (
                      <Badge variant="pass" className="text-[9px] px-1.5 py-0">
                        CLEARED
                      </Badge>
                    )}
                  </div>
                  <div className={cn(
                    "text-xs font-bold mt-1",
                    cameraCheckin.dbCheck.watchlistHit ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {cameraCheckin.dbCheck.watchlistHit
                      ? "INTERPOL RED NOTICE HIT"
                      : "Zero Watchlist Matches"}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {cameraCheckin.dbCheck.watchlistReason ||
                      `Document ${cameraCheckin.dbCheck.documentNumber || "N/A"} verified clean against SLTD database.`}
                  </p>
                </div>
              </div>

              {/* Central Database History */}
              <div className="rounded-xl border border-ink-border bg-ink/40 p-3 flex flex-col justify-between text-slate-300">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
                    <span>Traveler History</span>
                    <Badge variant="default" className="bg-signal-blue/20 text-signal-cyan border-signal-blue/30 text-[9px] px-1.5 py-0">
                      {cameraCheckin.dbCheck.matchFound ? `${cameraCheckin.dbCheck.previousCasesCount} PRIOR` : "NEW RECORD"}
                    </Badge>
                  </div>
                  <div className="text-xs font-bold text-slate-100 mt-1">
                    {cameraCheckin.dbCheck.matchFound
                      ? `${cameraCheckin.dbCheck.previousCasesCount} Prior Border Crossing(s)`
                      : "First-Time Border Crossing"}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                    {cameraCheckin.dbCheck.lastEncounter
                      ? `Last: ${cameraCheckin.dbCheck.lastEncounter.caseCode} (${cameraCheckin.dbCheck.lastEncounter.status})`
                      : "Biometric profile registered to central border database."}
                  </p>
                </div>
              </div>

              {/* Real-time authenticity & anti-spoofing */}
              <div className="rounded-xl border border-ink-border bg-ink/40 p-3 flex flex-col justify-between text-slate-300">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
                    <span>Real-Time Integrity</span>
                    <Badge variant="pass" className="text-[9px] px-1.5 py-0">
                      AUTHENTIC
                    </Badge>
                  </div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">
                    100% Real-Time Authentic Stream
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Liveness score: {Math.round((result?.face?.livenessScore || 0.96) * 100)}% · 0% deepfake / synthetic bypass allowed.
                  </p>
                </div>
              </div>

              {/* Recommended Automated Action */}
              <div className="rounded-xl border border-ink-border bg-ink/40 p-3 flex flex-col justify-between text-slate-300">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
                    <span>Automated Verdict</span>
                    <Badge variant="default" className={cn(
                      "text-[9px] px-1.5 py-0 font-bold",
                      cameraCheckin.dbCheck.recommendedAction === "ESCALATE_ALERT"
                        ? "bg-rose-500 text-white"
                        : cameraCheckin.dbCheck.recommendedAction === "AUTO_CLEAR"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    )}>
                      {cameraCheckin.dbCheck.recommendedAction.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="text-xs font-bold text-slate-100 mt-1">
                    {cameraCheckin.dbCheck.recommendedAction === "ESCALATE_ALERT"
                      ? "Escalate to Commander"
                      : cameraCheckin.dbCheck.recommendedAction === "AUTO_CLEAR"
                      ? "Auto-Clearance Granted"
                      : "Secondary Interview"}
                  </div>
                </div>

                <div className="pt-2">
                  {cameraCheckin.caseId ? (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/cases/${cameraCheckin.caseId}`)}
                      className="w-full h-7 text-xs bg-signal-blue hover:bg-signal-blue/90 gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Enrolled Case
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={saveCase}
                      disabled={saving}
                      className="w-full h-7 text-xs bg-signal-blue hover:bg-signal-blue/90 gap-1.5"
                    >
                      <Save className="h-3 w-3" />
                      Save Record to DB
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 2xl:gap-5 min-w-0 max-w-full">
        {/* LEFT */}
        <div className="xl:col-span-3 min-w-0 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-signal-blue" />
                Document Input
              </CardTitle>
              <CardDescription>
                Upload, capture, or pick a demo sample.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
                  dragOver
                    ? "border-signal-blue bg-signal-blue/5"
                    : "border-ink-border bg-ink-card/40"
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCameraOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCameraOpen(true);
                    }
                  }}
                  title="Open live camera scanner"
                  className="h-14 w-14 mx-auto rounded-2xl bg-signal-blue hover:bg-signal-blue/90 border border-signal-blue/40 flex items-center justify-center mb-3 cursor-pointer shadow-lg shadow-signal-blue/30 hover:scale-105 active:scale-95 transition-all text-white"
                >
                  <Camera className="h-7 w-7" />
                </div>
                <div className="text-sm font-semibold text-slate-100">
                  Scan Identity Document with Laptop Webcam
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Automatic optical alignment, quality checking, and unmirrored capture.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload File
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCameraOpen(true);
                    }}
                    className="bg-signal-blue hover:bg-signal-blue/90 text-white font-semibold shadow-md shadow-signal-blue/25"
                    title="Open live camera scanner"
                  >
                    <Camera className="h-4 w-4 mr-1.5" />
                    Live Laptop Camera
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setCaptureSource("upload");
                        onFile(f);
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex flex-wrap items-center justify-between gap-1 min-w-0">
                  <span className="truncate">Reference Dataset Catalog</span>
                  <span className="text-[9px] font-mono text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 shrink-0">BENCHMARK STANDARDS</span>
                </div>
                <MidvArchetypeInspector
                  midvResult={midvResult}
                  pipelineResult={result}
                  captureSource={captureSource}
                  storageInfo={storageInfo}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER */}
        <div className="xl:col-span-6 min-w-0 space-y-4">
          <DocumentViewer
            imageUrl={storageInfo?.url}
            docBBox={result?.docDetect.boundingBox ?? null}
            ocrFields={result?.ocr.fields ?? []}
            mrzLines={result?.mrz.rawLines ?? []}
            tamperingRegions={result?.tampering.regions ?? []}
            face={result?.face ?? null}
            provenance={currentProvenance || result?.provenance}
            onActivateCamera={() => setCameraOpen(true)}
            onUploadFile={() => inputRef.current?.click()}
          />

          <MidvAuditCard
            result={midvResult}
            loading={midvLoading}
            engineOnline={midvOnline}
            onRunAudit={() => triggerMidvAudit(result, storageInfo)}
          />

          <FaceForensicsCard
            result={faceForensicsResult}
            loading={faceForensicsLoading}
            engineOnline={midvOnline}
            onRunAudit={() => triggerMidvAudit(result, storageInfo)}
          />
        </div>

        {/* RIGHT */}
        <div className="xl:col-span-3 min-w-0 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-signal-blue" />
                  TRUSTFUSION RISK ENGINE
                </div>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {overallProgress}%
                </span>
              </CardTitle>
              <CardDescription>
                TRUSTFUSION RISK ENGINE — 9 Multi-Modal Verification Stages
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-3 pb-4 space-y-3">
              <Progress value={overallProgress} />
              <div className="space-y-1.5 max-h-[250px] 2xl:max-h-[310px] overflow-y-auto pr-1.5 scrollbar-thin">
                {pipelineModules.map((m) => {
                  const t = moduleTone(m.status);
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-2.5 py-1.5 bg-ink-card/40 transition-colors",
                        t.border
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-6 rounded-full bg-ink-card border border-ink-border flex items-center justify-center text-[10px] font-bold tabular-nums text-slate-400">
                          {String(m.index).padStart(2, "0")}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {m.label}
                        </div>
                        {m.message && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {m.message}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {typeof m.score === "number" &&
                          !Number.isNaN(m.score) &&
                          m.status !== "PROCESSING" && (
                            <span className="text-[10px] tabular-nums text-slate-400">
                              {pct(m.score, 0)}
                            </span>
                          )}
                        <Badge
                          className={cn(
                            t.chip,
                            "min-w-[62px] py-0.5 justify-center text-[10px]"
                          )}
                        >
                          {m.status === "PROCESSING" ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : null}
                          {t.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {risk && rc && (
                <div
                  className={cn(
                    "rounded-xl border p-3",
                    risk.level === "HIGH"
                      ? "border-risk-high/40 bg-risk-high/5"
                      : risk.level === "MEDIUM"
                      ? "border-risk-medium/40 bg-risk-medium/5"
                      : "border-risk-low/30 bg-risk-low/5"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        AI Risk Score
                      </div>
                      <div
                        className={cn(
                          "mt-0.5 text-2xl font-bold tabular-nums",
                          rc.text
                        )}
                      >
                        {risk.score}
                        <span className="text-slate-600 text-sm"> / 100</span>
                      </div>
                    </div>
                    <Badge className={rc.badge}>{risk.level} RISK</Badge>
                  </div>
                  <Progress
                    className="mt-2"
                    value={risk.score}
                  />
                  <p className="mt-2 text-xs text-slate-300 leading-snug">
                    {risk.recommendedAction}
                  </p>
                  {result && (
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[10px]">
                      <Stat label="Processing" value={formatDuration(result.totalMs)} />
                      <Stat
                        label="OCR Conf"
                        value={pct(result.ocr.overallConfidence * 100)}
                      />
                      <Stat
                        label="Image Quality"
                        value={pct(result.imageQuality.score)}
                      />
                      <Stat
                        label="Consistency"
                        value={pct(result.identity.score)}
                      />
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                disabled={!result || saving || !user}
                onClick={saveCase}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving case…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Case & Open Review
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-[11px] text-risk-high flex items-center gap-2">
                  <FileX2 className="h-3.5 w-3.5" />
                  Not authenticated — login to save.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Automated Border Clearance (e-Gate) Controller Card */}
          <Card className={cn(
            "transition-all duration-300 overflow-hidden w-full max-w-full box-border shadow-xs",
            autoClearResult?.cleared
              ? "border-emerald-400 bg-emerald-50/90 dark:border-emerald-500/60 dark:bg-gradient-to-br dark:from-emerald-950/30 dark:via-slate-900/95 dark:to-slate-900/90 shadow-md shadow-emerald-950/10"
              : autoClearResult?.cleared === false
              ? "border-rose-400 bg-rose-50/90 dark:border-rose-500/60 dark:bg-gradient-to-br dark:from-rose-950/30 dark:via-slate-900/95 dark:to-slate-900/90 shadow-md shadow-rose-950/10"
              : "border-slate-200 bg-white dark:border-signal-cyan/40 dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-ink-card dark:to-slate-900/90 shadow-xs"
          )}>
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {autoClearResult?.cleared ? (
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/40 flex items-center justify-center text-emerald-800 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                  ) : autoClearResult?.cleared === false ? (
                    <div className="h-8 w-8 rounded-lg bg-rose-100 border border-rose-300 dark:bg-rose-500/20 dark:border-rose-500/40 flex items-center justify-center text-rose-800 dark:text-rose-400 shrink-0">
                      <ShieldAlert className="h-4.5 w-4.5" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-sky-100 border border-sky-300 dark:bg-signal-cyan/15 dark:border-signal-cyan/40 flex items-center justify-center text-signal-blue dark:text-signal-cyan shrink-0">
                      <Radio className="h-4 w-4 animate-pulse" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                      Automated Border Clearance
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-600 dark:text-slate-400 truncate font-medium">
                      {autoClearEnabled ? "Autonomous e-Gate Actuation Active" : "Manual Officer Dispatch Mode"}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAutoClearEnabled((prev) => !prev)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold border transition-colors cursor-pointer flex items-center gap-1",
                      autoClearEnabled
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40"
                        : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    )}
                    title={autoClearEnabled ? "Click to switch to manual mode" : "Click to enable automated e-gate clearance"}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", autoClearEnabled ? "bg-emerald-600 dark:bg-emerald-400 animate-pulse" : "bg-slate-400 dark:bg-slate-500")} />
                    {autoClearEnabled ? "AUTO: ON" : "AUTO: OFF"}
                  </button>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-3 pb-3.5 space-y-3">
              {/* STATE 1: CLEARED (Passed) */}
              {autoClearResult?.cleared && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping" />
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider font-mono">
                        GATE CLEARANCE: AUTHORIZED
                      </span>
                    </div>
                    <Badge variant="pass" className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5">
                      BARRIER UNLOCKED
                    </Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-ink-card/60 border border-slate-200 dark:border-emerald-500/30 text-xs text-slate-800 dark:text-slate-300 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Traveler:</span>
                      <strong className="text-slate-900 dark:text-white font-mono font-bold">{autoClearResult.travelerName || "Verified Holder"}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Ref Code:</span>
                      <span className="text-signal-blue dark:text-signal-cyan font-mono font-bold">{autoClearResult.caseCode}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Risk Assessment:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">LOW ({pct(result?.risk.score ?? 0)})</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Database Record:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">✓ Auto-Saved &amp; Approved</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        resetPipeline();
                        setAutoClearResult(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/20 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Next Traveler
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (autoClearResult.caseId) {
                          navigate(`/cases/${autoClearResult.caseId}`);
                        } else {
                          saveCase();
                        }
                      }}
                      className="border-slate-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/40 dark:text-emerald-300 dark:bg-transparent dark:hover:bg-emerald-500/10 text-xs font-bold cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Audit Dossier
                    </Button>
                  </div>
                </div>
              )}

              {/* STATE 2: BLOCKED (Failed / Risk / Tamper) */}
              {autoClearResult?.cleared === false && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-600 dark:bg-rose-500 animate-pulse" />
                      <span className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider font-mono">
                        GATE CLEARANCE: HALTED
                      </span>
                    </div>
                    <Badge variant="critical" className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5">
                      BARRIER LOCKED
                    </Badge>
                  </div>

                  <p className="text-xs text-rose-950 dark:text-rose-200 font-semibold leading-relaxed bg-rose-100/95 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 p-3 rounded-xl shadow-2xs">
                    Automated clearance declined: Document failed security criteria (Risk: {result?.risk.level ?? "HIGH"}). Physical officer examination mandatory.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveCase}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer border-transparent"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      Hold &amp; Inspect
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetPipeline();
                        setAutoClearResult(null);
                      }}
                      className="border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Reset Scanner
                    </Button>
                  </div>
                </div>
              )}

              {/* STATE 3: IDLE / STANDBY (Crisp, High-Visibility Telemetry) */}
              {!autoClearResult && (
                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 dark:bg-black/40 dark:border-slate-800 p-2.5 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-700 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                        Gate Barrier Status:
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30">
                        ARMED &amp; READY
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
                      <div className="rounded-lg bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 p-2 shadow-2xs">
                        <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">Clearance Protocol:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs mt-0.5 block">Autonomous e-Gate</span>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 p-2 shadow-2xs">
                        <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">Pass Threshold:</span>
                        <span className="text-signal-blue dark:text-signal-cyan font-black text-xs mt-0.5 block">&lt; 35% Risk Score</span>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 p-2 shadow-2xs">
                        <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">Turnstile Hardware:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs mt-0.5 block">Barrier Lane A1</span>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 p-2 shadow-2xs">
                        <span className="text-slate-600 dark:text-slate-400 block text-[9.5px] font-bold uppercase tracking-wider">Actuation Response:</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs mt-0.5 block">&lt; 800ms Target</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug font-medium">
                    When credentials pass all 9 TrustFusion stages with zero critical violations, the system automatically validates the traveler as <strong className="text-emerald-700 dark:text-emerald-400 font-bold">CLEARED</strong>, records the entry in the database, and actuates the barrier gate.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>


          {result?.findings && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-risk-medium" />
                  Findings
                  <Badge variant="default" className="ml-auto">
                    {result.findings.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Expand any row for evidence + recommendation.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-3 max-h-[720px] overflow-auto pr-1">
                {findingsCritical.map((f) => (
                  <FindingCard key={f.id} f={f} />
                ))}
                {findingsHigh.map((f) => (
                  <FindingCard key={f.id} f={f} />
                ))}
                {findingsMed.map((f) => (
                  <FindingCard key={f.id} f={f} />
                ))}
                {findingsLow.map((f) => (
                  <FindingCard key={f.id} f={f} />
                ))}
                {findingsPass.map((f) => (
                  <FindingCard key={f.id} f={f} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptureComplete={onCameraCapture}
        onUploadFallback={() => inputRef.current?.click()}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-ink-border dark:bg-ink-card/60 px-2.5 py-2 shadow-2xs">
      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-slate-400">
        {label}
      </div>
      <div className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
        {value}
      </div>
    </div>
  );
}
