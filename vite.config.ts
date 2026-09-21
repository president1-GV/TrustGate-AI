import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react() as any],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    // Prevent "process.env is not defined" in browser bundles
    "process.env": "{}",
  },
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 1600,
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
});
