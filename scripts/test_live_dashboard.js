import { createClient } from '@insforge/sdk';

const BACKEND_URL = 'https://i8yy29ec.us-east.insforge.app';
const ANON_KEY = 'anon_1c1ac97b969d1f89dcaa2fe5c5d971b282ef827ce8fec10ce27284935bf044e5';

async function test() {
  const c = createClient({ baseUrl: BACKEND_URL, anonKey: ANON_KEY });
  const { data: auth, error: authErr } = await c.auth.signInWithPassword({
    email: 'officer@trustgate.ai',
    password: 'TrustGate@SIH2026'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }

  const { data: cases, error } = await c.database
    .from('cases')
    .select('id, case_code, risk_level, status, risk_score, created_at, document_type')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cases:', error);
    return;
  }
  console.log('Successfully fetched cases from PostgreSQL! Total count:', cases.length);
  console.log('Latest 5 cases:');
  cases.slice(0, 5).forEach(c => console.log('  -', c.case_code, '| Doc:', c.document_type, '| Risk:', c.risk_level, '| Status:', c.status, '| Created:', c.created_at));

  console.log('\n14-Day Timeline Breakdown:');
  const now = new Date();
  let totalIn14Days = 0;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayCases = cases.filter(c => c.created_at && c.created_at.slice(0, 10) === dateStr);
    totalIn14Days += dayCases.length;
    console.log('  Date:', dateStr, '-> Cases:', dayCases.length);
  }
  console.log('Total cases in last 14 days:', totalIn14Days);

  const lowCount = cases.filter(c => c.risk_level === 'LOW').length;
  const medCount = cases.filter(c => c.risk_level === 'MEDIUM').length;
  const highCount = cases.filter(c => c.risk_level === 'HIGH').length;
  console.log(`Risk Distribution: Low: ${lowCount}, Medium: ${medCount}, High: ${highCount}`);
}

test();
