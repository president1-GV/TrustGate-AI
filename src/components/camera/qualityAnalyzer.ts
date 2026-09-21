/**
 * TrustGate AI — Real-Time Camera Quality & Document Framing Analyzer
 * Strictly computes real quality metrics (brightness, contrast, Laplacian sharpness, framing)
 * using an offscreen canvas sampling pipeline with ultra-low CPU footprint.
 */

import type {
  FrameQualityMetrics,
  QualityLevel,
  FocusLevel,
  PositionLevel,
  DocumentDetectionLevel,
} from "./types";

const SAMPLE_WIDTH = 320;
const SAMPLE_HEIGHT = 240;

export class CameraQualityAnalyzer {
  private static offscreenCanvas: HTMLCanvasElement | null = null;
  private static offscreenCtx: CanvasRenderingContext2D | null = null;

  private static getContext(): CanvasRenderingContext2D | null {
    if (!this.offscreenCanvas) {
      if (typeof document === "undefined") return null;
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCanvas.width = SAMPLE_WIDTH;
      this.offscreenCanvas.height = SAMPLE_HEIGHT;
      this.offscreenCtx = this.offscreenCanvas.getContext("2d", {
        willReadFrequently: true,
      });
    }
    return this.offscreenCtx;
  }

  /**
   * Analyzes an active HTMLVideoElement or Canvas and returns real computed quality metrics.
   */
  public static analyzeFrame(
    source: HTMLVideoElement | HTMLCanvasElement,
    mode: "document" | "portrait" = "document"
  ): FrameQualityMetrics {
    const ctx = this.getContext();
    const defaultMetrics: FrameQualityMetrics = {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      framingScore: 0,
      occupancyPercent: 0,
      isCentered: false,
      overallScore: 0,
      width: source instanceof HTMLVideoElement ? source.videoWidth || 0 : source.width || 0,
      height: source instanceof HTMLVideoElement ? source.videoHeight || 0 : source.height || 0,
      lightIndicator: "POOR",
      focusIndicator: "BLUR",
      positionIndicator: "ADJUST",
      docIndicator: "SEARCHING",
      guidanceMessage: "Waiting for camera frame…",
      isQualityAcceptable: false,
    };

    if (!ctx) return defaultMetrics;

    const srcWidth =
      source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const srcHeight =
      source instanceof HTMLVideoElement ? source.videoHeight : source.height;

    if (!srcWidth || !srcHeight) return defaultMetrics;

    // Draw downsampled frame for lightweight analysis
    ctx.drawImage(source, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    } catch {
      return defaultMetrics;
    }

    const data = imgData.data;
    const totalPixels = SAMPLE_WIDTH * SAMPLE_HEIGHT;

    // 1. Grayscale luminance & contrast measurement
    let sumLum = 0;
    let sumLumSq = 0;
    const gray = new Float32Array(totalPixels);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Rec. 601 Luma formula
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[p] = y;
      sumLum += y;
      sumLumSq += y * y;
    }

    const meanLum = sumLum / totalPixels;
    const varianceLum = Math.max(0, sumLumSq / totalPixels - meanLum * meanLum);
    const stdDevLum = Math.sqrt(varianceLum);

    // Brightness score: 0-100 (optimal around 110-140 luma)
    const brightnessScore = Math.min(100, Math.max(0, Math.round((meanLum / 255) * 100)));
    // Contrast score: 0-100 (standard deviation normalized)
    const contrastScore = Math.min(100, Math.max(0, Math.round((stdDevLum / 64) * 100)));

    // 2. Sharpness Measurement via discrete Laplacian kernel on central 60% of frame
    const startX = Math.floor(SAMPLE_WIDTH * 0.2);
    const endX = Math.floor(SAMPLE_WIDTH * 0.8);
    const startY = Math.floor(SAMPLE_HEIGHT * 0.2);
    const endY = Math.floor(SAMPLE_HEIGHT * 0.8);

    let laplacianSum = 0;
    let laplacianSumSq = 0;
    let laplacianCount = 0;

    for (let y = startY; y < endY; y++) {
      const rowOffset = y * SAMPLE_WIDTH;
      for (let x = startX; x < endX; x++) {
        const center = gray[rowOffset + x];
        const up = gray[rowOffset - SAMPLE_WIDTH + x];
        const down = gray[rowOffset + SAMPLE_WIDTH + x];
        const left = gray[rowOffset + x - 1];
        const right = gray[rowOffset + x + 1];

        // Discrete Laplacian: L = up + down + left + right - 4*center
        const lap = up + down + left + right - 4 * center;
        laplacianSum += lap;
        laplacianSumSq += lap * lap;
        laplacianCount++;
      }
    }

    const lapMean = laplacianSum / Math.max(1, laplacianCount);
    const lapVar = Math.max(0, laplacianSumSq / Math.max(1, laplacianCount) - lapMean * lapMean);

    // Normalize Laplacian variance to 0-100 scale (var > 120 is tack sharp)
    const sharpnessScore = Math.min(100, Math.max(0, Math.round((Math.sqrt(lapVar) / 28) * 100)));

    // 3. Document / Face Framing & Alignment Estimation
    // Compute edge density inside the target alignment box vs outside
    const boxW = Math.floor(SAMPLE_WIDTH * 0.72);
    const boxH = Math.floor(boxW / (mode === "document" ? 1.42 : 1.25));
    const boxX = Math.floor((SAMPLE_WIDTH - boxW) / 2);
    const boxY = Math.floor((SAMPLE_HEIGHT - boxH) / 2);

    let insideEdgeEnergy = 0;
    let insideCount = 0;
    let outsideEdgeEnergy = 0;
    let outsideCount = 0;

    for (let y = 1; y < SAMPLE_HEIGHT - 1; y++) {
      const rOff = y * SAMPLE_WIDTH;
      const isInsideY = y >= boxY && y <= boxY + boxH;
      for (let x = 1; x < SAMPLE_WIDTH - 1; x++) {
        const gx = Math.abs(gray[rOff + x + 1] - gray[rOff + x - 1]);
        const gy = Math.abs(gray[rOff + SAMPLE_WIDTH + x] - gray[rOff - SAMPLE_WIDTH + x]);
        const grad = gx + gy;

        if (isInsideY && x >= boxX && x <= boxX + boxW) {
          insideEdgeEnergy += grad;
          insideCount++;
        } else {
          outsideEdgeEnergy += grad;
          outsideCount++;
        }
      }
    }

    const avgInsideGrad = insideEdgeEnergy / Math.max(1, insideCount);
    const avgOutsideGrad = outsideEdgeEnergy / Math.max(1, outsideCount);

    // Framing ratio: high inside gradient relative to outside indicates good framing
    const framingRatio = avgInsideGrad / Math.max(1, avgOutsideGrad + 1);
    const framingScore = Math.min(100, Math.max(0, Math.round(framingRatio * 50)));

    // Occupancy estimation
    const edgePixelsInside = insideEdgeEnergy > 20 ? Math.min(100, Math.round((avgInsideGrad / 32) * 100)) : 0;
    const occupancyPercent = Math.min(100, Math.max(10, Math.round(edgePixelsInside * 0.95)));
    const isCentered = framingScore >= 40 && Math.abs(avgInsideGrad - avgOutsideGrad) > 4;

    // Overall Score: weighted composite strictly derived from real measurements
    const overallScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          0.35 * sharpnessScore +
          0.25 * brightnessScore +
          0.20 * contrastScore +
          0.20 * framingScore
        )
      )
    );

    // Indicator determinations
    let lightIndicator: QualityLevel = "GOOD";
    if (brightnessScore < 30 || brightnessScore > 92) lightIndicator = "POOR";
    else if (brightnessScore < 45 || brightnessScore > 80) lightIndicator = "FAIR";

    let focusIndicator: FocusLevel = "SHARP";
    if (sharpnessScore < 30) focusIndicator = "BLUR";
    else if (sharpnessScore < 45) focusIndicator = "FAIR";

    let positionIndicator: PositionLevel = "GOOD";
    if (!isCentered || framingScore < 35) positionIndicator = "ADJUST";
    else if (occupancyPercent < 30 || occupancyPercent > 85) positionIndicator = "CENTERING";

    let docIndicator: DocumentDetectionLevel = "ALIGNED";
    if (framingScore < 25) docIndicator = "SEARCHING";
    else if (framingScore < 45 || !isCentered) docIndicator = "DETECTED";

    // Guidance Message
    let guidanceMessage = "Ready for capture";
    if (lightIndicator === "POOR") {
      guidanceMessage = brightnessScore < 30 ? "Improve lighting — frame is too dark" : "Reduce direct glare on document";
    } else if (focusIndicator === "BLUR") {
      guidanceMessage = "Hold steady — focusing image";
    } else if (docIndicator === "SEARCHING") {
      guidanceMessage = mode === "document" ? "Move document into alignment frame" : "Position face within oval frame";
    } else if (occupancyPercent < 25) {
      guidanceMessage = "Move closer to camera";
    } else if (occupancyPercent > 88) {
      guidanceMessage = "Move farther away from camera";
    } else if (positionIndicator !== "GOOD") {
      guidanceMessage = "Align document with corner brackets";
    } else {
      guidanceMessage = "Document aligned — hold steady";
    }

    const isQualityAcceptable =
      brightnessScore >= 38 &&
      brightnessScore <= 90 &&
      contrastScore >= 25 &&
      sharpnessScore >= 35 &&
      framingScore >= 35 &&
      occupancyPercent >= 25 &&
      occupancyPercent <= 90;

    return {
      brightness: brightnessScore,
      contrast: contrastScore,
      sharpness: sharpnessScore,
      framingScore,
      occupancyPercent,
      isCentered,
      overallScore,
      width: srcWidth,
      height: srcHeight,
      lightIndicator,
      focusIndicator,
      positionIndicator,
      docIndicator,
      guidanceMessage,
      isQualityAcceptable,
    };
  }
}
