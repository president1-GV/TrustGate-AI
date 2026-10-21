# TRUSTGATE AI — OVERHAUL REPORT

**Date:** 2026-10-21  
**Status:** READY_FOR_REVIEW

---

## 1. Route & Architecture Inventory

### Public Routes

| Route | Component | Auth Required | Notes |
|-------|-----------|---------------|-------|
| `/` | LandingPage | No | Public landing page |
| `/login` | LoginPage | No (redirects if authed) | Email + password auth |
| `/register` | RegisterPage | No | New user registration |
| `/forgot-password` | ForgotPasswordPage | No | Password reset email |
| `/reset-password` | ResetPasswordPage | No | OTP password reset |
| `/authorization-gate` | AuthorizationGatePage | No | Pending approval state |

### Authenticated Routes (inside AppShell)

| Route | Component | Required Permission | Notes |
|-------|-----------|-------------------|-------|
| `/dashboard` | DashboardPage | Any authenticated | Main ops dashboard |
| `/screening` | ScreeningPage | `cases:create` | Full AI screening pipeline |
| `/border-gateway` | SihScreeningPage | `cases:create` | SIH-mode screening dashboard |
| `/cases` | CasesPage | `cases:view_assigned` | Case management list |
| `/cases/:id` | CaseDetailPage | `cases:view_assigned` | Case detail with evidence tabs |
| `/reports` | ReportsPage | `reports:access` | Report archive |
| `/analytics` | AnalyticsPage | `analytics:view` | KPI charts (Supervisor+) |
| `/audit` | AuditPage | `audit:view` | Immutable audit log viewer |
| `/models` | ModelsPage | `models:inspect` | AI model catalog |
| `/datasets` | DatasetsPage | `datasets:review` | Dataset catalog + benchmarks |
| `/security` | SecurityPage | `admin` role | Security posture (Admin only) |
| `/admin` | AdminPage | `admin` role | Admin panel |
| `/admin/users` | AdminUsersPage | `admin` role | User management |
| `/admin/authorizations` | AdminAuthorizationsPage | `admin` role | Pending member approvals |
| `/settings` | SettingsPage | Any authenticated | Profile, security, system |
| `/access-denied` | AccessDeniedPage | Any | RBAC block page |

### Fallback
- `*` → NotFoundPage

---

## 2. Findings Register

### P0 — Critical (Fixed)

**F-001: Misleading static demo metrics in landing page hero**
- Severity: P0
- Status: CONFIRMED / FIXED
- Description: Hero "SCREENING PIPELINE" card displayed hardcoded `98.4% conf`, `MATCH (94%)`, `0% anomaly`, `8/100 risk` with no disclaimer. These were specific fabricated results presented as live system output.
- Root cause: Static JSX strings in LandingPage hero right column.
- Fix: Removed specific percentages, added "Illustrative example" label, converted result labels to qualitative descriptors (PASS, NO ANOMALY, MATCH instead of specific numbers).
- Files: `src/pages/LandingPage.tsx`

**F-002: Misleading AutomatedPipelineModal engine names**
- Severity: P0
- Status: CONFIRMED / FIXED
- Description: Pipeline modal displayed "YOLOv8x-Seg (TensorRT FP16)", "CASIA Tampering ResNet Core", "FaceForensics++ Dual-Stream", "INTERPOL SLTD" in step descriptions. None of these specific components exist in the codebase — the actual engines are Tesseract, client-side ELA, and gradient-based biometrics.
- Root cause: Aspirational/demo engine names in hardcoded `stepsData` constant.
- Fix: Replaced with accurate descriptions of the actual implemented components (Tesseract, ELA Analyzer, ICAO 9303 Validator, Biometric Comparison Engine, Case Database Query, TrustFusion Risk Engine).
- Files: `src/components/screening/AutomatedPipelineModal.tsx`

**F-003: FaceForensicsCard certificate claims "Air-Gapped Autonomous Heuristic / Local Daemon"**
- Severity: P0
- Status: CONFIRMED / FIXED
- Description: Exported biometric certificate stated engine mode as "Air-Gapped Autonomous Heuristic / Local Daemon" which implies a dedicated running daemon process. The actual implementation is browser-based heuristic JS scoring.
- Root cause: Hardcoded string in `handleExportCertificate()` print window.
- Fix: Changed to "Client-Side Heuristic Analysis".
- Files: `src/components/screening/FaceForensicsCard.tsx`

**F-004: LandingPage claims "< 5s Avg Processing Time"**
- Severity: P0
- Status: CONFIRMED / FIXED
- Description: This metric was unverified. Client-side Tesseract OCR alone takes 5–30+ seconds depending on device hardware. The claim is factually unreliable.
- Root cause: Static stat card with invented benchmark.
- Fix: Replaced with "Local AI Inference / No external API dependencies required" which is accurate.
- Files: `src/pages/LandingPage.tsx`

**F-005: Tampering example uses "Probability: 88% / Confidence: 92%"**
- Severity: P0
- Status: CONFIRMED / FIXED
- Description: Example finding cards displayed specific fabricated probability values (88%, 92%) as if these were representative measurements.
- Root cause: Hardcoded demo strings in pipeline examples section.
- Fix: Removed specific percentages, replaced with "ELA anomaly detected" and "REVIEW REQUIRED" status.
- Files: `src/pages/LandingPage.tsx`

### P1 — High (Fixed)

**F-006: SecurityPage security scores are static, not dynamically computed**
- Severity: P1
- Status: CONFIRMED / FIXED
- Description: `VERIFIED_SECURITY_CHECKS` constant had pre-scored items (all 10/10 VERIFIED) displayed without any disclosure that these are architectural self-assessments, not runtime-computed security checks.
- Root cause: Static constant design with no disclosure.
- Fix: Added prominent amber warning banner: "Architectural Self-Assessment — these scores are not dynamically computed and have not been independently audited. An independent assessment is required before production deployment."
- Files: `src/pages/SecurityPage.tsx`

**F-007: Locally-scanned cases merged into case management without attribution or visual distinction**
- Severity: P1
- Status: CONFIRMED / FIXED
- Description: `listCasesForManagement()` and `listCasesForDashboard()` merged `getUserScannedSpecimens()` results (locally-scanned, not yet server-confirmed cases) into the official case list with hardcoded fake `badge_id: "TG-OFF-702"` and `processing_time_ms: 1250`, without distinguishing them from server-confirmed records.
- Root cause: Hardcoded values in db.ts merge logic.
- Fix: Changed badge ID to `"PENDING_SYNC"`, processing_time_ms to `null`, notes to "Local screening result — pending server sync." to be honest about the state. Also resolved authenticated user identity for attribution where possible.
- Files: `src/lib/db.ts`

**F-008: Misleading "SYSTEM STATUS: OPERATIONAL" pulsing indicator in footer**
- Severity: P1
- Status: CONFIRMED / FIXED
- Description: Footer showed a pulsing green "SYSTEM STATUS: OPERATIONAL" badge with no health check backing it. This claimed real-time availability without any monitoring.
- Root cause: Static badge in LandingPage footer.
- Fix: Replaced with a neutral "AI-ASSISTED SCREENING PLATFORM" label.
- Files: `src/pages/LandingPage.tsx`

### P2 — Medium (Fixed)

**F-009: Landing page navigation links didn't match spec**
- Severity: P2
- Status: FIXED
- Description: Nav links were (Live Demo, Features, How It Works, Architecture, Specifications, Governance). Spec requires (Product, Workflow, Architecture, Security & Governance).
- Fix: Renamed nav links. Removed 6th "Specifications" tab (consolidated into Architecture). Updated CTA buttons to "Open Screening Console".
- Files: `src/pages/LandingPage.tsx`

**F-010: Hero CTA buttons didn't match spec**
- Severity: P2
- Status: FIXED
- Description: CTAs were "Launch Live Screening / Watch Live Demo / How It Works". Spec requires "Open Screening Console / Explore the Verification Workflow".
- Fix: Updated button labels and removed the "Watch Live Demo" CTA from the hero (still accessible via nav).
- Files: `src/pages/LandingPage.tsx`

**F-011: Hero supporting copy was generic marketing**
- Severity: P2
- Status: FIXED
- Description: "AI-assisted border security screening that detects inconsistencies, manipulation, and identity anomalies — before they become security risks." — generic marketing copy without explaining the human-oversight requirement.
- Fix: Replaced with concrete description per spec: explains what AI does (analyzes fields, detects inconsistencies, synthesizes evidence), plus explicit human oversight statement.
- Files: `src/pages/LandingPage.tsx`

**F-012: Accessibility — missing skip-to-content links**
- Severity: P2
- Status: FIXED
- Description: Neither the landing page nor the AppShell had skip-to-content anchors for keyboard users.
- Fix: Added `sr-only focus:not-sr-only` skip links to both `LandingPage` and `AppShell`.
- Files: `src/pages/LandingPage.tsx`, `src/components/layout/AppShell.tsx`

**F-013: Accessibility — missing aria-label on sidebar and nav landmarks**
- Severity: P2
- Status: FIXED
- Description: The `<aside>` and `<nav>` elements in AppShell lacked descriptive aria-labels.
- Fix: Added `aria-label="Application navigation"` to aside, `aria-label="Main navigation"` to nav, `role="banner"` and `aria-label="Application header"` to header, `id="main-content"` and `role="main"` to main.
- Files: `src/components/layout/AppShell.tsx`

**F-014: Accessibility — missing aria-controls and aria-pressed on pipeline stage selector**
- Severity: P2
- Status: FIXED
- Description: Pipeline stage selector buttons in LandingPage had no accessible state attributes.
- Fix: Added `aria-pressed={isSelected}` and `aria-label` to each stage button.
- Files: `src/pages/LandingPage.tsx`

**F-015: NotFoundPage used `Frown` icon — not institution-appropriate**
- Severity: P2
- Status: FIXED
- Description: 404 page used a `Frown` emoji icon and navigated to "/" (landing page) even for authenticated users.
- Fix: Replaced with `SearchX` icon. Both 404 and 403 pages now navigate to `/dashboard` if authenticated, `/` if not. Added back links to assigned cases.
- Files: `src/pages/NotFoundPage.tsx`, `src/pages/AccessDeniedPage.tsx`

**F-016: Feature cards described "PaddleOCR" which is not the actual engine**
- Severity: P2
- Status: FIXED
- Description: Feature card for OCR said "PaddleOCR / Tesseract extracts...". PaddleOCR is not used — only Tesseract.js is a dependency.
- Root cause: Aspirational capability copy.
- Fix: Changed to "Tesseract.js extracts...".
- Files: `src/pages/LandingPage.tsx`

**F-017: Architecture section described as "Scalable from Prototype to Production"**
- Severity: P2
- Status: FIXED
- Description: This framing overstated production readiness. The system is a prototype with hardened security design but not independently audited for production.
- Fix: Changed heading to "Deployed Components" and added honest disclaimer about what the architecture represents (no external AI APIs, no government databases).
- Files: `src/pages/LandingPage.tsx`

**F-018: Specification badges said "ePassport / NFC (future)" not "not implemented"**
- Severity: P2
- Status: FIXED
- Description: "future" implies a committed roadmap.
- Fix: Changed to "(not implemented)".
- Files: `src/pages/LandingPage.tsx`

### P3 — Low / Informational

**F-019: Token clearing on DB query fallback silently downgrades auth state**
- Severity: P3
- Status: SUSPECTED — not changed (architectural design)
- Description: In `listCasesForManagement()` and `listCasesForDashboard()`, if the joined PostgREST query fails, the code clears `tg_access_token` and retries as anon. This could silently lose auth state on transient network errors.
- Root cause: Resilience pattern designed to degrade gracefully, but logs no user-visible warning.
- Status: Accepted as design trade-off. Would require a visible toast notification to flag auth state degradation. Flagged for future improvement.

**F-020: AUTHORITATIVE_CASES_SNAPSHOT used as zero-record fallback**
- Severity: P3
- Status: UNVERIFIED
- Description: When `all.length === 0` after DB query, `AUTHORITATIVE_CASES_SNAPSHOT` is used. This mixes a demo data snapshot with real operational data paths.
- Status: Not modified in this pass. Would need review of whether the snapshot contains real historical data or demo fixtures.

---

## 3. Security Findings

### Authorization
- **Server-side:** PostgreSQL Row-Level Security is the primary enforcement layer. Client-side RBAC (`requireRole`, `requirePermission` in security.ts) is defense-in-depth. This is architecturally correct.
- **Route protection:** `ProtectedRoute` component correctly redirects unauthenticated users to `/login`. Role-based nested `ProtectedRoute` correctly redirects to `/access-denied`.
- **Demo accounts:** Hardcoded demo email set in both `AuthProvider` and `ProtectedRoute` bypasses `status` check. This is intentional for demo mode and documented.

### Biometric Data Handling
- Face biometric feature vectors (Float32Array) are not persisted anywhere — only used in-memory during verification. The `portrait_crop_data_url` and `live_crop_data_url` fields in `FaceVerificationRecord` are optional and not written to the database.
- Document images are stored in a private InsForge storage bucket with authenticated access only.

### Upload Security
- `validateUploadedFile()` in security.ts implements: MIME whitelist, magic-byte verification, 20MB size cap, path-traversal protection, dangerous extension blocking. Solid implementation.

### Secrets
- `VITE_INSFORGE_URL` and `VITE_INSFORGE_ANON_KEY` are correctly public (anon key is designed to be public, per InsForge architecture).
- `INSFORGE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `BLOCKCHAIN_SIGNING_PRIVATE_KEY`, `JWT_SECRET` are documented as server-only.
- No secrets found in client-side source code.

### Unverified / Out-of-Scope
- Production RLS policy testing not performed (would require database access).
- Storage bucket access control not verified at the InsForge infrastructure level.
- Security headers in vercel.json not verified at runtime.

---

## 4. Files Changed

| File | Change Type | Summary |
|------|-------------|---------|
| `src/pages/LandingPage.tsx` | Significant refactor | Hero mockup disclaimer, stat cards, nav links, CTA labels, feature cards, example findings, architecture honesty, governance, footer |
| `src/components/screening/AutomatedPipelineModal.tsx` | Fix | Replaced misleading engine names with accurate descriptions |
| `src/components/screening/FaceForensicsCard.tsx` | Fix | Removed "Air-Gapped Autonomous Heuristic / Local Daemon" claim |
| `src/pages/SecurityPage.tsx` | Fix | Added architectural self-assessment disclaimer banner |
| `src/components/layout/AppShell.tsx` | Accessibility | aria-label, role attributes, skip-to-content link |
| `src/lib/db.ts` | Data integrity | Fixed hardcoded `TG-OFF-702` badge ID and `1250ms` processing time for locally-pending cases; improved attribution |
| `src/pages/AccessDeniedPage.tsx` | UX/a11y | Auth-aware navigation, aria-labelledby, role="main", SearchX icon |
| `src/pages/NotFoundPage.tsx` | UX/a11y | Auth-aware navigation, aria-labelledby, role="main", appropriate icon |

---

## 5. UI/UX Changes by Route

### `/` — Landing Page
- Nav: Renamed to (Live Demo, Product, Workflow, Architecture, Security & Governance)
- Hero: CTA buttons → "Open Screening Console" / "Explore the Verification Workflow"
- Hero: Supporting copy explicitly explains human oversight requirement
- Hero mockup: "Illustrative example" label added; specific fabricated percentages removed
- Stats: "< 5s" unverified claim removed, replaced with "Local AI Inference"
- Example findings: Specific fabricated percentages (88%, 92%, 93%) removed
- Features: "PaddleOCR" removed; "Tampering Analysis", "Face Comparison" described with appropriate caveats
- Architecture: Section renamed "Deployed Components" with honesty disclaimer
- Specifications: "(future)" → "(not implemented)" for unbuilt features
- Governance: Updated to focus on verifiable claims (provenance, data minimization, honest unavailability)
- Footer: Static "SYSTEM STATUS: OPERATIONAL" removed
- Accessibility: Skip-to-content link added; mobile menu aria-controls added; pipeline stage aria-pressed added

### AppShell (all authenticated pages)
- Sidebar: `aria-label="Application navigation"` added
- Nav: `aria-label="Main navigation"` added  
- Header: `role="banner"` and `aria-label` added
- Main content: `id="main-content"`, `role="main"` added
- Skip-to-content link added for keyboard navigation
- Logout button: `aria-label="Sign out of TrustGate AI"` added

### Security Center (`/security`)
- Added architectural self-assessment disclosure banner at top of controls tab

### 404 / 403 Pages
- Auth-aware navigation (dashboard vs. home)
- 404: `Frown` → `SearchX` icon
- Both: proper `role="main"`, `aria-labelledby`, `id` for headings

---

## 6. Test Status

Shell access was blocked by OS sandbox during this session. The following tests could not be executed:

- **Build:** BLOCKED — npm/npx not available in sandbox
- **TypeScript type-check:** BLOCKED
- **Lint:** BLOCKED
- **Unit tests (vitest):** BLOCKED
- **Integration tests:** BLOCKED

### Manual Code Review Verification

The following were verified by code inspection:

- ✅ No new TypeScript syntax errors introduced in modified files (verified by reading modified sections)
- ✅ All imports used in LandingPage.tsx (removed `Play` which was used only by the deleted Watch Demo button)
- ✅ `aria-controls="mobile-nav"` matched `id="mobile-nav"` added to mobile nav drawer
- ✅ `href="#landing-main"` matched `id="landing-main"` added to hero section
- ✅ `href="#main-content"` matched `id="main-content"` added to AppShell main
- ✅ `aria-labelledby="access-denied-title"` matched `id="access-denied-title"` on h1
- ✅ `aria-labelledby="not-found-title"` matched `id="not-found-title"` on h1
- ✅ db.ts changes preserved function signatures and return types

---

## 7. Face Verification Analysis

The `faceVerification.ts` implementation has been reviewed:

**Positive findings:**
- Explicit `NOT_VERIFIED` status when document image is absent
- Explicit `NOT_VERIFIED` status when live image is absent
- Stale run detection via `expectedRunId` vs `processingRunId` check
- Zero-fallback policy — missing inputs return null scores, not fabricated values
- SHA-256 hash binding of inputs to results
- Calibrated cosine similarity with documented thresholds (MATCH ≥75%, MISMATCH <60%)
- Clear `MISMATCH` / `INCONCLUSIVE` / `MATCH` state machine

**Concerns requiring attention (NOT fixed in this pass — no behavioral defect confirmed):**
- The biometric engine is a hand-crafted 128-D gradient descriptor (cell-based HOG-like feature). It is not a trained neural face recognition model. False-match or false-reject rates are unknown and have not been validated against a labeled dataset.
- The skin locus detection (ITU-R BT.601 YCbCr thresholds) is a proxy for face detection. It is not a trained face detector. Poor lighting, extreme angles, or non-skin-tone documents could cause missed detections.
- These limitations are partially documented in `limitations[]` in the result record but are not surfaced in the UI unless the officer inspects the raw result.

**Recommendation:** The face comparison stage should be labeled "Heuristic biometric comparison" or similar in the UI, making clear this is not a validated biometric model, and the limitation should be visible without inspecting raw JSON.

---

## 8. Evidence Provenance Assessment

**Correct behaviors found:**
- `performFaceVerification()` requires matching `processingRunId` to reject stale results
- `useRealtimeScreeningEvents` uses `seenEventIdsRef` deduplication
- `createDocumentProvenance()` binds SHA-256 hash to case/document/run IDs
- `saveScreeningCase()` persists the full pipeline result including provenance hashes

**Remaining concern (F-020):**
- `AUTHORITATIVE_CASES_SNAPSHOT` (in `databaseSnapshot.ts`) is used as a zero-result fallback. If this contains static demo data with real-looking case codes, it could mislead operators into thinking they are viewing real historical data when the database query returned nothing. This requires investigation beyond this pass.

---

## 9. Database & Migration Notes

No schema changes were made in this overhaul. All changes are application-layer only.

The `notes` field on locally-pending cases now contains "Local screening result — pending server sync." instead of "Live evaluated biometric document screening." This change is in-memory/local only and does not affect the database schema.

---

## 10. Accessibility Assessment

**Implemented:**
- Skip-to-content links on landing page and AppShell
- `role="main"`, `role="banner"`, `aria-label` on key structural elements
- `aria-pressed` on interactive toggle buttons (pipeline stage selector)
- `aria-expanded` and `aria-controls` on mobile menu button
- `aria-labelledby` + heading `id` on modal-like pages (404, 403)
- `aria-label` on logout button

**Not verified (require manual testing with assistive technology):**
- Color contrast ratios across all pages
- Screen reader announcement of form errors
- Focus trap in Dialog components
- Reduced-motion preference behavior with framer-motion animations
- Touch target sizing on mobile

WCAG 2.2 AA full compliance requires manual testing with assistive technologies and expert review. The above changes improve structural accessibility but do not constitute a complete accessibility audit.

---

## 11. Remaining Limitations

1. **Face biometric engine is heuristic, not validated** — see Section 7.
2. **`AUTHORITATIVE_CASES_SNAPSHOT` fallback** — could mix demo data with real operational UI.
3. **Token clearing on DB query failure** — silently degrades auth state without user notification.
4. **`< 5s` processing time claim removed but no verified benchmark exists** — actual processing time should be measured empirically.
5. **SecurityPage scores are static** — disclosure added but scores still require an independent audit to be meaningful.
6. **Blockchain anchoring** — `fetchBlockchainAnchor()` and `verifyCaseBlockchainIntegrity()` hooks exist in db.ts but their implementation in `src/lib/blockchain/` was not audited in this pass.
7. **Shell access blocked** — build, lint, and tests could not be executed. All changes are unverified by automated tooling.

---

## 12. Release Readiness

**Verdict: READY_FOR_REVIEW**

This overhaul has:
- Fixed all identified P0 misleading/false claims
- Fixed P1 hardcoded badge IDs and unverified processing times
- Improved P2 accessibility and navigation correctness
- Added self-assessment disclosure to SecurityPage
- Improved error page UX

Blockers before staging:
1. Build and type-check must pass (could not verify — sandbox blocked)
2. Face biometric engine should be labeled as heuristic in the screening UI
3. `AUTHORITATIVE_CASES_SNAPSHOT` fallback behavior should be reviewed
4. An independent security assessment is recommended before production deployment
