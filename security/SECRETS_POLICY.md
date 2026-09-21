# TrustGate AI Billion — Secrets Management & Governance Policy

**Document Classification:** RESTRICTED — SECURITY GOVERNANCE  
**Version:** 1.0  
**Effective Date:** September 2026  
**Audience:** Platform Engineers, Security Administrators, DevOps  

---

## 1. Scope & Objective

This policy defines the lifecycle, storage, rotation, and auditing requirements for all secrets and sensitive configuration values across TrustGate AI Billion. Given the critical nature of identity document screening, strict governance is enforced to prevent credential leakage, privilege abuse, and unauthorized infrastructure access.

---

## 2. Secrets Taxonomy & Classifications

| Classification | Identifier | Permitted Location | Rotation Frequency | Access Restriction |
|---|---|---|---|---|
| **Public Client Key** | `VITE_INSFORGE_ANON_KEY` | `.env.local` / Client Bundle | 90 days or upon compromise | Public (governed by DB RLS) |
| **Backend API URL** | `VITE_INSFORGE_URL` | Environment Variable | Architecture change | Public |
| **Database Service Role** | `INSFORGE_SERVICE_ROLE_KEY` | Backend Server / CI Secret | 60 days | Root / Infrastructure only (NEVER in frontend) |
| **Integration Test Credentials** | `INTEGRATION_ADMIN_*` | `.env.integration` (Gitignored) | On demand / Automated ephemeral | Automated test runners only |
| **OpenRouter / AI API Keys** | `OPENROUTER_API_KEY` | InsForge Secrets Vault | 60 days | Serverless functions / Edge only |

---

## 3. Strict Rules & Controls

### 3.1 Zero Secrets in Source Code (Deny-by-Default)
- Under no circumstances shall passwords, private keys, service role tokens, or live credentials be committed to any version control branch.
- Any commit containing string matches for demo credentials or private tokens is automatically rejected by pre-commit hooks and CI security checks (`npm run security:check`).

### 3.2 Public Anon Key vs. Service Role Key
- The `VITE_INSFORGE_ANON_KEY` is a client-facing authorization identifier intended for browser consumption. It possesses **zero intrinsic privileges** without a valid user session.
- Database access via the anon key is strictly constrained by PostgreSQL Row Level Security (RLS). An attacker possessing only the anon key cannot read or write data from any table where RLS denies access.
- The `SERVICE_ROLE_KEY` bypasses RLS and is **forbidden** from client-side bundles, frontend code, or browser-accessible assets.

### 3.3 Ephemeral Integration Credentials
- Testing against live backend environments must rely on `.env.integration`, which is permanently added to `.gitignore`.
- Integration test credentials should utilize dedicated, short-lived accounts that can be purged or rotated immediately following test execution.

---

## 4. Automated Secret Scanning Pipeline

TrustGate AI Billion implements automated scanning executed during local builds, pre-commit checks, and CI validation:

1. **Rule Set**: Scans all tracked files (`src/`, `scripts/`, `migrations/`) for:
   - Private key blocks (`-----BEGIN PRIVATE KEY-----`)
   - AWS / S3 access keys (`AKIA[0-9A-Z]{16}`)
   - GitHub / GitLab personal access tokens (`ghp_`, `glpat_`)
   - High-entropy raw credentials or passwords (`password\s*=\s*['"][^'"]+['"]`)
   - Hardcoded integration passwords
2. **Failure Action**: The security check script (`scripts/security-check.cjs`) immediately halts compilation with exit code 1 if a high-entropy secret pattern is detected.

---

## 5. Secret Rotation Procedures

### 5.1 Routine Rotation
1. **Anon Key Rotation**:
   - Provision a new anonymous key in the InsForge dashboard / CLI.
   - Update production environment secrets in the hosting provider (e.g. Vercel, Docker environment).
   - Re-deploy the frontend build to propagate the new client key.
   - De-authorize the previous anon key after confirming client traffic migration.
2. **Admin & Service Passwords**:
   - Rotate all administrative passwords every 90 days.
   - Enforce password complexity (minimum 12 characters, uppercase, lowercase, numeric, and special characters).

### 5.2 Emergency Compromise Procedure
In the event of suspected or confirmed credential exposure:
1. **Immediate Revocation**: Invalidate the compromised token or password via InsForge management CLI within 15 minutes.
2. **Active Session Invalidation**: Trigger global session termination for affected accounts or user tiers.
3. **Audit Log Forensics**: Query `audit_logs` for all actions taken using the exposed actor identifier or IP address.
4. **Post-Mortem**: Document root cause, affected scope, and remediation timeline in `/security/INCIDENT_RESPONSE.md`.
