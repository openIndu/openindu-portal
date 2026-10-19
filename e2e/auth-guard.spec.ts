import { test, expect } from "@playwright/test";

const GOLDEN = {
  // Was "文档与软件下载" -- the page's actual current heading is "下载中心"
  // (product copy changed at some point; this test wasn't updated).
  resourcesHeading: { zh: "下载中心", en: "Downloads" },
  studioHeading: { zh: "openIndu-studio 介绍", en: "openIndu-studio Overview" },
} as const;

const LOCALES = [
  { locale: "zh" as const, prefix: "", label: "Chinese" },
  { locale: "en" as const, prefix: "/en", label: "English" },
] as const;

for (const { locale, prefix, label } of LOCALES) {
  test.describe(`Auth Guard (${label})`, () => {
    test("should load /resources without login (page is now public)", async ({ page }) => {
      await page.goto(prefix + "/resources");
      // Resources is publicly accessible; no redirect to login
      await expect(page).toHaveURL(prefix + "/resources");
      // Scoped to h1 -- the same text also appears in the nav link and footer.
      await expect(page.locator("h1")).toContainText(GOLDEN.resourcesHeading[locale]);
    });

    test("should redirect /workflow to /motion-control/studio", async ({ page }) => {
      await page.goto(prefix + "/workflow");
      // Old /workflow route redirects to the new public path
      await expect(page).toHaveURL(prefix + "/motion-control/studio");
    });

    test("should show resources page when authenticated as member", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("openindu_portal_token", "test-token");
        localStorage.setItem(
          "openindu_portal_user",
          JSON.stringify({ id: 1, phone: "13800138000", role: "member" }),
        );
      });
      await page.goto(prefix + "/resources");

      // Should stay on resources (not redirect to login)
      await expect(page).toHaveURL(prefix + "/resources");
      await expect(page.locator("h1")).toContainText(GOLDEN.resourcesHeading[locale]);
    });

    test("should show openIndu-studio page when navigating /workflow", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("openindu_portal_token", "test-token");
        localStorage.setItem(
          "openindu_portal_user",
          JSON.stringify({ id: 1, phone: "13800138000", role: "member" }),
        );
      });
      await page.goto(prefix + "/workflow");

      // /workflow redirects to /motion-control/studio
      await expect(page).toHaveURL(prefix + "/motion-control/studio");
      await expect(page.locator("h1")).toContainText(GOLDEN.studioHeading[locale]);
    });
  });
}
