import type {
  FullPipelineResult,
  PipelineModule,
  PipelineStatus,
  StepCallback,
  Finding,
  ImageQualityResult,
  DocDetectResult,
  OcrResult,
  MrzResult,
  ValidationResult,
  TamperingResult,
  FaceResult,
  IdentityConsistencyResult,
  RiskResult,
  ValidationIssue,
  DocumentProvenance,
} from "../types";
import { analyzeImageQuality } from "./01-image-quality";
import { detectDocument } from "./02-doc-detect";
import { runOcr } from "./03-ocr";
import { parseMrz } from "./04-mrz";
import { validateCase } from "./05-validation";
import { detectTampering } from "./06-tampering";
import { analyzeFace } from "./07-face";
import { identityConsistency } from "./08-identity";
import { computeRisk } from "./09-risk";

export const PIPELINE_STEPS: { id: string; index: number; label: string }[] = [
  { id: "01-image-quality", index: 1, label: "Image Quality" },
  { id: "02-doc-detect", index: 2, label: "Document Detection" },
  { id: "03-ocr", index: 3, label: "OCR & Field Extraction" },
  { id: "04-mrz", index: 4, label: "MRZ Analysis" },
  { id: "05-validation", index: 5, label: "Cross-Field Validation" },
  { id: "06-tampering", index: 6, label: "Tampering Detection" },
  { id: "07-face", index: 7, label: "Face Analysis" },
  { id: "08-identity", index: 8, label: "Identity Consistency" },
  { id: "09-risk", index: 9, label: "Risk Scoring" },
];

export function imageFromFile(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to acquire 2D context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function statusForStep01(quality: ImageQualityResult): PipelineStatus {
  if (quality.score >= 70) return "PASS";
  if (quality.score >= 50) return "WARNING";
  return "FAIL";
}
function statusForStep02(doc: DocDetectResult): PipelineStatus {
  if (doc.confidence >= 0.7) return "PASS";
  if (doc.confidence < 0.5) return "FAIL";
  return "WARNING";
}
function statusForStep03(ocr: OcrResult): PipelineStatus {
  if (ocr.overallConfidence >= 0.85) return "PASS";
  if (ocr.overallConfidence < 0.6) return "FAIL";
  return "WARNING";
}
function statusForStep04(mrz: MrzResult): PipelineStatus {
  if (mrz.present && mrz.compositeValid) return "PASS";
  if (mrz.present && !mrz.compositeValid) return "WARNING";
  return "FAIL";
}
function statusForStep05(v: ValidationResult): PipelineStatus {
  if (v.summaryCritical > 0) return "FAIL";
  if (v.summaryHigh > 0) return "WARNING";
  return "PASS";
}
function statusForStep06(
  t: TamperingResult,
  docDetect?: DocDetectResult,
  mrz?: MrzResult
): PipelineStatus {
  if (docDetect?.documentType === "unknown" && !mrz?.present) {
    return "WARNING";
  }
  if (t.probability < 30) return "PASS";
  if (t.probability < 60) return "WARNING";
  return "FAIL";
}
function statusForStep07(f: FaceResult): PipelineStatus {
  if (f.detected && (f.quality ?? 0) >= 70) return "PASS";
  if (!f.detected) return "FAIL";
  return "WARNING";
}
function statusForStep08(i: IdentityConsistencyResult): PipelineStatus {
  if (i.score >= 85) return "PASS";
  if (i.score >= 60) return "WARNING";
  return "FAIL";
}
function statusForStep09(r: RiskResult): PipelineStatus {
  if (r.level === "LOW") return "PASS";
  if (r.level === "MEDIUM") return "WARNING";
  return "FAIL";
}

export function buildFindings(r: FullPipelineResult): Finding[] {
  const findings: Finding[] = [];
  let fid = 0;
  const nextId = () => `F${(++fid).toString().padStart(4, "0")}`;

  for (const issue of r.validation.issues) {
    if (issue.severity === "HIGH" || issue.severity === "CRITICAL") {
      findings.push({
        id: nextId(),
        title: `Validation: ${issue.ruleCode}`,
        severity: issue.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
        location: "document_fields",
        evidence: issue.message,
        modelName: "rule-validator-v1",
        recommendation:
          issue.severity === "CRITICAL"
            ? "Reject document and request resubmission."
            : "Flag for manual operator review.",
      });
    } else if (issue.severity === "WARNING") {
      findings.push({
        id: nextId(),
        title: `Validation: ${issue.ruleCode}`,
        severity: "MEDIUM",
        location: "document_fields",
        evidence: issue.message,
        modelName: "rule-validator-v1",
        recommendation: "Operator review recommended.",
      });
    } else if (issue.severity === "PASS") {
      findings.push({
        id: nextId(),
        title: `Check passed: ${issue.ruleCode}`,
        severity: "PASS",
        evidence: issue.message,
      });
    }
  }

  for (const region of r.tampering.regions) {
    if (region.probability >= 60) {
      findings.push({
        id: nextId(),
        title: `Tampering suspected: ${region.regionLabel}`,
        severity: region.probability >= 80 ? "HIGH" : "MEDIUM",
        location: region.regionLabel,
        confidence: region.probability,
        evidence: region.evidence,
        modelName: "ela-tamper-v1",
        recommendation:
          region.probability >= 80
            ? "Request new, unedited document capture."
            : "Inspect region closely under UV/alternate lighting.",
      });
    }
  }

  if ((r.face.similarity ?? 100) < 70) {
    findings.push({
      id: nextId(),
      title: "Face similarity below threshold",
      severity: "MEDIUM",
      location: "photo",
      confidence: r.face.similarity,
      evidence: `Face similarity ${(r.face.similarity ?? 0).toFixed(0)}% below configured threshold 70%.`,
      modelName: "face-compare-v1",
      recommendation: "Request a fresh portrait capture in uniform lighting.",
    });
  }
  if (!r.face.detected) {
    findings.push({
      id: nextId(),
      title: "No face detected in portrait region",
      severity: "HIGH",
      location: "photo",
      evidence: "Face detector returned no detections in expected photo region.",
      modelName: "face-detect-v1",
      recommendation: "Request a clearer capture with the portrait visible.",
    });
  }

  if (r.identity.score < 70) {
    findings.push({
      id: nextId(),
      title: "Identity consistency score low",
      severity: r.identity.score < 50 ? "HIGH" : "MEDIUM",
      confidence: r.identity.score,
      evidence: `Cross-field identity consistency scored ${r.identity.score.toFixed(0)}/100.`,
      modelName: "identity-consistency-v1",
      recommendation: "Manually reconcile mismatched fields before approval.",
    });
  }

  if (r.risk.level === "HIGH") {
    findings.push({
      id: nextId(),
      title: "Overall risk level HIGH",
      severity: "HIGH",
      confidence: r.risk.score,
      evidence: `Aggregate risk score ${r.risk.score.toFixed(0)}/100 (${r.risk.level}). ${r.risk.recommendedAction}`,
      modelName: r.risk.engineVersion,
      recommendation: r.risk.recommendedAction,
    });
  } else if (r.risk.level === "MEDIUM") {
    findings.push({
      id: nextId(),
      title: "Overall risk level MEDIUM",
      severity: "MEDIUM",
      confidence: r.risk.score,
      evidence: `Aggregate risk score ${r.risk.score.toFixed(0)}/100 (${r.risk.level}).`,
      modelName: r.risk.engineVersion,
      recommendation: r.risk.recommendedAction,
    });
  }

  if (r.risk.level === "LOW") {
    findings.push({
      id: nextId(),
      title: "Risk assessment: LOW",
      severity: "PASS",
      evidence: `Aggregate risk score ${r.risk.score.toFixed(0)}/100 — LOW risk profile.`,
    });
  }
  const expiryIssue = r.validation.issues.find(
    (i: ValidationIssue) => i.ruleCode === "not_expired" && i.severity === "PASS"
  );
  if (expiryIssue) {
    findings.push({
      id: nextId(),
      title: "Expiry valid",
      severity: "PASS",
      evidence: expiryIssue.message,
    });
  }
  if (r.tampering.severity === "NONE") {
    findings.push({
      id: nextId(),
      title: "Tampering: NONE",
      severity: "PASS",
      evidence: "ELA analysis found no significant tampering indicators.",
    });
  }
  if (r.mrz.present && r.mrz.compositeValid) {
    findings.push({
      id: nextId(),
      title: "MRZ composite valid",
      severity: "PASS",
      evidence: "All MRZ check digits and composite check digit verified successfully.",
    });
  }

  return findings;
}

export function isVerbosePipelineLogging(): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem("tg_verbose_pipeline_logging") === "true";
  }
  return false;
}

export async function runPipeline(
  fileOrCanvas: File | HTMLCanvasElement,
  opts?: { onStep?: StepCallback; minStepMs?: number; provenance?: DocumentProvenance }
): Promise<FullPipelineResult> {
  const startedAt = Date.now();
  const minStepMs = opts?.minStepMs ?? 0;
  const onStep = opts?.onStep;

  let canvas: HTMLCanvasElement;
  if (fileOrCanvas instanceof File) {
    canvas = await imageFromFile(fileOrCanvas);
  } else {
    canvas = fileOrCanvas;
  }

  const modules: PipelineModule[] = PIPELINE_STEPS.map((s) => ({
    id: s.id,
    index: s.index,
    label: s.label,
    status: "IDLE",
  }));

  function fire(mod: PipelineModule, partial: Partial<FullPipelineResult>) {
    if (onStep) onStep({ ...mod }, partial);
  }

  let partial: Partial<FullPipelineResult> = {};
  const stepStart = (idx: number) => {
    const mod = modules[idx];
    mod.startedAt = performance.now();
    mod.status = "PROCESSING";
    fire(mod, partial);
    return mod;
  };

  const isVerbose = isVerbosePipelineLogging();
  const stepFinish = (mod: PipelineModule, status: PipelineStatus, score?: number, message?: string) => {
    mod.finishedAt = performance.now();
    mod.status = status;
    mod.score = score;
    mod.message = message;
    if (isVerbose) {
      console.info(
        `%c[TrustGate Verbose Pipeline]%c [${mod.id}] ${mod.label}: status=${status} | score=${score !== undefined ? Math.round(score) : "—"} | msg="${message ?? ""}" | duration=${Math.round((mod.finishedAt || 0) - (mod.startedAt || 0))}ms`,
        "color: #0EA5FF; font-weight: bold",
        "color: inherit"
      );
    }
  };
  const ensureDelay = async (t0: number) => {
    const elapsed = performance.now() - t0;
    if (elapsed < minStepMs) await sleep(minStepMs - elapsed);
  };

  const t0 = performance.now();
  const mod1 = stepStart(0);
  const imageQuality = await analyzeImageQuality(canvas);
  await ensureDelay(t0);
  stepFinish(mod1, statusForStep01(imageQuality), imageQuality.score, `Grade ${imageQuality.grade}`);
  partial = { ...partial, imageQuality };
  fire(mod1, partial);

  const t1 = performance.now();
  const mod2 = stepStart(1);
  const docDetect = await detectDocument(canvas, imageQuality);
  await ensureDelay(t1);
  stepFinish(mod2, statusForStep02(docDetect), docDetect.confidence * 100, `Type=${docDetect.documentType}`);
  partial = { ...partial, docDetect };
  fire(mod2, partial);

  const t2 = performance.now();
  const mod3 = stepStart(2);
  const ocr = await runOcr(canvas, {
    documentId: opts?.provenance?.documentId,
    processingRunId: opts?.provenance?.processingRunId,
    imageHash: opts?.provenance?.documentHash,
  });
  await ensureDelay(t2);
  stepFinish(mod3, statusForStep03(ocr), ocr.overallConfidence * 100, `${ocr.fields.length} fields (${ocr.provider})`);
  partial = { ...partial, ocr };
  fire(mod3, partial);

  const t3 = performance.now();
  const mod4 = stepStart(3);
  const mrz = await parseMrz(ocr, canvas);
  await ensureDelay(t3);
  stepFinish(mod4, statusForStep04(mrz), mrz.present ? (mrz.compositeValid ? 100 : 60) : 0, mrz.format ? `Format=${mrz.format}` : mrz.present ? "MRZ found" : "No MRZ");
  partial = { ...partial, mrz };
  fire(mod4, partial);

  const t4 = performance.now();
  const mod5 = stepStart(4);
  const validation = await validateCase({ ocr, mrz, docType: docDetect.documentType, countryCode: mrz.nationality });
  await ensureDelay(t4);
  stepFinish(mod5, statusForStep05(validation), undefined, `${validation.summaryPass}P ${validation.summaryWarn}W ${validation.summaryHigh}H ${validation.summaryCritical}C`);
  partial = { ...partial, validation };
  fire(mod5, partial);

  const t5 = performance.now();
  const mod6 = stepStart(5);
  const tampering = await detectTampering(canvas, imageQuality);
  await ensureDelay(t5);

  const isNonDocument = docDetect.documentType === "unknown" && !mrz.present;
  const mod6Status = statusForStep06(tampering, docDetect, mrz);
  // Integrity score: 100% when 0% tampering detected; 0% if non-credential image
  const integrityScore = isNonDocument ? 0 : Math.max(0, 100 - tampering.probability);
  const mod6Msg = isNonDocument
    ? "UNVERIFIED — Non-credential image"
    : tampering.regions.length === 0
    ? "CLEAN — 0 tamper anomalies"
    : `${tampering.severity} — ${tampering.regions.length} anomalous region(s)`;

  stepFinish(mod6, mod6Status, integrityScore, mod6Msg);
  partial = { ...partial, tampering };
  fire(mod6, partial);

  const t6 = performance.now();
  const mod7 = stepStart(6);
  const face = await analyzeFace(canvas, imageQuality);
  await ensureDelay(t6);
  stepFinish(mod7, statusForStep07(face), face.quality, face.resultLabel ?? (face.detected ? "Detected" : "No face"));
  partial = { ...partial, face };
  fire(mod7, partial);

  const t7 = performance.now();
  const mod8 = stepStart(7);
  const identity = await identityConsistency({ ocr, mrz, face, validation });
  await ensureDelay(t7);
  stepFinish(mod8, statusForStep08(identity), identity.score, `${identity.perField.length} assertions`);
  partial = { ...partial, identity };
  fire(mod8, partial);

  const t8 = performance.now();
  const mod9 = stepStart(8);
  const risk = await computeRisk({ imageQuality, docDetect, ocr, mrz, validation, tampering, face, identity });
  await ensureDelay(t8);
  stepFinish(mod9, statusForStep09(risk), risk.score, `Risk ${risk.level}`);
  partial = { ...partial, risk };
  fire(mod9, partial);

  const result: FullPipelineResult = {
    imageQuality,
    docDetect,
    ocr,
    mrz,
    validation,
    tampering,
    face,
    identity,
    risk,
    findings: [],
    modules,
    startedAt,
    finishedAt: Date.now(),
    totalMs: 0,
    provenance: opts?.provenance,
  };
  result.totalMs = result.finishedAt - result.startedAt;
  result.findings = buildFindings(result);

  if (isVerbose) {
    console.info(
      `%c[TrustGate Verbose Pipeline]%c Complete: Total ${Math.round(result.totalMs)}ms | Risk ${result.risk.score} (${result.risk.level}) | Findings: ${result.findings.length}`,
      "color: #10B981; font-weight: bold",
      "color: inherit",
      result
    );
  }

  return result;
}
