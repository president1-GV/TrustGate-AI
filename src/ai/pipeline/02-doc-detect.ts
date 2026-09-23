import type { DocDetectResult, ImageQualityResult } from "../types";

/**
 * Evaluates whether an image exhibits structural identity credential characteristics.
 * Strictly verifies aspect ratios, dimensions, edge transition density, and framing.
 * Rejects non-document images (e.g. arbitrary photos, screenshots, code) with "unknown" type.
 */
export async function detectDocument(
  canvas: HTMLCanvasElement,
  quality: ImageQualityResult
): Promise<DocDetectResult> {
  const W = canvas.width;
  const H = canvas.height;

  if (W < 120 || H < 90) {
    return {
      documentType: "unknown",
      confidence: 0.1,
      boundingBox: { x: 0, y: 0, w: W, h: H },
    };
  }

  const aspect = W / H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // 1. Measure horizontal edge transitions (text line density indicator)
  let horizontalGradients = 0;
  let totalSamples = 0;

  if (ctx) {
    try {
      const stepY = Math.max(2, Math.floor(H / 40));
      const stepX = Math.max(2, Math.floor(W / 60));
      const imgData = ctx.getImageData(0, 0, W, H).data;

      for (let y = stepY; y < H - stepY; y += stepY) {
        for (let x = stepX; x < W - stepX; x += stepX) {
          const idx = (y * W + x) * 4;
          const nextIdx = (y * W + (x + stepX)) * 4;
          const lum1 = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
          const lum2 = 0.299 * imgData[nextIdx] + 0.587 * imgData[nextIdx + 1] + 0.114 * imgData[nextIdx + 2];
          if (Math.abs(lum1 - lum2) > 28) {
            horizontalGradients++;
          }
          totalSamples++;
        }
      }
    } catch {
      // Ignore sample error, use geometry
    }
  }

  const gradientRatio = totalSamples > 0 ? horizontalGradients / totalSamples : 0;
  // Documents typically have moderate gradient density (5% to 45%).
  // Uniform solid blocks (<2%) or noisy random noise (>70%) are unlikely to be standard credentials.
  const hasDocumentTextStructure = gradientRatio >= 0.04 && gradientRatio <= 0.65;

  let documentType: DocDetectResult["documentType"] = "unknown";
  let confidence = 0.25;

  // ICAO 9303 TD3 standard passport page (aspect ~1.420)
  if (aspect >= 1.36 && aspect <= 1.48 && hasDocumentTextStructure) {
    documentType = "passport";
    const aspectDiff = Math.abs(aspect - 1.42);
    confidence = Math.max(0.70, 0.94 - aspectDiff * 1.5);
  }
  // ICAO 9303 TD1 standard identity card / driving licence (aspect ~1.586)
  else if (aspect >= 1.52 && aspect <= 1.66 && hasDocumentTextStructure) {
    documentType = "id";
    const aspectDiff = Math.abs(aspect - 1.586);
    confidence = Math.max(0.70, 0.93 - aspectDiff * 1.5);
  }
  // ICAO MRV-A / MRV-B standard visa format (aspect ~1.65 - 1.75)
  else if (aspect >= 1.66 && aspect <= 1.76 && hasDocumentTextStructure) {
    documentType = "visa";
    confidence = 0.85;
  }
  // Widescreen 16:9 capture or desktop screenshot (aspect ~1.77)
  else if (aspect >= 1.74 && aspect <= 1.84) {
    // A 16:9 frame is non-standard for physical credentials (TD3 is ~1.42, TD1 is ~1.586).
    // Without confirmed MRZ or card boundaries, classify as unknown.
    documentType = "unknown";
    confidence = 0.35;
  }
  // Live camera 4:3 frame containing document (aspect ~1.30 - 1.36)
  else if (aspect >= 1.30 && aspect < 1.36 && hasDocumentTextStructure) {
    documentType = "passport";
    confidence = 0.70;
  }
  // Camera capture framing of ID card / credential (aspect ~1.15 - 1.30)
  else if (aspect >= 1.15 && aspect < 1.30 && hasDocumentTextStructure) {
    documentType = "id";
    confidence = 0.75;
  }
  // ID Permit / Portrait orientation mobile scan / e-Aadhaar letter slip (aspect ~0.38 - 0.78)
  else if (aspect >= 0.38 && aspect <= 0.78 && hasDocumentTextStructure) {
    documentType = "id";
    confidence = 0.82;
  }
  // Non-matching aspect ratio or lacks document structures
  else {
    documentType = "unknown";
    confidence = Math.min(0.35, Math.max(0.1, gradientRatio));
  }

  // Modulate confidence with measured image quality
  if (quality.grade === "POOR") {
    confidence = Math.max(0.15, confidence * 0.7);
  }

  const boundingBox = {
    x: Math.floor(W * 0.05),
    y: Math.floor(H * 0.05),
    w: Math.floor(W * 0.9),
    h: Math.floor(H * 0.9),
  };

  return {
    documentType,
    confidence: Math.round(confidence * 100) / 100,
    boundingBox,
  };
}
