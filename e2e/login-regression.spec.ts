import { test, expect } from "@playwright/test";

test.describe("Portal login regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/auth/sign-in", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: 200,
          data: {
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            user: { id: 1, phone: "13800000000", nickname: "Test", role: "member" },
          },
        }),
      }),
    );
  });
  test("stores token and redirects after login", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#login-phone", "13800000000");
    await page.fill("#login-code", "888888");
    // Submit requires privacy-consent (added after this test was written).
    await page.locator('input[type="checkbox"]').check();
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/resources/);
    await page.waitForLoadState("networkidle");

    const token = await page.evaluate(() => localStorage.getItem("openindu_portal_token"));
    expect(token).toBeTruthy();
  });

  // Regression: the axios 401 interceptor used to hardcode "/login" (no
  // locale awareness) when building `?redirect=`, and Login.tsx passed that
  // already-prefixed value straight into `navigate()`, which re-adds the
  // router's /en basename -- landing on /en/en/... instead of /en/....
  test("EN sign-in from a locale-prefixed redirect lands on the single-prefixed URL", async ({
    page,
  }) => {
    await page.goto("/en/login?redirect=%2Fen%2Fmotion-control%2Fstudio");
    await page.fill("#login-phone", "13800000000");
    await page.fill("#login-code", "888888");
    await page.locator('input[type="checkbox"]').check();
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/en/motion-control/studio");
    await expect(page.locator("h1")).toContainText("openIndu-studio Overview");
  });
});
