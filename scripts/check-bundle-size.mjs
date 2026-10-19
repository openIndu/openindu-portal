#!/usr/bin/env node
/**
 * Fails when the JS + CSS a first-time visitor must download for the entry HTML
 * (the entry script, its modulepreloads and the stylesheets) grows past a budget.
 * Route chunks are not counted: they load when their route is visited.
 *
 * Usage:   node scripts/check-bundle-size.mjs [distDir]
 * Budget:  BUNDLE_BUDGET_KB (gzip, kB = 1000 bytes, the unit Vite's build report uses).
 *
 * The budget sits a little above today's size on purpose: it is there to catch a
 * heavy dependency or an accidental static import creeping back into the entry
 * bundle, not to police every kilobyte. Raise it deliberately, in a PR that says why.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const dist = resolve(process.argv[2] ?? "dist");
const budgetKb = Number(process.env.BUNDLE_BUDGET_KB ?? 240);

const html = readFileSync(join(dist, "index.html"), "utf8");
const refs = new Set();
for (const m of html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) refs.add(m[1]);

if (refs.size === 0) {
  console.error(
    `No script/stylesheet references found in ${join(dist, "index.html")} — was it built?`,
  );
  process.exit(2);
}

const kb = (bytes) => (bytes / 1000).toFixed(1).padStart(7);
let rawTotal = 0;
let gzipTotal = 0;
console.log("Initial assets for the entry HTML:");
for (const ref of [...refs].sort()) {
  const bytes = readFileSync(join(dist, ref.replace(/^\//, "")));
  const gzipped = gzipSync(bytes).length;
  rawTotal += bytes.length;
  gzipTotal += gzipped;
  console.log(`${kb(bytes.length)} kB raw  ${kb(gzipped)} kB gzip  ${ref}`);
}
console.log(`${kb(rawTotal)} kB raw  ${kb(gzipTotal)} kB gzip  TOTAL (budget ${budgetKb} kB gzip)`);

if (gzipTotal / 1000 > budgetKb) {
  console.error(
    `\nInitial bundle is ${(gzipTotal / 1000).toFixed(1)} kB gzip, over the ${budgetKb} kB budget.\n` +
      "Find what moved into the entry chunk (a new static import of a page or a large\n" +
      "dependency usually does it) and load it lazily; see src/app/routes.tsx.",
  );
  process.exit(1);
}
