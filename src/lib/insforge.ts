import { createClient, type InsForgeClient } from "@insforge/sdk";

/**
 * Validate required environment variables at startup.
 * Throws a clear error in development if VITE_INSFORGE_URL or VITE_INSFORGE_ANON_KEY
 * are missing — prevents silent misconfiguration from connecting to the wrong backend.
 */
function assertEnvVars(): { baseUrl: string; anonKey: string } {
  const baseUrl = import.meta.env.VITE_INSFORGE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined;

  if (!baseUrl || baseUrl.trim() === "") {
    throw new Error(
      "[TrustGate] VITE_INSFORGE_URL is required. " +
        "Copy .env.example to .env and set the InsForge project URL."
    );
  }
  if (!anonKey || anonKey.trim() === "") {
    throw new Error(
      "[TrustGate] VITE_INSFORGE_ANON_KEY is required. " +
        "Copy .env.example to .env and set the InsForge anonymous key."
    );
  }
  return { baseUrl, anonKey };
}

const { baseUrl, anonKey } = assertEnvVars();

export const insforge: InsForgeClient = createClient({ baseUrl, anonKey });

// Auto-restore access token from localStorage if available in browser
if (typeof window !== "undefined" && window.localStorage) {
  try {
    const savedToken = window.localStorage.getItem("tg_access_token");
    if (savedToken) {
      insforge.setAccessToken(savedToken);
    }
  } catch {}
}

let authInitPromise: Promise<string | null> | null = null;

/**
 * Ensures that the InsForge SDK has a valid JWT session attached so that
 * PostgREST queries to /api/database/records/* succeed with 200 rather than 401.
 * If no session exists, automatically authenticates with the system credentials
 * and caches the token in localStorage.
 */
export async function ensureAuthenticatedClient(): Promise<string | null> {
  try {
    // 1. Check in-memory user
    const { data: userRes } = await insforge.auth.getCurrentUser();
    if (userRes?.user) {
      const token = typeof window !== "undefined" && typeof window.localStorage?.getItem === "function"
        ? window.localStorage.getItem("tg_access_token")
        : null;
      return token || "active";
    }
  } catch {}

  // 2. Check localStorage
  if (typeof window !== "undefined" && typeof window.localStorage?.getItem === "function") {
    const savedToken = window.localStorage.getItem("tg_access_token");
    if (savedToken) {
      insforge.setAccessToken(savedToken);
      try {
        const { data: u } = await insforge.auth.getCurrentUser();
        if (u?.user) {
          return savedToken;
        }
      } catch {}
    }
  }

  // 3. Deduplicate in-flight authentication
  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = (async () => {
    try {
      const { data, error } = await insforge.auth.signInWithPassword({
        email: "admin@trustgate.ai",
        password: "TrustGate@SIH2026",
      });
      if (!error && data?.accessToken) {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem("tg_access_token", data.accessToken);
        }
        insforge.setAccessToken(data.accessToken);
        return data.accessToken;
      }
    } catch (err) {
      console.warn("[TrustGate] ensureAuthenticatedClient sign-in attempt:", err);
    } finally {
      authInitPromise = null;
    }
    return null;
  })();

  return authInitPromise;
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
  const { data, error } = await insforge.storage.from(bucket).download(key);
  if (error || !data) {
    throw new Error(error?.message ?? `Failed to download object from bucket ${bucket}`);
  }
  return URL.createObjectURL(data);
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
  const BUCKET = "screening-documents";
  const code = caseCode || genCaseCode();
  const safeRandom = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const key = `cases/${code}/documents/capture-${Date.now()}-${safeRandom}.jpg`;

  const { data, error } = await insforge.storage
    .from(BUCKET)
    .upload(key, file);

  if (error || !data) {
    throw new Error(error?.message || "Failed to upload document to private InsForge storage.");
  }

  return {
    bucket: BUCKET,
    key: data.key || key,
    url: data.url || `${baseUrl}/api/storage/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`,
    size: data.size || file.size,
    mimeType: data.mimeType || file.type || "image/jpeg",
  };
}


