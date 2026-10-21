import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react() as any],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    // Prevent "process.env is not defined" in browser bundles
    "process.env": "{}",
  },
  server: {
    port: 5173,
    // SECURITY: In dev, only allow connections from localhost.
    // Prevents accidental network exposure of the dev server.
    host: "127.0.0.1",
  },
  build: {
    chunkSizeWarningLimit: 1600,
    // SECURITY: Use esbuild minifier and strip developer noise from production bundles.
    // console.log / console.debug / console.info are removed — they can leak internal
    // state, user IDs, token fragments, and database schema details in browser DevTools.
    // console.warn and console.error are kept for operational visibility.
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-charts": ["recharts"],
          "vendor-ui": ["lucide-react", "framer-motion"],
          "vendor-insforge": ["@insforge/sdk"],
          "vendor-tesseract": ["tesseract.js"],
        },
      },
    },
  },
  // SECURITY: In production, drop console.log/debug/info/trace via esbuild.
  // This must be set at the top level (not inside build.rollupOptions) for esbuild.
  ...(mode === "production"
    ? {
        esbuild: {
          drop: ["debugger"],
          pure: ["console.log", "console.debug", "console.info", "console.trace"],
        },
      }
    : {}),
}));
