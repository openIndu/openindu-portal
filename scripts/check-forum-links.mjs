import { chromium } from "playwright";

const BASE = "https://forum.openindu.com/c/process/7";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1500);

  // Discourse renders subcategories and topic titles client-side.
  const found = await page.evaluate(() => {
    const cats = [...document.querySelectorAll('a[href*="/c/process/"]')]
      .map((a) => ({ href: a.getAttribute("href"), text: a.innerText.trim().slice(0, 30) }))
      .filter((x) => x.text);
    const topics = [...document.querySelectorAll("a.title, a.raw-topic-link")]
      .map((a) => a.innerText.trim().slice(0, 50))
      .filter(Boolean);
    return { cats, topics: topics.slice(0, 15) };
  });

  const seen = new Set();
  console.log("=== /c/process/ 下的分类链接 ===");
  for (const c of found.cats) {
    if (seen.has(c.href)) continue;
    seen.add(c.href);
    console.log(`  ${c.href}   "${c.text}"`);
  }
  console.log("\n=== 版块内主题 ===");
  found.topics.forEach((t) => console.log(`  ${t}`));
} catch (e) {
  console.log("FAIL:", e.message.slice(0, 150));
}
await browser.close();
