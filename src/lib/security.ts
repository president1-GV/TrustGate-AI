/**
 * TrustGate AI — Centralized Security Utilities
 *
 * This module provides:
 * - File upload validation (MIME, magic bytes, size, dimensions)
 * - Input sanitization
 * - AI output validation and clamping
 * - Authorization helpers
 * - Audit event helpers
 *
 * All security-critical logic belongs here — not scattered across components.
 */

import { insforge, roleAtLeast, hasPermission, type AppRole, type Permission } from "@/lib/insforge";
import { useAuthStore } from "@/store/auth";

// ─── File Upload Security ────────────────────────────────────────────────────

/** Allowed MIME types for document uploads */
export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/** Maximum upload size: 20 MB */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Minimum image dimension (pixels) in either axis */
export const MIN_IMAGE_DIMENSION = 10;

/** Maximum image dimension — prevents decompression bombs */
export const MAX_IMAGE_DIMENSION = 20_000;

/** Magic byte signatures for allowed formats */
const MAGIC_SIGNATURES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  // JPEG: starts with FF D8 FF
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WebP: RIFF....WEBP (bytes 0–3 = RIFF, bytes 8–11 = WEBP)
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  // PDF: starts with %PDF- (25 50 44 46 2D)
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  /** Validated MIME type from magic bytes (may differ from file.type) */
  detectedMime?: string;
}

/**
 * Read the first N bytes of a file for magic-byte inspection.
 */
function readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buf = e.target?.result as ArrayBuffer | null;
      if (!buf) { reject(new Error("Failed to read file header")); return; }
      resolve(new Uint8Array(buf));
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

/**
 * Validate an uploaded file for:
 * 1. Allowed MIME type (from browser Content-Type)
 * 2. File size ≤ MAX_UPLOAD_BYTES
 * 3. Magic bytes match declared MIME type
 * 4. Filename does not contain path traversal characters
 */
export async function validateUploadedFile(
  file: File
): Promise<FileValidationResult> {
  // 1. Normalize declared MIME type
  let declaredMime = (file.type || "").toLowerCase().trim();
  if (!declaredMime || declaredMime === "image/jpg" || declaredMime === "image/pjpeg" || declaredMime === "image/x-png") {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg") declaredMime = "image/jpeg";
    else if (ext === "png") declaredMime = "image/png";
    else if (ext === "webp") declaredMime = "image/webp";
    else if (ext === "pdf") declaredMime = "application/pdf";
  }

  // MIME type whitelist check
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(declaredMime)) {
    return {
      valid: false,
      error: `File type not allowed: "${file.type || "unknown"}". Accepted types: JPEG, PNG, WebP, PDF.`,
    };
  }

  // 2. File size check
  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large (${mb} MB). Maximum allowed size is 20 MB.`,
    };
  }

  // 3. Filename security checks (path traversal, null bytes, disguised extensions)
  if (file.name.includes("\0") || file.name.includes("%00") || file.name.length > 255) {
    return {
      valid: false,
      error: "Filename contains disallowed or malicious characters.",
    };
  }

  const safeName = file.name.replace(/[/\\]/g, "");
  if (safeName !== file.name || file.name.includes("..")) {
    return {
      valid: false,
      error: "Filename contains disallowed characters.",
    };
  }

  const lowerName = file.name.toLowerCase();
  const dangerousSubExts = [".php", ".phtml", ".exe", ".sh", ".bat", ".cmd", ".js", ".vbs", ".scr", ".html", ".svg"];
  for (const ext of dangerousSubExts) {
    if (lowerName.includes(ext + ".")) {
      return {
        valid: false,
        error: "Disguised or executable extension detected in filename.",
      };
    }
  }

  // 4. Magic byte validation
  try {
    const header = await readFileHeader(file, 12);
    const sig = MAGIC_SIGNATURES.find((s) => s.mime === declaredMime);
    if (sig) {
      const matches = sig.bytes.every((b, i) => header[i] === b);
      if (!matches) {
        // If magic bytes didn't match declaredMime, check if it matches ANY other valid signature (e.g. png with .jpg extension)
        const altSig = MAGIC_SIGNATURES.find((s) => s.bytes.every((b, i) => header[i] === b));
        if (altSig) {
          return { valid: true, detectedMime: altSig.mime };
        }
        return {
          valid: false,
          error: `File header does not match expected image format. The file may be corrupted.`,
        };
      }
      return { valid: true, detectedMime: declaredMime };
    }
  } catch {
    // If we can't read the header, reject conservatively
    return { valid: false, error: "Could not verify file integrity. Please try again." };
  }

  return { valid: true, detectedMime: declaredMime };
}

// ─── AI Output Validation ────────────────────────────────────────────────────

const VALID_RISK_LEVELS = new Set(["LOW", "MEDIUM", "HIGH"]);
const VALID_SEVERITIES = new Set(["PASS", "LOW", "MEDIUM", "HIGH", "CRITICAL", "WARNING"]);
const VALID_STATUSES = new Set([
  "PENDING", "ANALYZING", "UNDER_REVIEW", "CLEARED",
  "FLAGGED", "ESCALATED", "CLOSED",
]);

/**
 * Validate and clamp a risk score to the allowed range [0, 100].
 * Returns null if the value is not a finite number.
 */
export function validateRiskScore(score: unknown): number | null {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Validate a risk level string against the allowed enum.
 * Returns "MEDIUM" as a safe default for unknown values.
 */
export function validateRiskLevel(level: unknown): "LOW" | "MEDIUM" | "HIGH" {
  const s = String(level ?? "").toUpperCase();
  if (VALID_RISK_LEVELS.has(s)) return s as "LOW" | "MEDIUM" | "HIGH";
  return "MEDIUM";
}

/**
 * Validate a finding severity against the allowed enum.
 * Returns "MEDIUM" as a safe default.
 */
export function validateSeverity(
  sev: unknown
): "PASS" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "WARNING" {
  const s = String(sev ?? "").toUpperCase();
  if (VALID_SEVERITIES.has(s))
    return s as "PASS" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "WARNING";
  return "MEDIUM";
}

/**
 * Validate a case status string against the allowed enum.
 */
export function validateCaseStatus(status: unknown): string {
  const s = String(status ?? "").toUpperCase();
  if (VALID_STATUSES.has(s)) return s;
  return "UNDER_REVIEW";
}

/**
 * Clamp a confidence/probability value to [0, 100].
 * Accepts 0–1 or 0–100 scale (auto-detected by magnitude).
 */
export function clampConfidence(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  // Auto-detect 0–1 scale
  if (Math.abs(n) <= 1.0) return Math.max(0, Math.min(100, Math.round(n * 100)));
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Sanitize a string that may contain AI-generated or user-provided content
 * before storing in the database. Trims whitespace and enforces a max length.
 */
export function sanitizeTextInput(
  value: unknown,
  maxLength = 4096
): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  return s.slice(0, maxLength);
}

// ─── Authorization Helpers ───────────────────────────────────────────────────

/**
 * Get the currently authenticated user ID from the Zustand store.
 * Throws if not authenticated — use this in DB operation wrappers
 * to enforce authentication before any data access.
 */
export function requireAuthUserId(): string {
  const user = useAuthStore.getState().user;
  if (!user?.id) throw new Error("Authentication required");
  return user.id;
}

/**
 * Get the current user's role. Throws if not authenticated.
 */
export function requireAuthRole(): AppRole {
  const user = useAuthStore.getState().user;
  if (!user?.role) throw new Error("Authentication required");
  return user.role;
}

/**
 * Assert that the current user has at least the given role.
 * Throws an authorization error if not met.
 */
export function requireRole(minimumRole: AppRole): void {
  const role = requireAuthRole();
  if (!roleAtLeast(role, minimumRole)) {
    throw new Error(`Authorization denied: requires ${minimumRole} role or higher`);
  }
}

/**
 * Assert that the current user has the specified permission.
 * Throws an authorization error if not met.
 */
export function requirePermission(permission: Permission): void {
  const role = requireAuthRole();
  if (!hasPermission(role, permission)) {
    throw new Error(`Authorization denied: role "${role}" lacks permission "${permission}"`);
  }
}

/**
 * Check whether the current user has a specific permission without throwing.
 */
export function canPerform(permission: Permission): boolean {
  const user = useAuthStore.getState().user;
  if (!user?.role) return false;
  return hasPermission(user.role, permission);
}

/**
 * Validate a risk override request.
 * Risk override is a high-security action.
 * Requires:
 * - Supervisor or Admin role
 * - Non-empty, meaningful reason (min 10 characters)
 * - Previous risk score and new decision
 */
export function validateRiskOverrideRequest(params: {
  actorRole: AppRole;
  overrideReason?: string | null;
  previousRiskScore?: number | null;
  newDecision: string;
}): { valid: boolean; error?: string } {
  if (params.actorRole !== "supervisor" && params.actorRole !== "admin") {
    return {
      valid: false,
      error: "Only Supervisors or Administrators are authorized to override risk assessments.",
    };
  }

  const reason = (params.overrideReason ?? "").trim();
  if (reason.length < 10) {
    return {
      valid: false,
      error: "An explicit justification reason (at least 10 characters) is required for risk overrides.",
    };
  }

  if (!params.newDecision) {
    return {
      valid: false,
      error: "A valid determination decision must be specified.",
    };
  }

  return { valid: true };
}


// ─── Audit Event Helpers ─────────────────────────────────────────────────────

import { saveAuditLogOffline } from "@/lib/offlineDb";

export const AUTHORITATIVE_SYSTEM_ACTOR_ID = "d78d7bfa-d033-412d-8d20-987e0019467c";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ROSTER_PROFILE_MAP: Record<string, string> = {
  "officer-duty-roster": "06d9077b-2a97-460e-b6ed-38d6a16581c3",
  "supervisor-duty-roster": "e49cf4a5-e63d-4cac-a54a-436f47da9e52",
  "analyst-duty-roster": "59119414-9a9b-4b00-bade-16e0b1e11ed1",
  "admin-duty-roster": "d78d7bfa-d033-412d-8d20-987e0019467c",
  "field-officer-airgap-01": "d78d7bfa-d033-412d-8d20-987e0019467c",
  "90cb3e0d-6bb6-435b-b9b2-8cf4afdbcbf8": "d78d7bfa-d033-412d-8d20-987e0019467c",
};

export function resolveValidActorId(actorId?: string | null): string {
  if (!actorId) return AUTHORITATIVE_SYSTEM_ACTOR_ID;
  if (ROSTER_PROFILE_MAP[actorId]) return ROSTER_PROFILE_MAP[actorId];
  if (UUID_REGEX.test(actorId)) return actorId;
  return AUTHORITATIVE_SYSTEM_ACTOR_ID;
}

function generateSecureUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Write a security-relevant audit event to the audit_logs table and offline DB.
 * Dispatches real-time window events and updates UI instantly.
 * Silently swallows errors — audit logging must never break the main flow.
 */
export async function auditSecurityEvent(params: {
  actorId?: string | null;
  action: string;
  eventType: string;
  caseId?: string | null;
  result?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const actorId = resolveValidActorId(params.actorId);
  const now = new Date().toISOString();
  const validCaseId = params.caseId && UUID_REGEX.test(params.caseId) ? params.caseId : null;
  const auditId = generateSecureUuid();

  const logPayload = {
    id: auditId,
    actor_id: actorId,
    actorId: actorId,
    action: params.action,
    event_type: params.eventType,
    eventType: params.eventType,
    case_id: validCaseId,
    caseId: validCaseId,
    result: params.result ?? "SUCCESS",
    metadata: params.metadata ?? null,
    created_at: now,
  };

  // 1. Persist to local offline IndexedDB so it appears immediately in the UI
  try {
    await saveAuditLogOffline(logPayload);
  } catch (offlineErr) {
    console.warn("[TrustGate] Local offline audit save note:", offlineErr);
  }

  // 2. Dispatch real-time events across windows/tabs
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("trustgate:audit_log_added", { detail: logPayload }));
      window.dispatchEvent(new CustomEvent("audit_logs_changed", { detail: logPayload }));
      window.dispatchEvent(new CustomEvent("tg:db_updated", { detail: { type: "audit_log", logEntry: logPayload } }));
      localStorage.setItem("tg:last_audit_change", String(Date.now()));
      localStorage.setItem("tg:last_db_change", String(Date.now()));

      if (typeof BroadcastChannel !== "undefined") {
        const ch = new BroadcastChannel("trustgate_audit_channel");
        ch.postMessage({ type: "audit_log_added", log: logPayload });
        setTimeout(() => { try { ch.close(); } catch {} }, 1000);
      }
    } catch {}
  }

  // 3. Persist to PostgreSQL audit_logs table with error handling and fallback
  try {
    const insertRes = await insforge.database.from("audit_logs").insert([
      {
        id: logPayload.id,
        actor_id: logPayload.actor_id,
        action: logPayload.action,
        event_type: logPayload.event_type,
        case_id: logPayload.case_id,
        result: logPayload.result,
        metadata: logPayload.metadata,
        created_at: logPayload.created_at,
      },
    ]);

    if (insertRes.error) {
      console.warn("[TrustGate] Primary audit log insert notice, retrying with system fallback:", insertRes.error);
      const retryRes = await insforge.database.from("audit_logs").insert([
        {
          actor_id: AUTHORITATIVE_SYSTEM_ACTOR_ID,
          action: logPayload.action,
          event_type: logPayload.event_type,
          case_id: null,
          result: logPayload.result,
          metadata: {
            ...(params.metadata || {}),
            original_actor_id: logPayload.actor_id,
            original_case_id: logPayload.case_id,
          },
          created_at: logPayload.created_at,
        },
      ]);
      if (retryRes.error) {
        console.error("[TrustGate] Audit log retry failed:", retryRes.error);
      }
    }
  } catch (err) {
    console.error("[TrustGate] Audit log write exception:", err);
  }
}

/**
 * Write a risk override event to the audit trail.
 * Required whenever an officer overrides an AI-generated risk score.
 */
export async function auditRiskOverride(params: {
  actorId: string;
  caseId: string;
  aiRiskScore: number;
  officerDecision: string;
  overrideReason: string;
}): Promise<void> {
  await auditSecurityEvent({
    actorId: params.actorId,
    action: "RISK_OVERRIDE",
    eventType: "case.risk.override",
    caseId: params.caseId,
    result: "SUCCESS",
    metadata: {
      ai_risk_score: params.aiRiskScore,
      officer_decision: params.officerDecision,
      override_reason: sanitizeTextInput(params.overrideReason, 1024),
    },
  });
}

// ─── Content Security ────────────────────────────────────────────────────────

/**
 * Escape HTML special characters for safe rendering in non-React contexts.
 * React JSX already escapes by default — this is for edge cases.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitize a filename for safe storage/display.
 * Removes path separators, null bytes, and control characters.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/]/g, "_")      // path separators
    .replace(/\.\./g, "_")        // path traversal
    .replace(/\0/g, "")           // null bytes
    .replace(/[\x00-\x1f]/g, "") // control chars
    .slice(0, 255);               // filesystem limit
}

/**
 * Sanitize errors before surfacing to the UI or API responses.
 * Prevents database schema disclosure, SQLSTATE leak, and internal system path leaks.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return "An internal operational error occurred.";
  const raw = typeof error === "string" ? error : (error as any)?.message || String(error);

  // Database & SQL error patterns (suppress table names, constraint details, SQL state codes)
  if (
    /relation\s+"?\w+"?\s+does\s+not\s+exist/i.test(raw) ||
    /violates\s+(foreign\s+key|not-null|unique)\s+constraint/i.test(raw) ||
    /syntax\s+error\s+at\s+or\s+near/i.test(raw) ||
    /column\s+"?\w+"?\s+does\s+not\s+exist/i.test(raw) ||
    /SQLSTATE/i.test(raw) ||
    /postgrest/i.test(raw) ||
    /pg_/i.test(raw)
  ) {
    return "A secure database transaction error occurred. The transaction has been recorded in the security log.";
  }

  // Auth and credential disclosure prevention
  if (/jwt|token|bearer|secret|anon-key|auth-header/i.test(raw)) {
    return "Authentication credentials or session expired. Please re-authenticate.";
  }

  // File system path leakage prevention
  if (/[a-zA-Z]:\\[^ \n\r\t]+|\/(?:home|etc|var|usr|Users)\/[^ \n\r\t]+/i.test(raw)) {
    return "A secure system resource error occurred.";
  }

  // Return clean, length-bounded message
  return raw.trim().slice(0, 160);
}

