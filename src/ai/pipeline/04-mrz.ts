import type { MrzResult, OcrResult } from "../types";

function validateMrzCheckDigit(str: string, check: string): boolean {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    let val: number;
    if (ch === "<") val = 0;
    else if (ch >= "0" && ch <= "9") val = parseInt(ch, 10);
    else val = ch.charCodeAt(0) - 55;
    sum += val * weights[i % 3];
  }
  const expected = (sum % 10).toString();
  return expected === check;
}

function mrzDateToIso(yymmdd: string): string | null {
  if (yymmdd.length !== 6 || !/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  const dd = parseInt(yymmdd.slice(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const year = yy >= 50 ? 1900 + yy : 2000 + yy;
  return `${year}-${mm.toString().padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
}

function findOcrField(fields: { fieldName: string; fieldValue?: string | null }[], name: string): string {
  const f = fields.find((x) => x.fieldName === name);
  return (f?.fieldValue as string) || "";
}

function normalizeIsoDate(s: string): string {
  return s.replace(/[\/\-\s]/g, "");
}

export async function parseMrz(
  ocr: OcrResult,
  _canvas: HTMLCanvasElement
): Promise<MrzResult> {
  const rawText = ocr.rawText || "";
  const isAadhaarDoc =
    /Unique\s+Identification\s+Authority\s+of\s+India/i.test(rawText) ||
    /Aadhaar|Aadhar/i.test(rawText) ||
    /UIDAI/i.test(rawText) ||
    /\b[2-9]\d{3}\s\d{4}\s\d{4}\b/.test(rawText);

  // Indian Aadhaar credentials are national smart cards that do not have an ICAO MRZ
  if (isAadhaarDoc && !rawText.includes("P<") && !rawText.includes("I<IND")) {
    return {
      present: false,
      compositeValid: false,
      checkDigitsValid: false,
      rawLines: [],
      mismatches: [],
    };
  }

  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim());

  const mrzLines: string[] = [];
  const mrz44 = /^[A-Z0-9<]{44}$/;
  const mrz36 = /^[A-Z0-9<]{36}$/;
  const mrz30 = /^[A-Z0-9<]{30}$/;

  for (const l of rawLines) {
    const clean = l.toUpperCase().replace(/\s+/g, "");
    const fillerCount = (clean.match(/</g) || []).length;

    if (clean.startsWith("P<") && clean.length >= 35 && fillerCount >= 2) {
      mrzLines.push(clean.padEnd(44, "<").slice(0, 44));
    } else if (mrzLines.length === 1 && mrzLines[0].length === 44 && /^[A-Z0-9<]{35,55}$/.test(clean) && fillerCount >= 1) {
      mrzLines.push(clean.padEnd(44, "<").slice(0, 44));
    } else if ((clean.startsWith("ID") || clean.startsWith("I<") || clean.startsWith("A<") || clean.startsWith("C<")) && clean.length >= 25 && clean.length <= 34 && fillerCount >= 2) {
      mrzLines.push(clean.padEnd(30, "<").slice(0, 30));
    } else if (mrzLines.length >= 1 && mrzLines[0].length === 30 && /^[A-Z0-9<]{25,35}$/.test(clean) && fillerCount >= 1) {
      mrzLines.push(clean.padEnd(30, "<").slice(0, 30));
    } else if ((mrz44.test(clean) || mrz36.test(clean) || mrz30.test(clean)) && fillerCount >= 2) {
      mrzLines.push(clean);
    }
  }

  // Search rawText for P< pattern if lines had whitespace or newline issues
  if (mrzLines.length === 0 && rawText.includes("P<")) {
    const pIdx = rawText.indexOf("P<");
    const sub = rawText.slice(pIdx).replace(/\r/g, "");
    const subLines = sub.split("\n").map(l => l.trim().toUpperCase().replace(/\s+/g, "")).filter(Boolean);
    if (subLines.length >= 2 && subLines[0].startsWith("P<")) {
      mrzLines.push(subLines[0].padEnd(44, "<").slice(0, 44));
      mrzLines.push(subLines[1].padEnd(44, "<").slice(0, 44));
    }
  }

  if (mrzLines.length === 0) {
    return {
      present: false,
      compositeValid: false,
      checkDigitsValid: false,
      rawLines: [],
      mismatches: [],
    };
  }

  let format: MrzResult["format"] = undefined;
  let documentNumber: string | undefined = undefined;
  let dateOfBirth: string | undefined = undefined;
  let expiryDate: string | undefined = undefined;
  let nationality: string | undefined = undefined;
  let sex: string | undefined = undefined;
  let names: MrzResult["names"] = undefined;
  let checkDigitsValid = false;
  let compositeValid = false;

  // Format 1: ICAO 9303 TD3 (Passports, 2 lines of 44 chars)
  if (mrzLines.length >= 2 && mrzLines[0].length === 44 && mrzLines[0].startsWith("P<")) {
    format = "TD3";
    const line1 = mrzLines[0];
    const line2 = mrzLines[1];

    nationality = line1.slice(2, 5).replace(/</g, "");
    const namePart = line1.slice(5).replace(/<+$/, "");
    let nameParts = namePart.split("<<");
    if (nameParts.length < 2) {
      const tokens = namePart.split(/<+/).filter(Boolean);
      if (tokens.length >= 2) {
        nameParts = [tokens[0], tokens[1]];
      }
    }
    const cleanPrimary = nameParts[0]
      ? nameParts[0].replace(/<+/g, " ").replace(/LK$|K$/, "").trim()
      : undefined;
    const cleanSecondary = nameParts[1]
      ? nameParts[1].replace(/<+/g, " ").replace(/LK$|K$/, "").trim()
      : undefined;
    names = {
      primary: cleanPrimary,
      secondary: cleanSecondary,
    };

    documentNumber = line2.slice(0, 9).replace(/<+$/, "");
    const docCheck = line2.slice(9, 10);
    const docOk = validateMrzCheckDigit(line2.slice(0, 9), docCheck);

    const nat2 = line2.slice(10, 13).replace(/</g, "");
    if (nat2) nationality = nat2;

    const dobRaw = line2.slice(13, 19);
    const dobCheck = line2.slice(19, 20);
    let dobOk = false;
    if (/^\d{6}$/.test(dobRaw)) {
      dobOk = validateMrzCheckDigit(dobRaw, dobCheck);
      dateOfBirth = mrzDateToIso(dobRaw) || undefined;
    }

    const sexChar = line2.slice(20, 21);
    if (sexChar === "M" || sexChar === "F") sex = sexChar;

    const expRaw = line2.slice(21, 27);
    const expCheck = line2.slice(27, 28);
    let expOk = false;
    if (/^\d{6}$/.test(expRaw)) {
      expOk = validateMrzCheckDigit(expRaw, expCheck);
      expiryDate = mrzDateToIso(expRaw) || undefined;
    }

    checkDigitsValid = docOk && dobOk && expOk;

    const compStr =
      line2.slice(0, 10) +
      line2.slice(13, 20) +
      line2.slice(21, 28) +
      (line2.slice(28, 35).replace(/<+$/, "").length > 0 ? line2.slice(28, 35) : "");
    const compCheck = line2.slice(43, 44);
    compositeValid = validateMrzCheckDigit(compStr, compCheck) && checkDigitsValid;
  }
  // Format 2: ICAO 9303 TD1 (ID cards, 3 lines of 30 chars)
  else if (mrzLines.length >= 3 && mrzLines[0].length === 30) {
    format = "TD1";
    const line1 = mrzLines[0];
    const line2 = mrzLines[1];
    const line3 = mrzLines[2];

    documentNumber = line1.slice(5, 14).replace(/<+$/, "");
    const docCheck = line1.slice(14, 15);
    const docOk = validateMrzCheckDigit(line1.slice(5, 14), docCheck);

    const dobRaw = line2.slice(0, 6);
    const dobCheck = line2.slice(6, 7);
    let dobOk = false;
    if (/^\d{6}$/.test(dobRaw)) {
      dobOk = validateMrzCheckDigit(dobRaw, dobCheck);
      dateOfBirth = mrzDateToIso(dobRaw) || undefined;
    }

    const sexChar = line2.slice(7, 8);
    if (sexChar === "M" || sexChar === "F") sex = sexChar;

    const expRaw = line2.slice(8, 14);
    const expCheck = line2.slice(14, 15);
    let expOk = false;
    if (/^\d{6}$/.test(expRaw)) {
      expOk = validateMrzCheckDigit(expRaw, expCheck);
      expiryDate = mrzDateToIso(expRaw) || undefined;
    }

    nationality = line2.slice(15, 18).replace(/</g, "");
    checkDigitsValid = docOk && dobOk && expOk;

    // Names in TD1 are on Line 3
    const namePart = line3.replace(/<+$/, "");
    const nameParts = namePart.split("<<");
    names = {
      primary: nameParts[0] ? nameParts[0].replace(/</g, " ").trim() : undefined,
      secondary: nameParts[1] ? nameParts[1].replace(/</g, " ").trim() : undefined,
    };

    compositeValid = checkDigitsValid;
  }
  // Format 3: ICAO 9303 TD2 (Visas / ID, 2 lines of 36 chars)
  else if (mrzLines.length >= 2 && mrzLines[0].length === 36) {
    format = "TD2";
    const line1 = mrzLines[0];
    const line2 = mrzLines[1];

    nationality = line1.slice(2, 5).replace(/</g, "");
    const namePart = line1.slice(5).replace(/<+$/, "");
    const nameParts = namePart.split("<<");
    names = {
      primary: nameParts[0] ? nameParts[0].replace(/</g, " ").trim() : undefined,
      secondary: nameParts[1] ? nameParts[1].replace(/</g, " ").trim() : undefined,
    };

    documentNumber = line2.slice(0, 9).replace(/<+$/, "");
    const docCheck = line2.slice(9, 10);
    const docOk = validateMrzCheckDigit(line2.slice(0, 9), docCheck);

    const dobRaw = line2.slice(13, 19);
    const dobCheck = line2.slice(19, 20);
    let dobOk = false;
    if (/^\d{6}$/.test(dobRaw)) {
      dobOk = validateMrzCheckDigit(dobRaw, dobCheck);
      dateOfBirth = mrzDateToIso(dobRaw) || undefined;
    }

    const expRaw = line2.slice(21, 27);
    const expCheck = line2.slice(27, 28);
    let expOk = false;
    if (/^\d{6}$/.test(expRaw)) {
      expOk = validateMrzCheckDigit(expRaw, expCheck);
      expiryDate = mrzDateToIso(expRaw) || undefined;
    }

    checkDigitsValid = docOk && dobOk && expOk;
    compositeValid = checkDigitsValid;
  }

  // Cross-Field Concordance vs OCR (strictly real values only)
  const mismatches: MrzResult["mismatches"] = [];

  const ocrDocNum = findOcrField(ocr.fields, "DOCUMENT_NUMBER");
  if (ocrDocNum && documentNumber && ocrDocNum !== documentNumber) {
    const severity: "LOW" | "MEDIUM" | "HIGH" =
      normalizeIsoDate(ocrDocNum) === normalizeIsoDate(documentNumber) ? "LOW" :
      ocrDocNum.slice(0, 6) === documentNumber.slice(0, 6) ? "MEDIUM" : "HIGH";
    mismatches.push({ field: "DOCUMENT_NUMBER", ocr: ocrDocNum, mrz: documentNumber, severity });
  }

  const ocrDob = findOcrField(ocr.fields, "DATE_OF_BIRTH");
  if (ocrDob && dateOfBirth && normalizeIsoDate(ocrDob) !== normalizeIsoDate(dateOfBirth)) {
    mismatches.push({ field: "DATE_OF_BIRTH", ocr: ocrDob, mrz: dateOfBirth, severity: "HIGH" });
  }

  const ocrExp = findOcrField(ocr.fields, "EXPIRY_DATE");
  if (ocrExp && expiryDate && normalizeIsoDate(ocrExp) !== normalizeIsoDate(expiryDate)) {
    mismatches.push({ field: "EXPIRY_DATE", ocr: ocrExp, mrz: expiryDate, severity: "HIGH" });
  }

  return {
    present: true,
    format,
    documentNumber,
    dateOfBirth,
    expiryDate,
    nationality,
    sex,
    names,
    checkDigitsValid,
    compositeValid,
    rawLines: mrzLines,
    mismatches,
  };
}
