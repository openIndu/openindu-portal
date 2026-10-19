import { test, expect } from "@playwright/test";

// Golden values -- curated manually against src/locales/{zh,en}/station.json.
// NOT read from locale JSON (see i18n-test-rework-plan.md 1.1).
const GOLDEN = {
  h1: { zh: "openIndu-station", en: "openIndu-station" },
  navParent: { zh: "AI+视觉", en: "AI + Machine Vision" },
  navChild: { zh: "openIndu-station", en: "openIndu-station" },
  badge: {
    zh: "社区共建 · 即将开源",
    en: "Community-built · Open-sourcing soon",
  },
  capabilityTitles: {
    zh: ["九点手眼标定", "模板匹配 + Blob 双引擎", "双相机协同定位"],
    en: [
      "Nine-Point Hand-Eye Calibration",
      "Template Matching + Blob Dual Engine",
      "Dual-Camera Coordinated Positioning",
    ],
  },
  productTitles: {
    zh: ["双相机精密点胶机", "双平台激光切割机"],
    en: ["Dual-Camera Precision Dispensing Machine", "Dual-Platform Laser Cutting Machine"],
  },
  status: {
    zh: "该平台目前在 openIndu 社区孵化中，即将开源。",
    en: "Currently incubating in the openIndu community; open-sourcing soon.",
  },
} as const;

const LOCALES = [
  { locale: "zh" as const, prefix: "", label: "Chinese" },
  { locale: "en" as const, prefix: "/en", label: "English" },
] as const;

for (const { locale, prefix, label } of LOCALES) {
  test.describe(`openIndu-station Page (${label})`, () => {
    test("should load station page at /vision/station", async ({ page }) => {
      await page.goto(prefix + "/vision/station");

      await expect(page).toHaveURL(prefix + "/vision/station");
      await expect(page.locator("h1")).toContainText(GOLDEN.h1[locale]);
    });

    test("should display the open-sourcing-soon badge", async ({ page }) => {
      await page.goto(prefix + "/vision/station");
      await expect(page.getByText(GOLDEN.badge[locale], { exact: true })).toBeVisible();
    });

    test("should load both screenshots", async ({ page }) => {
      await page.goto(prefix + "/vision/station");

      // The screenshots are the only <figure>s on the page; their URLs are content-hashed
      // by the build, so select by structure rather than by path.
      const images = page.locator("figure img");
      await expect(images).toHaveCount(2);
      for (let i = 0; i < 2; i++) {
        const image = images.nth(i);
        await expect(image).toBeVisible();
        // naturalWidth is 0 for a broken/404 image even though the element renders.
        await expect
          .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
          .toBeGreaterThan(0);
      }
    });

    test("should display all 3 vision capabilities", async ({ page }) => {
      await page.goto(prefix + "/vision/station");

      for (const title of GOLDEN.capabilityTitles[locale]) {
        await expect(page.getByText(title, { exact: true })).toBeVisible();
      }
    });

    test("should display both products", async ({ page }) => {
      await page.goto(prefix + "/vision/station");

      for (const title of GOLDEN.productTitles[locale]) {
        await expect(page.getByText(title, { exact: true })).toBeVisible();
      }
    });

    test("should display the incubating status line", async ({ page }) => {
      await page.goto(prefix + "/vision/station");
      await expect(page.getByText(GOLDEN.status[locale], { exact: true })).toBeVisible();
    });

    test("should reach the station page from the vision nav dropdown", async ({ page }) => {
      await page.goto(prefix + "/vision");

      // The dropdown only renders on the desktop nav (xl breakpoint); the
      // default Desktop Chrome viewport is 1280px wide, so it is present.
      await page.locator("header").getByTestId("nav-products").hover();
      await page.locator("header").getByTestId("nav-station").click();

      await expect(page).toHaveURL(prefix + "/vision/station");
      await expect(page.locator("h1")).toContainText(GOLDEN.h1[locale]);
    });
  });
}
