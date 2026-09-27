import type { OcrResult, OcrField } from "../types";
import { createWorker } from "tesseract.js";

function parseDate(text: string): string | null {
  const iso = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const dmy = text.match(/(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // Handle OCR noise where slash is recognized as 7 or digit in DOB: e.g. DOB: 210772006 or 21072006
  const dobNoise = text.match(/(?:DOB|Birth|Date\s+of\s+Birth)[:\s]*(\d{2})[0-9/\-\.]?(\d{2})[0-9/\-\.]?(\d{4})/i);
  if (dobNoise) {
    const day = dobNoise[1];
    const month = dobNoise[2];
    const year = dobNoise[3];
    const dNum = parseInt(day, 10);
    const mNum = parseInt(month, 10);
    if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12) {
      return `${year}-${month}-${day}`;
    }
  }

  // Handle 8-digit continuous date in line mentioning DOB: e.g. 21072006
  if (/DOB|Birth/i.test(text)) {
    const eight = text.match(/\b(\d{2})(\d{2})(\d{4})\b/);
    if (eight) {
      const dNum = parseInt(eight[1], 10);
      const mNum = parseInt(eight[2], 10);
      if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12) {
        return `${eight[3]}-${eight[2]}-${eight[1]}`;
      }
    }
    const yob = text.match(/(?:Year\s+of\s+Birth|Birth\s*Year)[:\s]*(\d{4})/i);
    if (yob) {
      return `${yob[1]}-01-01`;
    }
  }

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

function enrichOcrFields(
  fields: OcrField[],
  rawText: string,
  baseConfidence: number
): OcrField[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const zeroBBox = { x: 0, y: 0, w: 0, h: 0 };
  const conf = Math.max(0.85, baseConfidence);

  const isAadhaarDoc =
    /Unique\s+Identification\s+Authority/i.test(rawText) ||
    /Aadhaar|Aadhar|Adhaar|UIDAI|Mera\s+Aadhaar|Meri\s+Pehchan/i.test(rawText) ||
    /आधार|भारत\s*सरकार/u.test(rawText) ||
    (/Government\s+of\s+India|Govt\s+of\s+India/i.test(rawText) && (/Enrolment|VID|UID/i.test(rawText) || /\d{4}/.test(rawText))) ||
    /\b[2-9]\d{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b/.test(rawText) ||
    /(?:X{4}|[xX]{4}|\*{4}|•{4})[\s\-]+(?:X{4}|[xX]{4}|\*{4}|•{4})[\s\-]+\d{4}/.test(rawText);

  if (isAadhaarDoc) {
    // 1. Aadhaar 12-digit Number or Masked Number
    let aadhaarNum: string | null = null;
    const uidMatch = rawText.match(/(?:Your\s+Aadhaar\s+No\.?|Aadhaar\s+No\.?|UID\s*[:\-]?)\s*[:\-]?\s*([2-9]\d{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4})/i);
    if (uidMatch) {
      aadhaarNum = uidMatch[1].replace(/[\s\-]/g, "").replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
    }
    if (!aadhaarNum) {
      const match12 = rawText.match(/\b([2-9]\d{3}\s\d{4}\s\d{4})\b/);
      if (match12) {
        aadhaarNum = match12[1];
      }
    }
    if (!aadhaarNum) {
      const matchHyphen = rawText.match(/\b([2-9]\d{3}\-\d{4}\-\d{4})\b/);
      if (matchHyphen) {
        aadhaarNum = matchHyphen[1].replace(/-/g, " ");
      }
    }
    if (!aadhaarNum) {
      const match12NoSpace = rawText.match(/\b([2-9]\d{11})\b/);
      if (match12NoSpace) {
        aadhaarNum = match12NoSpace[1].replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
      }
    }
    if (!aadhaarNum) {
      const maskedMatch = rawText.match(/((?:X{4}|[xX]{4}|\*{4}|•{4})[\s\-]+(?:X{4}|[xX]{4}|\*{4}|•{4})[\s\-]+\d{4})/);
      if (maskedMatch) {
        aadhaarNum = maskedMatch[1].replace(/[\-]/g, " ");
      }
    }

    if (aadhaarNum) {
      const existingDocNum = fields.find((f) => f.fieldName === "DOCUMENT_NUMBER");
      if (existingDocNum) {
        // Overwrite if existing was a 10-digit mobile number, noise, or missing spaces
        if (!existingDocNum.fieldValue || existingDocNum.fieldValue.replace(/\s+/g, "").length !== 12 || /^[6-9]\d{9}$/.test(existingDocNum.fieldValue)) {
          existingDocNum.fieldValue = aadhaarNum;
          existingDocNum.confidence = Math.max(existingDocNum.confidence, 0.95);
        }
      } else {
        fields.push({
          fieldName: "DOCUMENT_NUMBER",
          fieldValue: aadhaarNum,
          confidence: 0.95,
          boundingBox: zeroBBox,
          source: "ocr",
        });
      }
    }

    // 2. Nationality (Always IND for Aadhaar)
    const existingNat = fields.find((f) => f.fieldName === "NATIONALITY");
    if (existingNat) {
      existingNat.fieldValue = "IND";
      existingNat.confidence = Math.max(existingNat.confidence, 0.98);
    } else {
      fields.push({
        fieldName: "NATIONALITY",
        fieldValue: "IND",
        confidence: 0.98,
        boundingBox: zeroBBox,
        source: "ocr",
      });
    }

    // 3. Issuing Authority
    const existingAuth = fields.find((f) => f.fieldName === "ISSUING_AUTHORITY");
    if (existingAuth) {
      if (!existingAuth.fieldValue || !existingAuth.fieldValue.includes("UIDAI")) {
        existingAuth.fieldValue = "UIDAI (Govt of India)";
      }
    } else {
      fields.push({
        fieldName: "ISSUING_AUTHORITY",
        fieldValue: "UIDAI (Govt of India)",
        confidence: 0.98,
        boundingBox: zeroBBox,
        source: "ocr",
      });
    }

    // 4. Full Name for Aadhaar
    const existingName = fields.find((f) => f.fieldName === "FULL_NAME");
    if (existingName?.fieldValue) {
      existingName.fieldValue = existingName.fieldValue
        .replace(/^(SL|Sh\.|Sri|Shri|Smt\.|Mr\.|Mrs\.|Kumari|Ms\.)\s+/i, "")
        .trim();
    } else {
      let nameCandidate: string | null = null;
      const dobLineIdx = lines.findIndex((l) => /DOB|Date\s+of\s+Birth|Birth/i.test(l));
      if (dobLineIdx > 0) {
        const prevLine = lines[dobLineIdx - 1];
        if (
          !/Government|Authority|Enrolment|Address|Gali|VTC|District|State|PIN|Mobile|Aadhaar/i.test(prevLine) &&
          /[a-zA-Z]{3,}/.test(prevLine)
        ) {
          nameCandidate = prevLine.replace(/^(SL|Sh\.|Sri|Shri|Smt\.|Mr\.|Mrs\.|Kumari|Ms\.)\s+/i, "").trim();
        }
      }
      if (!nameCandidate) {
        for (const l of lines) {
          if (/Government|Authority|Enrolment|Address|Gali|VTC|District|State|PIN|Mobile|Aadhaar|Unique|India/i.test(l)) continue;
          const cleaned = l.replace(/^(SL|Sh\.|Sri|Shri|Smt\.|Mr\.|Mrs\.|Kumari|Ms\.)\s+/i, "").trim();
          if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(cleaned)) {
            nameCandidate = cleaned;
            break;
          }
        }
      }
      if (nameCandidate) {
        fields.push({
          fieldName: "FULL_NAME",
          fieldValue: nameCandidate,
          confidence: conf,
          boundingBox: zeroBBox,
          source: "ocr",
        });
      }
    }

    // 5. Date of Birth
    const existingDob = fields.find((f) => f.fieldName === "DATE_OF_BIRTH");
    if (!existingDob?.fieldValue) {
      let parsedDob: string | null = null;
      const dobLine = lines.find((l) => /DOB|Date\s+of\s+Birth|Birth/i.test(l));
      if (dobLine) parsedDob = parseDate(dobLine);
      if (!parsedDob) {
        for (const l of lines) {
          parsedDob = parseDate(l);
          if (parsedDob) break;
        }
      }
      if (parsedDob) {
        if (existingDob) {
          existingDob.fieldValue = parsedDob;
        } else {
          fields.push({
            fieldName: "DATE_OF_BIRTH",
            fieldValue: parsedDob,
            confidence: conf,
            boundingBox: zeroBBox,
            source: "ocr",
          });
        }
      }
    }

    // 6. Sex / Gender
    const existingSex = fields.find((f) => f.fieldName === "SEX");
    if (!existingSex?.fieldValue) {
      let foundSex: string | null = null;
      for (const l of lines) {
        if (/^Male$/i.test(l) || (/\bMale\b/i.test(l) && !/Female/i.test(l))) {
          foundSex = "M";
          break;
        } else if (/^Female$/i.test(l) || /\bFemale\b/i.test(l)) {
          foundSex = "F";
          break;
        } else if (/Transgender/i.test(l)) {
          foundSex = "T";
          break;
        }
      }
      if (foundSex) {
        if (existingSex) {
          existingSex.fieldValue = foundSex;
        } else {
          fields.push({
            fieldName: "SEX",
            fieldValue: foundSex,
            confidence: conf,
            boundingBox: zeroBBox,
            source: "ocr",
          });
        }
      }
    }
  }

  return fields;
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

      const rawText = data.raw_text || "";
      const enrichedFields = enrichOcrFields(fields, rawText, data.confidence_mean || 0.95);
      const executionMs = performance.now() - start;
      return {
        provider: "PaddleOCR 3.7.0",
        rawText,
        overallConfidence: data.confidence_mean || (enrichedFields.length > 0 ? 0.95 : 0.0),
        fields: enrichedFields,
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
      if (/Mobile|Phone|Tel|Mob|PIN\s*Code|Enrolment/i.test(l)) continue;
      const m = l.match(/\b[A-Z0-9]{8,10}\b/);
      if (m && !/^(PASSPORT|DOCUMENT|NATIONAL|ENROLMENT|MAHARASHTRA|AUTHORITY|GOVERNMENT)$/i.test(m[0])) {
        if (/^[6-9]\d{9}$/.test(m[0])) continue;
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
  if (!sex) {
    const standaloneSex = lines.find((l) => /^(Male|Female|Transgender)$/i.test(l) || /\b(Male|Female|Transgender)\b/i.test(l));
    if (standaloneSex) {
      if (/Female/i.test(standaloneSex)) sex = "F";
      else if (/Male/i.test(standaloneSex)) sex = "M";
      else if (/Transgender/i.test(standaloneSex)) sex = "T";
    }
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

  const enrichedFields = enrichOcrFields(fields, rawText, overallConfidence);
  const executionMs = performance.now() - start;
  return { provider: "tesseract.js", rawText, overallConfidence, fields: enrichedFields, executionMs };
}
