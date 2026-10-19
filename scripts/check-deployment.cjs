const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const proj = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, '.insforge', 'project.json'), 'utf8'));

function req(method, endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${proj.oss_host}${endpoint}`);
    const options = {
      method,
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${proj.api_key}`,
        'Content-Type': 'application/json'
      }
    };
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    r.on('error', reject);
    r.end();
  });
}

async function check() {
  console.log('Checking recent deployments...');
  const res = await req('GET', '/api/deployments');
  console.log('Deployments status:', res.status);
  console.log('Deployments response:', JSON.stringify(res.data, null, 2));
}

check();
