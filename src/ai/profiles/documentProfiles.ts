/**
 * TRUSTGATE AI BILLION — DOCUMENT PROFILE REGISTRY
 * 
 * Formal document-type-aware profiles ensuring validation rules, MRZ applicability,
 * geometry constraints, and risk policies are customized to each sovereign credential.
 * 
 * Prevents applying universal ICAO passport standards to domestic identity cards like Aadhaar.
 */

export interface DocumentProfile {
  id: string;
  family: "PASSPORT" | "NATIONAL_ID" | "TAX_CARD" | "VOTER_CARD" | "DRIVING_LICENCE" | "RESIDENCE_PERMIT" | "VISA" | "UNKNOWN";
  issuingJurisdiction: string;
  countryCode: string | null;
  documentType: "passport" | "idcard" | "pan" | "aadhaar" | "voter_id" | "drivinglicense" | "visa" | "permit" | "unknown";
  documentTitle: string;
  standard: string;
  status: "IMPLEMENTED" | "PARTIALLY_SUPPORTED" | "UNSUPPORTED";
  expectedAspectRatio: {
    min: number;
    nominal: number;
    max: number;
  };
  supportedSides: ("front" | "back" | "single_page")[];
  mrz: {
    applicable: boolean;
    mandatory: boolean;
    expectedFormat?: "TD1" | "TD2" | "TD3" | "MRVA" | "MRVB";
    nonApplicableReason?: string;
  };
  qrCode: {
    applicable: boolean;
    description?: string;
  };
  lifetimeValidity: boolean; // true for lifelong credentials without expiry (e.g. Aadhaar, PAN)
  expectedFields: string[];
  mandatoryFields: string[];
  privacyRules: {
    maskInUi: boolean;
    identifierFieldName?: string;
    maskPattern?: RegExp;
    maskFormat?: (raw: string) => string;
  };
  knownLimitations: string[];
}

export const DOCUMENT_PROFILES: Record<string, DocumentProfile> = {
  aadhaar: {
    id: "ind_aadhaar",
    family: "NATIONAL_ID",
    issuingJurisdiction: "Republic of India (UIDAI)",
    countryCode: "IND",
    documentType: "aadhaar",
    documentTitle: "Unique Identification Authority of India (Aadhaar)",
    standard: "National Identity Smart Card (UIDAI)",
    status: "IMPLEMENTED",
    expectedAspectRatio: {
      min: 1.48,
      nominal: 1.586, // ISO/IEC 7810 ID-1
      max: 1.82,
    },
    supportedSides: ["front", "back"],
    mrz: {
      applicable: false,
      mandatory: false,
      nonApplicableReason: "Aadhaar does not use an ICAO passport-style MRZ (Domestic Smart Card)",
    },
    qrCode: {
      applicable: true,
      description: "Secure QR code containing digitally signed demographic data & photograph",
    },
    lifetimeValidity: true, // Permanent identity credential, no expiry cutoff
    expectedFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "DATE_OF_BIRTH",
      "SEX",
      "NATIONALITY",
      "ISSUING_AUTHORITY",
      "ADDRESS",
      "PIN_CODE",
    ],
    mandatoryFields: ["DOCUMENT_NUMBER", "FULL_NAME"],
    privacyRules: {
      maskInUi: true,
      identifierFieldName: "DOCUMENT_NUMBER",
      maskPattern: /^\d{4}\s\d{4}\s\d{4}$/,
      maskFormat: (raw: string) => {
        const cleaned = raw.replace(/\D/g, "");
        if (cleaned.length === 12) {
          return `XXXX XXXX ${cleaned.slice(8)}`;
        }
        return raw;
      },
    },
    knownLimitations: [
      "Visual OCR alone cannot verify biometric binding without authorized UIDAI auth endpoint",
      "Back side contains address; front side contains name, DOB, gender, and photograph",
      "Laminated cards often exhibit specular glare in webcam captures",
    ],
  },

  pan: {
    id: "ind_pan",
    family: "TAX_CARD",
    issuingJurisdiction: "Republic of India (Income Tax Department)",
    countryCode: "IND",
    documentType: "pan",
    documentTitle: "Income Tax Department Permanent Account Number (PAN)",
    standard: "ISO 7810 ID-1",
    status: "IMPLEMENTED",
    expectedAspectRatio: {
      min: 1.48,
      nominal: 1.586,
      max: 1.70,
    },
    supportedSides: ["front"],
    mrz: {
      applicable: false,
      mandatory: false,
      nonApplicableReason: "PAN card does not use an ICAO MRZ (Tax Identification Card)",
    },
    qrCode: {
      applicable: true,
      description: "Enhanced Quick Response Code on new generation PAN cards",
    },
    lifetimeValidity: true,
    expectedFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "FATHER_NAME",
      "DATE_OF_BIRTH",
      "NATIONALITY",
      "ISSUING_AUTHORITY",
    ],
    mandatoryFields: ["DOCUMENT_NUMBER", "FULL_NAME", "DATE_OF_BIRTH"],
    privacyRules: {
      maskInUi: true,
      identifierFieldName: "DOCUMENT_NUMBER",
      maskPattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
      maskFormat: (raw: string) => {
        if (/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(raw)) {
          return `${raw.slice(0, 2)}XXX${raw.slice(5, 9)}${raw.slice(9)}`;
        }
        return raw;
      },
    },
    knownLimitations: [
      "No expiration date present on standard PAN credentials",
      "Physical cards lack embedded RFID chip",
    ],
  },

  voter_id: {
    id: "ind_voter_id",
    family: "VOTER_CARD",
    issuingJurisdiction: "Republic of India (Election Commission of India)",
    countryCode: "IND",
    documentType: "voter_id",
    documentTitle: "Election Commission of India — Elector's Photo Identity Card (EPIC)",
    standard: "National Identity Smart Card",
    status: "IMPLEMENTED",
    expectedAspectRatio: {
      min: 1.48,
      nominal: 1.586,
      max: 1.70,
    },
    supportedSides: ["front", "back"],
    mrz: {
      applicable: false,
      mandatory: false,
      nonApplicableReason: "Voter ID does not use an ICAO MRZ",
    },
    qrCode: {
      applicable: true,
      description: "Secure QR on e-EPIC and newer smart cards",
    },
    lifetimeValidity: true,
    expectedFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "FATHER_NAME",
      "DATE_OF_BIRTH",
      "SEX",
      "NATIONALITY",
    ],
    mandatoryFields: ["DOCUMENT_NUMBER", "FULL_NAME"],
    privacyRules: {
      maskInUi: false,
    },
    knownLimitations: [
      "Older paper/laminated formats have non-standard layouts",
    ],
  },

  passport: {
    id: "icao_passport",
    family: "PASSPORT",
    issuingJurisdiction: "International / Sovereign Issuing State",
    countryCode: null,
    documentType: "passport",
    documentTitle: "Standard ICAO Machine Readable Travel Document (Passport)",
    standard: "ICAO 9303 TD3",
    status: "IMPLEMENTED",
    expectedAspectRatio: {
      min: 1.34,
      nominal: 1.420, // ICAO TD3 passport page
      max: 1.48,
    },
    supportedSides: ["single_page"],
    mrz: {
      applicable: true,
      mandatory: true,
      expectedFormat: "TD3",
    },
    qrCode: {
      applicable: false,
    },
    lifetimeValidity: false, // Standard passports expire (typically 5 or 10 years)
    expectedFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "DATE_OF_BIRTH",
      "EXPIRY_DATE",
      "NATIONALITY",
      "SEX",
      "ISSUE_DATE",
      "ISSUING_AUTHORITY",
    ],
    mandatoryFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "DATE_OF_BIRTH",
      "EXPIRY_DATE",
      "NATIONALITY",
      "SEX",
    ],
    privacyRules: {
      maskInUi: false,
    },
    knownLimitations: [
      "Requires optical line of sight for 2x44 MRZ character recognition",
    ],
  },

  icao_td1: {
    id: "icao_td1_idcard",
    family: "NATIONAL_ID",
    issuingJurisdiction: "International / Sovereign Issuing State",
    countryCode: null,
    documentType: "idcard",
    documentTitle: "ICAO Machine Readable Identity Card (TD1)",
    standard: "ICAO 9303 TD1",
    status: "IMPLEMENTED",
    expectedAspectRatio: {
      min: 1.50,
      nominal: 1.586,
      max: 1.66,
    },
    supportedSides: ["front", "back"],
    mrz: {
      applicable: true,
      mandatory: true,
      expectedFormat: "TD1", // 3x30
    },
    qrCode: {
      applicable: false,
    },
    lifetimeValidity: false,
    expectedFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "DATE_OF_BIRTH",
      "EXPIRY_DATE",
      "NATIONALITY",
      "SEX",
    ],
    mandatoryFields: ["DOCUMENT_NUMBER", "FULL_NAME", "EXPIRY_DATE"],
    privacyRules: {
      maskInUi: false,
    },
    knownLimitations: [
      "MRZ is typically printed on the back side of TD1 cards",
    ],
  },

  icao_td2: {
    id: "icao_td2_idcard",
    family: "NATIONAL_ID",
    issuingJurisdiction: "International / Sovereign Issuing State",
    countryCode: null,
    documentType: "idcard",
    documentTitle: "ICAO Machine Readable Official Travel Document (TD2)",
    standard: "ICAO 9303 TD2",
    status: "IMPLEMENTED",
    expectedAspectRatio: {
      min: 1.35,
      nominal: 1.419,
      max: 1.48,
    },
    supportedSides: ["front", "back"],
    mrz: {
      applicable: true,
      mandatory: true,
      expectedFormat: "TD2", // 2x36
    },
    qrCode: {
      applicable: false,
    },
    lifetimeValidity: false,
    expectedFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "DATE_OF_BIRTH",
      "EXPIRY_DATE",
      "NATIONALITY",
      "SEX",
    ],
    mandatoryFields: ["DOCUMENT_NUMBER", "FULL_NAME"],
    privacyRules: {
      maskInUi: false,
    },
    knownLimitations: [],
  },

  visa: {
    id: "icao_visa",
    family: "VISA",
    issuingJurisdiction: "International / Sovereign Issuing State",
    countryCode: null,
    documentType: "visa",
    documentTitle: "Machine Readable Visa Endorsement (MRV)",
    standard: "ICAO 9303 MRV-B",
    status: "IMPLEMENTED",
    expectedAspectRatio: {
      min: 1.35,
      nominal: 1.420,
      max: 1.76,
    },
    supportedSides: ["single_page"],
    mrz: {
      applicable: true,
      mandatory: true,
      expectedFormat: "MRVB",
    },
    qrCode: {
      applicable: false,
    },
    lifetimeValidity: false,
    expectedFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "DATE_OF_BIRTH",
      "EXPIRY_DATE",
      "NATIONALITY",
      "SEX",
    ],
    mandatoryFields: ["DOCUMENT_NUMBER", "FULL_NAME", "EXPIRY_DATE"],
    privacyRules: {
      maskInUi: false,
    },
    knownLimitations: [],
  },

  drivinglicense: {
    id: "iso_driving_licence",
    family: "DRIVING_LICENCE",
    issuingJurisdiction: "Sovereign Department of Motor Vehicles",
    countryCode: null,
    documentType: "drivinglicense",
    documentTitle: "Official Driving Licence (ISO 18013)",
    standard: "ISO 18013",
    status: "PARTIALLY_SUPPORTED",
    expectedAspectRatio: {
      min: 1.48,
      nominal: 1.586,
      max: 1.70,
    },
    supportedSides: ["front", "back"],
    mrz: {
      applicable: false,
      mandatory: false,
      nonApplicableReason: "Standard driving licences do not mandate an ICAO MRZ",
    },
    qrCode: {
      applicable: true,
    },
    lifetimeValidity: false,
    expectedFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "DATE_OF_BIRTH",
      "EXPIRY_DATE",
      "ISSUE_DATE",
    ],
    mandatoryFields: ["DOCUMENT_NUMBER", "FULL_NAME"],
    privacyRules: {
      maskInUi: false,
    },
    knownLimitations: [
      "Jurisdiction-specific category endorsements and varying national layouts",
    ],
  },

  permit: {
    id: "residence_permit",
    family: "RESIDENCE_PERMIT",
    issuingJurisdiction: "Immigration / Home Affairs Authority",
    countryCode: null,
    documentType: "permit",
    documentTitle: "Official Residence & Work Permit",
    standard: "National Immigration Standard",
    status: "PARTIALLY_SUPPORTED",
    expectedAspectRatio: {
      min: 1.48,
      nominal: 1.586,
      max: 1.70,
    },
    supportedSides: ["front", "back"],
    mrz: {
      applicable: false,
      mandatory: false,
      nonApplicableReason: "Domestic residence permits vary; MRZ not globally mandatory",
    },
    qrCode: {
      applicable: false,
    },
    lifetimeValidity: false,
    expectedFields: [
      "DOCUMENT_NUMBER",
      "FULL_NAME",
      "DATE_OF_BIRTH",
      "EXPIRY_DATE",
      "NATIONALITY",
    ],
    mandatoryFields: ["DOCUMENT_NUMBER", "FULL_NAME"],
    privacyRules: {
      maskInUi: false,
    },
    knownLimitations: [],
  },

  unknown: {
    id: "unknown_document",
    family: "UNKNOWN",
    issuingJurisdiction: "Unspecified",
    countryCode: null,
    documentType: "unknown",
    documentTitle: "Unrecognized Credential Format",
    standard: "Undetermined / Non-standard",
    status: "UNSUPPORTED",
    expectedAspectRatio: {
      min: 0.1,
      nominal: 1.420,
      max: 3.0,
    },
    supportedSides: ["single_page"],
    mrz: {
      applicable: false,
      mandatory: false,
      nonApplicableReason: "Document standard applicability undetermined",
    },
    qrCode: {
      applicable: false,
    },
    lifetimeValidity: false,
    expectedFields: [],
    mandatoryFields: [],
    privacyRules: {
      maskInUi: false,
    },
    knownLimitations: [
      "Image does not conform to supported physical identity credential specifications",
    ],
  },
};

/**
 * Resolves a document profile given a detected document type and optional country.
 */
export function getDocumentProfile(
  documentType: string | undefined,
  countryCode?: string | null
): DocumentProfile {
  if (!documentType) return DOCUMENT_PROFILES.unknown;

  const normalized = documentType.toLowerCase().trim();
  if (normalized === "aadhaar" || (normalized === "id" && countryCode === "IND")) {
    return DOCUMENT_PROFILES.aadhaar;
  }
  if (normalized === "pan") return DOCUMENT_PROFILES.pan;
  if (normalized === "voter_id") return DOCUMENT_PROFILES.voter_id;
  if (normalized === "passport") return DOCUMENT_PROFILES.passport;
  if (normalized === "visa") return DOCUMENT_PROFILES.visa;
  if (normalized === "drivinglicense" || normalized === "dl") return DOCUMENT_PROFILES.drivinglicense;
  if (normalized === "permit") return DOCUMENT_PROFILES.permit;
  if (normalized === "id" || normalized === "idcard") {
    return DOCUMENT_PROFILES.icao_td1;
  }

  return DOCUMENT_PROFILES.unknown;
}

/**
 * Checks whether an ICAO MRZ is applicable to the given document profile.
 */
export function isMrzApplicable(documentType: string | undefined, countryCode?: string | null): boolean {
  const profile = getDocumentProfile(documentType, countryCode);
  return profile.mrz.applicable;
}

/**
 * Masks sensitive identifiers (such as 12-digit Aadhaar UID) for privacy-preserving UI display.
 */
export function maskIdentifier(
  fieldName: string,
  value: string | undefined | null,
  docType?: string
): string {
  if (!value) return "—";
  if (docType === "aadhaar" || fieldName === "DOCUMENT_NUMBER" || fieldName === "AADHAAR_NUMBER") {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 12) {
      return `XXXX XXXX ${digitsOnly.slice(8)}`;
    }
    // If already partially masked
    if (/^[xX\*\•]{4}\s?[xX\*\•]{4}\s?\d{4}$/.test(value)) {
      return value.replace(/[xX\*\•]/g, "X");
    }
  }
  return value;
}
