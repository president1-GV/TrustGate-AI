-- TRUSTGATE AI core schema, RBAC helpers, RLS, storage policies, seed catalogs.
-- Application tables live in public. Identity lives in auth.users.

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (name IN ('officer', 'supervisor', 'admin')),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  badge_id TEXT,
  station TEXT,
  team TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

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
        ELSE 3
      END
      LIMIT 1
    ),
    'officer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT public.current_app_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT public.current_app_role() IN ('admin', 'supervisor');
$$;

CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  document_type TEXT NOT NULL DEFAULT 'unknown',
  country_code TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'ANALYZING', 'UNDER_REVIEW', 'CLEARED', 'FLAGGED', 'ESCALATED', 'CLOSED'
  )),
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  processing_time_ms INTEGER,
  review_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (review_status IN ('OPEN', 'IN_REVIEW', 'COMPLETED')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  notes TEXT,
  ai_risk_score INTEGER,
  officer_decision TEXT CHECK (officer_decision IN ('CLEARED', 'FLAGGED', 'ESCALATED', 'SECONDARY_VERIFICATION')),
  override_reason TEXT,
  decision_timestamp TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  retention_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'unknown',
  country_code TEXT,
  image_quality_score INTEGER,
  image_width INTEGER,
  image_height INTEGER,
  processing_status TEXT NOT NULL DEFAULT 'PENDING',
  storage_bucket TEXT,
  storage_key TEXT,
  storage_url TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,
  retention_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('original', 'corrected', 'crop', 'heatmap')),
  storage_bucket TEXT,
  storage_key TEXT,
  storage_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  raw_text TEXT,
  overall_confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ocr_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocr_result_id UUID NOT NULL REFERENCES public.ocr_results(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  confidence NUMERIC,
  bounding_box JSONB,
  source TEXT NOT NULL DEFAULT 'ocr',
  validation_status TEXT NOT NULL DEFAULT 'UNVALIDATED'
);

CREATE TABLE IF NOT EXISTS public.mrz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT false,
  format TEXT,
  document_number TEXT,
  date_of_birth TEXT,
  expiry_date TEXT,
  nationality TEXT,
  sex TEXT,
  check_digits_valid BOOLEAN,
  composite_valid BOOLEAN,
  raw_lines TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('PASS', 'WARNING', 'HIGH', 'CRITICAL')),
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tampering_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  probability INTEGER,
  confidence NUMERIC,
  severity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tampering_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tampering_result_id UUID NOT NULL REFERENCES public.tampering_results(id) ON DELETE CASCADE,
  manipulation_type TEXT,
  region_label TEXT,
  bounding_box JSONB,
  evidence TEXT,
  probability INTEGER
);

CREATE TABLE IF NOT EXISTS public.face_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  detected BOOLEAN NOT NULL DEFAULT false,
  quality INTEGER,
  similarity INTEGER,
  pose_yaw NUMERIC,
  pose_pitch NUMERIC,
  blur_score NUMERIC,
  result_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.face_embeddings_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_result_id UUID NOT NULL REFERENCES public.face_results(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  dimension INTEGER,
  stored BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  level TEXT NOT NULL CHECK (level IN ('LOW', 'MEDIUM', 'HIGH')),
  recommended_action TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_score_id UUID NOT NULL REFERENCES public.risk_scores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  weight INTEGER,
  contribution INTEGER,
  explanation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  location TEXT,
  confidence NUMERIC,
  evidence TEXT,
  model_name TEXT,
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES auth.users(id),
  format TEXT NOT NULL DEFAULT 'json',
  payload JSONB NOT NULL,
  storage_bucket TEXT,
  storage_key TEXT,
  storage_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  result TEXT,
  session_ref TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO',
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prototype',
  last_evaluated_at TIMESTAMPTZ,
  precision NUMERIC,
  recall NUMERIC,
  f1 NUMERIC,
  roc_auc NUMERIC,
  latency_ms INTEGER,
  dataset TEXT,
  notes TEXT NOT NULL DEFAULT 'Not yet evaluated. Metrics will appear after a documented benchmark run.'
);

CREATE TABLE IF NOT EXISTS public.model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id UUID NOT NULL REFERENCES public.model_versions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'INFO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_created_by ON public.cases (created_by);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON public.cases (assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_risk_level ON public.cases (risk_level);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON public.cases (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents (case_id);
CREATE INDEX IF NOT EXISTS idx_findings_case_id ON public.findings (case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_case_owner_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by cannot be changed';
  END IF;
  IF NEW.is_demo IS DISTINCT FROM OLD.is_demo AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'is_demo cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_case_owner_change
BEFORE UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.prevent_case_owner_change();

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  officer_role_id UUID;
  admin_role_id UUID;
  admin_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.profile->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO officer_role_id FROM public.roles WHERE name = 'officer';
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT COUNT(*) INTO admin_count FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'admin';

  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, admin_role_id)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, officer_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

INSERT INTO public.roles (name, description) VALUES
  ('officer', 'Create screenings, analyze documents, submit own cases for review'),
  ('supervisor', 'Review team cases, analytics, and audit events'),
  ('admin', 'User management, system configuration, security monitoring')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.model_versions (key, display_name, version, status, notes) VALUES
  ('ocr', 'OCR Model', 'local-tesseract-5', 'prototype', 'Local Tesseract.js provider. Not yet benchmarked on MIDV datasets.'),
  ('document', 'Document Detection Model', 'heuristic-v1', 'prototype', 'Aspect-ratio and layout heuristic. Not yet benchmarked.'),
  ('tampering', 'Tampering Detection Model', 'ela-local-v1', 'prototype', 'Error-level analysis in-browser. Not yet benchmarked.'),
  ('face', 'Face Analysis Model', 'local-quality-v1', 'prototype', 'Face crop quality heuristics. Embeddings are not persisted by default.'),
  ('risk', 'Risk Engine', 'explainable-v1', 'prototype', 'Weighted explainable scoring. Not a legal determination.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES
  ('retention_days', '7'::jsonb),
  ('face_similarity_threshold', '70'::jsonb),
  ('high_risk_threshold', '70'::jsonb),
  ('medium_risk_threshold', '30'::jsonb),
  ('demo_mode_default', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tampering_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tampering_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_embeddings_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_read ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_self_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_supervisor_or_admin());
CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_supervisor_or_admin());
CREATE POLICY user_roles_admin_write ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY user_roles_admin_update ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY user_roles_admin_delete ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY cases_select ON public.cases FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_supervisor_or_admin());
CREATE POLICY cases_insert ON public.cases FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY cases_update ON public.cases FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  WITH CHECK (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_supervisor_or_admin());

CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())));
CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())));
CREATE POLICY documents_update ON public.documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())));

CREATE POLICY case_child_select ON public.document_images FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  ));
CREATE POLICY case_child_insert ON public.document_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())
  ));

CREATE POLICY ocr_select ON public.ocr_results FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  ));
CREATE POLICY ocr_insert ON public.ocr_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())
  ));

CREATE POLICY ocr_fields_select ON public.ocr_fields FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ocr_results o
    JOIN public.documents d ON d.id = o.document_id
    JOIN public.cases c ON c.id = d.case_id
    WHERE o.id = ocr_result_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  ));
CREATE POLICY ocr_fields_insert ON public.ocr_fields FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ocr_results o
    JOIN public.documents d ON d.id = o.document_id
    JOIN public.cases c ON c.id = d.case_id
    WHERE o.id = ocr_result_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())
  ));

CREATE POLICY mrz_select ON public.mrz_results FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  ));
CREATE POLICY mrz_insert ON public.mrz_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())
  ));

CREATE POLICY tamper_select ON public.tampering_results FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  ));
CREATE POLICY tamper_insert ON public.tampering_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())
  ));

CREATE POLICY tamper_regions_select ON public.tampering_regions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tampering_results t
    JOIN public.documents d ON d.id = t.document_id
    JOIN public.cases c ON c.id = d.case_id
    WHERE t.id = tampering_result_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  ));
CREATE POLICY tamper_regions_insert ON public.tampering_regions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tampering_results t
    JOIN public.documents d ON d.id = t.document_id
    JOIN public.cases c ON c.id = d.case_id
    WHERE t.id = tampering_result_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())
  ));

CREATE POLICY face_select ON public.face_results FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  ));
CREATE POLICY face_insert ON public.face_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())
  ));

CREATE POLICY face_meta_select ON public.face_embeddings_metadata FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.face_results f
    JOIN public.documents d ON d.id = f.document_id
    JOIN public.cases c ON c.id = d.case_id
    WHERE f.id = face_result_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  ));
CREATE POLICY face_meta_insert ON public.face_embeddings_metadata FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY validation_select ON public.validation_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())));
CREATE POLICY validation_insert ON public.validation_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())));

CREATE POLICY risk_select ON public.risk_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())));
CREATE POLICY risk_insert ON public.risk_scores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())));

CREATE POLICY risk_factors_select ON public.risk_factors FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.risk_scores s JOIN public.cases c ON c.id = s.case_id
    WHERE s.id = risk_score_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())
  ));
CREATE POLICY risk_factors_insert ON public.risk_factors FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.risk_scores s JOIN public.cases c ON c.id = s.case_id
    WHERE s.id = risk_score_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())
  ));

CREATE POLICY findings_select ON public.findings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())));
CREATE POLICY findings_insert ON public.findings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR public.is_supervisor_or_admin())));

CREATE POLICY reports_select ON public.reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_supervisor_or_admin())));
CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_supervisor_or_admin())));

CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.is_supervisor_or_admin());

CREATE POLICY security_select ON public.security_events FOR SELECT TO authenticated
  USING (public.is_supervisor_or_admin());
CREATE POLICY security_insert ON public.security_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.is_admin());

CREATE POLICY models_select ON public.model_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY models_admin_update ON public.model_versions FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY model_metrics_select ON public.model_metrics FOR SELECT TO authenticated USING (true);

CREATE POLICY system_events_select ON public.system_events FOR SELECT TO authenticated
  USING (public.is_supervisor_or_admin());

CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_supervisor_or_admin());

CREATE POLICY settings_select ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_admin_update ON public.settings FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE UPDATE ON public.audit_logs FROM anon, authenticated;
REVOKE DELETE ON public.audit_logs FROM anon, authenticated;
REVOKE UPDATE ON public.ocr_results FROM anon, authenticated;
REVOKE DELETE ON public.ocr_results FROM anon, authenticated;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_owner_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_delete ON storage.objects;

CREATE POLICY storage_objects_owner_select ON storage.objects
FOR SELECT TO authenticated
USING (
  uploaded_by = (auth.jwt() ->> 'sub')
  OR public.is_supervisor_or_admin()
);

CREATE POLICY storage_objects_owner_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (uploaded_by = (auth.jwt() ->> 'sub'));

CREATE POLICY storage_objects_owner_update ON storage.objects
FOR UPDATE TO authenticated
USING (uploaded_by = (auth.jwt() ->> 'sub') OR public.is_admin())
WITH CHECK (uploaded_by = (auth.jwt() ->> 'sub') OR public.is_admin());

CREATE POLICY storage_objects_owner_delete ON storage.objects
FOR DELETE TO authenticated
USING (uploaded_by = (auth.jwt() ->> 'sub') OR public.is_admin());
