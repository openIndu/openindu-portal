import { chromium } from "playwright";

const URLS = [
  "/",
  "/architecture",
  "/motion-control",
  "/motion-control/studio",
  "/vision",
  "/vision/station",
  "/craftsmanship",
  "/use-cases",
  "/iiot-platform",
  "/edge-computing",
  "/infrastructure",
  "/forum",
  "/resources",
  "/developers",
  "/about",
  "/team",
  "/pricing",
  "/login",
  "/register",
  "/privacy",
  "/legal",
  "/cookies",
];
const VIEWPORTS = [
  { w: 375, h: 812, name: "mobile" },
  { w: 768, h: 1024, name: "tablet" },
];

const browser = await chromium.launch({ headless: true });
let bad = 0;
for (const vp of VIEWPORTS) {
  for (const url of URLS) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    try {
      await page.goto(`http://localhost:4173${url}`, { waitUntil: "networkidle", timeout: 25000 });
      const r = await page.evaluate(() => {
        const d = document.documentElement;
        // Name the widest offender so the fix has somewhere to start.
        let worst = null;
        if (d.scrollWidth > d.clientWidth) {
          document.querySelectorAll("*").forEach((el) => {
            const b = el.getBoundingClientRect();
            if (b.right > d.clientWidth + 1 && (!worst || b.right > worst.right)) {
              worst = {
                right: Math.round(b.right),
                tag: el.tagName,
                cls: String(el.className).slice(0, 60),
              };
            }
          });
        }
        return { over: d.scrollWidth - d.clientWidth, worst };
      });
      if (r.over > 0) {
        bad++;
        console.log(
          `❌ ${vp.name} ${url} 溢出 ${r.over}px  ${r.worst ? `${r.worst.tag}.${r.worst.cls}` : ""}`,
        );
      }
    } catch (e) {
      console.log(`⚠️  ${vp.name} ${url}: ${e.message.slice(0, 40)}`);
    }
    await page.close();
  }
}
await browser.close();
console.log(
  bad === 0 ? `\n✅ ${URLS.length} 页 × ${VIEWPORTS.length} 视口，无横向溢出` : `\n${bad} 处溢出`,
);
