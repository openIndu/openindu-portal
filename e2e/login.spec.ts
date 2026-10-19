import { test, expect } from "@playwright/test";

const GOLDEN = {
  heading: { zh: "手机号登录 / 注册", en: "Sign in / Sign up with Phone" },
  phonePlaceholder: { zh: "请输入 11 位手机号", en: "Enter your 11-digit phone number" },
  sendCode: { zh: "发送验证码", en: "Send Code" },
  submit: { zh: "登录 / 注册", en: "Sign in / Sign up" },
  invalidPhoneSnippet: { zh: "11 位", en: "11-digit" },
} as const;

const LOCALES = [
  { locale: "zh" as const, prefix: "", label: "Chinese" },
  { locale: "en" as const, prefix: "/en", label: "English" },
] as const;

for (const { locale, prefix, label } of LOCALES) {
  test.describe(`Login Page (${label})`, () => {
    test("should load the login page", async ({ page }) => {
      await page.goto(prefix + "/login");
      await expect(page).toHaveTitle(/openIndu/);
      await expect(page.getByRole("heading", { name: GOLDEN.heading[locale] })).toBeVisible();
    });

    test("should display phone input field", async ({ page }) => {
      await page.goto(prefix + "/login");
      const phoneInput = page.locator("#login-phone");
      await expect(phoneInput).toBeVisible();
      await expect(phoneInput).toHaveAttribute("placeholder", GOLDEN.phonePlaceholder[locale]);
    });

    test("should display code input and send button", async ({ page }) => {
      await page.goto(prefix + "/login");
      const codeInput = page.locator("#login-code");
      await expect(codeInput).toBeVisible();

      const sendButton = page.getByRole("button", { name: GOLDEN.sendCode[locale] });
      await expect(sendButton).toBeVisible();
    });

    test("should have submit button disabled when inputs are empty", async ({ page }) => {
      await page.goto(prefix + "/login");
      const submitButton = page.getByRole("button", { name: GOLDEN.submit[locale] });
      await expect(submitButton).toBeDisabled();
    });

    test("should enable submit when valid phone, code, and privacy consent are given", async ({
      page,
    }) => {
      await page.goto(prefix + "/login");
      await page.fill("#login-phone", "13800138000");
      await page.fill("#login-code", "123456");
      // Submit also requires the privacy-consent checkbox (added after this
      // test was first written) -- without it canSubmit stays false forever.
      await page.locator('input[type="checkbox"]').check();

      const submitButton = page.getByRole("button", { name: GOLDEN.submit[locale] });
      await expect(submitButton).toBeEnabled();
    });

    test("should show error for invalid phone format", async ({ page }) => {
      await page.goto(prefix + "/login");
      await page.fill("#login-phone", "123");

      const sendButton = page.getByRole("button", { name: GOLDEN.sendCode[locale] });
      // Button should still be clickable — clicking triggers validation
      await sendButton.click();

      const error = page.locator(".text-red-700");
      await expect(error).toBeVisible();
      await expect(error).toContainText(GOLDEN.invalidPhoneSnippet[locale]);
    });
  });
}
