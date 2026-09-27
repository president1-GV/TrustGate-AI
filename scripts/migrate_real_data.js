import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@insforge/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL || '';
const ANON_KEY = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY || '';
const DATA_FILE = process.env.DATA_FILE || path.resolve(__dirname, '../scratch/prepared_data.json');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@trustgate.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

async function migrate() {
  if (!BACKEND_URL || !ANON_KEY || !ADMIN_PASSWORD) {
    console.error('Error: INSFORGE_URL, INSFORGE_ANON_KEY, and ADMIN_PASSWORD environment variables are required.');
    process.exit(1);
  }
  if (!fs.existsSync(DATA_FILE)) {
    console.error('Data file not found:', DATA_FILE);
    process.exit(1);
  }
  console.log('Reading prepared data from:', DATA_FILE);
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);

  const client = createClient({ baseUrl: BACKEND_URL, anonKey: ANON_KEY });

  // Sign in as admin to have full RLS clearance
  console.log(`Signing in as ${ADMIN_EMAIL}...`);
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    process.exit(1);
  }
  console.log('Authenticated successfully as Admin:', auth.user.id);

  // 1. Insert Cases
  console.log(`Inserting ${data.cases.length} cases...`);
  const cleanCases = data.cases.map(c => ({
    id: c.id,
    case_code: c.case_code,
    created_by: c.created_by,
    assigned_to: c.assigned_to,
    document_type: c.document_type,
    country_code: c.country_code,
    status: c.status,
    risk_score: c.risk_score,
    risk_level: c.risk_level,
    processing_time_ms: c.processing_time_ms,
    review_status: c.review_status,
    priority: c.priority,
    notes: c.notes,
    ai_risk_score: c.ai_risk_score,
    officer_decision: c.officer_decision,
    is_demo: c.is_demo ?? false,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  // Batch in chunks of 25
  for (let i = 0; i < cleanCases.length; i += 25) {
    const chunk = cleanCases.slice(i, i + 25);
    const { error } = await client.database.from('cases').insert(chunk);
    if (error) {
      console.error(`Error inserting cases chunk ${i}:`, error);
    } else {
      console.log(`Inserted cases ${i} to ${i + chunk.length}`);
    }
  }

  // 2. Insert Documents
  console.log(`Inserting ${data.documents.length} documents...`);
  const cleanDocs = data.documents.map(d => ({
    id: d.id,
    case_id: d.case_id,
    document_type: d.document_type,
    country_code: d.country_code,
    image_quality_score: d.image_quality_score,
    processing_status: d.processing_status,
    storage_url: d.storage_url,
    storage_key: d.storage_key,
    storage_bucket: d.storage_bucket,
    mime_type: d.mime_type,
    file_size_bytes: d.file_size_bytes,
    document_hash: d.document_hash,
    created_at: d.created_at,
    updated_at: d.updated_at || d.created_at,
  }));
  for (let i = 0; i < cleanDocs.length; i += 25) {
    const chunk = cleanDocs.slice(i, i + 25);
    const { error } = await client.database.from('documents').insert(chunk);
    if (error) console.error(`Error inserting documents chunk ${i}:`, error);
    else console.log(`Inserted documents ${i} to ${i + chunk.length}`);
  }

  // 3. Insert Risk Scores
  console.log(`Inserting ${data.risk_scores.length} risk scores...`);
  const cleanRisk = data.risk_scores.map(r => ({
    id: r.id,
    case_id: r.case_id,
    overall_score: r.overall_score,
    risk_level: r.risk_level,
    recommended_action: r.recommended_action,
    confidence: r.confidence,
    rules_triggered_count: r.rules_triggered_count,
    engine_version: r.engine_version,
    created_at: r.created_at,
  }));
  for (let i = 0; i < cleanRisk.length; i += 25) {
    const chunk = cleanRisk.slice(i, i + 25);
    const { error } = await client.database.from('risk_scores').insert(chunk);
    if (error) console.error(`Error inserting risk_scores chunk ${i}:`, error);
    else console.log(`Inserted risk_scores ${i} to ${i + chunk.length}`);
  }

  // 4. Insert OCR Results
  console.log(`Inserting ${data.ocr_results.length} ocr results...`);
  const cleanOcr = data.ocr_results.map(o => ({
    id: o.id,
    document_id: o.document_id,
    raw_text: o.raw_text,
    overall_confidence: o.overall_confidence,
    fields_count: o.fields_count,
    processing_time_ms: o.processing_time_ms,
    engine: o.engine,
    engine_version: o.engine_version,
    created_at: o.created_at,
  }));
  for (let i = 0; i < cleanOcr.length; i += 25) {
    const chunk = cleanOcr.slice(i, i + 25);
    const { error } = await client.database.from('ocr_results').insert(chunk);
    if (error) console.error(`Error inserting ocr_results chunk ${i}:`, error);
    else console.log(`Inserted ocr_results ${i} to ${i + chunk.length}`);
  }

  // 5. Insert MRZ Results
  console.log(`Inserting ${data.mrz_results.length} mrz results...`);
  const cleanMrz = data.mrz_results.map(m => ({
    id: m.id,
    document_id: m.document_id,
    raw_mrz: m.raw_mrz,
    format: m.format,
    document_number: m.document_number,
    nationality: m.nationality,
    birth_date: m.birth_date,
    sex: m.sex,
    expiry_date: m.expiry_date,
    is_valid: m.is_valid,
    check_digits_valid: m.check_digits_valid,
    processing_time_ms: m.processing_time_ms,
    engine: m.engine,
    created_at: m.created_at,
  }));
  for (let i = 0; i < cleanMrz.length; i += 25) {
    const chunk = cleanMrz.slice(i, i + 25);
    const { error } = await client.database.from('mrz_results').insert(chunk);
    if (error) console.error(`Error inserting mrz_results chunk ${i}:`, error);
    else console.log(`Inserted mrz_results ${i} to ${i + chunk.length}`);
  }

  // 6. Insert Findings
  console.log(`Inserting ${data.findings.length} findings...`);
  const cleanFindings = data.findings.map(f => ({
    id: f.id,
    case_id: f.case_id,
    severity: f.severity,
    category: f.category,
    title: f.title,
    description: f.description,
    confidence: f.confidence,
    source_module: f.source_module,
    created_at: f.created_at,
  }));
  for (let i = 0; i < cleanFindings.length; i += 50) {
    const chunk = cleanFindings.slice(i, i + 50);
    const { error } = await client.database.from('findings').insert(chunk);
    if (error) console.error(`Error inserting findings chunk ${i}:`, error);
    else console.log(`Inserted findings ${i} to ${i + chunk.length}`);
  }

  // 7. Insert Validation Results
  console.log(`Inserting ${data.validation_results.length} validation results...`);
  const cleanValidations = data.validation_results.map(v => ({
    id: v.id,
    case_id: v.case_id,
    rule_id: v.rule_id,
    rule_code: v.rule_code,
    rule_name: v.rule_name,
    category: v.category,
    status: v.status,
    severity: v.severity,
    message: v.message,
    created_at: v.created_at,
  }));
  for (let i = 0; i < cleanValidations.length; i += 50) {
    const chunk = cleanValidations.slice(i, i + 50);
    const { error } = await client.database.from('validation_results').insert(chunk);
    if (error) console.error(`Error inserting validation_results chunk ${i}:`, error);
    else console.log(`Inserted validation_results ${i} to ${i + chunk.length}`);
  }

  console.log('--- ALL REAL OPERATIONAL DATA INGESTED INTO TrustGate AI Billion-1 ---');
}

migrate().catch(console.error);
