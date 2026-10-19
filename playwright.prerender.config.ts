import { defineConfig, devices } from "@playwright/test";

/**
 * Separate config for the prerender/SEO project — deliberately NOT merged
 * into playwright.config.ts's webServer array. Playwright starts every
 * entry in a `webServer` array unconditionally for any invocation of that
 * config, project filter or not; folding a production build in there
 * would make every routine `npx playwright test` run one. Run this one
 * separately (see e2e/prerender.spec.ts's header comment and
 * design/architecture/i18n-test-rework-plan.md section 4.3 — intended as
 * its own, slower CI job after the main suite).
 *
 * `npm run build` is a REQUIRED, SEPARATE step before this config, not
 * chained into webServer.command:
 *   npm run build && npx playwright test --config=playwright.prerender.config.ts
 *
 * Why not chain it (tried first, reverted): `npm run build`'s last step
 * (scripts/prerender.mjs) starts and stops its own internal preview
 * server on port 4173 to do the Puppeteer rendering. Keeping that lifecycle
 * outside Playwright's process tree makes failures easier to attribute and
 * leaves this webServer responsible only for serving the completed dist/.
 *
 * Both the server and readiness probe use an explicit IPv4 loopback address.
 * This avoids localhost resolution differences and keeps HTTP proxy settings
 * from intercepting Playwright's local readiness request.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "prerender.spec.ts",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "prerender",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Assumes `npm run build` already ran (see file header) -- just serves
    // the resulting dist/. Deliberately a different port from
    // prerender.mjs's own internal preview server (4173) to avoid any
    // chance of colliding with a not-yet-released one from the build step.
    command: "npm run preview:prerender-test",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
