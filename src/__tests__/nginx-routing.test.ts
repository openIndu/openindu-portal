// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nginxOrSkip, startNginx, type ConfName, type RunningNginx } from "./helpers/nginx";

/**
 * What the two nginx configs answer for each kind of URL, checked against a real nginx on a
 * document root laid out like dist/ after the prerender: a file per prerendered route, the
 * bare app shell, and the two 404 pages. Skipped when no nginx binary is available (set
 * NGINX_BIN, or REQUIRE_NGINX=1 to make that a failure); CI installs nginx and requires it.
 */
const nginx = nginxOrSkip();

const SHELL = '<div id="root"></div>';
const FILES = {
  "index.html": "HOME-SNAPSHOT-ZH",
  "app-shell.html": SHELL,
  "404.html": "NOT-FOUND-ZH",
  "404.en.html": "NOT-FOUND-EN",
  "about/index.html": "ABOUT-ZH",
  "resources/index.html": "RESOURCES-ZH",
  "en/index.html": "HOME-EN",
  "en/about/index.html": "ABOUT-EN",
  "assets/index-DXpLleoC.js": "console.log(1);",
  "robots.txt": "User-agent: *",
};

const suite = nginx ? describe : describe.skip;

suite.each(["nginx.conf", "nginx.k8s.conf"] as ConfName[])("%s routing", (confName) => {
  let server: RunningNginx;
  beforeAll(async () => {
    server = await startNginx(nginx!, confName, FILES);
  }, 30_000);
  afterAll(async () => {
    await server?.stop();
  });

  // Redirects are the answer under test, not something to follow.
  const get = (path: string) => fetch(server.baseUrl + path, { redirect: "manual" });

  it.each([
    ["/", "HOME-SNAPSHOT-ZH"],
    ["/about/", "ABOUT-ZH"],
    // /resources is prerendered; /resources/documents and /resources/software are not
    ["/resources/", "RESOURCES-ZH"],
    ["/en/", "HOME-EN"],
    ["/en/about/", "ABOUT-EN"],
  ])("prerendered %s is served from its own file", async (path, body) => {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(body);
    expect(response.headers.get("cache-control")).toBe("no-cache, must-revalidate");
  });

  // The canonical URL of a prerendered route has a trailing slash (see SEO.tsx), and this is
  // how nginx has always sent a directory URL there; the change to the 404 handling must not.
  it.each(["/about", "/resources", "/en", "/en/about"])(
    "prerendered %s without the trailing slash redirects to its canonical URL",
    async (path) => {
      const response = await get(path);
      expect(response.status).toBe(301);
      expect(response.headers.get("location")).toBe(`${path}/`);
    },
  );

  it.each([
    "/login",
    "/login/",
    "/en/login",
    "/register",
    "/account",
    "/chat",
    "/workflow",
    "/en/workflow",
    "/platform",
    "/features",
    "/quick-start",
    "/docs",
    "/token-service",
    "/resources/documents",
    "/resources/software/",
    "/en/resources/software",
  ])("client-only route %s gets the bare app shell, not a page snapshot", async (path) => {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(SHELL);
    expect(response.headers.get("cache-control")).toBe("no-cache, must-revalidate");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each([
    ["/no-such-page", "NOT-FOUND-ZH"],
    ["/no-such/deeper/page", "NOT-FOUND-ZH"],
    ["/resources/software/123", "NOT-FOUND-ZH"],
    ["/en/no-such-page", "NOT-FOUND-EN"],
    ["/en/resources/software/123", "NOT-FOUND-EN"],
    // only the /en/ prefix selects the English page
    ["/english", "NOT-FOUND-ZH"],
  ])("unknown URL %s is a real 404 with the matching 404 page", async (path, body) => {
    const response = await get(path);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe(body);
    expect(response.headers.get("content-type")).toContain("text/html");
    // never cached: the same URL may exist after the next deploy
    expect(response.headers.get("cache-control")).toBe("no-cache, must-revalidate");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("a missing asset is a plain 404, not the HTML 404 page", async () => {
    const response = await get("/assets/removed-AbCd1234.js");
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("NOT-FOUND");
  });

  it.each(["privacy", "legal", "cookies", "legal-center", "chat"])(
    "/en/%s still redirects to the Chinese page",
    async (name) => {
      const response = await get(`/en/${name}`);
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(`/${name}`);
    },
  );

  it("serves files from the root, and the health check", async () => {
    const robots = await get("/robots.txt");
    expect(robots.status).toBe(200);
    expect(await robots.text()).toBe("User-agent: *");

    const health = await get("/health");
    expect(health.status).toBe(200);
  });

  it("refuses hidden files", async () => {
    expect((await get("/.env")).status).toBe(403);
  });
});
