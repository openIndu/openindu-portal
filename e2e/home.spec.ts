import { test, expect } from "@playwright/test";

// ─── Golden-value table ───
// Curated manually against src/locales/{zh,en}/home.json and
// docs/i18n-glossary.md. NOT read from locale JSON at test time --
// that would make the test tautological (see design/architecture/
// i18n-test-rework-plan.md section 1.1).

const GOLDEN = {
  heroTitleLine1: {
    zh: "一栈贯通，开放智造",
    en: "One Stack, Open Manufacturing",
  },
  heroTitleLine2: {
    zh: "共建工业自动化的端到端开源生态",
    en: "Build an End-to-End Open Ecosystem for Industrial Automation",
  },
  heroSubtitle: {
    zh: "分享工艺，共建工具，推动视觉、控制与工业数据协同。",
    en: "Share process knowledge, build tools together, and advance collaboration across vision, control, and industrial data.",
  },
  stackTitles: {
    zh: ["工艺知识库 (Forum)", "编程与组态层 (openIndu-studio)", "硬件与 OS 层 (PLC Experiment)"],
    en: [
      "Craftsmanship Knowledge Base (Forum)",
      "Programming Layer (openIndu-studio)",
      "Hardware & OS Layer (PLC Experiment)",
    ],
  },
  stepsHeading: { zh: "三步掌握openIndu社区", en: "Three Steps to openIndu" },
  stepTitles: {
    zh: ["理解全栈架构", "选择行业场景", "选择产品工具"],
    en: ["Understand the full stack", "Pick your industry scenario", "Choose your tools"],
  },
  showcaseHeading: { zh: "明星项目推荐", en: "Product Interfaces" },
  knowledgeHeading: { zh: "工艺知识众包库", en: "A Crowdsourced Process Library" },
  openSourceHeading: { zh: "开放协作，欢迎参与", en: "Open Collaboration — Come Build With Us" },
  ctaHeading: { zh: "加入 openIndu 社区", en: "Join the openIndu Community" },
  wechatHeading: { zh: "微信扫码关注公众号", en: "Follow us on WeChat" },
  wechatAlt: { zh: "openIndu 微信公众号二维码", en: "openIndu WeChat QR code" },
} as const;

// The two list-valued entries are read directly (GOLDEN.stepTitles[locale]); gv() is for single strings.
type TextKey = Exclude<keyof typeof GOLDEN, "stackTitles" | "stepTitles">;

function gv(key: TextKey, locale: "zh" | "en") {
  return GOLDEN[key][locale];
}

// ─── Locale parameterization ───

const LOCALES = [
  { locale: "zh" as const, prefix: "", label: "Chinese" },
  { locale: "en" as const, prefix: "/en", label: "English" },
] as const;

for (const { locale, prefix, label } of LOCALES) {
  test.describe(`Home Page (${label})`, () => {
    // ─── Tier 3: smoke ───

    test("loads without errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(prefix + "/");
      await expect(page.locator("h1").first()).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("title tag mentions openIndu", async ({ page }) => {
      await page.goto(prefix + "/");
      await expect(page).toHaveTitle(/openIndu/);
    });

    // ─── Tier 1: golden-value copy ───

    test("displays current community positioning", async ({ page }) => {
      await page.goto(prefix + "/");
      // Scoped to <h1> -- the tagline is deliberately echoed in the footer
      // description prose, so an unscoped getByText matches both.
      const hero = page.locator("h1");
      await expect(hero).toContainText(gv("heroTitleLine1", locale));
      await expect(hero).toContainText(gv("heroTitleLine2", locale));
      await expect(page.getByText(gv("heroSubtitle", locale))).toBeVisible();
    });

    test("keeps the hero title readable on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(prefix + "/");
      const secondLine = page.locator("h1 span").nth(1);
      await expect(secondLine).toBeVisible();
      const dimensions = await secondLine.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    });

    test("mobile navigation locks scrolling and closes with Escape", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(prefix + "/");
      const menuButton = page.getByRole("button", {
        name: locale === "zh" ? "打开导航菜单" : "Open navigation menu",
      });
      await menuButton.click();
      await expect(
        page.getByRole("navigation", {
          name: locale === "zh" ? "移动端导航" : "Mobile navigation",
        }),
      ).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("navigation", {
          name: locale === "zh" ? "移动端导航" : "Mobile navigation",
        }),
      ).toBeHidden();
      await expect(menuButton).toBeFocused();
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
    });

    test("displays the ecosystem stack", async ({ page }) => {
      await page.goto(prefix + "/");
      const main = page.locator("main");
      for (const title of GOLDEN.stackTitles[locale]) {
        await expect(main.getByText(title, { exact: true })).toBeVisible();
      }
      await expect(main.getByText("openIndu-studio", { exact: true }).first()).toBeVisible();
      await expect(main.getByText(/openIndu-cim \/ openIndu-platform/).first()).toBeVisible();
    });

    test("displays the three-step guide", async ({ page }) => {
      await page.goto(prefix + "/");
      await expect(page.getByText(gv("stepsHeading", locale))).toBeVisible();
      for (const title of GOLDEN.stepTitles[locale]) {
        await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
      }
    });

    test("displays the product showcase carousel", async ({ page }) => {
      await page.goto(prefix + "/");
      const carousel = page.getByRole("region", { name: gv("showcaseHeading", locale) });
      await expect(carousel).toBeVisible();
      const nextLabel = locale === "zh" ? "下一张" : "Next slide";
      await expect(carousel.getByRole("link").first()).toBeVisible();
      await carousel.getByRole("button", { name: nextLabel }).click();
      await expect(carousel.getByRole("link").first()).toBeVisible();
    });

    test("displays knowledge sharing and open collaboration sections", async ({ page }) => {
      await page.goto(prefix + "/");
      await expect(page.getByText(gv("knowledgeHeading", locale))).toBeVisible();
      await expect(page.getByText(gv("openSourceHeading", locale))).toBeVisible();
    });

    test("displays WeChat QR block next to CTA", async ({ page }) => {
      await page.goto(prefix + "/");
      await expect(page.getByText(gv("ctaHeading", locale))).toBeVisible();
      await expect(page.getByText(gv("wechatHeading", locale))).toBeVisible();
      await expect(page.locator(`img[alt="${gv("wechatAlt", locale)}"]`)).toBeVisible();
    });

    // ─── Tier 2: structural ───

    test("displays navigation links in header", async ({ page }) => {
      await page.goto(prefix + "/");
      const nav = page.locator("header nav");
      await expect(nav).toBeVisible();

      const testids = [
        "nav-home",
        "nav-architecture",
        "nav-use-cases",
        "nav-craftsmanship",
        "nav-products",
        "nav-forum",
        "nav-downloads",
      ];
      for (const testid of testids) {
        await expect(page.locator("header").getByTestId(testid).first()).toBeVisible();
      }
    });

    test("displays footer with copyright", async ({ page }) => {
      await page.goto(prefix + "/");
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      // Brand name -- invariant across locales.
      await expect(footer).toContainText("openIndu Community");
      const quickLinks = footer.getByTestId("footer-quick-links");
      const expectedHrefs = [
        prefix || "/",
        `${prefix}/architecture`,
        `${prefix}/use-cases`,
        `${prefix}/craftsmanship`,
        `${prefix}/resources`,
      ];
      for (const href of expectedHrefs) {
        await expect(quickLinks.locator(`a[href="${href}"]`)).toHaveCount(1);
      }
      await expect(quickLinks.locator('a[href$="/motion-control"]')).toHaveCount(0);
      await expect(quickLinks.locator('a[href$="/vision"]')).toHaveCount(0);
      await expect(quickLinks.locator('a[href$="/developers"]')).toHaveCount(0);
    });
  });
}
