-- TRUSTGATE AI Security Hardening Migration 20260905000002
-- 1. Ensure profiles table has status and process_id columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS process_id TEXT;

-- 2. Create member_access_requests table if it does not exist
CREATE TABLE IF NOT EXISTS public.member_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  badge_id TEXT,
  station TEXT,
  requested_role TEXT NOT NULL DEFAULT 'officer',
  process_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ip_address TEXT,
  device_info TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_access_requests_process_id ON public.member_access_requests (process_id);
CREATE INDEX IF NOT EXISTS idx_member_access_requests_user_id ON public.member_access_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_member_access_requests_status ON public.member_access_requests (status);

ALTER TABLE public.member_access_requests ENABLE ROW LEVEL SECURITY;

-- Harden member_access_requests RLS:
-- 1. Drop overly permissive access_requests_read, access_requests_admin_update, access_requests_admin_delete
-- 2. Restrict access_requests_read to admin or the user themselves (user_id = auth.uid())
-- 3. Restrict access_requests_admin_update to admin only (is_admin())
-- 4. Restrict access_requests_admin_delete to admin only (is_admin())
-- 5. Ensure access_requests_insert enforces status = 'pending'

DROP POLICY IF EXISTS access_requests_read ON public.member_access_requests;
DROP POLICY IF EXISTS access_requests_admin_update ON public.member_access_requests;
DROP POLICY IF EXISTS access_requests_admin_delete ON public.member_access_requests;
DROP POLICY IF EXISTS access_requests_insert ON public.member_access_requests;

-- Allow users to read only their own request, and admins to read all
CREATE POLICY access_requests_read ON public.member_access_requests
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR public.is_admin());

-- Allow anonymous or authenticated applicants to submit a pending request
CREATE POLICY access_requests_insert ON public.member_access_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Restrict updating approval/status strictly to admin
CREATE POLICY access_requests_admin_update ON public.member_access_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Restrict deleting requests strictly to admin
CREATE POLICY access_requests_admin_delete ON public.member_access_requests
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

