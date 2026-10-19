// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nginxOrSkip, startNginx, type ConfName, type RunningNginx } from "./helpers/nginx";

/**
 * Cache policy of the two nginx configs, checked against a real nginx.
 * Skipped when no nginx binary is available (set NGINX_BIN, or REQUIRE_NGINX=1 to
 * make that a failure); CI installs nginx and requires it.
 */
const nginx = nginxOrSkip();

const FILES = {
  "index.html": "<!doctype html><title>home</title>",
  // content-hashed build output, as Vite names it (the hash may end in "-")
  "assets/index-DXpLleoC.js": "console.log(1);",
  "assets/vendor-ui-Dy1Pya6-.js": "export {};",
  "assets/index-wqxreoZj.css": "a{color:red}",
  "assets/workbench-AbCd1234.webp": "webp",
  // files from public/: same URL when replaced
  "assets/logo-96.png": "png",
  "assets/iiot/qr-code.jpg": "jpg",
  "favicon.ico": "ico",
};

const suite = nginx ? describe : describe.skip;

suite.each(["nginx.conf", "nginx.k8s.conf"] as ConfName[])(
  "%s static asset caching",
  (confName) => {
    let server: RunningNginx;
    beforeAll(async () => {
      server = await startNginx(nginx!, confName, FILES);
    }, 30_000);
    afterAll(async () => {
      await server?.stop();
    });

    const get = (path: string) => fetch(server.baseUrl + path);

    it.each([
      "/assets/index-DXpLleoC.js",
      "/assets/vendor-ui-Dy1Pya6-.js",
      "/assets/index-wqxreoZj.css",
      "/assets/workbench-AbCd1234.webp",
    ])("content-hashed %s is cached for a year, with one Cache-Control header", async (path) => {
      const response = await get(path);
      expect(response.status).toBe(200);
      // Exact match: a second Cache-Control header (e.g. from `expires` plus add_header)
      // would be reported joined with a comma and fail this.
      expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    });

    it.each(["/assets/logo-96.png", "/assets/iiot/qr-code.jpg", "/favicon.ico"])(
      "%s keeps its URL when replaced, so it is cached for a day, not a year",
      async (path) => {
        const response = await get(path);
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      },
    );

    it("a missing content-hashed file is a 404 that is not cached", async () => {
      // A tab opened before a deploy asks for a chunk the new build no longer has.
      const response = await get("/assets/removed-AbCd1234.js");
      expect(response.status).toBe(404);
      // Whatever it carries, it must not be the year-long immutable policy of a real asset.
      expect(response.headers.get("cache-control") ?? "").not.toMatch(/immutable|max-age=3153/);
    });

    it("HTML is never cached", async () => {
      const response = await get("/");
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-cache, must-revalidate");
    });
  },
);
