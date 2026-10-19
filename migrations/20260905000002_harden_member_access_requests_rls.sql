-- Migration: 20260905000002_harden_member_access_requests_rls.sql
-- Harden Row-Level Security on public.member_access_requests

DROP POLICY IF EXISTS member_access_requests_select_all ON public.member_access_requests;
DROP POLICY IF EXISTS access_requests_admin_delete ON public.member_access_requests;
DROP POLICY IF EXISTS access_requests_admin_update ON public.member_access_requests;
DROP POLICY IF EXISTS access_requests_read ON public.member_access_requests;
DROP POLICY IF EXISTS access_requests_insert ON public.member_access_requests;

CREATE POLICY access_requests_read ON public.member_access_requests
  FOR SELECT TO anon, authenticated
  USING (
    (user_id = auth.uid()) 
    OR (email = (auth.jwt() ->> 'email'::text))
    OR public.is_admin()
  );

CREATE POLICY access_requests_insert ON public.member_access_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending'::text);

CREATE POLICY access_requests_admin_update ON public.member_access_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY access_requests_admin_delete ON public.member_access_requests
  FOR DELETE TO authenticated
  USING (public.is_admin());
