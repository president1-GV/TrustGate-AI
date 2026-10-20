import fs from "fs";
import path from "path";
import nodeCrypto from "node:crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RFC4122_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// 1. Extract and test genId from src/lib/offlineDb.ts
const offlineDbSource = fs.readFileSync(path.resolve(__dirname, "../src/lib/offlineDb.ts"), "utf8");
const genIdMatch = offlineDbSource.match(/function genId\(\): string \{([\s\S]*?)\n\}/);
if (!genIdMatch) {
  console.error("FAIL: Could not locate genId in src/lib/offlineDb.ts");
  process.exit(1);
}
const offlineGenId = new Function(genIdMatch[1]);

// 2. Extract generateUuid from src/lib/authRequests.ts
const authRequestsSource = fs.readFileSync(path.resolve(__dirname, "../src/lib/authRequests.ts"), "utf8");
const authUuidMatch = authRequestsSource.match(/export function generateUuid\(\): string \{([\s\S]*?)\n\}/);
if (!authUuidMatch) {
  console.error("FAIL: Could not locate generateUuid in src/lib/authRequests.ts");
  process.exit(1);
}
const authGenUuid = new Function(authUuidMatch[1]);

function testGenerator(name, fn, mode = "default") {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");

  try {
    if (mode === "getRandomValues_only") {
      Object.defineProperty(globalThis, "crypto", {
        value: {
          getRandomValues: (arr) => nodeCrypto.getRandomValues(arr),
        },
        configurable: true,
        writable: true,
      });
    } else if (mode === "math_random_only") {
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }

    const COUNT = 10000;
    const set = new Set();
    let invalidCount = 0;

    const start = performance.now();
    for (let i = 0; i < COUNT; i++) {
      const uuid = fn();
      if (!RFC4122_V4_REGEX.test(uuid)) {
        invalidCount++;
      }
      set.add(uuid);
    }
    const elapsed = (performance.now() - start).toFixed(2);

    const collisionCount = COUNT - set.size;
    const passed = invalidCount === 0 && collisionCount === 0;

    console.log(
      `[${passed ? "PASS" : "FAIL"}] ${name} (mode: ${mode}): ` +
      `generated=${COUNT}, valid_rfc4122=${COUNT - invalidCount}/${COUNT}, ` +
      `collisions=${collisionCount}, time=${elapsed}ms`
    );

    if (!passed) {
      throw new Error(`Test failed for ${name} in mode ${mode}`);
    }
  } finally {
    try {
      Object.defineProperty(globalThis, "crypto", originalDescriptor);
    } catch {}
  }
}

console.log("=== EMPIRICAL CHALLENGE 2: UUID GENERATOR RIGOR (10,000 PER BATCH) ===");
testGenerator("src/lib/offlineDb.ts genId()", offlineGenId, "default");
testGenerator("src/lib/offlineDb.ts genId()", offlineGenId, "getRandomValues_only");
testGenerator("src/lib/offlineDb.ts genId()", offlineGenId, "math_random_only");

testGenerator("src/lib/authRequests.ts generateUuid()", authGenUuid, "default");
testGenerator("src/lib/authRequests.ts generateUuid()", authGenUuid, "getRandomValues_only");
testGenerator("src/lib/authRequests.ts generateUuid()", authGenUuid, "math_random_only");

console.log("ALL UUID GENERATOR EMPIRICAL STRESS TESTS PASSED (60,000 UUIDs total, 100% compliant, 0 collisions).");
