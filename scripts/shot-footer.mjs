import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
for (const [path, tag] of [
  ["/", "zh"],
  ["/en/", "en"],
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://localhost:4173${path}`, { waitUntil: "networkidle" });
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.locator("footer").screenshot({ path: `screenshots/visual-eval/footer-${tag}.png` });
  const cols = await page.evaluate(() => document.querySelector("footer nav")?.children.length);
  console.log(`${tag}: 页脚栏目 ${cols} 个`);
  await page.close();
}
await browser.close();
