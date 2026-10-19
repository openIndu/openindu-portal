import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Surfaced in the footer's "last updated" line. Hard-coding that date in
  // the locale files meant it silently went stale between releases.
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router"],
          "vendor-ui": ["lucide-react", "react-markdown", "remark-gfm"],
          "vendor-i18n": ["i18next", "react-i18next"],
          "vendor-others": ["axios"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
