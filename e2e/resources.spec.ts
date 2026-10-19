import { test, expect } from "@playwright/test";

const GOLDEN = {
  // Was "文档与软件下载" -- the page's actual current heading is "下载中心".
  heading: { zh: "下载中心", en: "Downloads" },
  documentsTab: { zh: "文档", en: "Documents" },
  softwareTab: { zh: "软件", en: "Software" },
  searchPlaceholder: { zh: "输入关键词搜索资源", en: "Search resources by keyword" },
  searchButton: { zh: "搜索", en: "Search" },
} as const;

const LOCALES = [
  { locale: "zh" as const, prefix: "", label: "Chinese" },
  { locale: "en" as const, prefix: "/en", label: "English" },
] as const;

for (const { locale, prefix, label } of LOCALES) {
  test.describe(`Resources Page (${label})`, () => {
    test("should load resources page without login", async ({ page }) => {
      await page.goto(prefix + "/resources");
      // Page is public — should NOT redirect to login
      await expect(page).toHaveURL(prefix + "/resources");
      // Scoped to h1 -- the same text also appears in the nav link and footer.
      await expect(page.locator("h1")).toContainText(GOLDEN.heading[locale]);
      await expect(
        page
          .getByRole("link", { name: locale === "zh" ? "登录 / 注册" : "Sign in / Sign up" })
          .last(),
      ).toHaveAttribute("href", prefix + "/login");
    });

    test("should have document and software tabs visible when authenticated", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("openindu_portal_token", "test-token");
        localStorage.setItem(
          "openindu_portal_user",
          JSON.stringify({ id: 1, phone: "13800138000", role: "member" }),
        );
      });
      await page.goto(prefix + "/resources");

      await expect(page.getByRole("button", { name: GOLDEN.documentsTab[locale] })).toBeVisible();
      await expect(page.getByRole("button", { name: GOLDEN.softwareTab[locale] })).toBeVisible();
    });

    test("should display search and filter controls when authenticated", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("openindu_portal_token", "test-token");
        localStorage.setItem(
          "openindu_portal_user",
          JSON.stringify({ id: 1, phone: "13800138000", role: "member" }),
        );
      });
      await page.goto(prefix + "/resources");

      const searchInput = page.getByPlaceholder(GOLDEN.searchPlaceholder[locale]);
      await expect(searchInput).toBeVisible();

      const searchButton = page.getByRole("button", { name: GOLDEN.searchButton[locale] });
      await expect(searchButton).toBeVisible();
    });

    test("hydrates the search field from the structured search URL", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("openindu_portal_token", "test-token");
        localStorage.setItem(
          "openindu_portal_user",
          JSON.stringify({ id: 1, phone: "13800138000", role: "member" }),
        );
      });
      await page.goto(`${prefix}/resources?keyword=EtherCAT`);
      await expect(page.getByPlaceholder(GOLDEN.searchPlaceholder[locale])).toHaveValue("EtherCAT");
    });
  });
}
