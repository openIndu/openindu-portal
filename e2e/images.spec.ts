import { test, expect } from "@playwright/test";

// The product screenshots are imported through Vite (src/assets/product-images). A wrong
// path or a missing file only shows up as a broken image, which nothing else notices.
for (const path of ["/", "/iiot-platform", "/vision/station"]) {
  test(`every image on ${path} loads`, async ({ page }) => {
    await page.goto(path);
    // `load` does not wait for a lazily loaded route: until its chunk has arrived the page
    // has no <img> at all, and the count below would be 0.
    await page.locator("img").first().waitFor({ state: "attached" });

    const { count, broken } = await page.evaluate(async () => {
      const images = Array.from(document.images);
      // Most are loading="lazy" and some sit off-screen (carousel slides): load them now.
      images.forEach((image) => (image.loading = "eager"));
      const failures = await Promise.all(
        images.map((image) =>
          image.decode().then(
            () => null,
            () => image.currentSrc || image.src,
          ),
        ),
      );
      return { count: images.length, broken: failures.filter(Boolean) };
    });

    expect(count).toBeGreaterThan(0);
    expect(broken).toEqual([]);
  });
}
