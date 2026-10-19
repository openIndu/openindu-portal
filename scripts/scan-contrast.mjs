import { chromium } from "playwright";

/**
 * WCAG contrast scanner.
 *
 * Colours are normalised by painting them onto a 1x1 canvas and reading the
 * pixel back — getComputedStyle returns `oklch(...)` under Tailwind v4, which
 * naive rgb() regex parsing silently turns into garbage numbers.
 */
const URLS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
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

const browser = await chromium.launch({ headless: true });
const report = [];

for (const url of URLS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`http://localhost:4173${url}`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(300);

    const found = await page.evaluate(() => {
      const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      const cache = new Map();
      const toRGB = (css) => {
        if (cache.has(css)) return cache.get(css);
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        const v = [d[0], d[1], d[2], d[3] / 255];
        cache.set(css, v);
        return v;
      };
      const lum = ([r, g, b]) => {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      // Resolve every background colour the text could be sitting on.
      //
      // Two things make the naive version wrong:
      //  - a translucent layer (bg-white/10 over a dark band) must be
      //    composited with what is behind it, not read as solid white;
      //  - a CSS gradient lives in background-image, so backgroundColor is
      //    transparent and a walk upward falls through to the page白, turning
      //    "white text on a dark gradient hero" into a bogus 1:1 failure.
      // Gradients therefore contribute all of their colour stops, and the
      // caller scores against the worst of them — text has to stay legible
      // across the whole sweep, so worst-case is the correct standard.
      const GRAD_STOP =
        /(#[0-9a-f]{3,8}|rgba?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|hsla?\([^)]*\))/gi;
      const effectiveBgs = (el) => {
        const stack = [];
        let e = el;
        let stops = null;
        while (e) {
          const cs = getComputedStyle(e);
          const img = cs.backgroundImage;
          if (img && img !== "none" && /gradient/i.test(img)) {
            const found = img.match(GRAD_STOP);
            if (found && found.length) {
              stops = found
                .map(toRGB)
                .filter((c) => c[3] > 0.5)
                .map((c) => c.slice(0, 3));
              if (stops.length) break; // treat the gradient as the opaque base
              stops = null;
            }
          }
          const [r, g, b, a] = toRGB(cs.backgroundColor);
          if (a > 0) stack.push([r, g, b, a]);
          if (a >= 0.999) break;
          e = e.parentElement;
        }

        const bases = stops && stops.length ? stops : [[255, 255, 255]];
        if (!stack.length) return bases;

        // If a solid layer was found before any gradient, it is the base.
        const solidBase =
          stack[stack.length - 1][3] >= 0.999 ? [stack[stack.length - 1].slice(0, 3)] : bases;
        return solidBase.map((base) => {
          let [br, bgc, bb] = base;
          const start = stack[stack.length - 1][3] >= 0.999 ? stack.length - 2 : stack.length - 1;
          for (let i = start; i >= 0; i--) {
            const [r, g, b, a] = stack[i];
            br = r * a + br * (1 - a);
            bgc = g * a + bgc * (1 - a);
            bb = b * a + bb * (1 - a);
          }
          return [br, bgc, bb];
        });
      };

      const out = [];
      document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,a,li,span,button").forEach((el) => {
        const text = el.textContent?.trim();
        if (!text || text.length < 2 || text.length > 80) return;
        // Only leaf-ish nodes actually paint text.
        if (
          el.children.length &&
          ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        )
          return;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.opacity === "0") return;

        const fg = toRGB(cs.color);
        if (fg[3] < 0.1) return;
        const L1 = lum(fg);
        // Worst stop wins: the text must hold up across the whole background.
        const ratio = Math.min(
          ...effectiveBgs(el).map((bg) => {
            const L2 = lum(bg);
            return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          }),
        );

        const px = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        const large = px >= 24 || (bold && px >= 18.66);
        const need = large ? 3 : 4.5;
        if (ratio < need) {
          out.push({
            tag: el.tagName,
            text: text.slice(0, 34),
            color: cs.color,
            px,
            ratio: +ratio.toFixed(2),
            need,
          });
        }
      });
      return out;
    });

    report.push({ url, fails: found.length, samples: found.slice(0, 5) });
    console.log(
      `${found.length === 0 ? "✅" : "⚠️ "} ${url.padEnd(16)} ${found.length} 处未达 WCAG AA`,
    );
    found
      .slice(0, 4)
      .forEach((f) =>
        console.log(`     ${f.tag} "${f.text}" ${f.color} ${f.px}px → ${f.ratio}:1 (需 ${f.need})`),
      );
  } catch (e) {
    console.log(`❌ ${url}: ${e.message.slice(0, 60)}`);
  }
  await page.close();
}

await browser.close();
const total = report.reduce((n, r) => n + r.fails, 0);
console.log(`\n总计 ${total} 处未达标`);
