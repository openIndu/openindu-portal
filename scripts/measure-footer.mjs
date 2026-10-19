import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
for (const [path, tag] of [
  ["/en/", "en"],
  ["/", "zh"],
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://localhost:4173${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const nav = document.querySelector("footer nav");
    const cols = [...nav.children].map((col, i) => {
      const h = col.querySelector("h3");
      const r = col.getBoundingClientRect();
      const links = [...col.querySelectorAll("a")].map((a) => {
        const ar = a.getBoundingClientRect();
        // A link taller than ~1.6 line-heights has wrapped.
        const lh = parseFloat(getComputedStyle(a).lineHeight) || 20;
        const padY =
          parseFloat(getComputedStyle(a).paddingTop) +
          parseFloat(getComputedStyle(a).paddingBottom);
        const lines = Math.max(1, Math.round((ar.height - padY) / lh));
        return {
          text: a.innerText.replace(/\s+/g, " ").trim().slice(0, 28),
          w: Math.round(ar.width),
          h: Math.round(ar.height),
          lines,
        };
      });
      return { i, heading: h?.innerText ?? "(brand)", colW: Math.round(r.width), links };
    });
    return { navW: Math.round(nav.getBoundingClientRect().width), cols };
  });

  console.log(`\n===== ${tag.toUpperCase()}  (footer nav 宽 ${data.navW}px) =====`);
  for (const c of data.cols) {
    console.log(`[${c.i}] ${c.heading}  列宽 ${c.colW}px`);
    for (const l of c.links) {
      const flag = l.lines > 1 ? `  ← 换行 ${l.lines} 行` : "";
      console.log(
        `      ${String(l.w).padStart(4)}x${String(l.h).padStart(3)}  "${l.text}"${flag}`,
      );
    }
  }
  await page.close();
}
await browser.close();
