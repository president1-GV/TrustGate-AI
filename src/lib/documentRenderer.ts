/**
 * Authentic Document Canvas Generator for TrustGate AI
 * Synthesizes high-fidelity, photo-realistic identity documents compliant with
 * ICAO 9303 (TD1, TD3) standards directly matching the MIDV-2020 dataset archetypes.
 * Generates real canvas blobs/URLs for the Document Viewer.
 */

export interface DocumentRenderOptions {
  sampleId: string;
  width?: number;
  height?: number;
}

export function renderBenchmarkDocument(sampleId: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = 560;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve("");
      return;
    }

    // Determine archetype based on sampleId
    if (sampleId === "TAMPERED_PHOTO" || sampleId === "MIDV-2020-ESP-TAMPER-003") {
      drawSpanishDNI(ctx, width, height, true);
    } else if (sampleId === "MODIFIED_DOB" || sampleId === "MIDV-2020-DEU-002") {
      drawGermanID(ctx, width, height, true);
    } else if (sampleId === "HIGH_RISK_COMPOSITE") {
      drawHighRiskComposite(ctx, width, height);
    } else if (sampleId === "visa" || sampleId === "visa_sticker") {
      drawVisaSticker(ctx, width, height);
    } else if (sampleId === "genuine") {
      drawIndianPassport(ctx, width, height, {
        docNo: "P9182301",
        name: "SHARMA",
        givenNames: "RAHUL",
        dob: "14/08/1995",
        dobMrz: "950814",
        expiry: "20/05/2032",
        expiryMrz: "320520",
      });
    } else if (sampleId === "tampered_photo") {
      drawIndianPassport(ctx, width, height, {
        docNo: "L4091823",
        name: "VERMA",
        givenNames: "AMIT",
        dob: "10/02/1988",
        dobMrz: "880210",
        expiry: "15/11/2029",
        expiryMrz: "291115",
        tamperedPhoto: true,
      });
    } else if (sampleId === "mrz_mismatch") {
      drawIndianPassport(ctx, width, height, {
        docNo: "Z1092834",
        name: "SINGH",
        givenNames: "VIKRAM",
        dob: "12/04/1998",
        dobMrz: "920412",
        expiry: "01/01/2024",
        expiryMrz: "240101",
        mrzMismatch: true,
      });
    } else if (sampleId === "expired") {
      drawIndianPassport(ctx, width, height, {
        docNo: "K7723451",
        name: "NAIR",
        givenNames: "PRIYA",
        dob: "03/09/1990",
        dobMrz: "900903",
        expiry: "12/03/2025",
        expiryMrz: "250312",
        isExpired: true,
      });
    } else if (sampleId === "watchlist") {
      drawIndianPassport(ctx, width, height, {
        docNo: "M2210987",
        name: "KUMAR",
        givenNames: "ANIL",
        dob: "22/07/1982",
        dobMrz: "820722",
        expiry: "09/09/2028",
        expiryMrz: "280909",
      });
    } else if (sampleId === "low_quality") {
      drawIndianPassport(ctx, width, height, {
        docNo: "R5501984",
        name: "GUPTA",
        givenNames: "SANJAY",
        dob: "18/06/1993",
        dobMrz: "930618",
        expiry: "27/10/2030",
        expiryMrz: "301027",
        isBlur: true,
      });
    } else if (sampleId === "EXPIRED") {
      drawUSPassport(ctx, width, height, { isExpired: true });
    } else if (sampleId === "FACE_MISMATCH") {
      drawUSPassport(ctx, width, height, { altFace: true });
    } else if (sampleId === "MRZ_MISMATCH") {
      drawUSPassport(ctx, width, height, { mrzMismatch: true });
    } else {
      // Default: Clean genuine Indian Passport
      drawIndianPassport(ctx, width, height, {
        docNo: "P9182301",
        name: "SHARMA",
        givenNames: "RAHUL",
        dob: "14/08/1995",
        dobMrz: "950814",
        expiry: "20/05/2032",
        expiryMrz: "320520",
      });
    }

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      } else {
        resolve(canvas.toDataURL("image/png"));
      }
    }, "image/png");
  });
}

function drawGuilloche(ctx: CanvasRenderingContext2D, width: number, height: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 360; i += 18) {
    ctx.beginPath();
    const rad = (i * Math.PI) / 180;
    for (let r = 20; r < width / 2; r += 15) {
      const x = width / 2 + Math.cos(rad) * r + Math.sin(r / 10) * 12;
      const y = height / 2 + Math.sin(rad) * r * 0.7 + Math.cos(r / 10) * 12;
      if (r === 20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawPhotographicBiometricPortrait(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { tampered?: boolean; alt?: boolean; country?: string }
) {
  ctx.save();

  // 1. Biometric Studio Background: smooth light gradient (neutral ICAO standard backdrop)
  const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  bgGrad.addColorStop(0, "#e8edf2");
  bgGrad.addColorStop(0.4, "#dbe2e8");
  bgGrad.addColorStop(1, "#c2cbd3");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  // Studio Key Lighting glow behind subject
  const glowGrad = ctx.createRadialGradient(x + w * 0.5, y + h * 0.45, 10, x + w * 0.5, y + h * 0.45, w * 0.7);
  glowGrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(x, y, w, h);

  const cx = x + w * 0.5;

  // 2. Clothing / Suit & Shirt (Formal Dark Blazer)
  const suitGrad = ctx.createLinearGradient(x, y + h * 0.65, x, y + h);
  suitGrad.addColorStop(0, options?.alt ? "#1c2536" : "#0d1527");
  suitGrad.addColorStop(1, options?.alt ? "#111827" : "#050811");
  ctx.fillStyle = suitGrad;
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 1.08, w * 0.54, h * 0.48, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Suit lapel shadows & folds
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.32, y + h);
  ctx.lineTo(cx - w * 0.12, y + h * 0.74);
  ctx.lineTo(cx - w * 0.05, y + h * 0.88);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + w * 0.32, y + h);
  ctx.lineTo(cx + w * 0.12, y + h * 0.74);
  ctx.lineTo(cx + w * 0.05, y + h * 0.88);
  ctx.stroke();

  // Crisp White Formal Shirt Collar
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.13, y + h * 0.68);
  ctx.lineTo(cx, y + h * 0.86);
  ctx.lineTo(cx + w * 0.13, y + h * 0.68);
  ctx.lineTo(cx + w * 0.08, y + h * 0.64);
  ctx.lineTo(cx - w * 0.08, y + h * 0.64);
  ctx.closePath();
  ctx.fill();

  // Collar shadow & crease
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Silk Necktie (Burgundy / Crimson or Midnight Blue)
  const tieGrad = ctx.createLinearGradient(cx - 10, y + h * 0.72, cx + 10, y + h);
  tieGrad.addColorStop(0, options?.alt ? "#1e3a8a" : "#881337");
  tieGrad.addColorStop(1, options?.alt ? "#0f172a" : "#4c0519");
  ctx.fillStyle = tieGrad;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.04, y + h * 0.72);
  ctx.lineTo(cx + w * 0.04, y + h * 0.72);
  ctx.lineTo(cx + w * 0.065, y + h);
  ctx.lineTo(cx - w * 0.065, y + h);
  ctx.closePath();
  ctx.fill();

  // 3. Neck with realistic anatomical shadow
  const neckGrad = ctx.createLinearGradient(cx - w * 0.1, y + h * 0.5, cx + w * 0.1, y + h * 0.66);
  const skinBase = options?.alt ? "#d9a577" : "#dfb388";
  const skinShadow = options?.alt ? "#b57d4f" : "#be8b5c";
  const skinHighlight = options?.alt ? "#ebd2b8" : "#f2dec8";
  neckGrad.addColorStop(0, skinShadow);
  neckGrad.addColorStop(0.6, skinBase);
  neckGrad.addColorStop(1, skinShadow);
  ctx.fillStyle = neckGrad;
  ctx.fillRect(cx - w * 0.12, y + h * 0.5, w * 0.24, h * 0.18);

  // 4. Ears
  const earY = y + h * 0.38;
  const earH = h * 0.15;
  const earW = w * 0.08;
  ctx.fillStyle = skinShadow;
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.28, earY, earW, earH * 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + w * 0.28, earY, earW, earH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skinBase;
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.27, earY, earW * 0.6, earH * 0.4, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + w * 0.27, earY, earW * 0.6, earH * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 5. Head and Jaw (Photorealistic 3D Cranial Contours)
  const faceY = y + h * 0.4;
  const faceRx = w * 0.27;
  const faceRy = h * 0.28;

  ctx.beginPath();
  ctx.ellipse(cx, faceY, faceRx, faceRy, 0, 0, Math.PI * 2);
  const headGrad = ctx.createRadialGradient(cx - faceRx * 0.2, faceY - faceRy * 0.2, faceRx * 0.1, cx, faceY, faceRy * 1.1);
  headGrad.addColorStop(0, skinHighlight);
  headGrad.addColorStop(0.5, skinBase);
  headGrad.addColorStop(0.85, skinShadow);
  headGrad.addColorStop(1, "rgba(130, 85, 50, 0.8)");
  ctx.fillStyle = headGrad;
  ctx.fill();

  // Cheekbone soft radiance
  const cheekGrad = ctx.createRadialGradient(cx - faceRx * 0.45, faceY + faceRy * 0.1, 2, cx - faceRx * 0.45, faceY + faceRy * 0.1, faceRx * 0.4);
  cheekGrad.addColorStop(0, "rgba(255, 255, 255, 0.18)");
  cheekGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = cheekGrad;
  ctx.fillRect(cx - faceRx, faceY - faceRy * 0.2, faceRx * 2, faceRy * 0.8);

  // 6. Hair (Natural styled hairline, textured crown)
  const hairColor = options?.alt ? "#241812" : "#1a1310";
  const hairHighlight = options?.alt ? "#4a3225" : "#382922";
  const hairGrad = ctx.createLinearGradient(cx, y + h * 0.12, cx, y + h * 0.35);
  hairGrad.addColorStop(0, hairHighlight);
  hairGrad.addColorStop(0.4, hairColor);
  hairGrad.addColorStop(1, "#0d0a08");
  ctx.fillStyle = hairGrad;

  ctx.beginPath();
  ctx.moveTo(cx - faceRx * 1.05, faceY);
  ctx.quadraticCurveTo(cx - faceRx * 1.1, y + h * 0.16, cx, y + h * 0.13);
  ctx.quadraticCurveTo(cx + faceRx * 1.1, y + h * 0.16, cx + faceRx * 1.05, faceY);
  ctx.quadraticCurveTo(cx + faceRx * 0.85, faceY - faceRy * 0.4, cx + faceRx * 0.4, faceY - faceRy * 0.48);
  ctx.quadraticCurveTo(cx, faceY - faceRy * 0.42, cx - faceRx * 0.4, faceY - faceRy * 0.48);
  ctx.quadraticCurveTo(cx - faceRx * 0.85, faceY - faceRy * 0.4, cx - faceRx * 1.05, faceY);
  ctx.closePath();
  ctx.fill();

  // Natural hair texture strokes
  ctx.strokeStyle = hairHighlight;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  for (let i = -10; i <= 10; i += 3) {
    ctx.beginPath();
    ctx.moveTo(cx + (i * w * 0.015), y + h * 0.14);
    ctx.quadraticCurveTo(cx + (i * w * 0.018), y + h * 0.20, cx + (i * w * 0.014), y + h * 0.26);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // 7. Natural Eyebrows
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  const browY = faceY - faceRy * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx - faceRx * 0.65, browY + 2);
  ctx.quadraticCurveTo(cx - faceRx * 0.42, browY - 4, cx - faceRx * 0.16, browY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + faceRx * 0.16, browY);
  ctx.quadraticCurveTo(cx + faceRx * 0.42, browY - 4, cx + faceRx * 0.65, browY + 2);
  ctx.stroke();

  // 8. Photographic Eyes with Corneal Catchlights
  const eyeY = faceY - faceRy * 0.08;
  const eyeDist = faceRx * 0.38;
  const eyeWidth = faceRx * 0.24;
  const eyeHeight = faceRy * 0.12;

  const drawOneEye = (eyeCx: number) => {
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.ellipse(eyeCx, eyeY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.beginPath();
    ctx.ellipse(eyeCx, eyeY - eyeHeight * 0.2, eyeWidth, eyeHeight * 0.6, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    const irisR = eyeHeight * 0.95;
    ctx.fillStyle = "#1e130c";
    ctx.beginPath();
    ctx.arc(eyeCx, eyeY, irisR, 0, Math.PI * 2);
    ctx.fill();

    const irisGrad = ctx.createRadialGradient(eyeCx, eyeY, 1, eyeCx, eyeY, irisR);
    irisGrad.addColorStop(0, "#2c1d11");
    irisGrad.addColorStop(0.6, "#5c3d24");
    irisGrad.addColorStop(1, "#1e130c");
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(eyeCx, eyeY, irisR * 0.92, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#050302";
    ctx.beginPath();
    ctx.arc(eyeCx, eyeY, irisR * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Studio Catchlight
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eyeCx - irisR * 0.28, eyeY - irisR * 0.28, irisR * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Crease
    ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(eyeCx, eyeY, eyeWidth * 1.05, eyeHeight * 1.05, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  };

  drawOneEye(cx - eyeDist);
  drawOneEye(cx + eyeDist);

  // 9. Realistic 3D Nose Bridge & Tip
  const noseY = faceY + faceRy * 0.16;
  ctx.strokeStyle = "rgba(140, 95, 60, 0.45)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 3, faceY - faceRy * 0.12);
  ctx.lineTo(cx - 4, noseY);
  ctx.lineTo(cx, noseY + 3);
  ctx.stroke();

  ctx.fillStyle = "rgba(80, 45, 25, 0.5)";
  ctx.beginPath();
  ctx.arc(cx - faceRx * 0.14, noseY + 1, 2.2, 0, Math.PI * 2);
  ctx.arc(cx + faceRx * 0.14, noseY + 1, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.arc(cx, noseY - 1, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 10. Natural Lips
  const mouthY = faceY + faceRy * 0.48;
  const mouthW = faceRx * 0.42;
  const lipColor = options?.alt ? "#a3564d" : "#b06359";
  ctx.fillStyle = lipColor;
  ctx.beginPath();
  ctx.moveTo(cx - mouthW, mouthY);
  ctx.quadraticCurveTo(cx - mouthW * 0.4, mouthY - 3.5, cx, mouthY - 1.5);
  ctx.quadraticCurveTo(cx + mouthW * 0.4, mouthY - 3.5, cx + mouthW, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + 1, cx - mouthW, mouthY);
  ctx.closePath();
  ctx.fill();

  const lowerLipGrad = ctx.createLinearGradient(cx, mouthY, cx, mouthY + 7);
  lowerLipGrad.addColorStop(0, lipColor);
  lowerLipGrad.addColorStop(0.5, options?.alt ? "#ba685e" : "#c6756b");
  lowerLipGrad.addColorStop(1, options?.alt ? "#8f443b" : "#9e4f45");
  ctx.fillStyle = lowerLipGrad;
  ctx.beginPath();
  ctx.moveTo(cx - mouthW * 0.85, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + 7.5, cx + mouthW * 0.85, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + 1, cx - mouthW * 0.85, mouthY);
  ctx.closePath();
  ctx.fill();

  // 11. Subtle Photographic Sensor Micro-Grain (Gaussian-like noise)
  const imgData = ctx.getImageData(x, y, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 16) {
    const grain = (Math.random() - 0.5) * 8;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, x, y);

  // 12. Security Features: ICAO Anti-Counterfeiting Holographic Guilloche Wave
  ctx.save();
  ctx.strokeStyle = "rgba(14, 165, 233, 0.28)";
  ctx.lineWidth = 0.8;
  for (let rad = 20; rad < w * 0.9; rad += 18) {
    ctx.beginPath();
    ctx.arc(x + w, y + h, rad, Math.PI, Math.PI * 1.5);
    ctx.stroke();
  }

  // Official Biometric Chip Icon Watermark Overlay
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + w - 28, y + h - 22, 20, 14);
  ctx.beginPath();
  ctx.arc(x + w - 18, y + h - 15, 3.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (options?.tampered) {
    ctx.save();
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(244, 63, 94, 0.14)";
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.restore();
}

function drawFacePortrait(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { tampered?: boolean; alt?: boolean }
) {
  drawPhotographicBiometricPortrait(ctx, x, y, w, h, options);
}

function drawUSPassport(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  flags: { isExpired?: boolean; altFace?: boolean; mrzMismatch?: boolean }
) {
  // Document base (ICAO 9303 TD3 standard passport page)
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#f8fafc");
  bg.addColorStop(0.5, "#f1f5f9");
  bg.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Border & subtle rounded edges
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // Guilloche fine security lines
  drawGuilloche(ctx, width, height, "#0284c7");

  // Header Banner: UNITED STATES OF AMERICA
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(18, 18, width - 36, 44);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px 'Inter', sans-serif";
  ctx.fillText("UNITED STATES OF AMERICA", 36, 46);

  ctx.font = "bold 12px 'Inter', sans-serif";
  ctx.fillStyle = "#bfdbfe";
  ctx.fillText("PASSPORT / PASSEPORT", width - 210, 46);

  // Biometric symbol glyph
  ctx.strokeStyle = "#bfdbfe";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(width - 55, 30, 24, 18);
  ctx.beginPath();
  ctx.arc(width - 43, 39, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Photo Zone (Standard Left/Center)
  drawFacePortrait(ctx, 480, 85, 250, 310, { alt: flags.altFace });

  // Great Seal / Crest watermark
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#1e3a8a";
  ctx.beginPath();
  ctx.arc(280, 240, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Text Fields
  const startX = 42;
  let currY = 95;

  function renderField(label: string, value: string, highlight?: boolean) {
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 10px 'Inter', monospace";
    ctx.fillText(label.toUpperCase(), startX, currY);

    ctx.fillStyle = highlight ? "#b91c1c" : "#0f172a";
    ctx.font = "bold 14px 'Inter', monospace";
    ctx.fillText(value, startX, currY + 16);
    currY += 40;
  }

  renderField("Type / Type", "P");
  renderField("Country Code / Code du pays", "USA");
  renderField("Passport No. / No du passeport", "A12345678");
  renderField("Surname / Nom", "DOE");
  renderField("Given Names / Prénoms", "JOHN MICHAEL");
  renderField("Nationality / Nationalité", "UNITED STATES OF AMERICA");
  renderField("Date of Birth / Date de naissance", "01 JAN / JAN 1970");
  renderField("Sex / Sexe", "M");

  // Expiry date
  const expiryVal = flags.isExpired ? "14 MAR / MAR 2023" : "14 MAR / MAR 2030";
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 10px 'Inter', monospace";
  ctx.fillText("DATE OF EXPIRY / DATE D'EXPIRATION", 260, 375);
  ctx.fillStyle = flags.isExpired ? "#b91c1c" : "#0f172a";
  ctx.font = "bold 14px 'Inter', monospace";
  ctx.fillText(expiryVal, 260, 391);

  // MRZ Band at Bottom (ICAO 9303 TD3 — 2 Lines of 44 Characters)
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(18, height - 120, width - 36, 102);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, height - 120, width - 36, 102);

  const line1 = "P<USADOE<<JOHN<<MICHAEL<<<<<<<<<<<<<<<<<<<<<";
  const line2 = flags.mrzMismatch
    ? "A123456799USA7001019M2812315<<<<<<<<<<<<<<04"
    : flags.isExpired
    ? "A123456789USA7001019M2303145<<<<<<<<<<<<<<04"
    : "A123456789USA7001019M2812315<<<<<<<<<<<<<<04";

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 17px 'Courier New', monospace";
  ctx.fillText(line1, 38, height - 76);
  ctx.fillText(line2, 38, height - 42);
}

function drawGermanID(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hasTamperedDob?: boolean
) {
  // TD1 Format ID Card (Bundesrepublik Deutschland)
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#f0fdf4");
  bg.addColorStop(0.6, "#e0f2fe");
  bg.addColorStop(1, "#f8fafc");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  drawGuilloche(ctx, width, height, "#059669");

  // Header
  ctx.fillStyle = "#047857";
  ctx.fillRect(18, 18, width - 36, 44);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px 'Inter', sans-serif";
  ctx.fillText("BUNDESREPUBLIK DEUTSCHLAND", 36, 46);

  ctx.font = "bold 12px 'Inter', sans-serif";
  ctx.fillStyle = "#a7f3d0";
  ctx.fillText("PERSONALAUSWEIS / IDENTITY CARD", width - 290, 46);

  // Photo
  drawFacePortrait(ctx, 42, 85, 210, 270);

  // Fields
  const startX = 280;
  let currY = 95;

  function renderField(label: string, value: string, alert?: boolean) {
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 10px 'Inter', monospace";
    ctx.fillText(label, startX, currY);

    if (alert) {
      // Tampering visual cue: irregular font and background artifact
      ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
      ctx.fillRect(startX - 4, currY + 2, 180, 20);
      ctx.strokeStyle = "#ef4444";
      ctx.strokeRect(startX - 4, currY + 2, 180, 20);
      ctx.fillStyle = "#b91c1c";
      ctx.font = "bold 15px 'Times New Roman', serif";
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 14px 'Inter', monospace";
    }
    ctx.fillText(value, startX, currY + 16);
    currY += 42;
  }

  renderField("1. Name / Surname", "MUELLER");
  renderField("2. Vornamen / Given names", "MAX");
  renderField("3. Geburtstag / Date of birth", hasTamperedDob ? "22.08.1975" : "12.08.1964", hasTamperedDob);
  renderField("4. Staatsangehoerigkeit / Nationality", "DEUTSCH");
  renderField("5. Ausweisnummer / Document No.", "T22000129");
  renderField("6. Gueltig bis / Expiry date", "31.10.2029");

  // MRZ TD1 (3 Lines of 30 Characters)
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(18, height - 140, width - 36, 122);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, height - 140, width - 36, 122);

  const l1 = "IDD<<T220001293<<<<<<<<<<<<<<<";
  const l2 = "6408125M2910312D<<<<<<<<<<<<<4";
  const l3 = "MUELLER<<MAX<<<<<<<<<<<<<<<<<<";

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 17px 'Courier New', monospace";
  ctx.fillText(l1, 38, height - 98);
  ctx.fillText(l2, 38, height - 64);
  ctx.fillText(l3, 38, height - 30);
}

function drawSpanishDNI(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isPhotoTampered?: boolean
) {
  // TD1 Format DNI (Documento Nacional de Identidad - España)
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#fffbeb");
  bg.addColorStop(0.5, "#fef3c7");
  bg.addColorStop(1, "#fef9c3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  drawGuilloche(ctx, width, height, "#d97706");

  // Header
  ctx.fillStyle = "#b45309";
  ctx.fillRect(18, 18, width - 36, 44);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px 'Inter', sans-serif";
  ctx.fillText("ESPAÑA — DOCUMENTO NACIONAL DE IDENTIDAD", 36, 46);

  // Photo
  drawFacePortrait(ctx, 42, 85, 210, 270, { tampered: isPhotoTampered, alt: true });

  // Fields
  const startX = 280;
  let currY = 95;

  function renderField(label: string, value: string) {
    ctx.fillStyle = "#78350f";
    ctx.font = "bold 10px 'Inter', monospace";
    ctx.fillText(label, startX, currY);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px 'Inter', monospace";
    ctx.fillText(value, startX, currY + 16);
    currY += 42;
  }

  renderField("PRIMER APELLIDO / SURNAME", "GARCIA");
  renderField("SEGUNDO APELLIDO / SECOND SURNAME", "LOPEZ");
  renderField("NOMBRE / NAME", "CARMEN");
  renderField("SEXO / SEX · NACIONALIDAD / NATIONALITY", "F · ESP");
  renderField("NUMERO DE SOPORTE / DNI NO.", "BAA000111");
  renderField("VALIDEZ / EXPIRY", "01.01.2028");

  // MRZ TD1
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(18, height - 140, width - 36, 122);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, height - 140, width - 36, 122);

  const l1 = "IDESPBAA0001119<<<<<<<<<<<<<<<";
  const l2 = "8001014F2801014ESP<<<<<<<<<<<1";
  const l3 = "GARCIA<LOPEZ<<CARMEN<<<<<<<<<<";

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 17px 'Courier New', monospace";
  ctx.fillText(l1, 38, height - 98);
  ctx.fillText(l2, 38, height - 64);
  ctx.fillText(l3, 38, height - 30);
}

function drawHighRiskComposite(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Draw base US Passport with severe tampering anomalies
  drawUSPassport(ctx, width, height, { isExpired: true, altFace: true, mrzMismatch: true });

  // Add ELA tampering overlay flags
  ctx.save();
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 3]);

  // Altered DOC Number box
  ctx.strokeRect(36, 172, 210, 32);
  ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
  ctx.fillRect(36, 172, 210, 32);

  // Altered DOB box
  ctx.strokeRect(36, 332, 210, 32);
  ctx.fillRect(36, 332, 210, 32);

  ctx.restore();
}

interface IndianPassportParams {
  docNo: string;
  name: string;
  givenNames: string;
  dob: string;
  dobMrz: string;
  expiry: string;
  expiryMrz: string;
  tamperedPhoto?: boolean;
  mrzMismatch?: boolean;
  isExpired?: boolean;
  isBlur?: boolean;
}

function drawIndianPassport(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: IndianPassportParams
) {
  // Document base (ICAO 9303 TD3 standard passport page)
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#f8fafc");
  bg.addColorStop(0.5, "#fdf8f6");
  bg.addColorStop(1, "#f1f5f9");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (params.isBlur) {
    ctx.filter = "blur(2.5px)";
  }

  // Border & subtle rounded edges
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // Security Guilloche lines
  drawGuilloche(ctx, width, height, "#0284c7");
  drawGuilloche(ctx, width, height, "#ea580c");

  // Header Banner: REPUBLIC OF INDIA / भारत गणराज्य
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(18, 18, width - 36, 46);

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 15px 'Inter', sans-serif";
  ctx.fillText("REPUBLIC OF INDIA / भारत गणराज्य", 36, 46);

  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("PASSPORT / पासपोर्ट", width - 210, 46);

  // Biometric symbol glyph
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(width - 55, 30, 24, 18);
  ctx.beginPath();
  ctx.arc(width - 43, 39, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Photo Zone
  drawFacePortrait(ctx, 490, 85, 240, 305, { tampered: params.tamperedPhoto });

  // Ashoka Pillar emblem watermark
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#1e3a8a";
  ctx.beginPath();
  ctx.arc(280, 235, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Text Fields
  const startX = 40;
  let currY = 92;

  function renderField(label: string, value: string, highlight?: boolean) {
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 10px 'Inter', monospace";
    ctx.fillText(label.toUpperCase(), startX, currY);

    ctx.fillStyle = highlight ? "#dc2626" : "#0f172a";
    ctx.font = "bold 13.5px 'Inter', monospace";
    ctx.fillText(value, startX, currY + 16);
    currY += 39;
  }

  renderField("Type / प्रकार · Code / कोड", "P · IND");
  renderField("Passport No. / पासपोर्ट नं.", params.docNo);
  renderField("Surname / उपनाम", params.name);
  renderField("Given Names / दिया गया नाम", params.givenNames);
  renderField("Nationality / राष्ट्रीयता", "INDIAN");
  renderField("Date of Birth / जन्म तिथि", params.dob, params.mrzMismatch);
  renderField("Sex / लिंग", "M");

  // Expiry date
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 10px 'Inter', monospace";
  ctx.fillText("DATE OF EXPIRY / समाप्ति तिथि", 260, 365);
  ctx.fillStyle = params.isExpired ? "#dc2626" : "#0f172a";
  ctx.font = "bold 13.5px 'Inter', monospace";
  ctx.fillText(params.expiry, 260, 381);

  // MRZ Band at Bottom (ICAO 9303 TD3 — 2 Lines of 44 Characters)
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(18, height - 120, width - 36, 102);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, height - 120, width - 36, 102);

  const l1 = `P<IND${params.name}<<${params.givenNames}${"<".repeat(Math.max(0, 44 - 5 - params.name.length - 2 - params.givenNames.length))}`.slice(0, 44);
  const l2 = params.mrzMismatch
    ? `${params.docNo}<4IND${params.dobMrz}3M${params.expiryMrz}7<<<<<<<<<<<<<<<0`
    : `${params.docNo}<4IND${params.dobMrz}3M${params.expiryMrz}7<<<<<<<<<<<<<<<0`;

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 17px 'Courier New', monospace";
  ctx.fillText(l1, 36, height - 74);
  ctx.fillText(l2, 36, height - 40);

  if (params.isBlur) {
    ctx.filter = "none";
  }
}

function drawVisaSticker(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // ICAO MRZ-V Standard Visa Sticker (2 Lines of 36 Characters)
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#fefce8");
  bg.addColorStop(0.5, "#fef9c3");
  bg.addColorStop(1, "#fef08a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  drawGuilloche(ctx, width, height, "#b45309");

  // Visa Header
  ctx.fillStyle = "#854d0e";
  ctx.fillRect(18, 18, width - 36, 44);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px 'Inter', sans-serif";
  ctx.fillText("BAGGAGE & ENTRY IMMIGRATION VISA / वीज़ा", 36, 46);

  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.fillStyle = "#fef08a";
  ctx.fillText("ICAO MRZ-V (TD2 / 2x36)", width - 200, 46);

  // Photo
  drawFacePortrait(ctx, 42, 85, 200, 260);

  // Fields
  const startX = 270;
  let currY = 92;

  function renderField(label: string, value: string) {
    ctx.fillStyle = "#854d0e";
    ctx.font = "bold 10px 'Inter', monospace";
    ctx.fillText(label, startX, currY);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px 'Inter', monospace";
    ctx.fillText(value, startX, currY + 16);
    currY += 40;
  }

  renderField("VISA TYPE / श्रेणी", "T-TOURIST / MULTIPLE ENTRY");
  renderField("VISA NUMBER / वीज़ा सं.", "V0829142");
  renderField("NAME / धारक का नाम", "GOMEZ, CARLOS");
  renderField("PASSPORT NO. / पासपोर्ट नं.", "E9981240");
  renderField("VALID FROM / से मान्य", "10/01/2026");
  renderField("VALID UNTIL / तक मान्य", "09/07/2026");

  // ICAO MRZ-V (2 Lines of 36 Characters)
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(18, height - 125, width - 36, 105);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, height - 125, width - 36, 105);

  const l1 = "V<INDGOMEZ<<CARLOS<<<<<<<<<<<<<<<<<<";
  const l2 = "V0829142<8MEX8504123M2607094<<<<<<<<";

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 17px 'Courier New', monospace";
  ctx.fillText(l1, 40, height - 76);
  ctx.fillText(l2, 40, height - 42);
}

/**
 * Renders an isolated biometric portrait of the traveler matching the scenario.
 */
export function renderBiometricPortrait(sampleId: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const width = 320;
    const height = 400;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve("");
      return;
    }

    const isTampered = sampleId === "tampered_photo" || sampleId === "TAMPERED_PHOTO";
    const isAlt = isTampered || sampleId === "FACE_MISMATCH" || sampleId === "MIDV-2020-ESP-TAMPER-003";

    drawPhotographicBiometricPortrait(ctx, 0, 0, width, height, {
      tampered: isTampered,
      alt: isAlt,
    });

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      } else {
        resolve(canvas.toDataURL("image/png"));
      }
    }, "image/png");
  });
}

