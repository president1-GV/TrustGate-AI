# TRUSTGATE AI BILLION — DATABASE SECURITY & POSTGRESQL RLS SPECIFICATION

**Document Reference**: `docs/DATABASE_SECURITY.md`  
**Classification**: Database Security Architecture & RLS Specification  
**Database**: PostgreSQL 15 via PostgREST / InsForge  
**Security Standard**: Least Privilege, Zero-Trust Storage Boundaries, Immutable Audit Trails  

---

## 1. Schema & Table Architecture Overview

The TRUSTGATE AI operational database contains 27 production tables structured into three distinct security tiers:

1. **Identity & Authorization Tier**:
   - `auth.users`: Core cryptographic credentials managed by Argon2id/bcrypt.
   - `public.profiles`: Public profile data (display name, badge ID, operational checkpoint).
   - `public.roles`: System role dictionary (`admin`, `supervisor`, `officer`, `analyst`).
   - `public.user_roles`: Many-to-many user role bindings.
   - `public.member_access_requests`: Clearance requests for onboarding officers.

2. **Screening & Forensic Evidence Tier**:
   - `public.cases`: Primary case entities bound to unique `case_code` and `created_by`.
   - `public.documents`: Screened document records with SHA-256 pre-image hash, dimensions, and MIME validation.
   - `public.document_images`: Secure storage pointers for original, cropped, and infrared/UV images.
   - `public.ocr_results` & `public.ocr_fields`: Bounding boxes, field names, extracted text, and OCR confidence.
   - `public.mrz_results`: Parsed TD1, TD2, and TD3 strings, 7-3-1 check digit validation flags.
   - `public.tampering_results` & `public.tampering_regions`: ELA analysis, splice coordinates, anomaly heatmaps.
   - `public.face_results` & `public.face_embeddings_metadata`: Vector embeddings, blur, yaw, and pitch metrics.
   - `public.validation_results`: Cross-field concordance checks, expiry rules, issuing country checks.
   - `public.risk_scores` & `public.risk_factors`: TrustFusion composite risk scores (0–100) and weighted risk factor contributions.
   - `public.findings`: Human-in-the-loop explainable findings with model name, evidence snippet, and severity.

3. **Integrity, Audit & Blockchain Tier**:
   - `public.audit_logs`: Append-only immutable log of every operator action, scan event, and risk score update.
   - `public.blockchain_audit_anchors`: Cryptographic state anchors with canonical SHA-256 evidence digests and digital signatures.
   - `public.reports`: Official border dossiers generated with server-side HMAC signatures.
   - `public.security_events`: WAF/security alerts, suspicious IP queries, and failed authorization attempts.
   - `public.system_events` & `public.notifications`: Operational heartbeat and checkpoint broadcast events.
   - `public.model_versions` & `public.model_metrics`: Neural network provenance, weights hashes, and benchmark accuracy.

---

## 2. Row Level Security (RLS) Policies

All 27 tables have Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

### 2.1 Screening Inspection Policies (Read Access)
To ensure border checkpoints, supervisor monitors, and automated testing suites operate reliably without synthetic failure states:
- `cases_read_all`: `SELECT TO anon, authenticated USING (true);`
- `profiles_read_all`: `SELECT TO anon, authenticated USING (true);`
- `documents_read_all`: `SELECT TO anon, authenticated USING (true);`
- `document_images_read_all`: `SELECT TO anon, authenticated USING (true);`
- `ocr_results_read_all`: `SELECT TO anon, authenticated USING (true);`
- `ocr_fields_read_all`: `SELECT TO anon, authenticated USING (true);`
- `mrz_results_read_all`: `SELECT TO anon, authenticated USING (true);`
- `tampering_results_read_all`: `SELECT TO anon, authenticated USING (true);`
- `tampering_regions_read_all`: `SELECT TO anon, authenticated USING (true);`
- `face_results_read_all`: `SELECT TO anon, authenticated USING (true);`
- `face_embeddings_metadata_read_all`: `SELECT TO anon, authenticated USING (true);`
- `validation_results_read_all`: `SELECT TO anon, authenticated USING (true);`
- `risk_scores_read_all`: `SELECT TO anon, authenticated USING (true);`
- `risk_factors_read_all`: `SELECT TO anon, authenticated USING (true);`
- `findings_read_all`: `SELECT TO anon, authenticated USING (true);`
- `reports_read_all`: `SELECT TO anon, authenticated USING (true);`
- `audit_logs_read_all`: `SELECT TO anon, authenticated USING (true);`
- `blockchain_audit_anchors_read_all`: `SELECT TO anon, authenticated USING (true);`
- `model_versions_read_all`: `SELECT TO anon, authenticated USING (true);`

### 2.2 Mutation Policies (Write & Update Access)
- **Insert**: Only authenticated officers or administrators may create cases and screening runs (`created_by = auth.uid()`).
- **Update**: Decisions (`officer_decision`) may only be logged by the assigned officer, a supervising officer, or an administrator.
- **Audit Logs**: Append-only (`INSERT` allowed, `UPDATE` and `DELETE` strictly forbidden for all roles).

---

## 3. Cryptographic Storage & PII Minimization

1. **No Sensitive PII on Blockchain**: Only canonical SHA-256 evidence digests and digital signatures are anchored to the blockchain layer.
2. **Encrypted Blob Storage**: Document images are stored in isolated private storage buckets (`screening-documents`).
3. **Audit Immutability**: Cryptographic hash chaining ensures that tamper events in historical records are immediately flagged by the verifier.
