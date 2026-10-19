import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:4173/en/", { waitUntil: "networkidle" });

const r = await page.evaluate(() => {
  // Measure each footer link's *natural* (unwrapped) width, plus the width of
  // its ZH marker, so we can tell exactly which column width would fit.
  const out = [];
  document.querySelectorAll("footer nav a").forEach((a) => {
    const probe = a.cloneNode(true);
    probe.style.cssText =
      "position:absolute;visibility:hidden;white-space:nowrap;width:auto;max-width:none";
    document.body.appendChild(probe);
    const natural = probe.getBoundingClientRect().width;
    const pill = probe.querySelector("span");
    const pillW = pill ? pill.getBoundingClientRect().width : 0;
    probe.remove();
    out.push({
      text: a.innerText.replace(/\s+/g, " ").trim().slice(0, 26),
      natural: Math.round(natural),
      pill: Math.round(pillW),
      textOnly: Math.round(natural - pillW),
    });
  });
  // Grid arithmetic for candidate layouts.
  const navW = document.querySelector("footer nav").getBoundingClientRect().width;
  const gap = 32;
  const layouts = {};
  for (const [name, tracks, brand] of [
    ["现状 7格/品牌2格", 7, 2],
    ["6格/品牌2格", 6, 2],
    ["6格/品牌1格", 6, 1],
    ["5格/品牌1格", 5, 1],
  ]) {
    const cells = (navW - gap * (tracks - 1)) / tracks;
    layouts[name] = Math.round(cells);
  }
  return { out, navW: Math.round(navW), layouts };
});

console.log(`footer nav 宽 ${r.navW}px\n`);
console.log("各方案下单个链接栏宽度:");
for (const [k, v] of Object.entries(r.layouts)) console.log(`  ${k.padEnd(20)} ${v}px`);
console.log("\n链接自然宽度（不换行时所需）:");
r.out
  .filter((x) => x.pill > 0 || x.natural > 120)
  .sort((a, b) => b.natural - a.natural)
  .forEach((x) =>
    console.log(
      `  ${String(x.natural).padStart(4)}px  (文字 ${x.textOnly} + 徽章 ${x.pill})  "${x.text}"`,
    ),
  );

await browser.close();
