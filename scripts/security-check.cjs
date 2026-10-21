/**
 * TRUSTGATE AI BILLION — Automated Security Check Suite v2.0
 * Executes:
 * 1. TypeScript typecheck (tsc -b)
 * 2. Automated Security Test Suite (vitest run)
 * 3. Repository Secrets Scanner (regex scan on source code)
 * 4. Security Configuration Check (vercel.json headers, .gitignore)
 * 5. Token Storage Safety Check (no JWTs in localStorage)
 * 6. Privilege Escalation Check (OfficerSwitcher role-rank guard)
 * 7. CSP Localhost Leak Check (no localhost in production CSP)
 * 8. Production Build Verification (vite build)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let hasFailures = false;
let passCount = 0;
let failCount = 0;

function banner(title) {
  console.log("\n" + "=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70));
}

function runStep(name, fn) {
  process.stdout.write(`[*] ${name}... `);
  try {
    fn();
    console.log("\x1b[32m[PASS]\x1b[0m");
    passCount++;
    return true;
  } catch (err) {
    console.log("\x1b[31m[FAIL]\x1b[0m");
    console.error(`    \x1b[33m${err.message || err}\x1b[0m`);
    hasFailures = true;
    failCount++;
    return false;
  }
}

function readSrc(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

banner("TRUSTGATE AI BILLION — AUTOMATED SECURITY VERIFICATION v2.0");

// ── 1. TypeScript Typecheck ──────────────────────────────────────────────────
runStep("TypeScript & Lint Check (tsc -b)", () => {
  execSync("npx tsc -b --pretty false", { cwd: ROOT, stdio: "pipe" });
});

// ── 2. Automated Security Tests ──────────────────────────────────────────────
runStep("Security & Unit Test Suite (vitest run)", () => {
  execSync("npx vitest run src/test/security.test.ts", { cwd: ROOT, stdio: "pipe" });
});

// ── 3. Repository Secrets Scanner ────────────────────────────────────────────
runStep("Repository Secret Scan", () => {
  const forbiddenPatterns = [
    { re: /eyJhbGciOi[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/, label: "Raw JWT" },
    { re: /(?:admin|root|password|passwd|secret)\s*[:=]\s*["'][A-Za-z0-9!@#$%^&*]{8,}["']/i, label: "Plaintext credential" },
    { re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, label: "Private key" },
    { re: /ik_[a-zA-Z0-9]{20,}/, label: "InsForge service-role key" },
    { re: /service_role/, label: "service_role key reference" },
  ];

  const SKIP_DIRS = new Set([
    "node_modules", "dist", ".git", ".insforge", "brain", ".venv", "venv",
    "__pycache__", "downloads", "checkpoints", "kyc_uploaded", "kyc_huggingface",
    "merged", "raw_datasets", "scratch", "deploy-src",
  ]);
  const SKIP_FILES = new Set([
    ".example", "package-lock", "security.test.ts", "security-check.cjs",
    "scratch", "SECURITY", "AUDIT", "DEBUG",
  ]);

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        scanDir(path.join(dir, ent.name));
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name);
        if (![".ts", ".tsx", ".js", ".jsx", ".json", ".sql", ".html", ".py"].includes(ext)) continue;
        const filePath = path.join(dir, ent.name);
        if ([...SKIP_FILES].some((s) => filePath.includes(s))) continue;
        const content = fs.readFileSync(filePath, "utf-8");
        for (const { re, label } of forbiddenPatterns) {
          if (re.test(content)) {
            throw new Error(`${label} pattern found in: ${filePath.replace(ROOT, "")}`);
          }
        }
      }
    }
  }

  scanDir(path.join(ROOT, "src"));
  scanDir(path.join(ROOT, "scripts"));
  scanDir(path.join(ROOT, "functions"));
});

// ── 4. Security Configuration Check ─────────────────────────────────────────
runStep("Production Security Headers Check (vercel.json)", () => {
  const vercel = JSON.parse(readSrc("vercel.json"));
  const headers = vercel.headers?.[0]?.headers || [];
  const headerMap = Object.fromEntries(headers.map((h) => [h.key, h.value]));

  const required = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
    "X-Permitted-Cross-Domain-Policies",
  ];

  for (const key of required) {
    if (!headerMap[key]) throw new Error(`Missing security header: ${key}`);
  }

  // Verify HSTS has a long max-age
  const hsts = headerMap["Strict-Transport-Security"] || "";
  const maxAge = parseInt((hsts.match(/max-age=(\d+)/) || [])[1] || "0", 10);
  if (maxAge < 31536000) throw new Error(`HSTS max-age too short: ${maxAge}s (minimum 1 year)`);

  // Verify frame-ancestors is set to 'none'
  const csp = headerMap["Content-Security-Policy"] || "";
  if (!csp.includes("frame-ancestors 'none'")) throw new Error("CSP missing: frame-ancestors 'none'");
  if (!csp.includes("base-uri 'self'")) throw new Error("CSP missing: base-uri 'self'");
  if (!csp.includes("form-action 'self'")) throw new Error("CSP missing: form-action 'self'");
});

runStep(".gitignore Safety Check", () => {
  const gitignore = readSrc(".gitignore");
  const required = [".env", "*.pem", "*.key", "cli_secrets.txt", "credentials."];
  for (const entry of required) {
    if (!gitignore.includes(entry)) throw new Error(`.gitignore missing entry: ${entry}`);
  }
});

// ── 5. Token Storage Safety Check ────────────────────────────────────────────
runStep("JWT Token Storage: sessionStorage (not localStorage)", () => {
  // No file should set tg_access_token in localStorage after our fix
  const files = [
    "src/lib/insforge.ts",
    "src/providers/AuthProvider.tsx",
    "src/lib/db.ts",
  ];
  for (const f of files) {
    const content = readSrc(f);
    // Detect any localStorage.setItem call for the access token
    if (/localStorage\.setItem\(['"']tg_access_token/.test(content)) {
      throw new Error(`${f} still writes tg_access_token to localStorage`);
    }
  }
});

runStep("Session Cache: sessionStorage preferred over localStorage", () => {
  const authProvider = readSrc("src/providers/AuthProvider.tsx");
  // Should read sessionStorage first for the session cache
  const sessionRead = authProvider.indexOf("sessionStorage.getItem(\"tg_authenticated_session\")");
  const localRead = authProvider.indexOf("localStorage.getItem(\"tg_authenticated_session\")");
  if (sessionRead === -1) throw new Error("AuthProvider.tsx does not read from sessionStorage for session cache");
  if (localRead !== -1 && localRead < sessionRead) {
    throw new Error("AuthProvider.tsx reads localStorage before sessionStorage — sessionStorage should take priority");
  }
});

// ── 6. Privilege Escalation Guard Check ──────────────────────────────────────
runStep("OfficerSwitcher: role-rank ceiling enforced", () => {
  const switcher = readSrc("src/components/layout/OfficerSwitcherModal.tsx");
  if (!switcher.includes("canSwitch")) {
    throw new Error("OfficerSwitcherModal.tsx missing canSwitch() role-rank guard");
  }
  if (!switcher.includes("targetRank <= userRank")) {
    throw new Error("OfficerSwitcherModal.tsx missing rank comparison (targetRank <= userRank)");
  }
  if (switcher.includes("setSession") && !switcher.includes("canSwitch(profile)")) {
    throw new Error("OfficerSwitcherModal.tsx calls setSession without canSwitch check");
  }
});

runStep("Login Rate Limiter: brute-force protection present", () => {
  const authProvider = readSrc("src/providers/AuthProvider.tsx");
  if (!authProvider.includes("checkLoginAllowed")) {
    throw new Error("AuthProvider.tsx missing checkLoginAllowed() rate limiter");
  }
  if (!authProvider.includes("recordFailedAttempt")) {
    throw new Error("AuthProvider.tsx missing recordFailedAttempt() for failed logins");
  }
  if (!authProvider.includes("MAX_LOGIN_ATTEMPTS")) {
    throw new Error("AuthProvider.tsx missing MAX_LOGIN_ATTEMPTS constant");
  }
});

// ── 7. CSP Localhost Leak Check ───────────────────────────────────────────────
runStep("Production CSP: no localhost endpoints exposed", () => {
  const vercel = JSON.parse(readSrc("vercel.json"));
  const headers = vercel.headers?.[0]?.headers || [];
  const csp = headers.find((h) => h.key === "Content-Security-Policy")?.value || "";
  if (csp.includes("localhost") || csp.includes("127.0.0.1")) {
    throw new Error("Production CSP in vercel.json exposes localhost/127.0.0.1 — development endpoint leaked to production");
  }
});

runStep("index.html CSP: no localhost endpoints exposed", () => {
  const html = readSrc("index.html");
  // Extract the CSP meta tag value
  const match = html.match(/Content-Security-Policy['"]\s+content="([^"]+)"/);
  if (!match) throw new Error("index.html CSP meta tag not found");
  const csp = match[1];
  if (csp.includes("localhost") || csp.includes("127.0.0.1")) {
    throw new Error("index.html CSP meta tag exposes localhost — remove before deploying");
  }
});

runStep("Error Sanitizer: stack trace patterns blocked", () => {
  const security = readSrc("src/lib/security.ts");
  if (!security.includes("at\\s+\\w+\\s*\\(")) {
    // Check for the raw string version
    if (!security.includes("\\s+at\\s+\\w+")) {
      throw new Error("security.ts sanitizeErrorMessage() does not strip JS stack traces");
    }
  }
  if (!security.includes("node_modules")) {
    throw new Error("security.ts sanitizeErrorMessage() does not strip node_modules paths");
  }
});

// ── 8. Production Build Verification ─────────────────────────────────────────
runStep("Production Build Verification (vite build)", () => {
  execSync("npx vite build", { cwd: ROOT, stdio: "pipe" });
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(70));
console.log(`  Results: \x1b[32m${passCount} passed\x1b[0m  /  \x1b[31m${failCount} failed\x1b[0m`);
console.log("=".repeat(70));

if (hasFailures) {
  console.log("\x1b[31m[-] SECURITY VERIFICATION FAILED — remediate issues above before deploying.\x1b[0m\n");
  process.exit(1);
} else {
  console.log("\x1b[32m[+] ALL SECURITY CHECKS PASSED — application is hardened and production-ready.\x1b[0m\n");
  process.exit(0);
}
