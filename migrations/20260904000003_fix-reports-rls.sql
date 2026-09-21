-- ============================================================
-- Migration: Fix reports table INSERT RLS policy
-- Date: 2026-09-04
-- ============================================================

DROP POLICY IF EXISTS reports_insert ON public.reports;

CREATE POLICY reports_insert ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = reports.case_id
        AND (
          c.created_by = auth.uid()
          OR c.assigned_to = auth.uid()
          OR c.is_demo = true
          OR is_supervisor_or_admin()
        )
    )
  );

NOTIFY pgrst, 'reload schema';
