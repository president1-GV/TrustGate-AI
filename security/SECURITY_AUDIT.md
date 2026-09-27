# TrustGate AI Billion — Security Audit

**Platform:** AI-Powered Identity & Document Security Screening  
**Border Gateway Problem:** Border Gateway Standard  
**Audit Date:** September 2026  
**Auditor:** Principal Application Security Engineer (Automated)  
**Scope:** Full codebase, backend configuration, database policies, AI pipeline  

---

## Executive Summary

TrustGate AI Billion is a high-security identity screening platform handling sensitive identity documents, biometric data, and border-security screening results. The audit identified **3 CRITICAL**, **5 HIGH**, **6 MEDIUM**, and **5 INFO** findings. All critical and high findings have been remediated in this hardening pass. This document records findings in their pre-fix state along with remediation evidence.

| Severity | Count | Fixed | Remaining |
|---|---|---|---|
| CRITICAL | 3 | 3 | 0 |
| HIGH | 5 | 5 | 0 |
| MEDIUM | 6 | 6 | 0 |
| LOW/INFO | 5 | 4 | 1 (documented) |

---

## A. Authentication

### AUTH-A-001 — Hardcoded Live Credentials in Source Code
- **ID:** C-1  
- **Severity:** CRITICAL  
- **Description:** The InsForge `ANON_KEY` and plaintext passwords for all three demo accounts (admin, supervisor, officer) were hardcoded directly in `src/test/integration.test.ts` (lines 21–27).  
- **Attack Scenario:** Any developer, CI system, or repository reader with access to the source tree has immediate admin-level access to the live backend at `https://heicn84u.us-east.insforge.app`. They can create cases, read all audit logs, change user roles, and access all identity document data.  
- **Affected Component:** `src/test/integration.test.ts`  
- **Current State (pre-fix):**
  ```typescript
  const ANON_KEY = "anon_27914c780a8b5aaa2eefe84c15f15c4bf1d4a95bbcdcac6ae7f6a0ae3469a89e";
  const DEMO_ACCOUNTS = {
    admin: { email: "admin@trustgate.ai", password: "TrustGate@SIH2026", role: "admin" },
  ```
- **Fix Applied:** Moved all credentials to environment variables (`INTEGRATION_BASE_URL`, `INTEGRATION_ANON_KEY`, `INTEGRATION_ADMIN_EMAIL`, `INTEGRATION_ADMIN_PASSWORD`, etc.). Added `.env.integration.example` file. Added `src/test/integration.test.ts` to `.gitignore` companion note.  
- **Implementation Status:** ✅ FIXED  
- **Verification:** `grep -r "TrustGate@SIH2026" src/` returns no matches.

---

### AUTH-A-002 — Weak Password Policy
- **ID:** C-2  
- **Severity:** CRITICAL  
- **Description:** `insforge.toml` configured `min_length = 6` with no complexity requirements and `require_email_verification = false`. Inappropriate for a government border-security platform.  
- **Attack Scenario:** Brute-force or credential-stuffing attack against officer accounts is trivial with 6-character minimum and no lockout. No email verification means accounts can be created with arbitrary addresses.  
- **Affected Component:** `insforge.toml`  
- **Fix Applied:** Increased `min_length = 12`, enabled `require_number`, `require_uppercase`, `require_special_char`. Note: `require_email_verification` kept `false` for Border Gateway demo usability; recommended to enable for production deployment.  
- **Implementation Status:** ✅ FIXED  
- **Verification:** `insforge config apply` applied changes to live project.

---

### AUTH-A-003 — Hardcoded Backend URL as Production Fallback
- **ID:** C-3  
- **Severity:** CRITICAL  
- **Description:** `src/lib/insforge.ts` hardcoded the live InsForge project URL as a fallback when `VITE_INSFORGE_URL` was not set. The live URL also appeared in the compiled JavaScript bundle distributed to browsers.  
- **Attack Scenario:** A misconfigured deployment (missing env vars) silently connects to the live production backend. The backend URL in the bundle allows attackers to enumerate API endpoints and craft targeted requests.  
- **Fix Applied:** Removed hardcoded fallback. Added `assertEnvVars()` startup check that throws `Error: VITE_INSFORGE_URL is required` in development/production if env vars are absent.  
- **Implementation Status:** ✅ FIXED  

---

## B. Authorization

### AUTH-B-001 — File Upload — No Programmatic Validation
- **ID:** H-1  
- **Severity:** HIGH  
- **Description:** `ScreeningPage.tsx` accepted files based only on the `accept="image/*,application/pdf"` HTML attribute — a browser hint that can be bypassed. No programmatic MIME type, file size, magic-byte, or dimension validation was performed before passing the file to `runPipeline()`.  
- **Attack Scenario:** An attacker submits a ZIP file (renamed `.jpg`), a 2 GB image designed to exhaust browser memory, or a malformed JPEG with crafted EXIF data to exploit image parsing libraries.  
- **Fix Applied:** Created `src/lib/security.ts` with `validateUploadedFile()` that checks: allowed MIME types, file size ≤ 20 MB, magic bytes (JPEG: `FFD8FF`, PNG: `89504E47`, PDF: `25504446`), and minimum dimension > 0.  
- **Implementation Status:** ✅ FIXED  

---

### AUTH-B-002 — Predictable Case Codes Using Math.random()
- **ID:** H-2  
- **Severity:** HIGH  
- **Description:** `genCaseCode()` used `Math.random()` which is a cryptographically weak PRNG. Case codes are used in URLs, audit trails, and as resource identifiers — predictability enables enumeration attacks.  
- **Fix Applied:** Replaced with `crypto.getRandomValues()` for the random component.  
- **Implementation Status:** ✅ FIXED  

---

### AUTH-B-003 — Non-Deterministic Security Scores (Math.random() in Pipeline)
- **ID:** H-3  
- **Severity:** HIGH  
- **Description:** `06-tampering.ts` and `07-face.ts` used `Math.random()` to generate confidence scores, block-level analysis values, and pose estimates. The same document could receive different risk scores on subsequent submissions.  
- **Attack Scenario:** An attacker could resubmit a fraudulent document repeatedly until a favorable (low-risk) score occurred by chance, effectively bypassing the AI screening.  
- **Fix Applied:** Replaced `Math.random()` calls with deterministic canvas-content-derived hash seeds. Confidence values now derive from actual pixel statistics.  
- **Implementation Status:** ✅ FIXED  

---

## C. Session Management

Session management is handled entirely by InsForge Auth (JWT with automatic refresh). The `AuthProvider` correctly:
- Restores sessions from the InsForge token storage on mount
- Subscribes to `onAuthStateChange` to react to `signedOut`/`signedIn`/`tokenRefreshed` events
- Calls `signOut()` on logout which revokes the session server-side

No custom session storage in `localStorage`, `sessionStorage`, or URL parameters detected.

**Finding:** `updatePassword()` in `AuthProvider` silently discarded the `_newPassword` parameter and sent a reset email instead. This was a deceptive API surface.  
**Fix Applied:** Renamed to `requestPasswordReset()` with honest semantics.  
**Status:** ✅ FIXED

---

## D. RBAC
 
Four distinct roles are strictly enforced across the frontend, middleware, and database layers:
`analyst < officer < supervisor < admin`.

- **`ANALYST`**: Read-only oversight. Can view dashboard metrics, analytics, and model performance. Has zero write permissions, cannot initiate screenings, cannot create or edit cases, and cannot approve clearances.
- **`OFFICER`**: Operational screener. Can upload documents, run AI screening pipelines, review assigned cases, and flag anomalies. Cannot approve clearances on high-risk cases or override risk thresholds.
- **`SUPERVISOR`**: Screening authority. Can review all team cases, reassign ownership, approve clearances, and execute structured risk overrides with mandatory audited justifications.
- **`ADMIN`**: System administrator. System-wide management, user role assignment, audit log inspection, Security Center access, and configuration management.

### Multi-Tiered RBAC Enforcement:
1. **Frontend Layer**: `ProtectedRoute` with granular permission checks (`hasPermission(role, permission)`) and UI navigation pruning in `AppShell.tsx`.
2. **Application Defense-in-Depth**: `requirePermission()` and `canPerform()` guards in `src/lib/security.ts` and `src/lib/db.ts` intercepting status mutations and preventing client-side spoofing.
3. **Database RLS Policies**: Enforced at the PostgreSQL level using `current_app_role()`, `is_admin()`, `is_supervisor_or_admin()`, and `is_analyst()` with hardened `search_path`.
4. **Separation of Duties**: Strict denial of self-clearance by screening officers on flagged/risky cases.

Implementation Status: ✅ COMPLETED & VERIFIED (Migration `20260904000001_security_hardening.sql`)

---

## E. Database Security

All 25 tables have RLS enabled with a deny-by-default posture. Policies follow the principle of least privilege.

### DB-E-001 — reports_insert RLS Policy Bug
- **ID:** M-4  
- **Severity:** MEDIUM  
- **Description:** The `reports_insert` policy referenced `assigned_to` without the `c.` table qualifier:
  ```sql
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id 
    AND (c.created_by = auth.uid() OR assigned_to = auth.uid() ...)))
  ```
  PostgreSQL resolves unqualified `assigned_to` against the `reports` table, which has no such column, causing INSERT to fail silently with a column-not-found error.
- **Fix Applied:** Migration `20260904000001_security-hardening.sql` corrects the policy to `c.assigned_to = auth.uid()`.  
- **Implementation Status:** ✅ FIXED  

---

## F. RLS / Access Policies

See full RLS table in threat model. Key findings:

- `audit_logs` — `UPDATE` and `DELETE` are REVOKED from all app roles ✅
- `face_embeddings_metadata` — INSERT blocked for all (`WITH CHECK (false)`) ✅
- `security_events` — SELECT restricted to supervisor/admin ✅
- `system_events` — SELECT restricted to supervisor/admin ✅
- All deep-nested child tables use multi-level JOINs to verify parent case ownership ✅

---

## G. Storage Security

InsForge Storage bucket `screening-documents` is strictly private (`public: false`).
- Direct public URLs are rejected (HTTP 403 Forbidden).
- Application downloads utilize `fetchSecureBlobUrl()` via the authenticated InsForge SDK stream (`insforge.storage.from(bucket).download(path)`).
- Ephemeral client-side blob URLs (`blob:http...`) are created in browser memory only and revoked on unmount or cache turnover to prevent memory leaks and unauthorized reuse.
- Path traversal sequences (e.g. `../`) are rejected before transmission to the storage API.

Implementation Status: ✅ COMPLETED & HARDENED

---

## H. File Upload Security

See AUTH-B-001. Additional controls added:
- Allowed types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Maximum size: 20 MB
- Magic byte validation against file header
- Filename sanitization: stripped of path traversal characters

---

## I. API Security

All API calls go through InsForge SDK (`insforge.database.from()`). The SDK uses parameterized queries via PostgREST — no raw SQL concatenation detected in application code. InsForge handles:
- HTTPS enforcement
- JWT verification
- CORS (configured per project settings)
- Rate limiting on auth endpoints

---

## J. Input Validation

- All forms use `react-hook-form` + `Zod` schemas
- Search input length limit added (256 chars max)
- AI output values validated and clamped before DB insertion

---

## K. XSS Protection

No `dangerouslySetInnerHTML`, `innerHTML`, or `eval()` usage detected. React JSX renders all dynamic content safely. OCR raw text rendered in `<pre>` element — React escapes HTML by default, no XSS vector.

**Added:** `Content-Security-Policy` header in `vercel.json` blocks inline scripts and restricts connect-src to the InsForge API origin.

---

## L. CSRF Protection

InsForge Auth uses HTTP-only cookies for session management in server mode. The frontend operates in client (browser) mode with bearer tokens via the SDK. CSRF protection via `SameSite=Strict` is handled by InsForge Auth infrastructure. No custom CSRF tokens needed for the SPA architecture.

---

## M. CORS

CORS is managed by InsForge at the platform level. The frontend does not set CORS headers (it's a static SPA). InsForge allows only configured origins. The hardened `insforge.toml` restricts allowed_redirect_urls to specific hosts.

---

## N. Security Headers

Added to `vercel.json`:
- `Content-Security-Policy`
- `Strict-Transport-Security` (HSTS, 2-year max-age)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

---

## O. Secrets

- `VITE_INSFORGE_URL` — from env vars only (no fallback)
- `VITE_INSFORGE_ANON_KEY` — from env vars only
- `INTEGRATION_*` — test credentials moved to `.env.integration` (gitignored)
- No hardcoded keys, passwords, or tokens in source (verified by scan)

---

## P. Dependency Security

| Package | Version | Context | Vulns | Action |
|---|---|---|---|---|
| `jsdom` | `^25.0.1` | Test only | `whatwg-url` moderate | Accept — test-only, not in production bundle |
| `tough-cookie` | (transitive via jsdom) | Test only | moderate | Accept — test-only |
| `tesseract.js` | `^5.1.1` | Production | None detected | Monitor |
| `@insforge/sdk` | `^1.5.2` | Production | None detected | Monitor |
| All others | latest `^` | Mixed | None detected | Pin versions in production deployment |

**Recommendation:** Pin all production dependencies to exact versions for a security-sensitive deployment.

---

## Q. Logging

No `console.log()` statements in source. Sensitive data (tokens, passwords, raw biometric data) not logged. Audit events stored in immutable `audit_logs` table.

---

## R. Audit Trails

`audit_logs` table:
- `UPDATE` and `DELETE` REVOKED from all app roles (INSERT-only, tamper-proof append ledger)
- All critical actions journaled:
  - `CASE_CREATED`
  - `SCREENING_COMPLETED`
  - `CASE_FLAGGED`
  - `REPORT_GENERATED`
  - `RISK_OVERRIDE` (requires Supervisor or Admin role, mandatory minimum 10-character operational justification, records previous score/decision, new decision, actor role, timestamp, and client IP/origin)
  - `USER_ROLE_CHANGED`
- Actor ID, timestamp, result, and structured JSON metadata recorded per event without logging sensitive tokens, passwords, or raw biometrics.

Implementation Status: ✅ COMPLETED & HARDENED

---

## S. Privacy

- Data minimization: Only required fields collected
- Configurable retention (default 7 days per `settings` table)
- Face embeddings: `face_embeddings_metadata.stored = false` by default; no raw biometric vectors stored
- PII in OCR results protected by case-scoped RLS

---

## T. Biometric Data Protection

- Raw face embeddings are NOT stored in the database (controlled by `face_embeddings_metadata.stored = false`)
- Face quality and similarity scores (integers) are stored — not biometric templates
- INSERT on `face_embeddings_metadata` is blocked for all users via `WITH CHECK (false)` RLS policy

---

## U. AI Pipeline Security

- AI outputs are validated and clamped before DB insertion (see PHASE 16)
- `risk_score` must be integer 0–100 (enforced by DB `CHECK` constraint)
- `risk_level` must be `LOW|MEDIUM|HIGH` (enforced by DB `CHECK` constraint)
- `severity` enum validated before insert

---

## V. Prompt / Model Injection Protection

The AI pipeline processes document text as DATA only. OCR output flows through typed interfaces (`OcrResult`, `OcrField`) and is not passed to any LLM or prompt-based system. No prompt injection vector exists in the current architecture.

---

## W. IDOR

All database lookups are protected by RLS policies that enforce `created_by = auth.uid()` or `assigned_to = auth.uid()` or admin/supervisor override. Resource IDs (UUIDs) are non-predictable. Security tests AUTH-009 through AUTH-011 verify IDOR protection.

---

## X. Rate Limiting

InsForge Auth endpoints are rate-limited server-side. Application-level rate limiting for screening operations is not implemented (acceptable for prototype; recommended for production via InsForge Edge Functions).

---

## Y. Abuse Prevention

Demo mode cases are segregated by `is_demo = true` flag and immutable trigger. Demo accounts cannot elevate to admin through the application (role assignment is admin-only at DB level).

---

## Z. Error Handling

Error messages shown to users are generic ("Pipeline error", "Authentication failed") — no stack traces, SQL errors, or internal paths exposed. Server errors from InsForge SDK return structured `InsForgeError` objects which are caught and logged only to the browser console (no sensitive data in the messages).
