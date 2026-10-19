#!/usr/bin/env node
/**
 * Make saturated full-width CTA bands hold WCAG AA.
 *
 * The pattern throughout these pages is a `-600` band carrying `-100`/`-200`
 * tinted body copy, which lands around 3.1:1. Two coordinated changes fix it
 * without changing the look much: the band drops one step darker, and the
 * tinted copy becomes white at reduced alpha. White-on-band links likewise
 * need the band dark enough to clear 4.5:1.
 */
import { readFileSync, writeFileSync } from "fs";

const HUES =
  "orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|red";
const BAND = new RegExp(`<section\\b[^>]*\\bbg-(?:(${HUES})-600|\\[#0B72B5\\])\\b[^>]*>`);

let total = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, "utf8");
  let n = 0;

  // Process section by section so a band's rules stay inside that band.
  const parts = src.split(/(?=<section\b)/);
  const out = parts.map((part) => {
    const head = part.slice(0, part.indexOf(">") + 1);
    const isBand =
      BAND.test(head) || new RegExp(`<section\\b[^>]*\\bbg-(?:${HUES})-(?:700|800)\\b`).test(head);
    if (!isBand) return part;

    let p = part;

    // Deepen a -600 band so white text on it clears 4.5:1.
    p = p.replace(new RegExp(`(<section\\b[^>]*\\bbg-)(${HUES})-600\\b`), (m, pre, hue) => {
      n++;
      return `${pre}${hue}-700`;
    });

    // Tinted body copy on a saturated band -> white at reduced alpha.
    p = p.replace(new RegExp(`\\btext-(?:${HUES})-(?:50|100|200)\\b`, "g"), () => {
      n++;
      return "text-white/90";
    });

    // A white "ghost" button on the band needs a dark enough label.
    p = p.replace(new RegExp(`(bg-white[^"']*?)\\btext-(${HUES})-600\\b`, "g"), (m, pre, hue) => {
      n++;
      return `${pre}text-${hue}-700`;
    });

    return p;
  });

  const result = out.join("");
  if (result !== src) writeFileSync(file, result);
  total += n;
  if (n) console.log(`${file.split(/[\\/]/).pop().padEnd(24)} ${n} 处`);
}
console.log(`\n共 ${total} 处`);
