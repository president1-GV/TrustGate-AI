import type {
  DemoSample,
  FullPipelineResult,
  PipelineModule,
  PipelineStatus,
  StepCallback,
} from "../types";
import { PIPELINE_STEPS, runPipeline, buildFindings } from "../pipeline/orchestrator";
import { computeRisk } from "../pipeline/09-risk";

function makeDummyCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 600;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#b8b8b8";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#808080";
    ctx.fillRect(40, 40, c.width - 80, c.height - 80);
  }
  return c;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Deep-merges `overrides` into `base`, returning a typed result.
 * We cast through `unknown` to avoid an index-signature mismatch — the
 * runtime behaviour is correct, and every consumer has proper types.
 */
function deepMergeResult(
  base: FullPipelineResult,
  overrides: Partial<FullPipelineResult>
): FullPipelineResult {
  const result: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };
  for (const k of Object.keys(overrides) as (keyof FullPipelineResult)[]) {
    const bv = result[k as string];
    const ov: unknown = overrides[k];
    if (isObject(bv) && isObject(ov)) {
      result[k as string] = deepMergeRecord(
        bv as Record<string, unknown>,
        ov as Record<string, unknown>
      );
    } else if (Array.isArray(ov)) {
      result[k as string] = ov.map((item) =>
        isObject(item) ? { ...(item as Record<string, unknown>) } : item
      );
    } else if (ov !== undefined) {
      result[k as string] = ov;
    }
  }
  return result as unknown as FullPipelineResult;
}

function deepMergeRecord(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const k of Object.keys(overrides)) {
    const bv = result[k];
    const ov = overrides[k];
    if (isObject(bv) && isObject(ov)) {
      result[k] = deepMergeRecord(bv, ov);
    } else if (Array.isArray(ov)) {
      result[k] = ov.map((item) =>
        isObject(item) ? { ...(item as Record<string, unknown>) } : item
      );
    } else if (ov !== undefined) {
      result[k] = ov;
    }
  }
  return result;
}

function deriveStatuses(result: FullPipelineResult): void {
  const s = result.modules;
  for (const m of s) {
    let status: PipelineStatus = m.status;
    switch (m.id) {
      case "01-image-quality": {
        const q = result.imageQuality.score;
        status = q >= 70 ? "PASS" : q >= 50 ? "WARNING" : "FAIL";
        m.score = q;
        m.message = `Grade ${result.imageQuality.grade}`;
        break;
      }
      case "02-doc-detect": {
        const c = result.docDetect.confidence;
        status = c >= 0.7 ? "PASS" : c < 0.5 ? "FAIL" : "WARNING";
        m.score = c * 100;
        m.message = `Type=${result.docDetect.documentType}`;
        break;
      }
      case "03-ocr": {
        const c = result.ocr.overallConfidence;
        status = c >= 0.85 ? "PASS" : c < 0.6 ? "FAIL" : "WARNING";
        m.score = c * 100;
        m.message = `${result.ocr.fields.length} fields`;
        break;
      }
      case "04-mrz": {
        const present = result.mrz.present;
        const composite = !!result.mrz.compositeValid;
        if (present && composite) { status = "PASS"; m.score = 100; }
        else if (present) { status = "WARNING"; m.score = 60; }
        else { status = "FAIL"; m.score = 0; }
        m.message = result.mrz.format ? `Format=${result.mrz.format}` : present ? "MRZ found" : "No MRZ";
        break;
      }
      case "05-validation": {
        const v = result.validation;
        if (v.summaryCritical > 0) status = "FAIL";
        else if (v.summaryHigh > 0) status = "WARNING";
        else status = "PASS";
        m.message = `${v.summaryPass}P ${v.summaryWarn}W ${v.summaryHigh}H ${v.summaryCritical}C`;
        break;
      }
      case "06-tampering": {
        const p = result.tampering.probability;
        status = p < 30 ? "PASS" : p < 60 ? "WARNING" : "FAIL";
        m.score = p;
        m.message = `${result.tampering.severity} — ${result.tampering.regions.length} regions`;
        break;
      }
      case "07-face": {
        if (result.face.detected && (result.face.quality ?? 0) >= 70) status = "PASS";
        else if (!result.face.detected) status = "FAIL";
        else status = "WARNING";
        m.score = result.face.quality;
        m.message = result.face.resultLabel ?? (result.face.detected ? "Detected" : "No face");
        break;
      }
      case "08-identity": {
        const sc = result.identity.score;
        status = sc >= 85 ? "PASS" : sc >= 60 ? "WARNING" : "FAIL";
        m.score = sc;
        m.message = `${result.identity.perField.length} assertions`;
        break;
      }
      case "09-risk": {
        const lvl = result.risk.level;
        status = lvl === "LOW" ? "PASS" : lvl === "MEDIUM" ? "WARNING" : "FAIL";
        m.score = result.risk.score;
        m.message = `Risk ${lvl}`;
        break;
      }
    }
    m.status = status;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export function generateDemoCaseCode(sampleId: string): string {
  const n = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TG-DEMO-${sampleId.toUpperCase()}-${n}`;
}

export async function runDemo(
  sample: DemoSample,
  opts?: { onStep?: StepCallback; stepDelayMs?: number }
): Promise<FullPipelineResult> {
  const stepDelayMs = opts?.stepDelayMs ?? 380;
  const onStep = opts?.onStep;
  const canvas = makeDummyCanvas();
  const baseline = await runPipeline(canvas, { minStepMs: 0 });

  const merged = deepMergeResult(baseline, sample.seed as Partial<FullPipelineResult>);

  if (
    merged.imageQuality &&
    merged.docDetect &&
    merged.ocr &&
    merged.mrz &&
    merged.validation &&
    merged.tampering &&
    merged.face &&
    merged.identity
  ) {
    try {
      const recomputed = await computeRisk({
        imageQuality: merged.imageQuality,
        docDetect: merged.docDetect,
        ocr: merged.ocr,
        mrz: merged.mrz,
        validation: merged.validation,
        tampering: merged.tampering,
        face: merged.face,
        identity: merged.identity,
      });
      const alpha = 0.55;
      merged.risk.score = Math.round(recomputed.score * alpha + sample.riskScore * (1 - alpha));
      merged.risk.score = Math.max(0, Math.min(100, merged.risk.score));
      merged.risk.level = sample.riskLevel;
      merged.risk.factors = recomputed.factors;
      if (sample.riskLevel === "LOW") {
        merged.risk.recommendedAction = "Proceed with clearance workflow.";
      } else if (sample.riskLevel === "MEDIUM") {
        merged.risk.recommendedAction = "Escalate to supervisor for secondary document review.";
      } else {
        merged.risk.recommendedAction = "Manual secondary verification required. Flag case.";
      }
    } catch {
      merged.risk.score = sample.riskScore;
      merged.risk.level = sample.riskLevel;
    }
  } else {
    merged.risk.score = sample.riskScore;
    merged.risk.level = sample.riskLevel;
  }

  deriveStatuses(merged);
  merged.findings = buildFindings(merged);

  if (onStep) {
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      const def = PIPELINE_STEPS[i];
      const modBase: PipelineModule = {
        id: def.id, index: def.index, label: def.label,
        status: "PROCESSING", startedAt: performance.now(),
      };
      onStep({ ...modBase }, { modules: [...merged.modules.slice(0, i), ...baseline.modules.slice(i)] });
      await sleep(stepDelayMs);
      const finalMod = merged.modules[i];
      finalMod.finishedAt = performance.now();
      onStep({ ...finalMod }, { modules: merged.modules.slice(0, i + 1) });
    }
  }

  merged.totalMs = merged.finishedAt - merged.startedAt;
  return merged;
}
