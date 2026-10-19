const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const API_BASE = 'https://i8yy29ec.us-east.insforge.app';
const ROOT_DIR = path.resolve(__dirname, '..');

let API_KEY = process.env.INSFORGE_API_KEY || '';
if (!API_KEY) {
  try {
    const proj = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, '.insforge', 'project.json'), 'utf8'));
    API_KEY = proj.api_key || '';
  } catch {}
}

const ALLOWED_ROOT_FILES = new Set([
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'tailwind.config.js',
  'postcss.config.js',
  'vercel.json'
]);

function shouldInclude(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  if (ALLOWED_ROOT_FILES.has(norm)) return true;
  if (norm.startsWith('public/')) return true;
  if (norm.startsWith('src/') && !norm.startsWith('src/test/')) {
    if (norm.endsWith('.ts') || norm.endsWith('.tsx') || norm.endsWith('.css') || norm.endsWith('.json') || norm.endsWith('.svg') || norm.endsWith('.png')) {
      return true;
    }
  }
  return false;
}

function collectFiles(dir, baseDir = dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      if (dir === baseDir) {
        if ([
          'node_modules', '.git', '.venv', 'venv', 'dist', 'tests', 'docs',
          'scratch', 'scripts', 'security', 'migrations', 'ml', 'ai',
          'biometric_exports', 'datasets', 'data', 'logs', '.agents',
          '.insforge', '.trae', 'TrustGate AI Billion', 'deploy-src'
        ].includes(entry.name)) {
          continue;
        }
      } else {
        if (['node_modules', '.git', 'test', '__tests__'].includes(entry.name)) {
          continue;
        }
      }
      results = results.concat(collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (shouldInclude(relPath)) {
        const content = fs.readFileSync(fullPath);
        const sha = crypto.createHash('sha1').update(content).digest('hex');
        results.push({
          fullPath,
          relPath: relPath.replace(/\\/g, '/'),
          sha,
          size: content.length,
          content
        });
      }
    }
  }
  return results;
}

function doRequest(method, endpoint, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`);
    const reqHeaders = {
      'Authorization': `Bearer ${API_KEY}`,
      ...headers
    };
    if (body && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: reqHeaders
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          const json = JSON.parse(raw);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

async function request(method, endpoint, headers = {}, body = null, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await doRequest(method, endpoint, headers, body);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
}

async function main() {
  console.log('1. Collecting source files for TrustGate AI production deployment...');
  const files = collectFiles(ROOT_DIR);
  console.log(`Found ${files.length} production files. Total size: ${(files.reduce((a, b) => a + b.size, 0) / 1024 / 1024).toFixed(2)} MB`);

  console.log('2. Registering deployment manifest with https://i8yy29ec.us-east.insforge.app/api/deployments/direct ...');
  const manifestPayload = {
    files: files.map(f => ({
      path: f.relPath,
      sha: f.sha,
      size: f.size
    }))
  };

  const regRes = await request('POST', '/api/deployments/direct', {}, manifestPayload);
  if (regRes.status !== 201) {
    console.error('Registration failed:', regRes);
    process.exit(1);
  }

  const { id: deploymentId, files: serverFiles } = regRes.data;
  console.log(`Deployment created: ${deploymentId}`);

  console.log('3. Uploading file contents in parallel batches...');
  const fileMap = new Map(files.map(f => [f.relPath, f]));
  const concurrency = 3;
  const toUpload = serverFiles.filter(f => !f.uploadedAt);
  console.log(`Need to upload ${toUpload.length} files (cached: ${serverFiles.length - toUpload.length})`);

  for (let i = 0; i < toUpload.length; i += concurrency) {
    const batch = toUpload.slice(i, i + concurrency);
    await Promise.all(batch.map(async sf => {
      const local = fileMap.get(sf.path);
      if (!local) throw new Error(`Local file not found for ${sf.path}`);
      const uploadRes = await request(
        'PUT',
        `/api/deployments/${deploymentId}/files/${sf.fileId}/content`,
        { 'Content-Type': 'application/octet-stream' },
        local.content
      );
      if (uploadRes.status !== 200) {
        console.error(`Failed to upload ${sf.path}:`, uploadRes);
        throw new Error(`Upload failed for ${sf.path}`);
      }
    }));
    process.stdout.write(`Uploaded ${Math.min(i + concurrency, toUpload.length)}/${toUpload.length}\r`);
  }
  console.log('\nAll files uploaded successfully.');

  console.log('4. Starting production deployment on Vercel project mapped to https://i8yy29ec.insforge.site ...');
  const startRes = await request('POST', `/api/deployments/${deploymentId}/start`, {}, {
    projectSettings: {
      buildCommand: 'npm run build',
      outputDirectory: 'dist'
    },
    envVars: [
      { key: 'VITE_INSFORGE_URL', value: 'https://i8yy29ec.us-east.insforge.app' },
      { key: 'VITE_INSFORGE_ANON_KEY', value: 'anon_1c1ac97b969d1f89dcaa2fe5c5d971b282ef827ce8fec10ce27284935bf044e5' },
      { key: 'VITE_SUPABASE_URL', value: 'https://i8yy29ec.us-east.insforge.app' },
      { key: 'VITE_SUPABASE_ANON_KEY', value: 'anon_1c1ac97b969d1f89dcaa2fe5c5d971b282ef827ce8fec10ce27284935bf044e5' }
    ]
  });

  if (startRes.status !== 200) {
    console.error('Start failed:', startRes);
    process.exit(1);
  }

  console.log('Deployment started! Provider ID:', startRes.data.providerDeploymentId, 'Target URL:', startRes.data.url);

  console.log('5. Monitoring deployment progress...');
  let attempts = 0;
  while (attempts < 120) {
    await new Promise(r => setTimeout(r, 4000));
    attempts++;
    const statusRes = await request('GET', `/api/deployments/${deploymentId}`);
    const st = statusRes.data.status;
    console.log(`[${attempts * 4}s] Status: ${st}`);
    if (st === 'READY') {
      console.log('========================================================');
      console.log(' SUCCESS: DEPLOYMENT READY AT https://i8yy29ec.insforge.site');
      console.log('========================================================');
      return;
    } else if (st === 'ERROR' || st === 'CANCELED') {
      console.error('Deployment ended with status:', st, statusRes.data.metadata?.error);
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
