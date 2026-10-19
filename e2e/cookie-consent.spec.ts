import { expect, test } from "@playwright/test";

const consentKey = "openindu_cookie_consent";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => localStorage.removeItem(key), consentKey);
});

test("reject blocks page-view analytics and persists", async ({ page }) => {
  let tracks = 0;
  await page.route("**/api/v1/visits/track", async (route) => {
    tracks += 1;
    await route.fulfill({ json: { code: 0, data: { tracked: true } } });
  });

  await page.goto("/");
  await expect(page.getByTestId("cookie-consent-banner")).toBeVisible();
  expect(tracks).toBe(0);
  await page.getByTestId("cookie-reject").click();
  await page.getByTestId("nav-architecture").click();
  await page.waitForTimeout(200);
  expect(tracks).toBe(0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "null").analytics,
      consentKey,
    ),
  ).toBe(false);
});

test("accept enables page-view analytics once for the current route", async ({ page }) => {
  let tracks = 0;
  await page.route("**/api/v1/visits/track", async (route) => {
    tracks += 1;
    await route.fulfill({ json: { code: 0, data: { tracked: true } } });
  });

  await page.goto("/");
  expect(tracks).toBe(0);
  await page.getByTestId("cookie-accept").click();
  await expect.poll(() => tracks).toBe(1);
  await expect(page.getByTestId("cookie-consent-banner")).toBeHidden();
});

test("manager saves preferences and footer reopens them", async ({ page }) => {
  await page.route("**/api/v1/visits/track", (route) =>
    route.fulfill({ json: { code: 0, data: { tracked: true } } }),
  );
  await page.goto("/");
  await page.getByTestId("cookie-manage").click();
  await expect(page.getByTestId("cookie-settings-dialog")).toBeVisible();
  await expect(page.getByLabel(/Necessary|必要存储/)).toBeDisabled();
  await page.getByTestId("cookie-analytics").check();
  await page.getByTestId("cookie-save").click();
  await page.getByTestId("cookie-settings").scrollIntoViewIfNeeded();
  await page.getByTestId("cookie-settings").click();
  await expect(page.getByTestId("cookie-analytics")).toBeChecked();
});

test("English route renders English privacy controls", async ({ page }) => {
  await page.goto("/en/");
  await expect(
    page.getByRole("heading", { name: "openIndu Community Respects Your Privacy" }),
  ).toBeVisible();
  await expect(page.getByTestId("cookie-accept")).toHaveText("Accept All");
  await expect(page.getByTestId("cookie-consent-banner")).toContainText(
    "By selecting Reject All, analytics remains disabled.",
  );
  await expect(page.getByTestId("cookie-consent-banner").getByRole("link")).toHaveAttribute(
    "href",
    "/en/cookies",
  );
  await expect(page.getByTestId("cookie-actions").getByRole("button")).toHaveText([
    "Accept All",
    "Reject All",
    "Manage Cookies",
  ]);
});

for (const { width, path, label } of [
  { width: 320, path: "/resources", label: "每页数量" },
  { width: 390, path: "/resources", label: "每页数量" },
  { width: 600, path: "/resources", label: "每页数量" },
  { width: 640, path: "/resources", label: "每页数量" },
  { width: 768, path: "/resources", label: "每页数量" },
  { width: 1024, path: "/resources", label: "每页数量" },
  { width: 1366, path: "/resources", label: "每页数量" },
  { width: 320, path: "/en/resources", label: "Items per page" },
  { width: 390, path: "/en/resources", label: "Items per page" },
]) {
  test(`consent notice does not cover resource pagination at ${width}px on ${path}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(path);

    const banner = page.getByTestId("cookie-consent-banner");
    const perPage = page.getByRole("combobox", { name: label });
    await expect(banner).toHaveCSS("position", "fixed");
    await perPage.scrollIntoViewIfNeeded();

    const bannerBox = await banner.boundingBox();
    const perPageBox = await perPage.boundingBox();
    expect(bannerBox).not.toBeNull();
    expect(perPageBox).not.toBeNull();
    // a full-width bar, flush with the bottom edge of the viewport
    const viewport = page.viewportSize()!;
    expect(Math.abs(bannerBox!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(bannerBox!.width - viewport.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(bannerBox!.y + bannerBox!.height - viewport.height)).toBeLessThanOrEqual(1);
    for (const button of await page.getByTestId("cookie-actions").getByRole("button").all()) {
      await expect(button).toBeInViewport();
    }
    await expect(perPage).toBeInViewport();
    const isTopmost = () =>
      perPage.evaluate((select) => {
        const box = select.getBoundingClientRect();
        return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === select;
      });
    expect(await isTopmost()).toBe(true);

    // Focus and #anchors scroll an element to the end of the viewport; it must stop above the bar.
    await perPage.evaluate((select) => select.scrollIntoView({ block: "end" }));
    expect(await isTopmost()).toBe(true);
  });
}

const reservedVar = () => document.documentElement.style.getPropertyValue("--cookie-banner-height");

for (const { width, path } of [
  { width: 320, path: "/about" },
  { width: 390, path: "/en/about" },
  { width: 768, path: "/about" },
  { width: 1366, path: "/" },
  { width: 1366, path: "/en/" },
]) {
  test(`the bar reserves its own room and the footer stays reachable at ${width}px on ${path}`, async ({
    page,
  }) => {
    const height = 800;
    await page.setViewportSize({ width, height });
    await page.goto(path);
    const banner = page.getByTestId("cookie-consent-banner");
    await expect(banner).toBeVisible();

    // The room it takes is kept as bottom padding of the page, and it never takes more
    // than 45% of the viewport (beyond that it scrolls inside itself).
    const bannerBox = (await banner.boundingBox())!;
    const reserved = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.body).paddingBottom),
    );
    expect(Math.abs(reserved - bannerBox.height)).toBeLessThanOrEqual(1);
    expect(bannerBox.height).toBeLessThanOrEqual(height * 0.45 + 1);

    // Scrolled to the very end, the whole footer is above the bar.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footerBottom = await page
      .locator("footer")
      .evaluate((element) => element.getBoundingClientRect().bottom);
    const barTop = (await banner.boundingBox())!.y;
    expect(footerBottom).toBeLessThanOrEqual(barTop + 1);
  });
}

test("on a short narrow screen all three buttons stay in view and only the text scrolls", async ({
  page,
}) => {
  const height = 568;
  await page.setViewportSize({ width: 320, height });
  await page.goto("/en/");
  const banner = page.getByTestId("cookie-consent-banner");
  await expect(banner).toBeVisible();

  const buttons = await page.getByTestId("cookie-actions").getByRole("button").all();
  expect(buttons).toHaveLength(3);
  for (const button of buttons) await expect(button).toBeInViewport({ ratio: 1 });

  expect((await banner.boundingBox())!.height).toBeLessThanOrEqual(height * 0.45 + 1);
  const textScrolls = await banner
    .getByRole("heading")
    .evaluate(
      (heading) => heading.parentElement!.scrollHeight > heading.parentElement!.clientHeight,
    );
  expect(textScrolls).toBe(true);
});

test("the settings dialog is stacked above the bar, not under it", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/en/");
  await page.getByTestId("cookie-manage").click();
  const dialog = page.getByTestId("cookie-settings-dialog");
  await expect(dialog).toBeVisible();

  // A modal makes the page behind it inert, so hit-testing cannot show who paints on top;
  // compare the stacking order itself.
  const zIndex = (selector: string) =>
    page.evaluate((s) => Number(getComputedStyle(document.querySelector(s)!).zIndex), selector);
  expect(await zIndex('[data-testid="cookie-consent-banner"]')).toBeLessThan(
    await zIndex('[data-testid="cookie-settings-dialog"]'),
  );

  await page.getByTestId("cookie-analytics").check();
  await page.getByTestId("cookie-save").click();
  await expect(page.getByTestId("cookie-consent-banner")).toBeHidden();
});

test("the open mobile menu is stacked above the bar and its last link is reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("cookie-consent-banner")).toBeVisible();

  await page.getByRole("button", { name: "打开导航菜单" }).click();
  const menu = page.locator("#mobile-menu");
  await expect(menu).toBeVisible();
  const lastLink = menu.getByRole("link").last();
  await lastLink.scrollIntoViewIfNeeded();
  await expect(lastLink).toBeInViewport({ ratio: 1 });

  const isTopmost = await lastLink.evaluate((link) => {
    const box = link.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return link.contains(hit);
  });
  expect(isTopmost).toBe(true);
});

test("choosing a preference removes the bar and releases the room it reserved", async ({
  page,
}) => {
  await page.goto("/about");
  const banner = page.getByTestId("cookie-consent-banner");
  await expect(banner).toBeVisible();
  expect(await page.evaluate(reservedVar)).toMatch(/^\d+px$/);

  await page.getByTestId("cookie-reject").click();
  await expect(banner).toBeHidden();
  expect(await page.evaluate(reservedVar)).toBe("");
  expect(await page.evaluate(() => getComputedStyle(document.body).paddingBottom)).toBe("0px");
});

test("a visitor who already chose gets neither the bar nor the reserved room", async ({ page }) => {
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          necessary: true,
          analytics: false,
          updatedAt: "2000-01-01T00:00:00.000Z",
        }),
      ),
    consentKey,
  );
  await page.goto("/about");
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.getByTestId("cookie-consent-banner")).toHaveCount(0);
  expect(await page.evaluate(reservedVar)).toBe("");
  expect(await page.evaluate(() => getComputedStyle(document.body).paddingBottom)).toBe("0px");
});
