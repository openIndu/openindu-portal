import { test, expect } from "@playwright/test";

const GOLDEN = {
  h1: { zh: "openIndu-studio 介绍", en: "openIndu-studio Overview" },
  stepLabel: { zh: "步骤", en: "Step" },
  firstStepDescriptionSnippet: {
    zh: "根据设备清单与工艺需求拆分电气模组",
    en: "Split electrical modules based on the equipment list and process requirements",
  },
  stepTitles: {
    zh: ["电气模组梳理", "电路图设计", "BOM 清单", "IO 地址规划", "PLC 编程", "HMI 编程"],
    en: [
      "Electrical Module Breakdown",
      "Circuit Diagram Design",
      "BOM List",
      "I/O Address Planning",
      "PLC Programming",
      "HMI Programming",
    ],
  },
} as const;

const LOCALES = [
  { locale: "zh" as const, prefix: "", label: "Chinese" },
  { locale: "en" as const, prefix: "/en", label: "English" },
] as const;

for (const { locale, prefix, label } of LOCALES) {
  test.describe(`openIndu-studio Page (${label})`, () => {
    test("should redirect /workflow to /motion-control/studio (page is public)", async ({
      page,
    }) => {
      await page.goto(prefix + "/workflow");
      // /workflow redirects to the public studio path — no login required
      await expect(page).toHaveURL(prefix + "/motion-control/studio");
    });

    test("should load studio page at /motion-control/studio", async ({ page }) => {
      await page.goto(prefix + "/motion-control/studio");

      await expect(page).toHaveURL(prefix + "/motion-control/studio");
      await expect(page.locator("h1")).toContainText(GOLDEN.h1[locale]);
    });

    test("should display all 6 workflow steps", async ({ page }) => {
      await page.goto(prefix + "/motion-control/studio");

      for (const title of GOLDEN.stepTitles[locale]) {
        await expect(page.getByText(title, { exact: true })).toBeVisible();
      }
    });

    test("should show step badges 1-6", async ({ page }) => {
      await page.goto(prefix + "/motion-control/studio");

      for (let i = 1; i <= 6; i++) {
        await expect(page.getByText(`${GOLDEN.stepLabel[locale]} ${i}`)).toBeVisible();
      }
    });

    test("should expand step description on click", async ({ page }) => {
      await page.goto(prefix + "/motion-control/studio");

      // Click the first workflow step card
      const firstStepTitle = GOLDEN.stepTitles[locale][0];
      const firstCard = page.getByText(firstStepTitle, { exact: true }).locator("..");
      await firstCard.click();

      // The description should now be visible in full
      await expect(page.getByText(GOLDEN.firstStepDescriptionSnippet[locale])).toBeVisible();
    });
  });
}
