-- ============================================================
-- Migration: Add cryptographic document provenance columns to documents table
-- Date: 2026-09-05
-- ============================================================

ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS document_hash text,
  ADD COLUMN IF NOT EXISTS processing_run_id text;

CREATE INDEX IF NOT EXISTS idx_documents_document_hash ON public.documents USING btree (document_hash);

NOTIFY pgrst, 'reload schema';
