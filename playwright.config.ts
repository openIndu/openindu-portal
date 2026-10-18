import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // prerender.spec.ts targets the production build via a separate config
  // (playwright.prerender.config.ts) -- it asserts on prerendered titles/
  // canonicals that don't exist on this dev-server-backed run.
  testIgnore: "prerender.spec.ts",
  // On CI a stray test.only must fail the run, and one retry turns a one-off blip into a
  // visible "flaky" entry (with a trace, see `use.trace`) instead of a red build.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_BASE_URL
      ? `npm run dev -- --host 127.0.0.1 --port ${new URL(process.env.PLAYWRIGHT_BASE_URL).port}`
      : "npm run dev -- --host 127.0.0.1 --port 3000 --strictPort",
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
