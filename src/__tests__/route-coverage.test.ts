// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SHARED_ROUTES, ZH_ONLY_ROUTES } from "../../scripts/public-routes.mjs";

/**
 * nginx answers an unknown URL with a real 404, so every route the router declares must be
 * either prerendered (a file under dist/) or listed as client-only in nginx. A page added to
 * src/app/routes.tsx and to neither list would work in `vite dev` and 404 in production.
 */

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

/** Every path the router declares under the layout, as URL paths ("/about"). */
function routerPaths(): string[] {
  return [...read("src/app/routes.tsx").matchAll(/\bpath:\s*"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== "/" && path !== "*")
    .map((path) => `/${path}`);
}

function clientOnlyPattern(conf: string): RegExp {
  const match = /# client-only-routes\s*\n\s*location ~ (\S+) \{/.exec(read(conf));
  if (!match) throw new Error(`${conf} has no "# client-only-routes" location`);
  return new RegExp(match[1]);
}

function redirectPattern(conf: string): RegExp {
  const match = /location ~ (\S+) \{\s*return 302/.exec(read(conf));
  if (!match) throw new Error(`${conf} has no "return 302" location for the EN legal pages`);
  return new RegExp(match[1]);
}

const PRERENDERED_ZH = new Set([...SHARED_ROUTES, ...ZH_ONLY_ROUTES]);
const PRERENDERED_EN = new Set(SHARED_ROUTES.map((path) => `/en${path}`));

describe("route table", () => {
  it("is actually read from routes.tsx", () => {
    // Guards the extraction itself: an empty list would make every test below pass.
    const paths = routerPaths();
    expect(paths.length).toBeGreaterThan(25);
    expect(paths).toEqual(expect.arrayContaining(["/about", "/login", "/resources/software"]));
  });

  it("prerenders only routes the router has", () => {
    const paths = new Set(routerPaths());
    for (const route of PRERENDERED_ZH) expect(paths, route).toContain(route);
  });
});

describe.each(["nginx.conf", "nginx.k8s.conf"])("%s", (conf) => {
  const clientOnly = clientOnlyPattern(conf);
  const redirected = redirectPattern(conf);

  it.each(routerPaths())(
    "route %s has a file or a client-only entry, in both languages",
    (path) => {
      // Chinese URL
      expect(
        PRERENDERED_ZH.has(path) || clientOnly.test(path),
        `${path} is neither prerendered nor client-only in ${conf}: it would 404`,
      ).toBe(true);

      // English URL: prerendered, or redirected to the Chinese page, or client-only
      const en = `/en${path}`;
      expect(
        PRERENDERED_EN.has(en) || redirected.test(en) || clientOnly.test(en),
        `${en} is neither prerendered, redirected nor client-only in ${conf}: it would 404`,
      ).toBe(true);
    },
  );

  it("never shadows a prerendered page with the app shell", () => {
    for (const route of [...PRERENDERED_ZH, ...PRERENDERED_EN, "/", "/en"]) {
      expect(clientOnly.test(route), route).toBe(false);
      expect(clientOnly.test(`${route}/`), `${route}/`).toBe(false);
    }
  });

  it("does not claim URLs the router does not have", () => {
    for (const path of ["/no-such-page", "/en/no-such-page", "/login/extra", "/resources/other"]) {
      expect(clientOnly.test(path), path).toBe(false);
    }
  });

  it("redirects the untranslated EN pages, and only those", () => {
    for (const path of [...ZH_ONLY_ROUTES, "/chat"])
      expect(redirected.test(`/en${path}`)).toBe(true);
    for (const path of SHARED_ROUTES) expect(redirected.test(`/en${path}`), path).toBe(false);
  });
});
