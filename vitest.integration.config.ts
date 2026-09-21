/**
 * Vitest config for integration tests only.
 * Runs against the live InsForge backend in Node.js environment.
 *
 * Usage:
 *   node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts
 */
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    "process.env": "{}",
  },
  test: {
    environment: "node",
    globals: true,
    // No setup file — integration tests use the real SDK, no mocks
    include: ["src/test/integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 15_000,
  },
});
