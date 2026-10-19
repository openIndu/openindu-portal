import { test, expect, type Page } from "@playwright/test";

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
      await expect(page.getByRole("link", { name: locale === "zh" ? "登录 / 注册" : "Sign in / Sign up" }).last()).toHaveAttribute("href", prefix + "/login");
    });

    test("should have document and software tabs visible when authenticated", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("openindu_portal_token", "test-token");
        localStorage.setItem("openindu_portal_user", JSON.stringify({ id: 1, phone: "13800138000", role: "member" }));
      });
      await page.goto(prefix + "/resources");

      await expect(page.getByRole("button", { name: GOLDEN.documentsTab[locale] })).toBeVisible();
      await expect(page.getByRole("button", { name: GOLDEN.softwareTab[locale] })).toBeVisible();
    });

    test("should display search and filter controls when authenticated", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("openindu_portal_token", "test-token");
        localStorage.setItem("openindu_portal_user", JSON.stringify({ id: 1, phone: "13800138000", role: "member" }));
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
        localStorage.setItem("openindu_portal_user", JSON.stringify({ id: 1, phone: "13800138000", role: "member" }));
      });
      await page.goto(`${prefix}/resources?keyword=EtherCAT`);
      await expect(page.getByPlaceholder(GOLDEN.searchPlaceholder[locale])).toHaveValue("EtherCAT");
    });
  });
}

/**
 * Answers the list API with one item titled after the keyword it was asked for,
 * so the page shows which request's response it is rendering. Returns the
 * keyword and page of every /documents request, in the order they were made.
 */
async function mockResourceList(page: Page, delayFor: (keyword: string) => number) {
  const keywords: string[] = [];
  const pages: number[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/v1/, "");
    let data: unknown = [];
    if (path === "/documents") {
      const keyword = url.searchParams.get("keyword") ?? "";
      keywords.push(keyword);
      const pageNumber = Number(url.searchParams.get("page") ?? 1);
      pages.push(pageNumber);
      await new Promise((resolve) => setTimeout(resolve, delayFor(keyword)));
      const title = `RESULT-FOR-${keyword || "(none)"}`;
      data = { items: [{ id: 1, title }], total: 35, page: pageNumber, page_size: 10 };
    }
    // The page may already have given up on this request (aborted); fulfilling it
    // then throws, which is not what these tests are about.
    await route
      .fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ code: 200, data }),
      })
      .catch(() => {});
  });
  return { keywords, pages };
}

test.describe("Resources search requests", () => {
  const placeholder = GOLDEN.searchPlaceholder.zh;

  test("typing queries once, after a pause, instead of once per keystroke", async ({ page }) => {
    const { keywords } = await mockResourceList(page, () => 20);
    await page.goto("/resources");
    await expect(page.getByText("RESULT-FOR-(none)")).toBeVisible();
    const before = keywords.length;

    await page.getByPlaceholder(placeholder).pressSequentially("plc", { delay: 80 });

    await expect(page.getByText("RESULT-FOR-plc")).toBeVisible();
    expect(keywords.slice(before)).toEqual(["plc"]);
  });

  test("a slow response for an earlier query never replaces the current results", async ({
    page,
  }) => {
    // The answer for "p" arrives long after the one for "plc".
    const { keywords } = await mockResourceList(page, (keyword) => (keyword === "p" ? 1500 : 20));
    await page.goto("/resources");
    await expect(page.getByText("RESULT-FOR-(none)")).toBeVisible();

    const box = page.getByPlaceholder(placeholder);
    await box.fill("p");
    await expect.poll(() => keywords.includes("p")).toBe(true);
    await box.fill("plc");
    await expect(page.getByText("RESULT-FOR-plc")).toBeVisible();

    await page.waitForTimeout(1800); // let the slow, now outdated, response arrive
    await expect(page.getByText("RESULT-FOR-plc")).toBeVisible();
    await expect(page.getByText("RESULT-FOR-p", { exact: true })).toHaveCount(0);
  });

  test("Enter searches at once without a second request, and Search refreshes an unchanged query", async ({
    page,
  }) => {
    const { keywords } = await mockResourceList(page, () => 20);
    await page.goto("/resources");
    await expect(page.getByText("RESULT-FOR-(none)")).toBeVisible();

    const box = page.getByPlaceholder(placeholder);
    await box.fill("modbus");
    await box.press("Enter");
    await expect(page.getByText("RESULT-FOR-modbus")).toBeVisible();

    await page.waitForTimeout(600); // the pending typing pause must not add another request
    expect(keywords.filter((keyword) => keyword === "modbus")).toHaveLength(1);

    const before = keywords.length;
    await page.getByRole("button", { name: GOLDEN.searchButton.zh }).click();
    await expect.poll(() => keywords.length).toBe(before + 1);
  });

  test("a new query goes back to the first page", async ({ page }) => {
    const { pages } = await mockResourceList(page, () => 20);
    await page.goto("/resources");
    await expect(page.getByText("RESULT-FOR-(none)")).toBeVisible();

    await page.getByRole("button", { name: "下一页" }).click();
    await expect.poll(() => pages[pages.length - 1]).toBe(2);

    await page.getByPlaceholder(placeholder).fill("modbus");
    await expect(page.getByText("RESULT-FOR-modbus")).toBeVisible();
    expect(pages[pages.length - 1]).toBe(1);
  });
});
