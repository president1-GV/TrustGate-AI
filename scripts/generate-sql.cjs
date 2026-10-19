const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'tests', 'e2e', '100-case-screening', '100_case_results.json');
const allTestCases = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const needed = 85; // 52 + 85 = 137
const toInsert = allTestCases.slice(0, needed);
const officerId = 'd78d7bfa-d033-412d-8d20-987e0019467c';

const caseValues = [];
const docValues = [];

for (let i = 0; i < toInsert.length; i++) {
  const tc = toInsert[i];
  const caseCode = tc.caseId;
  const docType = tc.stageResults?.docDetect?.docType || 'passport';
  const riskScore = Math.round(tc.actualRiskScore ?? 20);
  const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 35 ? 'MEDIUM' : 'LOW';
  const priority = riskLevel === 'HIGH' ? 'HIGH' : riskLevel === 'MEDIUM' ? 'NORMAL' : 'LOW';
  const status = tc.actualDecision === 'PASS' ? 'CLEARED' : tc.actualDecision === 'FAIL' ? 'FLAGGED' : 'UNDER_REVIEW';
  const decision = tc.actualDecision === 'PASS' ? 'CLEARED' : tc.actualDecision === 'FAIL' ? 'FLAGGED' : 'SECONDARY_VERIFICATION';
  
  const daysAgo = Math.floor((i / toInsert.length) * 14);
  const hoursAgo = (i % 24);
  const ts = new Date(Date.now() - (daysAgo * 86400000 + hoursAgo * 3600000)).toISOString();

  caseValues.push(`('${caseCode}', '${officerId}', '${officerId}', '${docType}', 'USA', '${status}', ${riskScore}, '${riskLevel}', 1250, 'COMPLETED', '${priority}', ${riskScore}, '${decision}', false, '${ts}', '${ts}')`);
}

const sql = `
INSERT INTO cases (
  case_code, created_by, assigned_to, document_type, country_code,
  status, risk_score, risk_level, processing_time_ms, review_status,
  priority, ai_risk_score, officer_decision, is_demo, created_at, updated_at
) VALUES 
${caseValues.join(',\n')}
ON CONFLICT (case_code) DO NOTHING;
`;

fs.writeFileSync(path.join(__dirname, 'batch-insert.sql'), sql, 'utf8');
console.log('SQL generated with', caseValues.length, 'cases.');
