# TRUSTGATE AI BILLION

> **See Beyond the Document.**
>
> AI-assisted identity and document security screening for border operations.
> Built as an enterprise-grade identity and document security gateway.

---

## Overview

TrustGate AI is a production-grade prototype of an AI-powered document screening and identity verification platform designed for authorized border-security personnel. It assists officers in detecting suspicious, forged, tampered, expired, or inconsistent identity and travel documents through a 9-stage AI pipeline with explainable risk scoring.

**The system is always human-in-the-loop. The AI assists officers — it never makes final legal or enforcement decisions.**

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 6, TypeScript 5 |
| **Styling** | Tailwind CSS, shadcn/ui primitives |
| **State** | Zustand (auth), TanStack Query (server state) |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Animation** | Framer Motion (subtle only) |
| **Backend** | InsForge (Postgres, Auth, Storage, RLS) |
| **Database** | InsForge Postgres — 25 tables, full RLS |
| **Auth** | InsForge Auth — JWT, RBAC (Officer / Supervisor / Admin) |
| **AI Pipeline** | Tesseract.js OCR, ELA tampering detection, rule-based validation, explainable risk engine |
| **Deployment** | Vercel Free Tier (frontend), InsForge (backend) |
| **Tests** | Vitest + React Testing Library |

---

## Architecture

```
Browser (React + Vite)
    │
    ├── Auth (InsForge Auth — JWT, RBAC)
    ├── Database (InsForge Postgres — 25 tables, RLS)
    ├── Storage (InsForge Storage — private buckets)
    └── AI Pipeline (local browser execution)
            ├── 01 Image Quality
            ├── 02 Document Detection
            ├── 03 OCR (Tesseract.js)
            ├── 04 MRZ Analysis
            ├── 05 Cross-Field Validation
            ├── 06 Tampering Detection (ELA)
            ├── 07 Face Analysis
            ├── 08 Identity Consistency
            └── 09 Explainable Risk Scoring
```

### RBAC Roles

| Role | Permissions |
|---|---|
| **Officer** | Create screenings, upload documents, run analysis, view own cases, add notes, make decisions |
| **Supervisor** | Everything Officer can + view team cases, review flagged cases, escalate, view analytics, view audit log |
| **Admin** | Everything Supervisor can + user management, system config, model registry, admin panel |

Authorization is enforced at **both** the frontend (route guards) and **database layer** (Row-Level Security policies on all 25 tables).

---

## InsForge Setup

This project uses [InsForge](https://insforge.dev) as its backend platform.

### 1. Create a Project

```bash
npm install -g insforge
insforge login
insforge create my-trustgate-project
```

### 2. Run the Migration

```bash
insforge db push --file migrations/20260903013505_trustgate-core-schema.sql
```

This creates all 25 tables with RLS, RBAC helper functions, triggers (auto-create profile on signup, assign first user as admin), and seed data (roles, model_versions, settings).

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
# Fill in VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY from your InsForge dashboard
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_INSFORGE_URL` | InsForge project API base URL | ✅ |
| `VITE_INSFORGE_ANON_KEY` | InsForge anonymous (public) key | ✅ |
| `VITE_APP_URL` | App URL (for auth redirect callbacks) | ✅ |

**Never commit `.env` or `.env.local`.** The `.gitignore` already excludes them.

---

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- An InsForge project (see above)

### Steps

```bash
# 1. Clone and install
git clone <repo>
cd "TrustGate AI Billion"
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your InsForge credentials

# 3. Start development server
npm run dev
# App runs at http://localhost:5173
```

### First Run

1. Open `http://localhost:5173`
2. Click **Get Started** or go to `/register`
3. Create the first account — it is **automatically assigned the Admin role** by the database trigger
4. Subsequent accounts are assigned the **Officer** role by default

---

## Demo Mode

TrustGate AI includes a built-in **Border Gateway Demo Mode** on the Screening page with 7 pre-configured synthetic test cases:

| Sample | Risk | Scenario |
|---|---|---|
| Genuine Document | LOW | All checks pass — clean passport |
| Photo Replacement | MEDIUM | Tampering in portrait region (88% probability) |
| Modified Date of Birth | HIGH | DOB digit alteration + MRZ/OCR mismatch |
| MRZ Document-Number Mismatch | HIGH | Check digit fails, single digit discrepancy |
| Expired Document | MEDIUM | Document expired 12+ months ago |
| Face Mismatch | MEDIUM | Face similarity 42% below threshold |
| High-Risk Composite | HIGH | Expired + MRZ invalid + tampering + face mismatch |

All demo data is clearly labeled **"DEMO DATA — NOT A REAL IDENTITY DOCUMENT"** and synthetic names/numbers are used throughout (`JOHN MICHAEL DOE`, `A12345678`, etc.).

---

## AI Pipeline

The 9-stage pipeline runs **entirely in the browser** — no paid AI APIs required.

```
Upload / Demo Sample
        │
01  Image Quality   → blur, brightness, contrast, noise, glare (score 0–100)
02  Doc Detection   → passport / visa / id / permit / unknown
03  OCR             → Tesseract.js — extracts 8+ named fields with bounding boxes
04  MRZ Analysis    → TD1/TD2/TD3 parsing, check-digit verification
05  Validation      → 7 rule checks: required fields, dates, expiry, OCR/MRZ match
06  Tampering       → ELA-based — photo replacement, digit alteration, text overwrite
07  Face Analysis   → quality, similarity, pose, blur
08  Identity        → cross-field consistency score (0–100)
09  Risk Scoring    → explainable 0–100 score — LOW / MEDIUM / HIGH
        │
Explainable Findings → expandable per-finding with location, evidence, model, recommendation
        │
Officer Review → Clear / Flag / Escalate / Secondary Verification
        │
Case Saved → InsForge DB (25 tables)
        │
Report + Audit Log
```

### AI Architecture (Provider Abstraction)

All AI modules are designed behind provider interfaces so models can be swapped:

- `LocalOCRProvider` → Tesseract.js (current)
- `LocalTamperingProvider` → ELA analysis (current)
- `LocalFaceProvider` → canvas-based (current)
- `ProductionProvider` → pluggable (Python/OpenCV/PaddleOCR/PyTorch — future)

---

## Database

25 tables in the `public` schema, all with Row-Level Security enabled.

| Table | Purpose |
|---|---|
| `roles` | Seeded: officer / supervisor / admin |
| `profiles` | User profile data mirroring auth.users |
| `user_roles` | M:M role assignments |
| `cases` | Core screening case record |
| `documents` | Document metadata per case |
| `document_images` | Original / corrected / crop / heatmap variants |
| `ocr_results` | OCR provider output per document |
| `ocr_fields` | Individual extracted fields with bounding boxes |
| `mrz_results` | MRZ parse result per document |
| `validation_results` | Rule-based validation issues per case |
| `tampering_results` | ELA tampering probability + severity |
| `tampering_regions` | Region-level tampering detail |
| `face_results` | Face detection, quality, similarity |
| `face_embeddings_metadata` | Embedding metadata (no vectors stored by default) |
| `risk_scores` | Aggregated risk score per case |
| `risk_factors` | Per-factor risk breakdown |
| `findings` | Summarized findings list per case |
| `reports` | Generated report payloads |
| `audit_logs` | Immutable event trail (INSERT-only via RLS) |
| `security_events` | Security-specific events |
| `model_versions` | AI model catalog with metrics |
| `model_metrics` | Time-series metrics per model |
| `system_events` | System-level events |
| `notifications` | Per-user notifications |
| `settings` | Global key/value configuration |

**Key security controls:**
- `audit_logs`: UPDATE and DELETE are revoked from all app roles — INSERT only
- `cases`: `created_by` and `is_demo` are immutable after creation (trigger-enforced for non-admins)
- All tables use `auth.uid()` and custom RBAC RPCs in RLS policies

---

## Security

| Control | Implementation |
|---|---|
| Authentication | InsForge Auth — JWT, auto-refresh, session persistence |
| Authorization | RBAC at route level + RLS at database level |
| Audit trail | INSERT-only `audit_logs` table — all critical actions journaled |
| Input validation | Zod schemas + React Hook Form on all forms |
| File validation | MIME type + extension + size checks before processing |
| SQL injection | Parameterized queries via InsForge SDK (no raw SQL in app) |
| Secrets | All keys in `.env.local` — never bundled in JS |
| PII minimization | Configurable retention, no permanent biometric storage by default |
| HTTPS | All API communication over TLS |

---

## Testing

```bash
# Run tests (single pass)
npm run test

# Watch mode
npm run test:watch
```

Tests use **Vitest** + **React Testing Library** with the InsForge SDK fully mocked in `src/test/setup.ts`.

---

## Dataset Strategy

| Phase | Dataset | Purpose | Status |
|---|---|---|---|
| Phase 1 | MIDV-500 | Baseline OCR & document layout | Complete |
| Phase 2 | MIDV-2020 | Cross-document generalization | In Progress |
| Phase 3 | Synthetic Fraud Data | Tampering detection training | Planned |

**No trained models are deployed in this prototype.** All AI modules are rule-based or use general-purpose local libraries. Model metrics are displayed as "NOT YET BENCHMARKED" — no fabricated accuracy numbers.

---

## Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

The `vercel.json` already includes SPA rewrite rules for client-side routing.

### Backend

The backend runs on InsForge — no separate server to deploy. Push schema changes via:

```bash
insforge db push --file migrations/<migration>.sql
```

---

## Future Integrations

The architecture supports future authorized government integrations, clearly labeled in the UI as **FUTURE AUTHORIZED INTEGRATION**:

- Passport Verification Service (MEA API)
- Visa Verification API
- Lost & Stolen Document Database (Interpol SLTD)
- Authorized Watchlist Check
- Immigration Database (FRRO / Bureau of Immigration)
- ePassport / NFC chip validation (ICAO LDS)
- Digital Signature Validation (CSCA certificate chain)

These interfaces are **architecturally defined** but **not connected** — no fabricated government connectivity.

---

## Enterprise Screening Standard Alignment

**Specification:** AI-Based Fake Identity & Document Screening System

| Requirement | TrustGate AI |
|---|---|
| Detect suspicious/forged documents | ✅ 9-stage AI pipeline |
| MRZ validation | ✅ Check-digit + composite validation |
| Photo tampering detection | ✅ ELA-based tampering with heatmap |
| Face similarity | ✅ Per-document face analysis |
| Explainable AI | ✅ Per-finding evidence + model attribution |
| Human-in-the-loop | ✅ Officer review required — no autonomous decisions |
| Audit trail | ✅ INSERT-only immutable audit_logs |
| RBAC security | ✅ Officer / Supervisor / Admin + RLS |
| Open-source / free-first | ✅ Zero paid APIs required |
| Production-grade architecture | ✅ InsForge backend, 25-table schema, Vercel frontend |

---

## Project Structure

```
src/
├── ai/
│   ├── demo/          # Demo samples and orchestrator
│   ├── pipeline/      # 9-stage pipeline modules (01–09) + orchestrator
│   └── types.ts       # All AI type definitions
├── components/
│   ├── layout/        # AppShell, Guard, NotificationBell
│   ├── screening/     # DocumentViewer
│   └── ui/            # 14 shared UI primitives
├── lib/
│   ├── db.ts          # All InsForge database helpers
│   ├── insforge.ts    # InsForge SDK client + auth helpers
│   └── utils.ts       # cn, risk/status colors, date formatters
├── pages/
│   ├── auth/          # Login, Register, ForgotPassword, ResetPassword
│   ├── admin/         # AdminPage, AdminUsersPage
│   ├── LandingPage    # Public marketing page
│   ├── DashboardPage  # Live command center
│   ├── ScreeningPage  # Main AI screening workspace
│   ├── CasesPage      # Case management with live data
│   ├── CaseDetailPage # Full case view with 14 tabs
│   ├── AnalyticsPage  # Supervisor analytics
│   ├── ModelsPage     # AI model registry
│   ├── DatasetsPage   # Dataset pipeline
│   ├── SecurityPage   # Security center
│   ├── AuditPage      # Live audit log
│   └── SettingsPage   # Profile, security, notifications, AI config
├── providers/
│   └── AuthProvider   # InsForge auth context
├── router/            # Route definitions + role guards
├── store/
│   └── auth.ts        # Zustand auth store
└── test/
    └── setup.ts       # Vitest + jsdom + InsForge mock
```

---

## License

Prototype — built for Smart India Hackathon 2026.

---

*AI-generated screening assistance. Final determination remains with authorized personnel.*
