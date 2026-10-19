import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { productScreenshots } from "@/assets/product-images";

const root = resolve(__dirname, "../..");

/** Intrinsic size from a WebP file's header (lossy VP8, lossless VP8L or extended VP8X). */
function webpSize(file: Buffer): { width: number; height: number } {
  if (file.toString("ascii", 0, 4) !== "RIFF" || file.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("not a WebP file");
  }
  const chunk = file.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = file.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: file.readUIntLE(24, 3) + 1, height: file.readUIntLE(27, 3) + 1 };
  }
  throw new Error(`unsupported WebP chunk ${chunk}`);
}

describe("product screenshots", () => {
  it.each(Object.entries(productScreenshots))(
    "%s: the registered width and height match the file",
    (_name, shot) => {
      // Under vitest an imported asset resolves to its project-relative URL.
      const file = readFileSync(join(root, shot.src.replace(/^\//, "")));
      expect(webpSize(file)).toEqual({ width: shot.width, height: shot.height });
    },
  );
});

describe("public/ files", () => {
  /**
   * nginx marks /assets/<name>-<8 chars>.<ext> as cacheable for a year ("immutable"),
   * on the assumption that such a name is a content-hashed build output. A file in
   * public/ keeps its URL when it is replaced, so one named like that would serve a
   * stale copy for up to a year.
   */
  const hashedLooking = /-[A-Za-z0-9_-]{8}\.(js|css|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|eot)$/i;

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });

  it("none is named like a content-hashed build output", () => {
    const offenders = walk(join(root, "public")).filter((path) => hashedLooking.test(path));
    expect(offenders).toEqual([]);
  });
});
