# TRUSTGATE AI BILLION — AUTHORIZATION MATRIX & RBAC
**Document Reference**: `AUTHORIZATION_MATRIX.md`  
**Classification**: Security Control & Authorization Matrix  
**Security Standard**: Least Privilege & Zero Trust Separation of Duties  
**Last Verified**: 2026-09-05T23:30:00Z  

---

## 1. Role Definitions

| Role Code | Role Name | Intended Operator | Description |
| :--- | :--- | :--- | :--- |
| `admin` | System Administrator | IT / Security Lead | Full administrative authority over users, system settings, and security audits |
| `supervisor` | Border Control Supervisor | Senior Immigration Officer | Case review authority, risk override, dossier generation, and audit review |
| `officer` | Screening Officer | Border Gate / SSB Officer | Frontline document scanning, case ingestion, and traveler inspection |
| `analyst` | Intelligence Analyst | Intelligence Bureau / CID | Read-only access to analytics, forensic model metrics, and dataset corpus |
| `pending` | Registered Applicant | New Hire Awaiting Clearance | Access blocked at `/authorization-gate` until approved by an administrator |
| `anon` | Anonymous Visitor | Public Network | Access restricted strictly to `LandingPage` (`/`) and authentication endpoints |

---

## 2. Route & UI Surface Clearance

| Route Path | Description | anon | pending | officer | analyst | supervisor | admin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/` | Landing Page | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/login` | Officer Login | ✅ | 🚫 (Redirect) | 🚫 (Redirect) | 🚫 (Redirect) | 🚫 (Redirect) | 🚫 (Redirect) |
| `/register` | Officer Self-Registration | ✅ | 🚫 (Redirect) | 🚫 (Redirect) | 🚫 (Redirect) | 🚫 (Redirect) | 🚫 (Redirect) |
| `/authorization-gate` | Approval Clearance Gate | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| `/dashboard` | Operational Dashboard | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ |
| `/screening` | Deep Forensic Pipeline | 🚫 | 🚫 | ✅ | 🚫 | ✅ | ✅ |
| `/sih-screening` | Border Gateway 7-Screens | 🚫 | 🚫 | ✅ | 🚫 | ✅ | ✅ |
| `/cases` | Case Management List | 🚫 | 🚫 | ✅ (Assigned) | 🚫 | ✅ (All) | ✅ (All) |
| `/cases/:id` | Case Dossier Detail | 🚫 | 🚫 | ✅ (Assigned) | 🚫 | ✅ (All) | ✅ (All) |
| `/reports` | Border Intelligence Dossiers| 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ |
| `/analytics` | Risk Trends & Throughput | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ |
| `/audit` | Immutable Audit Logs | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ |
| `/models` | Model Inspection & Registry| 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ |
| `/datasets` | MIDV & FaceForensics Corpus | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ |
| `/settings` | User Profile & Preferences | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ |
| `/security` | Threat Center & WAF Logs | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |
| `/admin` | System Admin Dashboard | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |
| `/admin/users` | User & Role Management | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |
| `/admin/authorizations`| Member Access Clearance | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |

---

## 3. Database Table Row-Level Security (RLS) Matrix

| Database Table | anon | officer | analyst | supervisor | admin |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cases` | Denied | SELECT/INSERT (Own/Assigned) | Denied | SELECT/INSERT/UPDATE (All) | FULL CONTROL |
| `documents` | Denied | SELECT/INSERT (Own Case) | Denied | SELECT/INSERT/UPDATE (All) | FULL CONTROL |
| `ocr_results` | Denied | SELECT/INSERT (Own Case) | Denied | SELECT/INSERT (All) | FULL CONTROL |
| `mrz_results` | Denied | SELECT/INSERT (Own Case) | Denied | SELECT/INSERT (All) | FULL CONTROL |
| `tampering_results`| Denied | SELECT/INSERT (Own Case) | Denied | SELECT/INSERT (All) | FULL CONTROL |
| `face_results` | Denied | SELECT/INSERT (Own Case) | Denied | SELECT/INSERT (All) | FULL CONTROL |
| `risk_scores` | Denied | SELECT/INSERT (Own Case) | Denied | SELECT/INSERT (All) | FULL CONTROL |
| `audit_logs` | Denied | INSERT (actor=uid), SELECT (Own) | Denied | INSERT/SELECT (All) | FULL CONTROL |
| `reports` | Denied | Denied | Denied | SELECT/INSERT (All) | FULL CONTROL |
| `profiles` | Denied | SELECT (All), UPDATE (Self) | SELECT (All), UPDATE (Self) | SELECT (All), UPDATE (Self) | FULL CONTROL |
| `user_roles` | Denied | SELECT (Self) | SELECT (Self) | SELECT (All) | FULL CONTROL |
| `member_access_requests`| INSERT (Self) | Denied | Denied | Denied | FULL CONTROL (Approval/Denial) |
| `settings` | Denied | SELECT | SELECT | SELECT/INSERT/UPDATE | FULL CONTROL |
| `security_events`| Denied | INSERT (Self Events) | Denied | SELECT (All) | FULL CONTROL |
| `screening-documents` (Storage)| Denied | UPLOAD/DOWNLOAD (Own Case) | Denied | DOWNLOAD (All) | FULL CONTROL |
