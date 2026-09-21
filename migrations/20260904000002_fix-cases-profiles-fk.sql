-- =============================================================================
-- TRUSTGATE AI BILLION — SCHEMA FIX: Cases & Audit Logs Foreign Keys to Profiles
-- Description: Updates cases and audit_logs foreign keys to reference public.profiles(id)
--              instead of auth.users(id) so PostgREST schema cache can resolve
--              embedded resource relationships (profiles!cases_created_by_fkey, etc.).
--              Also enables authenticated officers to select demo cases (is_demo = true).
-- Date: September 2026
-- =============================================================================

-- 1. Update foreign key constraints to point to public.profiles(id)
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_created_by_fkey;
ALTER TABLE public.cases ADD CONSTRAINT cases_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_assigned_to_fkey;
ALTER TABLE public.cases ADD CONSTRAINT cases_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey 
  FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Allow authenticated users to read profile display names
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- 3. Allow authenticated users to view demo benchmark case studies (is_demo = true)
DROP POLICY IF EXISTS "cases_select" ON public.cases;
CREATE POLICY "cases_select" ON public.cases
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR assigned_to = auth.uid() 
    OR is_demo = true 
    OR is_supervisor_or_admin()
  );

DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = documents.case_id
        AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR c.is_demo = true OR is_supervisor_or_admin())
    )
  );

DROP POLICY IF EXISTS "risk_select" ON public.risk_scores;
CREATE POLICY "risk_select" ON public.risk_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = risk_scores.case_id
        AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR c.is_demo = true OR is_supervisor_or_admin())
    )
  );

DROP POLICY IF EXISTS "findings_select" ON public.findings;
CREATE POLICY "findings_select" ON public.findings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = findings.case_id
        AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR c.is_demo = true OR is_supervisor_or_admin())
    )
  );

DROP POLICY IF EXISTS "validation_select" ON public.validation_results;
CREATE POLICY "validation_select" ON public.validation_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = validation_results.case_id
        AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR c.is_demo = true OR is_supervisor_or_admin())
    )
  );

DROP POLICY IF EXISTS "face_select" ON public.face_results;
CREATE POLICY "face_select" ON public.face_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.cases c ON c.id = d.case_id
      WHERE d.id = face_results.document_id
        AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR c.is_demo = true OR is_supervisor_or_admin())
    )
  );

DROP POLICY IF EXISTS "ocr_select" ON public.ocr_results;
CREATE POLICY "ocr_select" ON public.ocr_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.cases c ON c.id = d.case_id
      WHERE d.id = ocr_results.document_id
        AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR c.is_demo = true OR is_supervisor_or_admin())
    )
  );

DROP POLICY IF EXISTS "tamper_select" ON public.tampering_results;
CREATE POLICY "tamper_select" ON public.tampering_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.cases c ON c.id = d.case_id
      WHERE d.id = tampering_results.document_id
        AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR c.is_demo = true OR is_supervisor_or_admin())
    )
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

