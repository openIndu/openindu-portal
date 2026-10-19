import { chromium } from "playwright";

const PAGES = process.argv.slice(2).length
  ? process.argv.slice(2).map((u) => ({ url: u, name: u.replace(/\W+/g, "_") || "home" }))
  : [
      { url: "/", name: "home" },
      { url: "/architecture", name: "architecture" },
      { url: "/motion-control", name: "motion-control" },
    ];

const browser = await chromium.launch({ headless: true });
for (const p of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`http://localhost:4173${p.url}`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `screenshots/visual-eval/survey-${p.name}-fold.png` });
    const of = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    console.log(`shot ${p.name}${of.s > of.c ? "  ❌ 横向溢出" : ""}`);
  } catch (e) {
    console.log(`FAIL ${p.name}: ${e.message.slice(0, 50)}`);
  }
  await page.close();
}
await browser.close();
