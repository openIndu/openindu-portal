import { test, expect } from "@playwright/test";

const GOLDEN = {
  heading: { zh: "账号设置", en: "Account Settings" },
} as const;

const LOCALES = [
  { locale: "zh" as const, prefix: "", label: "Chinese" },
  { locale: "en" as const, prefix: "/en", label: "English" },
] as const;

for (const { locale, prefix, label } of LOCALES) {
  test.describe(`Account Settings (${label})`, () => {
    test("should show personal center with masked phone after login", async ({ page }) => {
      await page.route("**/api/v1/auth/me", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            code: 200,
            data: { id: 1, phone: "13800138000", nickname: "Tom", role: "member" },
          }),
        }),
      );
      await page.addInitScript(() => {
        localStorage.setItem("openindu_portal_token", "test-token");
        localStorage.setItem(
          "openindu_portal_user",
          JSON.stringify({ id: 1, phone: "13800138000", nickname: "Tom", role: "member" }),
        );
      });
      await page.goto(prefix + "/");

      await expect(page.locator("header").getByRole("link", { name: /Tom/ })).toBeVisible();
      await page.locator("header").getByRole("link", { name: /Tom/ }).click();

      await expect(page).toHaveURL(prefix + "/account");
      await expect(page.getByRole("heading", { name: GOLDEN.heading[locale] })).toBeVisible();
      await expect(page.getByText("138****8000")).toBeVisible();
      await expect(page.getByText("13800138000")).toHaveCount(0);
    });
  });
}
