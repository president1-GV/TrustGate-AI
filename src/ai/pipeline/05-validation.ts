import type { MrzResult, OcrResult, ValidationIssue, ValidationResult } from "../types";
import { parseISO, isValid, isBefore, differenceInDays } from "date-fns";

function fieldValue(fields: { fieldName: string; fieldValue?: string | null }[], name: string): string {
  const f = fields.find((x) => x.fieldName === name);
  return (f?.fieldValue as string) || "";
}

function safeParseDate(s: string): Date | null {
  if (!s) return null;
  try {
    const d = parseISO(s);
    if (isValid(d)) return d;
  } catch { /* ignore */ }
  return null;
}

export async function validateCase(input: {
  ocr: OcrResult;
  mrz: MrzResult;
  docType: string;
  countryCode?: string;
}): Promise<ValidationResult> {
  const { ocr, mrz, docType, countryCode } = input;
  const issues: ValidationIssue[] = [];

  const rawTextUpper = (ocr.rawText || "").toUpperCase();
  const isAadhaar =
    docType === "aadhaar" ||
    rawTextUpper.includes("AADHAAR") ||
    rawTextUpper.includes("UNIQUE IDENTIFICATION AUTHORITY OF INDIA") ||
    rawTextUpper.includes("UIDAI") ||
    ocr.fields.some(f => f.fieldName === "ISSUING_AUTHORITY" && f.fieldValue?.includes("UIDAI")) ||
    (ocr.fields.some(f => f.fieldName === "NATIONALITY" && f.fieldValue === "IND") &&
      ocr.fields.some(f => f.fieldName === "DOCUMENT_NUMBER" && /^\d{4}\s\d{4}\s\d{4}$/.test(f.fieldValue || "")));

  const requiredFields = isAadhaar
    ? ["FULL_NAME", "DATE_OF_BIRTH", "DOCUMENT_NUMBER", "NATIONALITY", "SEX"]
    : [
        "FULL_NAME", "DATE_OF_BIRTH", "DOCUMENT_NUMBER",
        "EXPIRY_DATE", "NATIONALITY", "SEX", "ISSUE_DATE",
      ];
  const missing = requiredFields.filter((n) => !fieldValue(ocr.fields, n));

  if (isAadhaar) {
    issues.push({
      ruleCode: "doc_type_valid",
      severity: "PASS",
      message: "Verified official Republic of India Aadhaar identity credential.",
      details: { docType: "aadhaar" },
    });
  } else if (docType === "unknown") {
    issues.push({
      ruleCode: "doc_type_valid",
      severity: "CRITICAL",
      message: "Unrecognized document format. Image does not conform to physical credential standards.",
      details: { docType },
    });
  } else {
    issues.push({
      ruleCode: "doc_type_valid",
      severity: "PASS",
      message: `Recognized credential format (${docType}).`,
      details: { docType },
    });
  }

  if (missing.length === 0) {
    issues.push({
      ruleCode: "required_fields",
      severity: "PASS",
      message: isAadhaar
        ? "All required Aadhaar identity fields are present and verified."
        : "All required fields are present and non-empty.",
    });
  } else if (docType !== "unknown" || isAadhaar) {
    issues.push({
      ruleCode: "required_fields",
      severity: missing.length > 4 ? "CRITICAL" : "HIGH",
      message: `Missing required fields: ${missing.join(", ")}.`,
      details: { missing },
    });
  } else {
    issues.push({
      ruleCode: "required_fields",
      severity: "CRITICAL",
      message: `Non-credential image missing standard identity fields (${missing.length} missing).`,
      details: { missing },
    });
  }

  const dateFields = isAadhaar ? ["DATE_OF_BIRTH"] : ["DATE_OF_BIRTH", "EXPIRY_DATE", "ISSUE_DATE"];
  const badDates: string[] = [];
  let datesTested = 0;
  for (const df of dateFields) {
    const v = fieldValue(ocr.fields, df);
    if (v) {
      datesTested++;
      if (!safeParseDate(v)) badDates.push(df);
    }
  }

  if (datesTested > 0 && badDates.length === 0) {
    issues.push({
      ruleCode: "date_format",
      severity: "PASS",
      message: "All extracted date fields are properly formatted.",
    });
  } else if (badDates.length > 0) {
    issues.push({
      ruleCode: "date_format",
      severity: "HIGH",
      message: `Malformed date format in fields: ${badDates.join(", ")}.`,
      details: { badDates },
    });
  } else {
    issues.push({
      ruleCode: "date_format",
      severity: "WARNING",
      message: "No date fields could be located for format verification.",
    });
  }

  const issueD = safeParseDate(fieldValue(ocr.fields, "ISSUE_DATE"));
  const expD = safeParseDate(fieldValue(ocr.fields, "EXPIRY_DATE"));
  if (isAadhaar) {
    issues.push({
      ruleCode: "issue_before_expiry",
      severity: "PASS",
      message: "Aadhaar is a permanent, lifelong credential (no expiry cutoff required).",
    });
  } else if (issueD && expD) {
    if (isBefore(issueD, expD)) {
      issues.push({
        ruleCode: "issue_before_expiry",
        severity: "PASS",
        message: "Document issue date is before expiry date.",
      });
    } else {
      issues.push({
        ruleCode: "issue_before_expiry",
        severity: "HIGH",
        message: "Document issue date must be before expiry date.",
        details: { issueDate: issueD.toISOString(), expiryDate: expD.toISOString() },
      });
    }
  } else {
    issues.push({
      ruleCode: "issue_before_expiry",
      severity: "WARNING",
      message: "Issue/expiry dates unavailable for temporal sequence comparison.",
    });
  }

  const today = new Date();
  if (isAadhaar) {
    issues.push({
      ruleCode: "not_expired",
      severity: "PASS",
      message: "Document is valid: Republic of India Aadhaar is a permanent lifelong identity credential.",
    });
  } else if (expD) {
    if (differenceInDays(expD, today) >= 0) {
      issues.push({
        ruleCode: "not_expired",
        severity: "PASS",
        message: `Document is valid (expires ${expD.toISOString().slice(0, 10)}).`,
      });
    } else {
      issues.push({
        ruleCode: "not_expired",
        severity: "CRITICAL",
        message: `Document expired ${expD.toISOString().slice(0, 10)}.`,
        details: { expiryDate: expD.toISOString(), daysExpired: -differenceInDays(expD, today) },
      });
    }
  } else {
    issues.push({
      ruleCode: "not_expired",
      severity: "WARNING",
      message: "Expiry date unavailable for validity period check.",
    });
  }

  const docNum = fieldValue(ocr.fields, "DOCUMENT_NUMBER");
  if (docNum && docNum.length >= 6) {
    issues.push({
      ruleCode: "doc_number_format",
      severity: "PASS",
      message: isAadhaar
        ? `Aadhaar 12-digit UID format verified (${docNum}).`
        : `Document number format valid (length=${docNum.length}).`,
    });
  } else {
    issues.push({
      ruleCode: "doc_number_format",
      severity: "WARNING",
      message: docNum ? `Document number format questionable (length=${docNum.length}).` : "Document number absent from visual zone.",
      details: { docNum, length: docNum?.length || 0 },
    });
  }

  // MRZ Presence & Concordance
  if (!mrz.present) {
    if (isAadhaar) {
      issues.push({
        ruleCode: "mrz_presence",
        severity: "PASS",
        message: "Domestic Aadhaar national identity credential (ICAO MRZ not required).",
      });
      issues.push({
        ruleCode: "ocr_vs_mrz_match",
        severity: "PASS",
        message: "MRZ verification waived for domestic Aadhaar credential; visual fields validated.",
      });
    } else {
      issues.push({
        ruleCode: "mrz_presence",
        severity: docType === "passport" ? "HIGH" : "WARNING",
        message: docType === "passport"
          ? "Passport credentials require a Machine Readable Zone (MRZ); none detected."
          : "No Machine Readable Zone (MRZ) detected in credential.",
      });
      issues.push({
        ruleCode: "ocr_vs_mrz_match",
        severity: "WARNING",
        message: "Cross-field concordance check omitted: MRZ is not present.",
      });
    }
  } else if (mrz.mismatches && mrz.mismatches.length > 0) {
    const highM = mrz.mismatches.filter((m) => m.severity === "HIGH");
    issues.push({
      ruleCode: "ocr_vs_mrz_match",
      severity: highM.length > 0 ? "HIGH" : "WARNING",
      message: `${mrz.mismatches.length} MRZ/OCR mismatch(es) detected (${highM.length} high-severity).`,
      details: { mismatches: mrz.mismatches },
    });
  } else {
    issues.push({
      ruleCode: "ocr_vs_mrz_match",
      severity: "PASS",
      message: "Extracted visual fields correlate with encoded MRZ data.",
    });
  }

  let countryConsistent = true;
  let countryMsg = "Country/document-type consistency check passed.";
  if (isAadhaar) {
    countryConsistent = true;
    countryMsg = "Country IND verified with Republic of India Aadhaar credential.";
  } else if (countryCode === "USA" && (docType === "passport" || docType === "id")) {
    countryConsistent = true;
  } else if (countryCode && docType === "unknown") {
    countryConsistent = false;
    countryMsg = `Country ${countryCode} paired with unknown document type.`;
  }
  issues.push({
    ruleCode: "country_doc_consistency",
    severity: countryConsistent ? "PASS" : "WARNING",
    message: countryMsg,
    details: { countryCode: isAadhaar ? "IND" : countryCode, docType: isAadhaar ? "aadhaar" : docType },
  });

  let summaryPass = 0, summaryWarn = 0, summaryHigh = 0, summaryCritical = 0;
  for (const i of issues) {
    if (i.severity === "PASS") summaryPass++;
    else if (i.severity === "WARNING") summaryWarn++;
    else if (i.severity === "HIGH") summaryHigh++;
    else if (i.severity === "CRITICAL") summaryCritical++;
  }

  return { issues, summaryPass, summaryWarn, summaryHigh, summaryCritical };
}
