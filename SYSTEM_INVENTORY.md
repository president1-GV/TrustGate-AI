# TRUSTGATE AI BILLION — COMPREHENSIVE SYSTEM INVENTORY
**Document Reference**: `SYSTEM_INVENTORY.md`  
**Classification**: High-Assurance Border Screening System Inventory  
**Inspection Date**: 2026-09-05T23:20:00Z  

---

## 1. Page & Screen Inventory

The application provides 23 distinct page surfaces organized by security zone:

| Index | Page Component | File Path | Route Path | Access Clearance |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `LandingPage` | `src/pages/LandingPage.tsx` | `/` | Public (Unauthenticated) |
| 2 | `LoginPage` | `src/pages/auth/LoginPage.tsx` | `/login` | Public (Redirect if Auth) |
| 3 | `RegisterPage` | `src/pages/auth/RegisterPage.tsx` | `/register` | Public (Redirect if Auth) |
| 4 | `ForgotPasswordPage` | `src/pages/auth/ForgotPasswordPage.tsx` | `/forgot-password` | Public (Redirect if Auth) |
| 5 | `ResetPasswordPage` | `src/pages/auth/ResetPasswordPage.tsx` | `/reset-password` | Public (Redirect if Auth) |
| 6 | `AuthorizationGatePage` | `src/pages/auth/AuthorizationGatePage.tsx` | `/authorization-gate` | Authenticated (Status = pending) |
| 7 | `DashboardPage` | `src/pages/DashboardPage.tsx` | `/dashboard` | Authenticated (Active Officer) |
| 8 | `ScreeningPage` | `src/pages/ScreeningPage.tsx` | `/screening` | Permission: `cases:create` |
| 9 | `SihScreeningPage` | `src/pages/SihScreeningPage.tsx` | `/sih-screening` | Permission: `cases:create` |
| 10 | `CasesPage` | `src/pages/CasesPage.tsx` | `/cases` | Permission: `cases:view_assigned` |
| 11 | `CaseDetailPage` | `src/pages/CaseDetailPage.tsx` | `/cases/:id` | Permission: `cases:view_assigned` |
| 12 | `ReportsPage` | `src/pages/ReportsPage.tsx` | `/reports` | Permission: `reports:access` |
| 13 | `AnalyticsPage` | `src/pages/AnalyticsPage.tsx` | `/analytics` | Permission: `analytics:view` |
| 14 | `AuditPage` | `src/pages/AuditPage.tsx` | `/audit` | Permission: `audit:view` |
| 15 | `ModelsPage` | `src/pages/ModelsPage.tsx` | `/models` | Permission: `models:inspect` |
| 16 | `DatasetsPage` | `src/pages/DatasetsPage.tsx` | `/datasets` | Permission: `datasets:review` |
| 17 | `SettingsPage` | `src/pages/SettingsPage.tsx` | `/settings` | Authenticated |
| 18 | `SecurityPage` | `src/pages/SecurityPage.tsx` | `/security` | Role: `admin` |
| 19 | `AdminPage` | `src/pages/admin/AdminPage.tsx` | `/admin` | Role: `admin` |
| 20 | `AdminUsersPage` | `src/pages/admin/AdminUsersPage.tsx` | `/admin/users` | Role: `admin` |
| 21 | `AdminAuthorizationsPage` | `src/pages/admin/AdminAuthorizationsPage.tsx` | `/admin/authorizations` | Role: `admin` |
| 22 | `AccessDeniedPage` | `src/pages/AccessDeniedPage.tsx` | `/access-denied` | Public Fallback |
| 23 | `NotFoundPage` | `src/pages/NotFoundPage.tsx` | `*` | Public 404 Fallback |

---

## 2. Route & Navigation Architecture

```
Routes Tree:
├── / (LandingPage)
├── /authorization-gate (AuthorizationGatePage)
├── /access-denied (AccessDeniedPage)
├── (UnauthLayout)
│   ├── /login (LoginPage)
│   ├── /register (RegisterPage)
│   ├── /forgot-password (ForgotPasswordPage)
│   └── /reset-password (ResetPasswordPage)
└── (ProtectedRoute) -> AppShell
    ├── /dashboard (DashboardPage)
    ├── /screening [permission: cases:create] (ScreeningPage)
    ├── /sih-screening [permission: cases:create] (SihScreeningPage)
    ├── /cases [permission: cases:view_assigned] (CasesPage)
    ├── /cases/:id [permission: cases:view_assigned] (CaseDetailPage)
    ├── /reports [permission: reports:access] (ReportsPage)
    ├── /settings (SettingsPage)
    ├── /analytics [permission: analytics:view] (AnalyticsPage)
    ├── /audit [permission: audit:view] (AuditPage)
    ├── /models [permission: models:inspect] (ModelsPage)
    ├── /datasets [permission: datasets:review] (DatasetsPage)
    ├── /security [role: admin] (SecurityPage)
    ├── /admin [role: admin] (AdminPage)
    ├── /admin/users [role: admin] (AdminUsersPage)
    └── /admin/authorizations [role: admin] (AdminAuthorizationsPage)
└── * (NotFoundPage)
```

---

## 3. State Stores & Context Architecture

1. **`ScreeningContext` (`src/providers/ScreeningContext.tsx`)**:
   - **Scope**: Entire application.
   - **Execution Modes**: `PRODUCTION` (strict real document mode), `DEMO` (synthetic Border Gateway benchmark scenarios), `TRAINING`, `EVALUATION`.
   - **State Fields**: `mode`, `caseId`, `documentId`, `processingRunId`, `documentHash`, `captureId`, `captureSource`, `documentImage`, `documentMimeType`, `documentTimestamp`, `pipelineStatus`, `stageResults`, `pipelineResult`, `databaseResult`, `midvResult`, `faceForensicsResult`, `compositeRisk`, `aiConfidence`, `finalDecision`, `auditEvents`.
   - **Concurrency Safety**: `activeRunIdRef` token check ensures stale asynchronous promises cannot overwrite current document state.

2. **`AuthProvider` & `useAuthStore` (`src/providers/AuthProvider.tsx`)**:
   - **Scope**: Global authentication & user profile.
   - **State Fields**: `user`, `isAuthenticated`, `loading`, `error`.
   - **Methods**: `login()`, `register()`, `logout()`, `refreshProfile()`.

3. **`ThemeProvider` (`src/providers/ThemeProvider.tsx`)**:
   - **Scope**: Visual presentation (dark border control room theme vs light mode).

4. **`QueryClient` (`src/main.tsx`)**:
   - **Configuration**: `staleTime: 30_000`, `refetchOnWindowFocus: false`, `retry: 1`.
   - **Caches**: PostgREST queries for cases, documents, reports, and system settings.

---

## 4. Backend Endpoints (InsForge PostgREST & Python FastAPI)

### A. InsForge PostgREST Tables & Operations
Base URL: `https://heicn84u.us-east.insforge.app/rest/v1/`

| Table | Permitted Operations | Primary Key | Key Constraints / Foreign Keys |
| :--- | :--- | :--- | :--- |
| `cases` | SELECT, INSERT, UPDATE | `id` (UUID) | `created_by -> auth.users.id`, `assigned_to -> auth.users.id` |
| `documents` | SELECT, INSERT, UPDATE | `id` (UUID) | `case_id -> cases.id`, `idx_documents_document_hash` |
| `document_images`| SELECT, INSERT | `id` (UUID) | `document_id -> documents.id` |
| `ocr_results` | SELECT, INSERT | `id` (UUID) | `document_id -> documents.id` |
| `ocr_fields` | SELECT, INSERT | `id` (UUID) | `ocr_result_id -> ocr_results.id` |
| `mrz_results` | SELECT, INSERT | `id` (UUID) | `document_id -> documents.id` |
| `tampering_results` | SELECT, INSERT | `id` (UUID) | `document_id -> documents.id` |
| `tampering_regions` | SELECT, INSERT | `id` (UUID) | `tampering_result_id -> tampering_results.id` |
| `face_results` | SELECT, INSERT | `id` (UUID) | `document_id -> documents.id` |
| `face_embeddings_metadata` | SELECT | `id` (UUID) | `face_result_id -> face_results.id` |
| `risk_scores` | SELECT, INSERT | `id` (UUID) | `case_id -> cases.id` |
| `risk_factors` | SELECT, INSERT | `id` (UUID) | `risk_score_id -> risk_scores.id` |
| `validation_results`| SELECT, INSERT | `id` (UUID) | `case_id -> cases.id` |
| `findings` | SELECT, INSERT | `id` (UUID) | `case_id -> cases.id` |
| `reports` | SELECT, INSERT | `id` (UUID) | `case_id -> cases.id` |
| `audit_logs` | SELECT, INSERT | `id` (UUID) | `actor_id -> auth.users.id` |
| `profiles` | SELECT, INSERT, UPDATE | `id` (UUID) | `id -> auth.users.id` |
| `roles` | SELECT | `name` (text) | Unique constraint |
| `user_roles` | SELECT, INSERT, UPDATE, DELETE | `id` (UUID) | `user_id -> auth.users.id`, `role -> roles.name` |
| `member_access_requests` | SELECT, INSERT, UPDATE, DELETE | `id` (UUID) | Unique email |
| `model_versions` | SELECT, UPDATE | `id` (UUID) | Unique version name |
| `model_metrics` | SELECT | `id` (UUID) | `model_id -> model_versions.id` |
| `notifications` | SELECT, INSERT, UPDATE | `id` (UUID) | `user_id -> auth.users.id` |
| `settings` | SELECT, INSERT, UPDATE | `id` (UUID) | Key-value unique key |
| `security_events`| SELECT, INSERT | `id` (UUID) | `actor_id -> auth.users.id` |
| `system_events` | SELECT | `id` (UUID) | Standalone timestamped events |

### B. Python Forensic Engine REST API (FastAPI / Server)
Base URL: `http://localhost:8000`

| Endpoint | Method | Functionality | Auth / Security Gate |
| :--- | :--- | :--- | :--- |
| `/`, `/health` | GET | Health check & dataset metadata | Public / Rate Limited |
| `/dataset/archetypes` | GET | MIDV-2020 document archetypes catalog | Public / Rate Limited |
| `/dataset/samples` | GET | Benchmark evaluation sample specs | Public / Rate Limited |
| `/dataset/authentic-samples` | GET | Catalog of authentic specimens | Public / Rate Limited |
| `/dataset/authentic-sample` | GET | Single authentic archetype specimen | Query parameter validated |
| `/faceforensics/metadata` | GET | FaceForensics++ benchmark metadata | Public / Rate Limited |
| `/faceforensics/samples` | GET | Benchmark face dataset samples | Public / Rate Limited |
| `/faceforensics/benchmark` | GET/POST | Runs FaceForensics test benchmark | Rate Limited (120 req/min) |
| `/verify` | POST | Deep MIDV optical archetype verification | Payload validated, 25MB limit |
| `/faceforensics/verify` | POST | Biometric facial spoof / deepfake evaluation | Payload validated, 25MB limit |
| `/realtime/test-case` | POST | Realtime case forensic verification | Payload validated |
| `/model/train` | POST | Executes FusionNet neural training | Restricted / Local only |
| `/model/predict` | POST | Neural risk classification | Payload validated |
| `/model/status` | GET | Returns trained model checkpoint metadata | Public / Rate Limited |

---

## 5. Storage Buckets

| Bucket Name | Privacy Level | Upload Method | Retrieval Method |
| :--- | :--- | :--- | :--- |
| `screening-documents` | Private | `insforge.storage.from("screening-documents").upload()` | Authenticated Blob download via SDK |

---

## 6. Component Hierarchy

```
src/
├── components/
│   ├── camera/
│   │   ├── CameraCapture.tsx (Hardware sensor frame acquisition)
│   │   ├── CameraOverlay.tsx (Document alignment frame HUD)
│   │   ├── CameraPermissionState.tsx (Permission prompt & denied handler)
│   │   ├── CameraPreview.tsx (Video element stream projection)
│   │   ├── CameraQualityIndicator.tsx (Laplacian blur & lighting meter)
│   │   ├── CaptureStatus.tsx (Capturing / Frozen state banner)
│   │   └── useCameraStream.ts (WebRTC MediaStream lifecycle hook)
│   ├── common/
│   │   └── SecurityErrorBoundary.tsx (High-security fallback boundary)
│   ├── layout/
│   │   ├── AppShell.tsx (Main application navigation sidebar & header)
│   │   ├── Guard.tsx (RBAC component wrapper)
│   │   ├── NotificationBell.tsx (Live system notification alerts)
│   │   └── SystemConnectivityBar.tsx (PostgREST + Python + Storage connectivity status)
│   ├── screening/
│   │   ├── DocumentViewer.tsx (Cryptographic SHA-256 bound document canvas)
│   │   ├── FaceForensicsCard.tsx (Facial deepfake / biometric analysis card)
│   │   ├── LiveCameraModal.tsx (Modal camera viewfinder)
│   │   ├── MidvArchetypeInspector.tsx (Reference archetype specification catalog)
│   │   ├── MidvAuditCard.tsx (Forensic audit report card)
│   │   └── SihScreeningDashboard.tsx (Unified Hub & Screens 1-7 Border Gateway)
│   └── ui/ (Shadcn / Tailwind Primitive Components: button, card, dialog, badge, tabs, etc.)
```
