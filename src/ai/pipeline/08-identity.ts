import type {
  FaceResult,
  IdentityConsistencyResult,
  MrzResult,
  OcrResult,
  ValidationResult,
} from "../types";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fieldValue(fields: { fieldName: string; fieldValue?: string | null }[], name: string): string {
  const f = fields.find((x) => x.fieldName === name);
  return (f?.fieldValue as string) || "";
}

export async function identityConsistency(input: {
  ocr: OcrResult;
  mrz: MrzResult;
  face: FaceResult;
  validation: ValidationResult;
}): Promise<IdentityConsistencyResult> {
  const { ocr, mrz, face, validation } = input;
  let score = 100;

  if (!mrz.present) {
    score -= 25;
  } else if (mrz.mismatches && mrz.mismatches.length > 0) {
    score -= mrz.mismatches.length * 15;
  }

  for (const issue of validation.issues) {
    if (issue.severity === "HIGH") score -= 10;
    else if (issue.severity === "CRITICAL") score -= 20;
  }

  if (!face.detected) {
    score -= 15;
  } else {
    if ((face.quality ?? 100) < 70) score -= 8;
    if ((face.similarity ?? 100) < 70) score -= 15;
  }

  // If no OCR fields were extracted at all
  if (ocr.fields.length === 0) {
    score -= 30;
  }

  score = clamp(score, 0, 100);

  const perField: IdentityConsistencyResult["perField"] = [];

  const mrzFieldMap: Record<string, string> = {
    FULL_NAME: "names",
    DATE_OF_BIRTH: "dateOfBirth",
    DOCUMENT_NUMBER: "documentNumber",
    NATIONALITY: "nationality",
    EXPIRY_DATE: "expiryDate",
  };

  const fieldNames = ["FULL_NAME", "DATE_OF_BIRTH", "DOCUMENT_NUMBER", "NATIONALITY", "EXPIRY_DATE"];
  for (const fn of fieldNames) {
    let status: "PASS" | "WARNING" | "FAIL" = "PASS";
    let note = "OCR and MRZ values consistent.";

    const ocrVal = fieldValue(ocr.fields, fn);
    const mrzKey = mrzFieldMap[fn];
    const mrzVal = (mrz as unknown as Record<string, string | undefined>)[mrzKey] || "";

    const mismatch = (mrz.mismatches || []).find((m) => m.field === fn);

    if (!mrz.present) {
      if (ocrVal) {
        status = "WARNING";
        note = `Visual field present ("${ocrVal}"), but MRZ is absent for cross-validation.`;
      } else {
        status = "WARNING";
        note = "Field missing from both visual OCR and MRZ.";
      }
    } else if (mismatch) {
      if (mismatch.severity === "HIGH") {
        status = "FAIL";
        note = `MRZ/OCR mismatch: OCR="${ocrVal}" MRZ="${mrzVal}"`;
      } else {
        status = "WARNING";
        note = `Minor MRZ/OCR discrepancy: OCR="${ocrVal}" MRZ="${mrzVal}"`;
      }
    } else if (!ocrVal) {
      status = "WARNING";
      note = `Field absent from visual OCR extraction (MRZ has "${mrzVal || "N/A"}").`;
    } else {
      status = "PASS";
      note = `Concordant: OCR="${ocrVal}" correlates with MRZ.`;
    }

    perField.push({ field: fn, status, note });
  }

  let photoStatus: "PASS" | "WARNING" | "FAIL" = "PASS";
  let photoNote = "Face detected; quality within baseline range.";
  if (!face.detected) {
    photoStatus = "WARNING";
    photoNote = "No face detected in document photo region.";
  } else if ((face.similarity ?? 100) < 50) {
    photoStatus = "FAIL";
    photoNote = `Face similarity ${(face.similarity ?? 0).toFixed(0)}% — mismatch indicated.`;
  } else if ((face.similarity ?? 100) < 70) {
    photoStatus = "WARNING";
    photoNote = `Face similarity ${(face.similarity ?? 0).toFixed(0)}% below configured threshold 70%.`;
  } else if ((face.quality ?? 100) < 60) {
    photoStatus = "WARNING";
    photoNote = `Face region quality low (${(face.quality ?? 0).toFixed(0)}%).`;
  }
  perField.push({ field: "PHOTO", status: photoStatus, note: photoNote });

  return { score, perField };
}
