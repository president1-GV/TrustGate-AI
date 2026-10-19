-- Migration: 20260905000001_add_document_provenance_columns.sql
-- Add cryptographic document provenance columns to public.documents

ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS document_hash TEXT,
  ADD COLUMN IF NOT EXISTS processing_run_id TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_document_hash 
  ON public.documents (document_hash);

CREATE INDEX IF NOT EXISTS idx_documents_processing_run_id 
  ON public.documents (processing_run_id);
