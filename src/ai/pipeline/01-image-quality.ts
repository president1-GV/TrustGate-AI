import type { ImageQualityResult } from "../types";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export async function analyzeImageQuality(
  canvas: HTMLCanvasElement
): Promise<ImageQualityResult> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return {
      score: 0,
      blur: 0,
      brightness: 0,
      contrast: 0,
      resolutionScore: 0,
      glare: 0,
      grade: "POOR",
    };
  }

  const W = canvas.width;
  const H = canvas.height;
  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;
  const pixelCount = W * H;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  const luminance: number[] = new Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    rSum += r;
    gSum += g;
    bSum += b;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    luminance[i] = lum;
  }

  const brightness = (rSum + gSum + bSum) / (3 * pixelCount);

  let lumSum = 0;
  for (let i = 0; i < pixelCount; i++) lumSum += luminance[i];
  const lumMean = lumSum / pixelCount;

  let lumVarSum = 0;
  for (let i = 0; i < pixelCount; i++) {
    const d = luminance[i] - lumMean;
    lumVarSum += d * d;
  }
  const contrast = Math.sqrt(lumVarSum / pixelCount);
  const contrastNorm = clamp((contrast / 80) * 100, 0, 100);

  const laplacian = new Float32Array(pixelCount);
  const kernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
  let lapSum = 0;

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let val = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kIdx = (ky + 1) * 3 + (kx + 1);
          const px = (y + ky) * W + (x + kx);
          val += luminance[px] * kernel[kIdx];
        }
      }
      const absVal = Math.abs(val);
      laplacian[y * W + x] = absVal;
      lapSum += absVal;
    }
  }

  const lapMean = lapSum / Math.max(1, (W - 2) * (H - 2));
  let lapVarSum = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const d = laplacian[y * W + x] - lapMean;
      lapVarSum += d * d;
    }
  }
  const lapVariance = lapVarSum / Math.max(1, (W - 2) * (H - 2));
  const blur = clamp(100 - Math.min(100, lapVariance / 50), 0, 100);

  const resolutionScore = clamp(((W * H) / 3000000) * 100, 0, 100);

  let glareCount = 0;
  for (let i = 0; i < pixelCount; i++) {
    if (luminance[i] > 240) glareCount++;
  }
  const glare = glareCount / pixelCount;

  const brightnessScore = 100 - Math.abs(brightness - 128) / 1.28;
  const glareScore = 100 - glare * 100;

  const score = clamp(
    blur * 0.35 +
      contrastNorm * 0.15 +
      brightnessScore * 0.15 +
      resolutionScore * 0.2 +
      glareScore * 0.15,
    0,
    100
  );

  let grade: ImageQualityResult["grade"];
  if (score >= 90) grade = "EXCELLENT";
  else if (score >= 70) grade = "GOOD";
  else if (score >= 50) grade = "FAIR";
  else grade = "POOR";

  return {
    score,
    blur,
    brightness,
    contrast: contrastNorm,
    resolutionScore,
    glare,
    grade,
  };
}
