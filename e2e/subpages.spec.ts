import { test, expect } from "@playwright/test";

// Golden values -- curated manually against src/locales/{zh,en}/*.json and
// docs/i18n-glossary.md. NOT read from locale JSON (see i18n-test-rework-plan.md 1.1).
const GOLDEN = {
  motionControl: {
    h1: { zh: "AI+运动控制", en: "AI + Motion Control" },
    launchedBadge: { zh: "正式推出", en: "Generally Available" },
    mitsubishi: { zh: "三菱PLC", en: "Mitsubishi PLC" },
    siemens: { zh: "西门子PLC", en: "Siemens PLC" },
  },
  vision: {
    h1: { zh: "AI+视觉", en: "AI + Machine Vision" },
  },
  iiot: {
    h1: { zh: "openIndu-platform 社区项目", en: "A Community IIoT Project" },
    architectureHeading: { zh: "技术架构", en: "Technical Architecture" },
    wechatFollowAbsent: { zh: "关注微信公众号", en: "Follow us on WeChat" },
  },
  infrastructure: {
    h1: { zh: "AI+基础设施", en: "AI + Infrastructure" },
    // Composite "label: value" phrase, not bare "Live" -- bare "Live" is a
    // substring of "deLIVEring" in the hero paragraph (Playwright getByText
    // is case-insensitive substring match), causing a strict-mode collision.
    statusLine: { zh: "状态: 已上线", en: "Status: Live" },
    modelPlatformLink: { zh: "访问模型平台", en: "Visit the Model Platform" },
  },
  comingSoonBadge: { zh: "敬请期待", en: "Coming soon" },
} as const;

const LOCALES = [
  { locale: "zh" as const, prefix: "", label: "Chinese" },
  { locale: "en" as const, prefix: "/en", label: "English" },
] as const;

for (const { locale, prefix, label } of LOCALES) {
  test.describe(`Motion Control Page (${label})`, () => {
    test("should load the motion control page", async ({ page }) => {
      await page.goto(prefix + "/motion-control");
      await expect(page.locator("h1")).toContainText(GOLDEN.motionControl.h1[locale]);
    });

    test("should display launched badge", async ({ page }) => {
      await page.goto(prefix + "/motion-control");
      await expect(
        page.getByText(GOLDEN.motionControl.launchedBadge[locale], { exact: true }).first(),
      ).toBeVisible();
      await expect(page.getByText(GOLDEN.comingSoonBadge[locale], { exact: true })).toHaveCount(0);
    });

    test("should display PLC brand cards", async ({ page }) => {
      await page.goto(prefix + "/motion-control");
      await expect(page.getByText(GOLDEN.motionControl.mitsubishi[locale])).toBeVisible();
      await expect(page.getByText(GOLDEN.motionControl.siemens[locale])).toBeVisible();
    });
  });

  test.describe(`Vision Page (${label})`, () => {
    test("should load the vision page", async ({ page }) => {
      await page.goto(prefix + "/vision");
      await expect(page.locator("h1")).toContainText(GOLDEN.vision.h1[locale]);
    });

    test("should display 'coming soon' badge", async ({ page }) => {
      await page.goto(prefix + "/vision");
      await expect(
        page.getByText(GOLDEN.comingSoonBadge[locale], { exact: true }).first(),
      ).toBeVisible();
    });
  });

  test.describe(`IIoT Platform Page (${label})`, () => {
    test("should load the iiot platform page", async ({ page }) => {
      await page.goto(prefix + "/iiot-platform");
      await expect(page.locator("h1")).toContainText(GOLDEN.iiot.h1[locale]);
    });

    test("should display architecture section", async ({ page }) => {
      await page.goto(prefix + "/iiot-platform");
      await expect(page.getByText(GOLDEN.iiot.architectureHeading[locale])).toBeVisible();
    });

    test("should not display WeChat QR block (moved to home)", async ({ page }) => {
      await page.goto(prefix + "/iiot-platform");
      await expect(page.getByText(GOLDEN.iiot.wechatFollowAbsent[locale])).toHaveCount(0);
    });
  });

  test.describe(`Infrastructure Page (${label})`, () => {
    test("should load the infrastructure page", async ({ page }) => {
      await page.goto(prefix + "/infrastructure");
      await expect(page.locator("h1")).toContainText(GOLDEN.infrastructure.h1[locale]);
    });

    test("should display status badge", async ({ page }) => {
      await page.goto(prefix + "/infrastructure");
      await expect(page.getByText(GOLDEN.infrastructure.statusLine[locale])).toBeVisible();
    });

    test("should have access link to model platform", async ({ page }) => {
      await page.goto(prefix + "/infrastructure");
      const link = page.getByRole("link", {
        name: GOLDEN.infrastructure.modelPlatformLink[locale],
      });
      await expect(link).toBeVisible();
    });
  });
}
