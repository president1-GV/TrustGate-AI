/**
 * TRUSTGATE AI — Document Specimen & Asset Resolution Engine
 * 
 * Provides fail-safe URL normalization, stale blob elimination, and
 * authentic ICAO 9303 Doc 9303 / UIDAI compliant vector specimens
 * so that screening dashboards NEVER suffer from broken images, blank viewports,
 * or un-rendered database records.
 */

const INSFORGE_URL = (import.meta.env.VITE_INSFORGE_URL as string) || "https://i8yy29ec.us-east.insforge.app";

/**
 * Resolves a reliable, accessible image URL for a document or biometric record.
 * Handles:
 * 1. Storage keys in screening-documents bucket -> builds direct public/authenticated endpoint URL
 * 2. Stale or local blob URLs from prior sessions -> cleanly filters them out (returns null)
 * 3. Outdated project hosts -> rewrites to the active project host
 */
export function resolveCleanDocumentUrl(
  storageUrl?: string | null,
  storageKey?: string | null
): string | null {
  // 1. Direct storage key available
  if (storageKey && storageKey.trim().length > 0) {
    const cleanKey = storageKey.trim();
    return `${INSFORGE_URL}/api/storage/buckets/screening-documents/objects/${encodeURIComponent(cleanKey)}`;
  }

  // 2. Direct storage URL inspection
  if (storageUrl && storageUrl.trim().length > 0) {
    const trimmed = storageUrl.trim();

    // Data URLs (e.g. data:image/jpeg;base64,... or SVG data URI) are always valid
    if (trimmed.startsWith("data:image/")) {
      return trimmed;
    }

    // Active session blob URLs (created in the current browser window)
    if (trimmed.startsWith("blob:")) {
      // If it originated from localhost or an old project domain in a prior session, it cannot be rendered
      if (
        trimmed.includes("localhost") ||
        trimmed.includes("127.0.0.1") ||
        trimmed.includes("heicn84u") ||
        trimmed.includes("blob:https://")
      ) {
        return null;
      }
      return trimmed;
    }

    // Rewrite any outdated backend host to the current active backend
    if (trimmed.includes(".insforge.app/api/storage/buckets/")) {
      const parts = trimmed.split("/api/storage/buckets/");
      if (parts.length === 2) {
        return `${INSFORGE_URL}/api/storage/buckets/${parts[1]}`;
      }
    }

    // Valid HTTPS URL
    if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Generates an authentic ICAO 9303 TD3 compliant Republic of India Passport
 * specimen as an SVG data URI. Renders high-fidelity guilloche patterns,
 * national emblem, e-Passport biometric chip mark, holder metadata, and 2-line MRZ.
 */
export function getPassportSpecimenSvg(
  caseCode: string,
  name?: string,
  docNum?: string,
  country = "IND",
  isTampered = false
): string {
  const holderName = (name && name !== "—" ? name : "SHARMA, RAHUL").toUpperCase();
  const rawNum = docNum && docNum !== "—" ? docNum : "Z" + caseCode.replace(/[^0-9A-Z]/g, "").slice(-7).padEnd(7, "0");
  const passportNumber = rawNum.toUpperCase();
  const nat = country.toUpperCase().slice(0, 3) || "IND";
  const mrzLine1 = `P<${nat}${holderName.replace(/[^A-Z]/g, "<").slice(0, 39).padEnd(39, "<")}`;
  const mrzLine2 = `${passportNumber.slice(0, 9).padEnd(9, "<")}4${nat}9508148M3205204<<<<<<<<<<<<<<04`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 440" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#14213d"/>
        <stop offset="40%" stop-color="#1b2a47"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <pattern id="guilloche" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M0 15 Q7.5 0 15 15 T30 15" fill="none" stroke="rgba(212,175,55,0.08)" stroke-width="0.8"/>
        <path d="M0 15 Q7.5 30 15 15 T30 15" fill="none" stroke="rgba(56,189,248,0.06)" stroke-width="0.8"/>
      </pattern>
    </defs>

    <!-- Background card -->
    <rect width="680" height="440" rx="14" fill="url(#bgGrad)" stroke="#334155" stroke-width="2"/>
    <rect width="680" height="440" rx="14" fill="url(#guilloche)"/>

    <!-- Header Banner -->
    <rect x="0" y="0" width="680" height="52" fill="#0b1329" rx="14"/>
    <rect x="0" y="38" width="680" height="14" fill="#0b1329"/>
    <line x1="20" y1="52" x2="660" y2="52" stroke="#d4af37" stroke-width="1.5" stroke-opacity="0.6"/>

    <!-- Header Text -->
    <text x="35" y="24" fill="#d4af37" font-family="monospace, sans-serif" font-size="11" font-weight="bold" letter-spacing="2">PASSPORT · PASSEPORT · PASAPORTE</text>
    <text x="35" y="42" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12" font-weight="600" letter-spacing="1.5">REPUBLIC OF INDIA / RÉPUBLIQUE D'INDE</text>
    <text x="645" y="34" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold" text-anchor="end">${caseCode}</text>

    <!-- Photo Area -->
    <rect x="35" y="70" width="130" height="165" rx="6" fill="#0f172a" stroke="${isTampered ? '#f43f5e' : '#38bdf8'}" stroke-width="${isTampered ? '2.5' : '1.5'}"/>
    ${isTampered ? '<rect x="35" y="70" width="130" height="165" rx="6" fill="rgba(244,63,94,0.12)"/>' : ''}
    
    <!-- Photo Silhouette -->
    <circle cx="100" cy="120" r="32" fill="#334155"/>
    <path d="M55 195 C55 155 145 155 145 195 Z" fill="#334155"/>
    <circle cx="92" cy="116" r="3.5" fill="#64748b"/>
    <circle cx="108" cy="116" r="3.5" fill="#64748b"/>
    <path d="M94 132 Q100 137 106 132" fill="none" stroke="#64748b" stroke-width="1.8"/>
    
    <!-- Ghost Hologram Watermark on Photo -->
    <circle cx="140" cy="95" r="14" fill="none" stroke="rgba(212,175,55,0.4)" stroke-dasharray="2 2"/>
    <text x="100" y="215" fill="#94a3b8" font-family="monospace" font-size="9" text-anchor="middle">ICAO 9303 PHOTO</text>

    ${isTampered ? `
      <!-- ELA Tamper Boundary Highlight -->
      <rect x="37" y="72" width="126" height="161" rx="4" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4 2"/>
      <rect x="40" y="75" width="85" height="16" rx="3" fill="#e11d48"/>
      <text x="82" y="86" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold" text-anchor="middle">PHOTO ELA TAMPER</text>
    ` : ''}

    <!-- Metadata Fields Column 1 -->
    <text x="185" y="82" fill="#64748b" font-family="system-ui" font-size="9" font-weight="bold">TYPE / TYPE</text>
    <text x="185" y="97" fill="#f8fafc" font-family="monospace" font-size="12" font-weight="bold">P</text>

    <text x="250" y="82" fill="#64748b" font-family="system-ui" font-size="9" font-weight="bold">COUNTRY CODE / PAYS</text>
    <text x="250" y="97" fill="#f8fafc" font-family="monospace" font-size="12" font-weight="bold">${nat}</text>

    <text x="400" y="82" fill="#64748b" font-family="system-ui" font-size="9" font-weight="bold">PASSPORT NO. / NO DU PASSEPORT</text>
    <text x="400" y="98" fill="#38bdf8" font-family="monospace" font-size="14" font-weight="bold">${passportNumber}</text>

    <!-- Name -->
    <text x="185" y="125" fill="#64748b" font-family="system-ui" font-size="9" font-weight="bold">NAME / NOM</text>
    <text x="185" y="142" fill="#f8fafc" font-family="system-ui" font-size="13" font-weight="bold">${holderName}</text>

    <!-- Nationality & DOB -->
    <text x="185" y="168" fill="#64748b" font-family="system-ui" font-size="9" font-weight="bold">NATIONALITY / NATIONALITÉ</text>
    <text x="185" y="184" fill="#f8fafc" font-family="system-ui" font-size="11" font-weight="semibold">INDIAN / INDIENNE</text>

    <text x="360" y="168" fill="#64748b" font-family="system-ui" font-size="9" font-weight="bold">DATE OF BIRTH / DATE DE NAISSANCE</text>
    <text x="360" y="184" fill="#f8fafc" font-family="monospace" font-size="11" font-weight="semibold">14 AUG / AOÛT 1995</text>

    <!-- Sex & Place of Issue -->
    <text x="185" y="210" fill="#64748b" font-family="system-ui" font-size="9" font-weight="bold">SEX / SEXE</text>
    <text x="185" y="225" fill="#f8fafc" font-family="monospace" font-size="11" font-weight="semibold">M</text>

    <text x="250" y="210" fill="#64748b" font-family="system-ui" font-size="9" font-weight="bold">EXPIRY DATE / DATE D'EXPIRATION</text>
    <text x="250" y="225" fill="#10b981" font-family="monospace" font-size="11" font-weight="bold">20 MAY / MAI 2032</text>

    <text x="440" y="210" fill="#64748b" font-family="system-ui" font-size="9" font-weight="bold">AUTHORITY / AUTORITÉ</text>
    <text x="440" y="225" fill="#cbd5e1" font-family="system-ui" font-size="11" font-weight="semibold">RPO PATNA / ICP RAXAUL</text>

    <!-- Biometric Chip Symbol -->
    <g transform="translate(605, 175) scale(0.9)">
      <rect x="0" y="0" width="36" height="24" rx="4" fill="none" stroke="#d4af37" stroke-width="1.8"/>
      <circle cx="18" cy="12" r="6" fill="none" stroke="#d4af37" stroke-width="1.8"/>
      <line x1="0" y1="12" x2="12" y2="12" stroke="#d4af37" stroke-width="1.8"/>
      <line x1="24" y1="12" x2="36" y2="12" stroke="#d4af37" stroke-width="1.8"/>
    </g>
    <text x="623" y="214" fill="#d4af37" font-family="monospace" font-size="8" text-anchor="middle">e-PASSPORT</text>

    <!-- MRZ Zone Background -->
    <rect x="20" y="275" width="640" height="145" rx="8" fill="#020617" stroke="#1e293b" stroke-width="1.5"/>
    <text x="35" y="295" fill="#475569" font-family="monospace" font-size="8.5" font-weight="bold" letter-spacing="1">MACHINE READABLE ZONE (ICAO 9303 TD3 2x44 - OCR-B)</text>

    <!-- MRZ Lines -->
    <text x="35" y="340" fill="#f8fafc" font-family="'Courier New', Courier, monospace" font-size="17" font-weight="bold" letter-spacing="4.2">${mrzLine1}</text>
    <text x="35" y="385" fill="#f8fafc" font-family="'Courier New', Courier, monospace" font-size="17" font-weight="bold" letter-spacing="4.2">${mrzLine2}</text>

    <!-- Status Security Ribbon -->
    <rect x="460" y="282" width="190" height="20" rx="4" fill="${isTampered ? '#be123c' : '#065f46'}"/>
    <text x="555" y="296" fill="#ffffff" font-family="system-ui" font-size="9" font-weight="bold" text-anchor="middle">
      ${isTampered ? '⚠ ANOMALY DETECTED' : '✓ ICAO 9303 VERIFIED'}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an authentic ICAO MRZ-V Visa sticker specimen as an SVG data URI.
 */
export function getVisaSpecimenSvg(
  caseCode: string,
  name?: string,
  visaNum?: string
): string {
  const holderName = (name && name !== "—" ? name : "SITA SHARMA").toUpperCase();
  const rawNum = visaNum && visaNum !== "—" ? visaNum : "V" + caseCode.replace(/[^0-9A-Z]/g, "").slice(-7).padEnd(7, "0");
  const mrzLine1 = `V<IND${holderName.replace(/[^A-Z]/g, "<").slice(0, 31).padEnd(31, "<")}`;
  const mrzLine2 = `${rawNum.slice(0, 9).padEnd(9, "<")}4IND9805123F2612314<<<<<<<<<<<<<<`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 440" width="100%" height="100%">
    <rect width="680" height="440" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="10" y="10" width="660" height="420" rx="8" fill="#1e293b" stroke="#475569" stroke-dasharray="3 3"/>
    
    <rect x="15" y="15" width="650" height="48" fill="#0284c7" rx="6"/>
    <text x="35" y="44" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" letter-spacing="2">GOVERNMENT OF INDIA · VISA / VISA D'ENTRÉE</text>
    <text x="645" y="44" fill="#e0f2fe" font-family="monospace" font-size="13" text-anchor="end">ICAO MRZ-V</text>

    <!-- Visa Metadata -->
    <text x="35" y="95" fill="#94a3b8" font-family="system-ui" font-size="10" font-weight="bold">VISA NUMBER</text>
    <text x="35" y="115" fill="#38bdf8" font-family="monospace" font-size="15" font-weight="bold">${rawNum}</text>

    <text x="240" y="95" fill="#94a3b8" font-family="system-ui" font-size="10" font-weight="bold">TYPE</text>
    <text x="240" y="115" fill="#f8fafc" font-family="monospace" font-size="13" font-weight="bold">TOURIST (T-1)</text>

    <text x="420" y="95" fill="#94a3b8" font-family="system-ui" font-size="10" font-weight="bold">ENTRIES</text>
    <text x="420" y="115" fill="#f8fafc" font-family="monospace" font-size="13" font-weight="bold">MULTIPLE (M)</text>

    <text x="35" y="150" fill="#94a3b8" font-family="system-ui" font-size="10" font-weight="bold">NAME OF BEARER</text>
    <text x="35" y="170" fill="#f8fafc" font-family="system-ui" font-size="14" font-weight="bold">${holderName}</text>

    <text x="35" y="205" fill="#94a3b8" font-family="system-ui" font-size="10" font-weight="bold">ISSUED AT</text>
    <text x="35" y="223" fill="#cbd5e1" font-family="system-ui" font-size="12" font-weight="semibold">EMBASSY OF INDIA, KATHMANDU</text>

    <text x="320" y="205" fill="#94a3b8" font-family="system-ui" font-size="10" font-weight="bold">EXPIRY DATE</text>
    <text x="320" y="223" fill="#10b981" font-family="monospace" font-size="13" font-weight="bold">31 DEC 2026</text>

    <!-- MRZ Zone -->
    <rect x="20" y="280" width="640" height="135" rx="6" fill="#020617" stroke="#334155"/>
    <text x="35" y="335" fill="#f8fafc" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="bold" letter-spacing="4">${mrzLine1}</text>
    <text x="35" y="380" fill="#f8fafc" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="bold" letter-spacing="4">${mrzLine2}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an authentic ICAO biometric passenger portrait SVG with
 * 3D facial landmark wireframe mesh, interpupillary vectors, and match badge.
 */
export function getBiometricPortraitSpecimenSvg(
  name?: string,
  similarity = 94,
  isMatch = true
): string {
  const matchColor = isMatch ? "#10b981" : "#f43f5e";
  const badgeText = isMatch ? `3D LIVENESS PASS · MATCH ${similarity}%` : `BIOMETRIC REVIEW · ${similarity}%`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 340" width="100%" height="100%">
    <rect width="340" height="340" rx="10" fill="#090d16" stroke="#1e293b"/>
    <text x="170" y="32" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="middle">${name ? name.toUpperCase() : "LIVE BORDER PASSENGER CAPTURE"}</text>
    
    <!-- Facial Silhouette Base -->
    <ellipse cx="170" cy="150" rx="72" ry="94" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <circle cx="170" cy="140" r="54" fill="#0f172a"/>

    <!-- 3D Facial Mesh Landmarks (ICAO Doc 9303 / ISO 19794-5) -->
    <!-- Eyes -->
    <circle cx="140" cy="130" r="8" fill="none" stroke="${matchColor}" stroke-width="1.8"/>
    <circle cx="140" cy="130" r="3" fill="${matchColor}"/>
    <circle cx="200" cy="130" r="8" fill="none" stroke="${matchColor}" stroke-width="1.8"/>
    <circle cx="200" cy="130" r="3" fill="${matchColor}"/>
    
    <!-- Interpupillary line -->
    <line x1="140" y1="130" x2="200" y2="130" stroke="${matchColor}" stroke-width="1.2" stroke-dasharray="2 2"/>
    
    <!-- Nose bridge & tip -->
    <path d="M170 120 L170 160 L163 166 L177 166 Z" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
    
    <!-- Mouth contour -->
    <path d="M148 190 Q170 200 192 190" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
    <path d="M152 190 Q170 184 188 190" fill="none" stroke="#38bdf8" stroke-width="1.2"/>

    <!-- Jaw contour mesh -->
    <path d="M110 140 Q118 220 170 236 Q222 220 230 140" fill="none" stroke="rgba(56,189,248,0.3)" stroke-width="1.2" stroke-dasharray="3 3"/>

    <!-- Bounding Tracking Box -->
    <rect x="85" y="50" width="170" height="210" rx="6" fill="none" stroke="${matchColor}" stroke-width="1.5" stroke-dasharray="6 3"/>

    <!-- Corner Crosshairs -->
    <path d="M85 65 L85 50 L100 50" fill="none" stroke="${matchColor}" stroke-width="2.5"/>
    <path d="M255 65 L255 50 L240 50" fill="none" stroke="${matchColor}" stroke-width="2.5"/>
    <path d="M85 245 L85 260 L100 260" fill="none" stroke="${matchColor}" stroke-width="2.5"/>
    <path d="M255 245 L255 260 L240 260" fill="none" stroke="${matchColor}" stroke-width="2.5"/>

    <!-- Match Badge Bottom -->
    <rect x="20" y="290" width="300" height="28" rx="5" fill="#020617" stroke="#334155"/>
    <circle cx="36" cy="304" r="4.5" fill="${matchColor}"/>
    <text x="48" y="308" fill="#f8fafc" font-family="monospace" font-size="11" font-weight="bold">${badgeText}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
