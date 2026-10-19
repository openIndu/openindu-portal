/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // Same JSX transform as the app (tsconfig "jsx": "react-jsx"): tests need no `import React`.
  esbuild: { jsx: "automatic" },
  test: {
    globals: true,
    environment: "jsdom",
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      // Scoped to the modules that carry real unit tests today. Pages, Layout,
      // SEO, i18n glue and the untested UI wrappers are left out until they get
      // coverage — widen this list as they do.
      include: ["src/api/**", "src/store/**", "src/app/components/ui/**", "src/app/utils/**"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/__tests__/**",
        "src/app/components/ui/alert-dialog.tsx",
      ],
      thresholds: {
        // Floor, not target — CI fails only if coverage *drops*. Raise these as
        // the untested api/index.ts paths (chat SSE, the 401 refresh
        // interceptor) gain tests. Target stays 80%.
        statements: 55,
        lines: 55,
        functions: 60,
        branches: 82,
      },
      reporter: ["text", "json"],
    },
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
