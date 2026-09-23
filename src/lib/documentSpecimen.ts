/**
 * TRUSTGATE AI — Document Specimen & Asset Resolution Engine
 * 
 * Provides fail-safe URL normalization, active session blob resolution,
 * and direct storage endpoint routing.
 * 
 * STRICT COMPLIANCE POLICY:
 * NO synthetic / Canva / mock SVG graphics are generated or rendered.
 * ONLY authentic uploaded travel documents and live physical camera
 * frames are accepted.
 */

const INSFORGE_URL = (import.meta.env.VITE_INSFORGE_URL as string) || "https://i8yy29ec.us-east.insforge.app";

/**
 * Resolves a reliable, accessible image URL for an authentic document or biometric record.
 * Handles:
 * 1. Storage keys in screening-documents bucket -> builds direct public/authenticated endpoint URL
 * 2. Active session blob URLs -> validates they belong to the current session
 * 3. Data URLs (base64 images) -> passed through directly
 * 4. Stale/unreachable remote blobs -> filters them out (returns null)
 * 5. Outdated project hosts -> rewrites to the active project host
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

    // Data URLs (e.g. data:image/jpeg;base64,...) are always valid
    if (trimmed.startsWith("data:image/")) {
      return trimmed;
    }

    // Active session blob URLs (created in the current browser window)
    if (trimmed.startsWith("blob:")) {
      // Discard stale blob URLs from legacy test domains or foreign origins that cannot load
      if (
        trimmed.includes("heicn84u") ||
        (typeof window !== "undefined" && !trimmed.startsWith(`blob:${window.location.origin}`))
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

    // Valid HTTPS / HTTP URL
    if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Permanently disabled: Zero simulated / Canva SVG images allowed.
 * Returns empty string to guarantee authentic document presentation only.
 */
export function getPassportSpecimenSvg(
  _caseCode?: string,
  _name?: string,
  _docNum?: string,
  _country?: string,
  _isTampered?: boolean
): string {
  return "";
}

/**
 * Permanently disabled: Zero simulated / Canva SVG images allowed.
 * Returns empty string to guarantee authentic document presentation only.
 */
export function getVisaSpecimenSvg(
  _caseCode?: string,
  _name?: string,
  _visaNum?: string
): string {
  return "";
}

/**
 * Permanently disabled: Zero simulated / Canva SVG images allowed.
 * Returns empty string to guarantee authentic traveler biometric presentation only.
 */
export function getBiometricPortraitSpecimenSvg(
  _name?: string,
  _similarity?: number,
  _isMatch?: boolean
): string {
  return "";
}
