const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGET = path.resolve(ROOT, "deploy-src");

if (fs.existsSync(TARGET)) {
  fs.rmSync(TARGET, { recursive: true, force: true });
}
fs.mkdirSync(TARGET, { recursive: true });

// Copy individual config files
const filesToCopy = [
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "tailwind.config.js",
  "postcss.config.js",
  "index.html",
  "vercel.json",
  ".env",
];

for (const file of filesToCopy) {
  const srcPath = path.join(ROOT, file);
  const dstPath = path.join(TARGET, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dstPath);
    console.log(`Copied ${file}`);
  }
}

// Copy public directory
function copyDir(src, dst, filter) {
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (filter && !filter(entry.name, path.join(src, entry.name))) continue;
    const srcEntry = path.join(src, entry.name);
    const dstEntry = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcEntry, dstEntry, filter);
    } else {
      fs.copyFileSync(srcEntry, dstEntry);
    }
  }
}

if (fs.existsSync(path.join(ROOT, "public"))) {
  copyDir(path.join(ROOT, "public"), path.join(TARGET, "public"));
  console.log("Copied public directory");
}

if (fs.existsSync(path.join(ROOT, "src"))) {
  // Exclude test directory from production bundle to reduce file count and deployment time
  copyDir(path.join(ROOT, "src"), path.join(TARGET, "src"), (name) => name !== "test");
  console.log("Copied src directory (excluding test files)");
}

console.log(`\nDeployment source prepared at: ${TARGET}`);
