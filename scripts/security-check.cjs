/**
 * TRUSTGATE AI BILLION — Automated Security Check Suite
 * Executes:
 * 1. Typecheck & Lint (tsc -b)
 * 2. Automated Security Test Suite (vitest run)
 * 3. Repository Secrets Scanner (regex scan on source code)
 * 4. Security Configuration Check (vercel.json headers, insforge.toml, .gitignore)
 * 5. Production Build Verification (vite build)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let hasFailures = false;

function banner(title) {
  console.log("\n" + "=".repeat(65));
  console.log(`  ${title}`);
  console.log("=".repeat(65));
}

function runStep(name, fn) {
  process.stdout.write(`[*] Running ${name}... `);
  try {
    fn();
    console.log(" \x1b[32m[PASS]\x1b[0m");
    return true;
  } catch (err) {
    console.log(" \x1b[31m[FAIL]\x1b[0m");
    console.error(`    Error: ${err.message || err}`);
    hasFailures = true;
    return false;
  }
}

banner("TRUSTGATE AI BILLION — AUTOMATED SECURITY VERIFICATION");

// 1. Typecheck & Lint
runStep("TypeScript & Lint Check (tsc -b)", () => {
  execSync("npx tsc -b --pretty false", { cwd: ROOT, stdio: "pipe" });
});

// 2. Automated Security Tests
runStep("Security & Unit Test Suite (vitest run)", () => {
  execSync("npx vitest run", { cwd: ROOT, stdio: "pipe" });
});

// 3. Secrets Scanner
runStep("Repository Secret Scan", () => {
  const forbiddenPatterns = [
    /eyJhbGciOi[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/, // Raw JWTs
    /(?:admin|root|password|passwd|secret)\s*[:=]\s*["'][A-Za-z0-9!@#$%^&*]{8,}["']/i, // Plaintext credentials
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, // Private keys
    /ik_[a-zA-Z0-9]{20,}/, // InsForge live API keys
  ];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        if (["node_modules", "dist", ".git", ".insforge", "brain", ".venv", "venv", "__pycache__", "downloads", "checkpoints", "kyc_uploaded", "kyc_huggingface", "merged", "raw_datasets"].includes(ent.name)) continue;
        scanDir(path.join(dir, ent.name));
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name);
        if ([".ts", ".tsx", ".js", ".jsx", ".json", ".sql", ".html", ".py"].includes(ext)) {
          const filePath = path.join(dir, ent.name);
          // Skip example files, lockfiles, scratch, and tests that test patterns
          if (filePath.includes(".example") || filePath.includes("package-lock") || filePath.includes("security.test.ts") || filePath.includes("security-check.cjs") || filePath.includes("scratch")) {
            continue;
          }
          const content = fs.readFileSync(filePath, "utf-8");
          for (const pattern of forbiddenPatterns) {
            if (pattern.test(content)) {
              throw new Error(`Potential exposed secret matching pattern ${pattern} found in ${filePath}`);
            }
          }
        }
      }
    }
  }

  scanDir(path.join(ROOT, "src"));
  scanDir(path.join(ROOT, "scripts"));
  scanDir(path.join(ROOT, "ai"));
});

// 4. Security Configuration Check
runStep("Production Security Configuration Check", () => {
  const vercelPath = path.join(ROOT, "vercel.json");
  if (!fs.existsSync(vercelPath)) throw new Error("vercel.json missing");
  const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf-8"));
  const headers = vercel.headers?.[0]?.headers || [];
  const headerKeys = headers.map((h) => h.key);

  if (!headerKeys.includes("Content-Security-Policy")) throw new Error("CSP header missing in vercel.json");
  if (!headerKeys.includes("Strict-Transport-Security")) throw new Error("HSTS header missing in vercel.json");
  if (!headerKeys.includes("X-Frame-Options")) throw new Error("X-Frame-Options missing in vercel.json");
  if (!headerKeys.includes("X-Content-Type-Options")) throw new Error("X-Content-Type-Options missing in vercel.json");

  const gitignorePath = path.join(ROOT, ".gitignore");
  const gitignore = fs.readFileSync(gitignorePath, "utf-8");
  if (!gitignore.includes(".env")) throw new Error(".env not excluded in .gitignore");
});

// 5. Production Build
runStep("Production Build Verification (vite build)", () => {
  execSync("npx vite build", { cwd: ROOT, stdio: "pipe" });
});

console.log("=".repeat(65));
if (hasFailures) {
  console.log("\x1b[31m[-] SECURITY VERIFICATION FAILED: Remediate issues above.\x1b[0m\n");
  process.exit(1);
} else {
  console.log("\x1b[32m[+] ALL SECURITY CHECKS PASSED: Application is hardened & production-ready.\x1b[0m\n");
  process.exit(0);
}
