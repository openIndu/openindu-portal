import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "screenshots/visual-eval/mobile-fold.png" });
// Check nothing overflows horizontally
const overflow = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}));
console.log(
  "overflow check:",
  JSON.stringify(overflow),
  overflow.scrollW > overflow.clientW ? "❌ 横向溢出" : "✅ 无横向溢出",
);
await browser.close();
