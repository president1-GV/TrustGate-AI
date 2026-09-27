# TrustGate AI Billion — Threat Model

**Framework:** STRIDE + OWASP  
**Date:** September 2026  

---

## Assets

| Asset | Sensitivity | Location |
|---|---|---|
| Identity document images | CRITICAL — contains PII, biometric |InsForge Storage (private) |
| MRZ / passport data (OCR) | CRITICAL — PII | DB: `ocr_fields`, `mrz_results` |
| Face similarity scores | HIGH — biometric proxy | DB: `face_results` |
| Risk scores / findings | HIGH — enforcement-adjacent | DB: `risk_scores`, `findings` |
| Officer identities | HIGH | DB: `profiles`, `auth.users` |
| Audit logs | HIGH — tamper evidence | DB: `audit_logs` |
| InsForge ANON_KEY | HIGH — API access | `.env` (gitignored) |
| Admin credentials | CRITICAL | `.env.integration` (gitignored) |
| Case records | HIGH — PII + enforcement context | DB: `cases` |
| AI model metadata | MEDIUM | DB: `model_versions` |
| System configuration | MEDIUM | DB: `settings` |

---

## Trust Boundaries

```
[Browser / Officer Device]
         |
         | HTTPS (InsForge SDK — JWT Bearer)
         |
[InsForge API Gateway]
         |
    ┌────┴────┐
    │         │
[Auth]    [PostgREST]
              |
          [PostgreSQL + RLS]
              |
    ┌─────────┼──────────┐
    │         │          │
[cases]  [documents]  [audit_logs]
```

**Boundary 1:** Browser ↔ InsForge API — crossed by JWT-authenticated requests  
**Boundary 2:** InsForge API ↔ PostgreSQL — enforced by RLS on every table  
**Boundary 3:** Admin role ↔ Supervisor/Officer roles — enforced by `is_admin()` RPC  

---

## Actors

| Actor | Trust Level | Access |
|---|---|---|
| Unauthenticated user | ZERO | None (RLS blocks all) |
| Analyst | READ-ONLY | Read-only analytics, dashboard, and model metrics |
| Officer | LOW | Own/assigned cases only |
| Supervisor | MEDIUM | Team cases, clearance approval, risk override + analytics |
| Admin | HIGH | System-wide, user role management, security audit |
| Database trigger | SYSTEM | Executes as `SECURITY DEFINER` |
| InsForge platform | SYSTEM | Full DB access |
| CI/CD pipeline | MEDIUM | Read-only (no DB write in CI) |

---

## STRIDE Threat Analysis

### S — Spoofing

| Threat | Mitigation | Status |
|---|---|---|
| Attacker impersonates officer via stolen JWT | JWT verified server-side by InsForge; short expiry with refresh | ✅ |
| Attacker registers as admin | First-user-admin trigger; subsequent users get officer only; role changes require admin | ✅ |
| Attacker claims elevated role via client-side state | RLS uses `current_app_role()` RPC, not client-provided role values | ✅ |
| Demo account used to access real data | RLS scopes to `created_by`; demo cases have `is_demo=true` immutable flag | ✅ |

### T — Tampering

| Threat | Mitigation | Status |
|---|---|---|
| Officer modifies another officer's case | RLS `cases_update` checks `created_by` or `assigned_to` | ✅ |
| Client manipulates `risk_score` or `risk_level` | Values set server-side; DB `CHECK` constraints enforce ranges | ✅ |
| Client tampers with `is_demo` flag | `prevent_case_owner_change` trigger blocks `is_demo` change for non-admins | ✅ |
| Attacker modifies audit logs | `REVOKE UPDATE, DELETE ON audit_logs` from all app roles | ✅ |
| Attacker modifies `created_by` on case | `prevent_case_owner_change` trigger blocks it | ✅ |
| Malicious document causes XSS via OCR output | React JSX escapes HTML; no `dangerouslySetInnerHTML` detected | ✅ |

### R — Repudiation

| Threat | Mitigation | Status |
|---|---|---|
| Officer denies performing a case action | Immutable audit log with `actor_id`, `action`, timestamp | ✅ |
| Admin denies role change | `user_roles_admin_write` policy + audit log | ✅ |
| Officer denies override | Risk override logged to audit trail (implemented in security hardening) | ✅ |

### I — Information Disclosure

| Threat | Mitigation | Status |
|---|---|---|
| Unauthenticated access to case data | All tables require `authenticated` role; anon gets empty results | ✅ |
| IDOR — officer reads another officer's case | RLS `cases_select` enforces `created_by = auth.uid() OR assigned_to` | ✅ |
| IDOR — officer reads another officer's documents | Multi-level JOIN in `documents_select` verifies parent case ownership | ✅ |
| Backend URL exposed in JS bundle | Removed hardcoded fallback URL; URL comes from env vars at build time | ✅ |
| Credentials in source code | Integration test credentials moved to gitignored env file | ✅ |
| Face embeddings stored | `face_embeddings_metadata.stored = false`; INSERT blocked via RLS | ✅ |
| Stack traces in error messages | Only generic messages shown to users | ✅ |
| Live backend URL in compiled bundle | URL comes from `VITE_INSFORGE_URL` env var; excluded from source | ✅ |

### D — Denial of Service

| Threat | Mitigation | Status |
|---|---|---|
| Oversized file upload causes browser OOM | File size limit enforced (20 MB) before processing | ✅ |
| Decompression bomb via uploaded PDF | PDF magic-byte check; processing is client-side (no server execution) | ⚠️ Partial |
| Repeated screening submissions exhaust InsForge quota | Application-level rate limiting not implemented | 📋 Future |
| Very long search string causes client-side hang | Search input length limited to 256 chars | ✅ |

### E — Elevation of Privilege

| Threat | Mitigation | Status |
|---|---|---|
| Officer sets their own role to admin | `user_roles_admin_write` INSERT policy requires `is_admin()` | ✅ |
| Attacker manipulates JWT payload to claim admin role | JWT signature verified by InsForge; `current_app_role()` queries DB, not JWT claims | ✅ |
| Analyst accesses admin endpoints | Route guards + RLS enforce role hierarchy and `is_analyst()` read-only boundary | ✅ |
| Demo user escalates to admin via app | Role changes require admin; `is_demo` cases cannot grant permissions | ✅ |
| Mass assignment via API | InsForge SDK uses typed query builders; no direct JSON body deserialization | ✅ |

---

## Attack Surfaces

| Surface | Exposure | Controls |
|---|---|---|
| Login endpoint | Public | InsForge rate limiting; password complexity |
| Registration endpoint | Public | Email verification (recommended); first-user-admin trigger |
| File upload | Authenticated | MIME/size/magic-byte validation; private storage |
| Case creation | Authenticated | RLS `created_by = auth.uid()` |
| Admin endpoints | Admin role only | Route guard + RLS `is_admin()` |
| Audit log read | Supervisor+admin | RLS `security_select` policy |
| Report generation | Authenticated | RLS via case ownership |
| Password reset | Public (email required) | InsForge OTP method; redirect URL whitelist |

---

## Residual Risks

| Risk | Severity | Accepted / Mitigated |
|---|---|---|
| Application-level rate limiting | LOW | Accepted — handled by InsForge platform for auth; screening rate not a concern for Border Gateway demo |
| PDF decompression bomb protection | LOW | Accepted — browser sandbox limits damage; 20 MB file size cap |
| Email verification disabled | MEDIUM | Accepted for Border Gateway demo convenience; MUST enable for production |
| Open version ranges (`^`) on npm deps | LOW | Accepted for prototype; pin in production CI |
| First-user-admin race condition (concurrent signups) | LOW | Accepted — UPSERT-based trigger reduces window; not realistic in controlled deployment |

---

## OWASP Top 10 Mapping

| OWASP | Threat | Status |
|---|---|---|
| A01 Broken Access Control | IDOR, privilege escalation | ✅ RLS + RBAC |
| A02 Cryptographic Failures | Credential storage, token handling | ✅ InsForge Auth handles; anon key in env |
| A03 Injection | SQL injection | ✅ Parameterized SDK queries |
| A04 Insecure Design | Missing validation, weak policy | ✅ Fixed in hardening pass |
| A05 Security Misconfiguration | Weak passwords, no headers | ✅ Fixed |
| A06 Vulnerable Components | jsdom vulns (test-only) | ✅ Accepted |
| A07 Auth/Session Failures | Hardcoded creds | ✅ Fixed |
| A08 Integrity Failures | AI output validation | ✅ Added clamping |
| A09 Logging Failures | Incomplete audit events | ✅ Hardened |
| A10 SSRF | No server-side URL fetch | N/A |
