#!/usr/bin/env node
/** Full-page screenshots of the pages changed this round, ZH and EN, so the
 *  result can be looked at rather than inferred from a passing scanner. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "screenshots/review";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const routes = [
  "/team",
  "/developers",
  "/pricing",
  "/token-service",
  "/vision/station",
  "/en/team",
  "/en/developers",
  "/en/pricing",
];

for (const r of routes) {
  await page.goto("http://localhost:4173" + r, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const name = (r === "/" ? "home" : r.slice(1)).replace(/\//g, "-");
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("shot", name);
}
await browser.close();
