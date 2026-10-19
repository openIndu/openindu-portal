#!/usr/bin/env node
/**
 * Shift the palette from the deep Klein blue to sky blue.
 *
 * Steps are picked for contrast, not for hue alone: Tailwind's sky ramp is
 * lighter than blue at the same number, so a straight blue-600 → sky-600 swap
 * would quietly drop white-on-fill from 4.56:1 to 4.10:1 and fail WCAG AA.
 * Filled surfaces and small text therefore move one step darker.
 *
 * Variant-aware: a rule for `bg-blue-600` also rewrites `hover:bg-blue-600`.
 */
import { readFileSync, writeFileSync } from "fs";

const FILES = process.argv.slice(2);
if (!FILES.length) {
  console.error("usage: node scripts/to-sky.mjs <file...>");
  process.exit(1);
}

const RULES = [
  // Brand hex literals scattered through the pages
  ["bg-[#002FA7]", "bg-[#0B72B5]"],
  ["text-[#002FA7]", "text-[#0B72B5]"],
  ["border-[#002FA7]", "border-[#0B72B5]"],
  ["hover:bg-[#1a3a6d]", "hover:bg-[#085A90]"],
  ["hover:text-[#1a3a6d]", "hover:text-[#085A90]"],

  // Washes and tints keep their step — they are backgrounds, not text.
  ["bg-blue-50", "bg-sky-50"],
  ["bg-blue-100", "bg-sky-100"],
  ["bg-blue-200", "bg-sky-200"],

  // Filled surfaces carry white text: one step darker to stay >= 4.5:1.
  ["bg-blue-600", "bg-sky-700"],
  ["bg-blue-700", "bg-sky-800"],
  ["bg-blue-800", "bg-sky-900"],
  ["bg-blue-900", "bg-sky-900"],

  // Text on white: likewise one step darker.
  ["text-blue-600", "text-sky-700"],
  ["text-blue-700", "text-sky-800"],
  ["text-blue-800", "text-sky-800"],
  // Light text sits on dark bands — keep the light step.
  ["text-blue-100", "text-sky-100"],
  ["text-blue-200", "text-sky-200"],
  ["text-blue-400", "text-sky-300"],

  ["border-blue-100", "border-sky-100"],
  ["border-blue-200", "border-sky-200"],
  ["border-blue-500", "border-sky-600"],
  ["border-blue-600", "border-sky-700"],
  ["border-blue-800", "border-sky-800"],
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const VARIANTS = "((?:[a-z][a-z0-9-]*:)*)";

let grand = 0;
for (const file of FILES) {
  let src = readFileSync(file, "utf8");
  let n = 0;
  for (const [from, to] of RULES) {
    const re = new RegExp(`(^|[\\s"'\`{])${VARIANTS}${esc(from)}(?![\\w./[-])`, "g");
    src = src.replace(re, (_m, pre, variants) => {
      n++;
      return `${pre}${variants}${to}`;
    });
  }
  writeFileSync(file, src);
  grand += n;
  if (n) console.log(`${file.split(/[\\/]/).pop().padEnd(24)} ${n} 处`);
}
console.log(`\n共 ${grand} 处`);
