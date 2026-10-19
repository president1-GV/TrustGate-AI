const https = require('https');
const fs = require('fs');
const path = require('path');

const proj = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.insforge', 'project.json'), 'utf8'));
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');

const anonKeyMatch = env.match(/VITE_INSFORGE_ANON_KEY=([^\r\n]+)/);
const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';

console.log('--- TRUSTGATE AI BILLION-1 BACKEND LIVE AUDIT ---');
console.log('Project Name:', proj.project_name);
console.log('Backend Host:', proj.oss_host);
console.log('App Key:', proj.appkey);
console.log('Has API Key:', Boolean(proj.api_key));
console.log('Has Anon Key:', Boolean(anonKey));

function req(urlStr, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const options = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data.slice(0, 500) });
        }
      });
    });
    r.on('error', (err) => resolve({ error: err.message }));
    r.end();
  });
}

async function run() {
  console.log('\n1. Testing Backend Root Health...');
  const health = await req(`${proj.oss_host}/health`);
  console.log('Health check:', health.status, health.data || health.raw || health.error);

  console.log('\n2. Testing Storage Buckets...');
  const buckets = await req(`${proj.oss_host}/api/storage/buckets`, {
    'Authorization': `Bearer ${proj.api_key}`
  });
  console.log('Buckets:', buckets.status, buckets.data);

  console.log('\n3. Testing Database Tables via PostgREST with Anon Key...');
  // Check screening_cases
  const casesAnon = await req(`${proj.oss_host}/rest/v1/screening_cases?select=count`, {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Range-Unit': 'items',
    'Prefer': 'count=exact'
  });
  console.log('screening_cases (Anon Key):', casesAnon.status, casesAnon.data || casesAnon.raw);

  console.log('\n4. Testing Database Tables via PostgREST with API Key / Service Role...');
  const casesApiKey = await req(`${proj.oss_host}/rest/v1/screening_cases?select=count`, {
    'apikey': proj.api_key,
    'Authorization': `Bearer ${proj.api_key}`,
    'Prefer': 'count=exact'
  });
  console.log('screening_cases (API Key):', casesApiKey.status, casesApiKey.data || casesApiKey.raw);

  console.log('\n5. Querying Database Cases Count & Recent Cases...');
  const recentCases = await req(`${proj.oss_host}/rest/v1/screening_cases?select=id,case_id,document_number,status,created_at&order=created_at.desc&limit=5`, {
    'apikey': proj.api_key,
    'Authorization': `Bearer ${proj.api_key}`
  });
  console.log('Recent 5 cases:', recentCases.status, Array.isArray(recentCases.data) ? `Found ${recentCases.data.length} records. Latest: ${JSON.stringify(recentCases.data[0])}` : recentCases.data || recentCases.raw);

  console.log('\n6. Checking Audit Logs Table...');
  const auditLogs = await req(`${proj.oss_host}/rest/v1/audit_logs?select=count`, {
    'apikey': proj.api_key,
    'Authorization': `Bearer ${proj.api_key}`,
    'Prefer': 'count=exact'
  });
  console.log('audit_logs count:', auditLogs.status, auditLogs.data || auditLogs.raw);

  console.log('\n7. Checking Auth Users / Profiles...');
  const users = await req(`${proj.oss_host}/rest/v1/users?select=id,email,role,badge_number,full_name&limit=10`, {
    'apikey': proj.api_key,
    'Authorization': `Bearer ${proj.api_key}`
  });
  console.log('users profiles:', users.status, Array.isArray(users.data) ? `Found ${users.data.length} profiles: ` + users.data.map(u => `${u.role}: ${u.email} (${u.badge_number})`).join(', ') : users.data || users.raw);

  console.log('\n8. Checking Member Access Requests...');
  const accessReqs = await req(`${proj.oss_host}/rest/v1/member_access_requests?select=id,status,target_role,created_at&limit=5`, {
    'apikey': proj.api_key,
    'Authorization': `Bearer ${proj.api_key}`
  });
  console.log('member_access_requests:', accessReqs.status, Array.isArray(accessReqs.data) ? `Found ${accessReqs.data.length} requests` : accessReqs.data || accessReqs.raw);
}

run();
