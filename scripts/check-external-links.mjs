#!/usr/bin/env node
/**
 * Every forum/GitHub URL that ships in the pages is HEAD-checked here. Earlier
 * rounds shipped hand-guessed /c/process/7/<industry> paths that all 404'd, and
 * nothing in the build caught it.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const roots = ["src/app/pages", "src/app/components"];
const files = roots.flatMap((r) =>
  readdirSync(r, { recursive: true })
    .filter((f) => String(f).endsWith(".tsx"))
    .map((f) => join(r, String(f))),
);

// Resolve the two template forms the pages use (`${FORUM}` as a base, and the
// numeric topic ids held in the plcBrandKeys table) into concrete URLs first, so
// a single literal scan below covers everything that actually ships.
const urls = new Map();
for (const f of files) {
  let src = readFileSync(f, "utf8");
  const base = src.match(/const FORUM = "([^"]+)"/)?.[1];
  if (base) src = src.split("${FORUM}").join(base);
  const ids = [...src.matchAll(/(?:selection|validation|topic):\s*(\d+)/g)].map((m) => m[1]);
  for (const id of ids)
    src += `
"https://forum.openindu.com/t/topic/${id}"`;
  for (const m of src.matchAll(/const (GH|ORG|FORUM|COMMUNITY) = ["`]([^"`]+)["`]/g)) {
    src = src.split("${" + m[1] + "}").join(m[2]);
  }
  for (const m of src.matchAll(
    /https:\/\/(?:forum\.openindu\.com|www\.openindu\.com|github\.com\/openIndu|gitee\.com\/openIndu)[^\s"'`)}]*/g,
  )) {
    const u = m[0].replace(/\/$/, "") || m[0];
    if (u.includes("${")) continue; // unresolved template fragment, not a real link
    urls.set(u, f);
  }
}

let bad = 0;
for (const [url, file] of [...urls].sort()) {
  let status = "ERR";
  try {
    const r = await fetch(url, { redirect: "follow" });
    status = r.status;
  } catch (e) {
    status = `ERR ${e.message.slice(0, 40)}`;
  }
  const ok = status === 200;
  if (!ok) bad++;
  console.log(`${ok ? "OK " : "BAD"}  ${status}  ${url}   (${file})`);
}
console.log(`\n${urls.size} 个链接，${bad} 个失败`);
process.exit(bad ? 1 : 0);
