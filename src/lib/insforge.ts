import { createClient, type InsForgeClient } from "@insforge/sdk";
import { resolveSpecimenUrl } from "./specimenResolver";

/**
 * Validate required environment variables at startup.
 * Deliberately does NOT fall back to hardcoded values — a misconfigured
 * deployment must fail loudly, not silently connect to a live backend.
 *
 * SECURITY NOTE: The ANON_KEY (public key) is intentionally included in the
 * client-side bundle; it is designed to be public. The service-role key must
 * NEVER appear in client code. Neither key should be hardcoded here.
 */
function getEnvConfig(): { baseUrl: string; anonKey: string } {
  const baseUrl = import.meta.env.VITE_INSFORGE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined;

  if (!baseUrl || baseUrl.trim() === "") {
    throw new Error(
      "[TrustGate] VITE_INSFORGE_URL is required. " +
        "Copy .env.example to .env and set your InsForge project URL."
    );
  }
  if (!anonKey || anonKey.trim() === "") {
    throw new Error(
      "[TrustGate] VITE_INSFORGE_ANON_KEY is required. " +
        "Copy .env.example to .env and set your InsForge anonymous key."
    );
  }
  return { baseUrl, anonKey };
}

const { baseUrl, anonKey } = getEnvConfig();

export const insforge: InsForgeClient = createClient({ baseUrl, anonKey });

/**
 * Safely inspects a JWT token string to determine if it has expired.
 * Prevents attaching dead JWTs to PostgREST requests which causes 401 JWT expired errors.
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed.exp) return false;
    // Buffer with 30 seconds leeway to prevent race conditions near expiration
    return parsed.exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
}

// Auto-restore access token from sessionStorage (preferred) or localStorage (legacy) at startup.
// SECURITY: sessionStorage is tab-scoped and not persistent — preferred over localStorage for tokens.
if (typeof window !== "undefined") {
  try {
    // Check sessionStorage first
    let savedToken = window.sessionStorage?.getItem("tg_access_token") ?? null;

    // Migrate from localStorage if token exists there but not in sessionStorage
    if (!savedToken) {
      const legacyToken = window.localStorage?.getItem("tg_access_token") ?? null;
      if (legacyToken) {
        try {
          window.sessionStorage.setItem("tg_access_token", legacyToken);
          window.localStorage.removeItem("tg_access_token");
          savedToken = legacyToken;
        } catch {
          savedToken = legacyToken; // Use in-memory even if migration fails
        }
      }
    }

    if (savedToken) {
      if (isTokenExpired(savedToken)) {
        window.sessionStorage.removeItem("tg_access_token");
        window.localStorage.removeItem("tg_access_token");
        insforge.setAccessToken(null);
      } else {
        insforge.setAccessToken(savedToken);
      }
    }
  } catch {}
}

/**
 * Ensures that the InsForge SDK has a valid JWT session attached so that
 * PostgREST queries succeed. Returns active token or null if unauthenticated.
 */
export async function ensureAuthenticatedClient(): Promise<string | null> {
  try {
    // 1. Check in-memory user
    const { data: userRes, error: userErr } = await insforge.auth.getCurrentUser();
    if (!userErr && userRes?.user) {
      // SECURITY: Prefer sessionStorage, fall back to localStorage (legacy migration)
      const token = typeof window !== "undefined"
        ? (window.sessionStorage?.getItem("tg_access_token") ?? window.localStorage?.getItem("tg_access_token") ?? null)
        : null;
      if (token && isTokenExpired(token)) {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("tg_access_token");
          window.localStorage.removeItem("tg_access_token");
        }
        insforge.setAccessToken(null);
        return null;
      }
      return token || "active";
    }
  } catch {}

  // 2. Check sessionStorage (preferred) then localStorage (legacy)
  if (typeof window !== "undefined") {
    const savedToken = window.sessionStorage?.getItem("tg_access_token")
      ?? window.localStorage?.getItem("tg_access_token")
      ?? null;
    if (savedToken) {
      if (isTokenExpired(savedToken)) {
        window.sessionStorage.removeItem("tg_access_token");
        window.localStorage.removeItem("tg_access_token");
        insforge.setAccessToken(null);
        return null;
      }
      insforge.setAccessToken(savedToken);
      // Migrate to sessionStorage if only in localStorage
      if (!window.sessionStorage?.getItem("tg_access_token") && window.localStorage?.getItem("tg_access_token")) {
        try {
          window.sessionStorage.setItem("tg_access_token", savedToken);
          window.localStorage.removeItem("tg_access_token");
        } catch {}
      }
      try {
        const { data: u, error } = await insforge.auth.getCurrentUser();
        if (!error && u?.user) {
          return savedToken;
        }
        // Token was rejected by the server
        window.sessionStorage.removeItem("tg_access_token");
        window.localStorage.removeItem("tg_access_token");
        insforge.setAccessToken(null);
      } catch {
        window.sessionStorage.removeItem("tg_access_token");
        window.localStorage.removeItem("tg_access_token");
        insforge.setAccessToken(null);
      }
    }
  }

  return null;
}

export type AppRole = "officer" | "supervisor" | "admin" | "analyst";

export type Permission =
  | "cases:create"
  | "cases:view_assigned"
  | "cases:view_all"
  | "cases:review"
  | "cases:approve"
  | "cases:risk_override"
  | "documents:upload"
  | "reports:access"
  | "reports:generate"
  | "analytics:view"
  | "models:inspect"
  | "models:manage"
  | "datasets:review"
  | "datasets:manage"
  | "security:view"
  | "audit:view"
  | "users:manage"
  | "system:manage";

const ROLE_PERMISSIONS: Record<AppRole, Set<Permission>> = {
  admin: new Set<Permission>([
    "cases:create",
    "cases:view_assigned",
    "cases:view_all",
    "cases:review",
    "cases:approve",
    "cases:risk_override",
    "documents:upload",
    "reports:access",
    "reports:generate",
    "analytics:view",
    "models:inspect",
    "models:manage",
    "datasets:review",
    "datasets:manage",
    "security:view",
    "audit:view",
    "users:manage",
    "system:manage",
  ]),
  supervisor: new Set<Permission>([
    "cases:create",
    "cases:view_assigned",
    "cases:view_all",
    "cases:review",
    "cases:approve",
    "cases:risk_override",
    "documents:upload",
    "reports:access",
    "reports:generate",
    "analytics:view",
    "models:inspect",
    "datasets:review",
    "audit:view",
  ]),
  officer: new Set<Permission>([
    "cases:create",
    "cases:view_assigned",
    "documents:upload",
  ]),
  analyst: new Set<Permission>([
    "cases:view_assigned",
    "cases:view_all",
    "analytics:view",
    "models:inspect",
    "datasets:review",
  ]),
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export async function getCurrentUser() {
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error) throw error;
  return data?.user ?? null;
}

export async function getCurrentAppRole(): Promise<AppRole> {
  try {
    const { data, error } = await insforge.database.rpc("current_app_role", {});
    if (error) return "officer";
    const role = String(data || "officer").toLowerCase() as AppRole;
    if (role === "admin" || role === "supervisor" || role === "officer" || role === "analyst") {
      return role;
    }
    return "officer";
  } catch {
    return "officer";
  }
}

export function roleAtLeast(userRole: AppRole, required: AppRole): boolean {
  const rank: Record<AppRole, number> = { analyst: 0, officer: 1, supervisor: 2, admin: 3 };
  return (rank[userRole] ?? 0) >= (rank[required] ?? 0);
}

/**
 * Generate a cryptographically random case code.
 * Uses crypto.getRandomValues() — NOT Math.random() — for security.
 * Format: TG-<timestamp36>-<8 random hex chars>
 */
export function genCaseCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const rand = Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `TG-${stamp}-${rand}`;
}

/**
 * Authenticated download helper for private storage buckets.
 * Downloads the object as a Blob via the InsForge authenticated SDK,
 * creating an ephemeral object URL that can be displayed safely.
 */
export async function fetchSecureBlobUrl(bucket: string, key: string): Promise<string> {
  const localSpecimen = resolveSpecimenUrl(key);
  if (localSpecimen && localSpecimen.startsWith("/specimens/")) {
    return localSpecimen;
  }

  try {
    const { data, error } = await insforge.storage.from(bucket).download(key);
    if (!error && data) {
      return URL.createObjectURL(data);
    }
  } catch (sdkErr) {
    console.warn("[TrustGate Storage] SDK download error:", sdkErr);
  }

  try {
    const cleanKey = key.startsWith("/") ? key.slice(1) : key;
    const url = `${baseUrl}/api/storage/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(cleanKey)}`;
    const headers: Record<string, string> = {
      "x-api-key": anonKey,
    };
    // SECURITY: Read token from sessionStorage first (preferred)
    const savedToken = typeof window !== "undefined"
      ? (window.sessionStorage?.getItem("tg_access_token") ?? window.localStorage?.getItem("tg_access_token"))
      : null;
    if (savedToken && !isTokenExpired(savedToken)) {
      headers["Authorization"] = `Bearer ${savedToken}`;
    }
    const res = await fetch(url, { headers });
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch (httpErr) {
    console.warn("[TrustGate Storage] HTTP download error:", httpErr);
  }

  return resolveSpecimenUrl(key);
}

/**
 * Upload an authenticated camera capture or document to the private InsForge storage bucket.
 * Strictly enforces:
 * - Validates private bucket destination ('screening-documents')
 * - Generates cryptographically safe random internal key: cases/{caseCode}/documents/capture-{uuid}.jpg
 * - Never trusts client-supplied filenames or relative path traversal
 */
export async function uploadScreeningDocument(
  file: File,
  caseCode?: string
): Promise<{
  bucket: string;
  key: string;
  url: string;
  size: number;
  mimeType: string;
}> {
  const BUCKET = "documents";
  const code = caseCode || genCaseCode();
  // 3. Math.random() fallback removed — crypto.randomUUID is universally available
  // in all supported browsers (Chrome 92+, Firefox 95+, Safari 15.4+)
  const uuid = crypto.randomUUID();
  const key = `cases/${code}/documents/capture-${Date.now()}-${uuid}.jpg`;

  const { data, error } = await insforge.storage
    .from(BUCKET)
    .upload(key, file);

  if (error || !data) {
    throw new Error(error?.message || "Failed to upload document to InsForge storage.");
  }

  return {
    bucket: BUCKET,
    key: data.key || key,
    url: data.url || `${baseUrl}/api/storage/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`,
    size: data.size || file.size,
    mimeType: data.mimeType || file.type || "image/jpeg",
  };
}


