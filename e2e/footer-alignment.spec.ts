import { expect, test, type Locator } from "@playwright/test";

// The footer's bottom bar stacks the copyright line, the ICP filing and the contact phone. The
// filing and phone links are 44px touch targets, so the copyright line gets the same minimum
// height: the three rows must share one pitch -- also while the copyright wraps, which it does at
// 320-390px -- and, where the language switcher sits beside them (the `sm` breakpoint and up), it
// lines up with the copyright line instead of floating against the middle of the block.
for (const { width, path } of [
  { width: 320, path: "/" },
  { width: 390, path: "/en/" },
  { width: 639, path: "/" },
  { width: 640, path: "/en/" },
  { width: 1024, path: "/" },
  { width: 1366, path: "/en/" },
]) {
  test(`footer bottom bar rows share one 44px pitch at ${width}px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(path);

    const footer = page.locator("footer");
    const centerY = async (locator: Locator) => {
      const box = (await locator.boundingBox())!;
      return box.y + box.height / 2;
    };

    const copyright = footer.locator("p", { hasText: "©" });
    const filing = footer.locator("p", { has: page.locator('a[href*="beian.miit.gov.cn"]') });
    const phone = footer.locator("p", { has: page.locator('a[href^="tel:"]') });
    const first = await centerY(copyright);
    const second = await centerY(filing);
    const third = await centerY(phone);
    expect(Math.abs(second - first - 44)).toBeLessThanOrEqual(1);
    expect(Math.abs(third - second - 44)).toBeLessThanOrEqual(1);

    if (width >= 640) {
      const switcher = footer.locator('nav:has(> [aria-current="true"])');
      expect(Math.abs((await centerY(switcher)) - first)).toBeLessThanOrEqual(1);
    }
  });
}
