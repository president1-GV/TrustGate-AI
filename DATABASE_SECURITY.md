# TRUSTGATE AI BILLION — DATABASE SECURITY & POSTGRESQL RLS SPECIFICATION
**Document Reference**: `DATABASE_SECURITY.md`  
**Database**: PostgreSQL 15 (PostgREST BaaS via InsForge)  
**Host**: `https://heicn84u.us-east.insforge.app`  
**Security Standard**: Least Privilege / Zero Trust / IDOR Neutralization  
**Last Hardened**: 2026-09-05T23:45:00Z  

---

## 1. Core Relational Hierarchy & Referential Integrity

Authoritative screening results cannot exist in isolation. Every piece of evidence is bound by foreign keys:

```
auth.users (Officer Identity)
     │
     ▼
cases (created_by, assigned_to)
     │
     ▼
documents (case_id, document_hash, processing_run_id)
     │
     ├── ocr_results (document_id) ──► ocr_fields (ocr_result_id)
     ├── mrz_results (document_id)
     ├── tampering_results (document_id) ──► tampering_regions (tampering_result_id)
     └── face_results (document_id) ──► face_embeddings_metadata (face_result_id)
```

---

## 2. Insecure Direct Object Reference (IDOR) Neutralization

Row-Level Security (RLS) is enabled on **all 26 public tables**. The access rules enforce ownership or supervisor oversight:

1. **`cases` & `documents`**:
   - `SELECT`: `((created_by = auth.uid()) OR (assigned_to = auth.uid()) OR (is_demo = true) OR is_supervisor_or_admin())`
   - `INSERT`: `(created_by = auth.uid())`
   - `UPDATE`: `((created_by = auth.uid()) OR (assigned_to = auth.uid()) OR is_supervisor_or_admin())`
2. **Child Records (`ocr_results`, `mrz_results`, `tampering_results`, `face_results`, `risk_scores`)**:
   - Cascaded existence check on parent case:
     ```sql
     EXISTS (
       SELECT 1 FROM cases c 
       WHERE c.id = case_id 
         AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR c.is_demo = true OR is_supervisor_or_admin())
     )
     ```
3. **`member_access_requests` (Hardened via Migration `20260905000002`)**:
   - `SELECT`: Restricted to `((user_id = auth.uid()) OR is_admin())`
   - `INSERT`: Permitted to applicants with check `(status = 'pending')`
   - `UPDATE` & `DELETE`: Strictly restricted to `is_admin()`

---

## 3. Database Failure Resilience & Failure-Safe Rules

In accordance with Phase 39-40 failure-safe architecture:
- **DATABASE UNAVAILABLE**: If InsForge PostgREST is unreachable, the system stores cases in local IndexedDB (`offlineDb.ts`) with status `pending_sync`. The UI renders `DATABASE UNAVAILABLE · OPERATING IN AIR-GAPPED STANDBY`. It **NEVER** converts a database failure into a `PASS` decision.
- **NO RECORD FOUND**: If an identity document is not found in the national registry, the system outputs `NO_RECORD_FOUND`. It **NEVER** equates no record found to automatic fraud without forensic tampering evidence.
