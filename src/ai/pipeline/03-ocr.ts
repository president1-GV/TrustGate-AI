import type { OcrResult, OcrField } from "../types";
import { createWorker } from "tesseract.js";

function parseDate(text: string): string | null {
  const iso = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const dmy = text.match(/(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  const mdy = text.match(
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})/i
  );
  if (mdy) {
    const months: Record<string, string> = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
      JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
    };
    const mm = months[mdy[1].toUpperCase().slice(0, 3)];
    if (mm) return `${mdy[3]}-${mm}-${mdy[2].padStart(2, "0")}`;
  }

  const ddmmmyyyy = text.match(
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i
  );
  if (ddmmmyyyy) {
    const months: Record<string, string> = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
      JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
    };
    const mm = months[ddmmmyyyy[2].toUpperCase().slice(0, 3)];
    if (mm) return `${ddmmmyyyy[3]}-${mm}-${ddmmmyyyy[1].padStart(2, "0")}`;
  }

  return null;
}

export interface OcrRunContext {
  documentId?: string;
  processingRunId?: string;
  imageHash?: string;
}

/**
 * Executes OCR on the current authoritative document canvas.
 * 1. Attempts high-accuracy PaddleOCR 3.7.0 execution via local inference microservice.
 * 2. Gracefully falls back to browser-based Tesseract engine if microservice is offline.
 */
export async function runOcr(
  canvas: HTMLCanvasElement,
  context?: OcrRunContext
): Promise<OcrResult> {
  const start = performance.now();

  // 1. Attempt Official PaddleOCR 3.7.0 Microservice
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const payload = {
      image_base64: canvas.toDataURL("image/jpeg", 0.95),
      document_id: context?.documentId || `DOC-${Date.now()}`,
      processing_run_id: context?.processingRunId || `RUN-${Date.now()}`,
      image_hash: context?.imageHash || undefined,
      capture_source: "OFFICER_CURRENT_DOCUMENT"
    };

    const resp = await fetch("http://127.0.0.1:8000/api/v1/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      const fields: OcrField[] = [];
      const extracted = data.extracted_fields || {};

      for (const [key, val] of Object.entries(extracted)) {
        const item = val as { value?: string; confidence?: number };
        if (item && item.value) {
          fields.push({
            fieldName: key,
            fieldValue: item.value,
            confidence: item.confidence ?? 0.95,
            boundingBox: { x: 0, y: 0, w: 0, h: 0 },
            source: "ocr",
          });
        }
      }

      const executionMs = performance.now() - start;
      return {
        provider: "PaddleOCR 3.7.0",
        rawText: data.raw_text || "",
        overallConfidence: data.confidence_mean || (fields.length > 0 ? 0.95 : 0.0),
        fields,
        executionMs,
      };
    }
  } catch (_paddleErr) {
    // Microservice offline or unreachable, fall back to browser OCR
  }

  // 2. Fallback: Browser Tesseract OCR
  let overallConfidence = 0;
  let rawText = "";

  try {
    const worker = await createWorker("eng");
    const ret = await worker.recognize(canvas.toDataURL("image/png"));
    rawText = ret.data.text || "";
    overallConfidence = (ret.data.confidence || 0) / 100;
    await worker.terminate();
  } catch (err) {
    console.warn("[TrustGate OCR] Tesseract fallback error or timeout:", err);
    rawText = "";
    overallConfidence = 0;
  }

  const fields: OcrField[] = [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    const executionMs = performance.now() - start;
    return { provider: "tesseract.js", rawText: "", overallConfidence: 0, fields: [], executionMs };
  }

  // 1. Full Name
  let fullName: string | null = null;
  const nameLine = lines.find((l) => /^Name[:\s]/i.test(l) || /Full\s+Name/i.test(l));
  if (nameLine) {
    const m = nameLine.match(/Name[:\s]+(.+)$/i);
    if (m && m[1].trim()) fullName = m[1].trim();
  }
  if (!fullName) {
    const capitalTwo = lines.find((l) => /^[A-Z][a-z]+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/.test(l));
    if (capitalTwo) fullName = capitalTwo;
  }

  // 2. Date of Birth
  let dob: string | null = null;
  const dobLine = lines.find((l) => /Date\s+of\s+Birth|DOB|Birth/i.test(l));
  if (dobLine) dob = parseDate(dobLine);
  if (!dob) {
    for (const l of lines) {
      const d = parseDate(l);
      if (d) { dob = d; break; }
    }
  }

  // 3. Document Number
  let docNum: string | null = null;
  const dnLine = lines.find((l) => /Document\s+Number|Doc\s*#|Passport\s*No/i.test(l));
  if (dnLine) {
    const m = dnLine.match(/([A-Z0-9]{6,})/);
    if (m) docNum = m[1];
  }
  if (!docNum) {
    for (const l of lines) {
      const m = l.match(/\b[A-Z0-9]{8,10}\b/);
      if (m && !/^(PASSPORT|DOCUMENT|NATIONAL)$/i.test(m[0])) {
        docNum = m[0];
        break;
      }
    }
  }

  // 4. Expiry Date
  let expiry: string | null = null;
  const expLine = lines.find((l) => /Expir|Valid\s+Until/i.test(l));
  if (expLine) expiry = parseDate(expLine);

  // 5. Nationality
  let nationality: string | null = null;
  const natLine = lines.find((l) => /Nationalit|Country/i.test(l));
  if (natLine) {
    const m = natLine.match(/\b([A-Z]{3})\b/);
    if (m) nationality = m[1];
  }

  // 6. Sex / Gender
  let sex: string | null = null;
  const sexLine = lines.find((l) => /\bSex\b|Gender/i.test(l));
  if (sexLine) {
    const m = sexLine.match(/\b(M|F)\b/i);
    if (m) sex = m[1].toUpperCase();
  }

  // 7. Issue Date
  let issueDate: string | null = null;
  const issueLine = lines.find((l) => /Date\s+of\s+Issue|Issued/i.test(l));
  if (issueLine) issueDate = parseDate(issueLine);

  // 8. Issuing Authority
  let issuingAuth: string | null = null;
  const authLine = lines.find((l) => /Issuing\s+Authority|Authority/i.test(l));
  if (authLine) {
    const m = authLine.match(/Authority[:\s]+(.+)$/i);
    if (m && m[1].trim()) issuingAuth = m[1].trim();
  }

  const zeroBBox = { x: 0, y: 0, w: 0, h: 0 };
  const baseConf = Math.max(0.1, overallConfidence);

  if (fullName) {
    fields.push({ fieldName: "FULL_NAME", fieldValue: fullName, confidence: baseConf, boundingBox: zeroBBox, source: "ocr" });
  }
  if (dob) {
    fields.push({ fieldName: "DATE_OF_BIRTH", fieldValue: dob, confidence: baseConf, boundingBox: zeroBBox, source: "ocr" });
  }
  if (docNum) {
    fields.push({ fieldName: "DOCUMENT_NUMBER", fieldValue: docNum, confidence: baseConf, boundingBox: zeroBBox, source: "ocr" });
  }
  if (expiry) {
    fields.push({ fieldName: "EXPIRY_DATE", fieldValue: expiry, confidence: baseConf, boundingBox: zeroBBox, source: "ocr" });
  }
  if (nationality) {
    fields.push({ fieldName: "NATIONALITY", fieldValue: nationality, confidence: baseConf, boundingBox: zeroBBox, source: "ocr" });
  }
  if (sex) {
    fields.push({ fieldName: "SEX", fieldValue: sex, confidence: baseConf, boundingBox: zeroBBox, source: "ocr" });
  }
  if (issueDate) {
    fields.push({ fieldName: "ISSUE_DATE", fieldValue: issueDate, confidence: baseConf, boundingBox: zeroBBox, source: "ocr" });
  }
  if (issuingAuth) {
    fields.push({ fieldName: "ISSUING_AUTHORITY", fieldValue: issuingAuth, confidence: baseConf, boundingBox: zeroBBox, source: "ocr" });
  }

  const executionMs = performance.now() - start;
  return { provider: "tesseract.js", rawText, overallConfidence, fields, executionMs };
}
