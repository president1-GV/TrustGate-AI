# TRUSTGATE AI — SECURITY POLICY & RESPONSIBLE DISCLOSURE

## 1. Overview & Security Principles

TRUSTGATE AI is engineered for mission-critical document authenticity verification and forensic screening. The platform adheres to defense-in-depth principles across all architectural tiers:

- **Zero-Trust Access Control**: All requests require authenticated sessions verified server-side; client claims are never trusted implicitly.
- **Server-Side Authorization & IDOR Protection**: Data access is partitioned and verified against authenticated user identity, role, and case ownership.
- **Cryptographic Evidence Integrity**: Every screening pipeline produces deterministic SHA-256 document manifests anchored to cryptographic tamper-evident audit trails.
- **Strict Data Isolation**: Authentic production inputs (live camera captures and authorized document uploads) are strictly decoupled from academic benchmarks and offline model training corpora.
- **Credential Hygiene**: Production secrets, private keys, database passwords, and service-role tokens are managed externally and never exposed in client bundles or public code.

---

## 2. Vulnerability Reporting & Responsible Disclosure

We appreciate coordinated, responsible disclosure of security vulnerabilities from the security research community.

### Reporting Process
- If you discover a vulnerability or potential security flaw, please report it via private security advisory on GitHub or email:
  **security@trustgate.ai**
- Please **do not** open public GitHub issues or discussions detailing unresolved vulnerabilities.
- Provide a clear, actionable description of the issue including:
  1. Description of the vulnerability and attack vector
  2. Proof-of-concept steps or minimal reproduction
  3. Potential impact assessment
  4. Suggested remediation if available

### Response Timeline
- **Initial Acknowledgement**: Within 48 hours of report receipt.
- **Assessment & Triage**: Within 5 business days.
- **Fix Delivery & Coordinated Release**: Prioritized by severity (Critical / High / Medium / Low).

---

## 3. Scope & Supported Versions

Security updates and patches are actively maintained for the current production release branch:

| Version | Supported | Security Maintenance |
| :--- | :---: | :--- |
| `1.x (main)` | ✅ Yes | Active vulnerability monitoring & patch releases |
| `< 1.0` | ❌ No | Deprecated prototype iterations |

---

## 4. Secret & Credential Handling

- **No Secrets in Source**: The codebase undergoes automated scanning for API keys, private keys, JWT secrets, passwords, and tokens.
- **Client Bundle Isolation**: Browser code receives only public anonymous keys (`VITE_INSFORGE_ANON_KEY`); all privileged operations are mediated through authenticated backend endpoints or PostgREST Row-Level Security (RLS).
- **Environment Isolation**: Runtime configuration is injected exclusively via environment variables (`.env.local` / deployment secrets manager). Template schemas are maintained in `.env.example`.

---

## 5. Dependency & Supply Chain Security

- All third-party dependencies are pinned in `package-lock.json` and audited using `npm audit` and static analysis pipelines.
- Security-critical dependencies (Tailwind LTS, InsForge SDK, cryptographic utilities) are restricted to tested, compatible versions.
- Continuous build verification validates type safety (`tsc -b`), lint integrity, and unit/integration test suites prior to deployment.

---

## 6. Authentication & Authorization Architecture

- **Session Management**: JWT-backed sessions with secure token storage and automated expiry.
- **Role-Based Access Control (RBAC)**: Clear delineation between Officer, Supervisor, Analyst, and Administrator tiers.
- **Row-Level Security (RLS)**: Enforced directly at the PostgreSQL layer, preventing horizontal privilege escalation (IDOR) and cross-case leakage.
- **Input Validation**: Server-side magic-byte inspection, MIME verification, strict file size limits (20MB maximum), and schema validation for all inference requests.
