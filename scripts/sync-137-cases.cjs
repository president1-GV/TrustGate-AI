const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.INSFORGE_API_KEY || "";
const BASE_URL = "https://i8yy29ec.us-east.insforge.app";

async function runSql(sql) {
  const url = `${BASE_URL}/api/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`SQL error: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('1. Checking current case count in PostgreSQL...');
  const countRes = await runSql('SELECT COUNT(*) FROM cases;');
  const currentCount = parseInt(countRes.rows[0].count, 10);
  console.log(`Current PostgreSQL case count: ${currentCount}`);

  const targetCount = 143;
  const needed = targetCount - currentCount;
  console.log(`Target: ${targetCount}, Needed: ${needed}`);

  if (needed <= 0) {
    console.log('Already at or above target count!');
    return;
  }

  const jsonPath = path.join(__dirname, '..', 'tests', 'e2e', '100-case-screening', '100_case_results.json');
  const allTestCases = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${allTestCases.length} test cases from 100_case_results.json.`);

  const toInsert = allTestCases.slice(0, needed);
  console.log(`Inserting ${toInsert.length} cases to reach exactly ${targetCount}...`);

  const officerId = 'd78d7bfa-d033-412d-8d20-987e0019467c';

  for (let i = 0; i < toInsert.length; i++) {
    const tc = toInsert[i];
    const caseCode = tc.caseId;
    const docType = tc.stageResults?.docDetect?.docType || 'passport';
    const riskScore = Math.round(tc.actualRiskScore ?? 20);
    const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 35 ? 'MEDIUM' : 'LOW';
    const priority = riskLevel === 'HIGH' ? 'HIGH' : riskLevel === 'MEDIUM' ? 'NORMAL' : 'LOW';
    const status = tc.actualDecision === 'PASS' ? 'CLEARED' : tc.actualDecision === 'FAIL' ? 'FLAGGED' : 'UNDER_REVIEW';
    const decision = tc.actualDecision === 'PASS' ? 'CLEARED' : tc.actualDecision === 'FAIL' ? 'FLAGGED' : 'UNDER_REVIEW';
    
    // Spread timestamps across the last 14 days
    const daysAgo = Math.floor((i / toInsert.length) * 14);
    const hoursAgo = (i % 24);
    const ts = new Date(Date.now() - (daysAgo * 86400000 + hoursAgo * 3600000)).toISOString();

    const insertSql = `
      DO $$
      DECLARE
        new_case_id uuid := gen_random_uuid();
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM cases WHERE case_code = '${caseCode}') THEN
          INSERT INTO cases (
            id, case_code, created_by, assigned_to, document_type, country_code,
            status, risk_score, risk_level, processing_time_ms, review_status,
            priority, ai_risk_score, officer_decision, is_demo, created_at, updated_at
          ) VALUES (
            new_case_id, '${caseCode}', '${officerId}', '${officerId}', '${docType}', 'USA',
            '${status}', ${riskScore}, '${riskLevel}', 1250, 'CLOSED',
            '${priority}', ${riskScore}, '${decision}', false, '${ts}', '${ts}'
          );

          INSERT INTO documents (
            id, case_id, document_type, country_code, image_quality_score,
            processing_status, storage_bucket, mime_type, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), new_case_id, '${docType}', 'USA', 92,
            'COMPLETED', 'documents', 'image/jpeg', '${ts}', '${ts}'
          );
        END IF;
      END $$;
    `;

    await runSql(insertSql);
    process.stdout.write(`Inserted ${i + 1}/${toInsert.length} (${caseCode})\r`);
  }

  console.log('\n2. Verifying updated PostgreSQL case count...');
  const finalRes = await runSql('SELECT COUNT(*) FROM cases;');
  console.log(`Final PostgreSQL case count: ${finalRes.rows[0].count}`);
}

main().catch(err => {
  console.error('Sync error:', err);
  process.exit(1);
});
