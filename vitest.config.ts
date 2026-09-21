import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react() as any],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    "process.env": "{}",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/src/test/integration.test.ts",
    ],
  },
});
