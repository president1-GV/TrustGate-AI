# TRUSTGATE AI BILLION — API INTEGRATION MATRIX
**Document Reference**: `API_INTEGRATION_MATRIX.md`  
**Classification**: System Interoperability & Integration Matrix  
**Last Verified**: 2026-09-05T23:25:00Z  

---

## 1. PostgREST / InsForge BaaS API

| Endpoint | Method | Caller Module | Auth Requirement | Payload Structure | Response Format | Error & Fallback Handling |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/auth/v1/token` | POST | `AuthProvider.tsx` | Public Anon Key | `{ email, password }` | `{ access_token, user }` | Form error display; reject invalid credentials |
| `/auth/v1/signup` | POST | `RegisterPage.tsx` | Public Anon Key | `{ email, password, data }` | `{ user }` | Disallow duplicate emails; prompt verification |
| `/rest/v1/cases` | POST | `src/lib/db.ts` | `authenticated` | `[{ case_code, status, priority, created_by, is_demo }]` | `[{ id, case_code, ... }]` | Buffer to IndexedDB (`offlineDb.ts`) on network error |
| `/rest/v1/cases` | GET | `CasesPage.tsx` | `authenticated` | Query filters (`status`, `priority`) | `[{ id, case_code, documents, risk_scores }]` | Render empty state; show offline cached records |
| `/rest/v1/cases?id=eq.:id` | GET | `CaseDetailPage.tsx` | `authenticated` | Case ID in query string | `{ id, case_code, documents: [...] }` | 404 Case Not Found or Access Denied boundary |
| `/rest/v1/documents` | POST | `src/lib/db.ts` | `authenticated` | `[{ case_id, file_path, document_hash, processing_run_id }]` | `[{ id, document_hash, ... }]` | Hard fail transaction if document insertion fails |
| `/rest/v1/ocr_results` | POST | `src/lib/db.ts` | `authenticated` | `[{ document_id, raw_text, confidence }]` | `[{ id }]` | Mark OCR status as failed in case record |
| `/rest/v1/mrz_results` | POST | `src/lib/db.ts` | `authenticated` | `[{ document_id, raw_lines, is_valid, format }]` | `[{ id }]` | Fallback to manual officer review |
| `/rest/v1/tampering_results`| POST | `src/lib/db.ts` | `authenticated` | `[{ document_id, tamper_score, verdict }]` | `[{ id }]` | Flag case as `INCONCLUSIVE` on error |
| `/rest/v1/face_results` | POST | `src/lib/db.ts` | `authenticated` | `[{ document_id, match_score, liveness_score }]` | `[{ id }]` | Flag as `NOT_AVAILABLE` if biometric unavailable |
| `/rest/v1/risk_scores` | POST | `src/lib/db.ts` | `authenticated` | `[{ case_id, score, verdict, confidence }]` | `[{ id }]` | Default to `REVIEW` verdict on calculation failure |
| `/rest/v1/audit_logs` | POST | `src/lib/db.ts` | `authenticated` | `[{ case_id, action, actor_id, details }]` | `[{ id }]` | Non-blocking write; logs failure to console |
| `/rest/v1/reports` | POST | `ReportsPage.tsx` | `authenticated` | `[{ case_id, report_type, summary }]` | `[{ id }]` | Display report generation toast failure |
| `/storage/v1/object/*` | POST | `src/lib/db.ts` | `authenticated` | Binary file stream | `{ Key }` | Reject file upload if size exceeds 25 MB |
| `/storage/v1/object/*` | GET | `DocumentViewer.tsx`| `authenticated` | Bucket object key | Binary Blob stream | Fallback to broken image icon with retry button |

---

## 2. Python Forensic Engine API (`http://localhost:8000`)

| Endpoint | Method | Caller Module | Auth Requirement | Payload Structure | Response Format | Error & Fallback Handling |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/health` | GET | `SystemConnectivityBar` | Public | None | `{ status: "healthy", version }` | Sets Python status indicator to `OFFLINE` |
| `/verify` | POST | `src/lib/midvService.ts` | Rate Limited | `{ doc_type, country, fields, mrz_lines, tampering }` | `{ archetype, evaluation, decision }` | Fallback to client-side TS rule orchestrator |
| `/faceforensics/verify` | POST | `src/lib/midvService.ts` | Rate Limited | `{ face_crop_base64, live_frame_base64 }` | `{ deepfake_score, liveness_score }` | Fallback to local skin chromaticity calculation |
| `/faceforensics/benchmark` | GET/POST | `FaceForensicsCard` | Rate Limited | None | `{ total_evaluated, eer, auc, samples }` | Display error toast if benchmark fails |
| `/dataset/archetypes` | GET | `MidvArchetypeInspector`| Rate Limited | None | `{ dataset, archetypes: [...] }` | Display cached offline archetypes from catalog |
| `/dataset/authentic-sample` | GET | `MidvArchetypeInspector`| Rate Limited | `?archetype=:id` | `{ archetype_id, specimen_image, fields }` | Return 404 error banner for unknown archetype |
| `/model/status` | GET | `ModelsPage.tsx` | Rate Limited | None | `{ is_trained, model_name, version }` | Render "Model weights uninitialized" status |
| `/model/train` | POST | `ModelsPage.tsx` | Local Admin | `{ epochs, samples_per_class, lr }` | `{ success, final_loss, accuracy }` | Catch timeout; training runs on separate worker |
| `/model/predict` | POST | `src/ai/pipeline/09-risk.ts`| Rate Limited | Feature vector dictionary | `{ risk_score, confidence, verdict }` | Fallback to deterministic weighted formula |
