-- TRUSTGATE AI Security Hardening Migration
-- 1. Add 'analyst' role to check constraint and roles table
-- 2. Update current_app_role() to include analyst
-- 3. Add is_analyst() helper function
-- 4. Fix reports_insert policy with explicit table reference c.assigned_to

ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_name_check CHECK (name IN ('officer', 'supervisor', 'admin', 'analyst'));
INSERT INTO public.roles (name, description) VALUES ('analyst', 'Access approved analytics, inspect model results, review datasets, monitor model performance') ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT r.name
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      ORDER BY CASE r.name
        WHEN 'admin' THEN 1
        WHEN 'supervisor' THEN 2
        WHEN 'officer' THEN 3
        WHEN 'analyst' THEN 4
        ELSE 5
      END
      LIMIT 1
    ),
    'officer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_analyst()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT public.current_app_role() = 'analyst';
$$;

DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())));
