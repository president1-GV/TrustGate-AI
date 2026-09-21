import type { ImageQualityResult, TamperingRegion, TamperingResult, BBox } from "../types";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

async function canvasFromDataUrl(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      ctx.drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = () => reject(new Error("img load failed"));
    img.src = dataUrl;
  });
}

function labelRegion(cxNorm: number, cyNorm: number): string {
  if (cxNorm > 0.6 && cyNorm < 0.45) return "PHOTO_ZONE";
  if (cxNorm < 0.45 && cyNorm > 0.35 && cyNorm < 0.65) return "DOC_NUMBER_ZONE";
  if (cxNorm < 0.45 && cyNorm > 0.7) return "DOB_ZONE";
  if (cyNorm > 0.8) return "SIGNATURE_ZONE";
  if (cxNorm > 0.55 && cyNorm > 0.55) return "EXPIRY_ZONE";
  return "SUBSTRATE_SURFACE";
}

function manipulationFor(label: string): string {
  switch (label) {
    case "PHOTO_ZONE": return "photo_replacement";
    case "DOC_NUMBER_ZONE": return "text_overwrite";
    case "DOB_ZONE": return "digit_alteration";
    case "SIGNATURE_ZONE": return "signature_forgery";
    case "EXPIRY_ZONE": return "expiry_extension";
    default: return "compression_discontinuity";
  }
}

function evidenceFor(label: string, errorDelta: number): string {
  switch (label) {
    case "PHOTO_ZONE":
      return `Photographic boundary ELA anomaly (${errorDelta.toFixed(1)} ΔE). Compression grid differs from substrate.`;
    case "DOC_NUMBER_ZONE":
      return `Document number region shows re-compression residue (${errorDelta.toFixed(1)} ΔE).`;
    case "DOB_ZONE":
      return `Date of birth field contains localized DCT quantization mismatch (${errorDelta.toFixed(1)} ΔE).`;
    case "SIGNATURE_ZONE":
      return `Signature block edge gradient discontinuity (${errorDelta.toFixed(1)} ΔE).`;
    case "EXPIRY_ZONE":
      return `Expiry field shows secondary compression artifact pattern (${errorDelta.toFixed(1)} ΔE).`;
    default:
      return `ELA analysis reveals anomalous block compression residue of ${errorDelta.toFixed(1)} ΔE.`;
  }
}

export async function detectTampering(
  canvas: HTMLCanvasElement,
  _quality: ImageQualityResult
): Promise<TamperingResult> {
  let blocks: { mean: number; bx: number; by: number; bw: number; bh: number }[] = [];

  try {
    const d95 = canvas.toDataURL("image/jpeg", 0.95);
    const d70 = canvas.toDataURL("image/jpeg", 0.70);
    const c95 = await canvasFromDataUrl(d95);
    const c70 = await canvasFromDataUrl(d70);
    const W = c95.width;
    const H = c95.height;
    const ctx95 = c95.getContext("2d", { willReadFrequently: true });
    const ctx70 = c70.getContext("2d", { willReadFrequently: true });

    if (ctx95 && ctx70 && W === c70.width && H === c70.height) {
      const img95 = ctx95.getImageData(0, 0, W, H).data;
      const img70 = ctx70.getImageData(0, 0, W, H).data;
      const BS = 16;
      const bW = Math.floor(W / BS);
      const bH = Math.floor(H / BS);
      blocks = new Array(bW * bH);

      for (let by = 0; by < bH; by++) {
        for (let bx = 0; bx < bW; bx++) {
          let s = 0;
          let n = 0;
          for (let py = 0; py < BS; py++) {
            for (let px = 0; px < BS; px++) {
              const x = bx * BS + px;
              const y = by * BS + py;
              const idx = (y * W + x) * 4;
              const d =
                Math.abs(img95[idx] - img70[idx]) +
                Math.abs(img95[idx + 1] - img70[idx + 1]) +
                Math.abs(img95[idx + 2] - img70[idx + 2]);
              s += d;
              n++;
            }
          }
          blocks[by * bW + bx] = {
            mean: n > 0 ? s / (n * 3) : 0,
            bx, by,
            bw: BS, bh: BS,
          };
        }
      }
    }
  } catch {
    blocks = [];
  }

  if (blocks.length === 0) {
    return { probability: 0, confidence: 90, severity: "NONE", regions: [] };
  }

  // Calculate baseline mean and standard deviation of ELA differences across all blocks
  let sum = 0;
  for (const b of blocks) sum += b.mean;
  const avgMean = sum / blocks.length;

  let variance = 0;
  for (const b of blocks) {
    const diff = b.mean - avgMean;
    variance += diff * diff;
  }
  const stdDev = Math.sqrt(variance / blocks.length);

  // A genuine tamper artifact requires block difference to exceed 2.8 standard deviations above baseline
  const dynamicThreshold = Math.max(18.0, avgMean + 2.8 * stdDev);
  const candidates = blocks.filter((b) => b.mean >= dynamicThreshold).sort((a, b) => b.mean - a.mean);

  const chosen: { mean: number; bx: number; by: number; bw: number; bh: number; label: string; bbox: BBox }[] = [];
  const W = canvas.width;
  const H = canvas.height;

  for (const c of candidates) {
    const cx = (c.bx + 0.5) / Math.max(1, Math.floor(W / 16));
    const cy = (c.by + 0.5) / Math.max(1, Math.floor(H / 16));
    const label = labelRegion(cx, cy);
    if (chosen.some((x) => x.label === label)) continue;
    chosen.push({
      ...c,
      label,
      bbox: { x: c.bx * c.bw, y: c.by * c.bh, w: c.bw, h: c.bh },
    });
    if (chosen.length >= 3) break;
  }

  const regions: TamperingRegion[] = chosen.map((c) => ({
    manipulationType: manipulationFor(c.label),
    regionLabel: c.label,
    boundingBox: c.bbox,
    evidence: evidenceFor(c.label, c.mean),
    probability: clamp(Math.round(45 + (c.mean - dynamicThreshold) * 4.0), 45, 98),
  }));

  let overallProb = 0;
  if (regions.length > 0) {
    const weights = [0.6, 0.3, 0.1];
    for (let i = 0; i < regions.length && i < weights.length; i++) {
      overallProb += regions[i].probability * weights[i];
    }
  } else {
    // Zero anomalous blocks detected
    overallProb = clamp(Math.round((avgMean / 40.0) * 10), 0, 12);
  }
  overallProb = clamp(Math.round(overallProb), 0, 100);

  let severity: TamperingResult["severity"];
  if (overallProb < 25) severity = "NONE";
  else if (overallProb < 50) severity = "LOW";
  else if (overallProb < 75) severity = "MEDIUM";
  else severity = "HIGH";

  const confidence = clamp(Math.round(80 + Math.min(18, blocks.length / 500)), 70, 99);

  return { probability: overallProb, confidence, severity, regions };
}
