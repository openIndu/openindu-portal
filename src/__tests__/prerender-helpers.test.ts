import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { COOKIE_CONSENT_KEY, analyticsAllowed, readCookieConsent } from "@/lib/cookieConsent";
import { SHARED_ROUTES, ZH_ONLY_ROUTES } from "../../scripts/public-routes.mjs";
import {
  consentPreset,
  expectedCanonical,
  expectedLang,
  isPristineShell,
  pageIsReady,
  prerenderTargets,
  snapshotProblems,
} from "../../scripts/prerender-helpers.mjs";

describe("consentPreset", () => {
  it("is a stored choice the app's own parser accepts: analytics off, banner not needed", () => {
    const preset = consentPreset();
    expect(preset.key).toBe(COOKIE_CONSENT_KEY);

    const stored = readCookieConsent({
      getItem: (key) => (key === preset.key ? preset.value : null),
      setItem: () => {},
    });
    expect(stored).not.toBeNull();
    expect(stored?.analytics).toBe(false);
    // a rejected choice must not switch on analytics during the build
    expect(analyticsAllowed(stored)).toBe(false);
  });
});

describe("expectedCanonical / expectedLang", () => {
  it.each([
    ["/", "https://www.openindu.com/", "zh-CN"],
    ["/about", "https://www.openindu.com/about/", "zh-CN"],
    ["/motion-control/studio", "https://www.openindu.com/motion-control/studio/", "zh-CN"],
    ["/en", "https://www.openindu.com/en/", "en"],
    ["/en/vision/station", "https://www.openindu.com/en/vision/station/", "en"],
    // "/en" must be a whole path segment
    ["/english", "https://www.openindu.com/english/", "zh-CN"],
  ])("%s", (route, canonical, lang) => {
    expect(expectedCanonical(route)).toBe(canonical);
    expect(expectedLang(route)).toBe(lang);
  });
});

describe("isPristineShell", () => {
  it("recognises the build's index.html and nothing that has been rendered into", () => {
    expect(isPristineShell(readFileSync(resolve(__dirname, "../../index.html"), "utf8"))).toBe(
      true,
    );
    expect(isPristineShell('<body><div id="root"><main>home</main></div></body>')).toBe(false);
  });
});

describe("prerenderTargets", () => {
  const targets = prerenderTargets(SHARED_ROUTES, ZH_ONLY_ROUTES);

  it("writes every public route in both languages, plus the home pages and the two 404 pages", () => {
    // 16 shared + 4 ZH-only + 16 EN + /en + /404 + /en/404 + /
    expect(targets).toHaveLength(SHARED_ROUTES.length * 2 + ZH_ONLY_ROUTES.length + 4);
    expect(targets.map((target) => target.route)).toEqual(
      expect.arrayContaining(["/", "/en", "/404", "/en/404", "/about", "/en/about", "/privacy"]),
    );
  });

  it('renders "/" last, because it replaces dist/index.html', () => {
    expect(targets.at(-1)).toEqual({ route: "/", file: "index.html", noindex: false });
  });

  it("maps routes to files, and only the 404 pages are noindex", () => {
    const byRoute = Object.fromEntries(targets.map((target) => [target.route, target]));
    expect(byRoute["/vision/station"].file).toBe("vision/station/index.html");
    expect(byRoute["/en"].file).toBe("en/index.html");
    expect(byRoute["/en/about"].file).toBe("en/about/index.html");
    expect(byRoute["/404"]).toEqual({ route: "/404", file: "404.html", noindex: true });
    expect(byRoute["/en/404"]).toEqual({ route: "/en/404", file: "404.en.html", noindex: true });
    expect(targets.filter((target) => target.noindex).map((target) => target.route)).toEqual([
      "/404",
      "/en/404",
    ]);
  });

  it("never writes the same file twice", () => {
    const files = targets.map((target) => target.file);
    expect(new Set(files).size).toBe(files.length);
  });
});

// ── snapshotProblems ─────────────────────────────────────────────────

const SITE_SCHEMAS = [{ "@type": "Organization" }, { "@type": "WebSite" }];

function pageHtml(options: {
  lang: string;
  title?: string | null;
  robots?: string | null;
  canonical?: string | null;
  schemas?: unknown[] | null;
  root?: string;
}) {
  const o = {
    title: "A title",
    robots: null,
    canonical: null,
    schemas: SITE_SCHEMAS,
    root: '<div id="root"><main>content</main></div>',
    ...options,
  };
  return (
    `<!DOCTYPE html><html lang="${o.lang}"><head>` +
    (o.title === null ? "" : `<title>${o.title}</title>`) +
    (o.robots ? `<meta name="robots" content="${o.robots}">` : "") +
    (o.canonical ? `<link rel="canonical" href="${o.canonical}">` : "") +
    (o.schemas
      ? `<script type="application/ld+json" data-openindu-jsonld="1">${JSON.stringify(o.schemas)}</script>`
      : "") +
    `</head><body>${o.root}</body></html>`
  );
}

const goodPage = (route: string) =>
  pageHtml({
    lang: expectedLang(route),
    canonical: expectedCanonical(route),
    schemas: [...SITE_SCHEMAS, { "@type": "WebPage", url: expectedCanonical(route) }],
  });
const goodErrorPage = (route: string) =>
  pageHtml({ lang: expectedLang(route), robots: "noindex,follow" });

describe("snapshotProblems", () => {
  it.each(["/", "/en", "/about", "/en/vision/station"])(
    "accepts a complete page for %s",
    (route) => {
      expect(snapshotProblems(goodPage(route), { route, noindex: false })).toEqual([]);
    },
  );

  it.each(["/404", "/en/404"])("accepts a complete error page for %s", (route) => {
    expect(snapshotProblems(goodErrorPage(route), { route, noindex: true })).toEqual([]);
  });

  it("reads attributes in any order", () => {
    const html = goodErrorPage("/404").replace(
      '<meta name="robots" content="noindex,follow">',
      '<meta content="noindex,follow" name="robots">',
    );
    expect(snapshotProblems(html, { route: "/404", noindex: true })).toEqual([]);
  });

  const page = { route: "/about", noindex: false };
  const good = goodPage("/about");
  const error = { route: "/404", noindex: true };

  // Each defect must be reported on its own, and as the only problem.
  it.each([
    [
      "the app did not render",
      good.replace('<div id="root"><main>content</main></div>', '<div id="root"></div>'),
      page,
      "#root is empty",
    ],
    [
      "the cookie banner is baked in",
      good.replace("<main>", '<section data-testid="cookie-consent-banner"></section><main>'),
      page,
      "cookie banner is baked into the page",
    ],
    ["a wrong <html lang>", good.replace('lang="zh-CN"', 'lang="en"'), page, "<html lang> is en"],
    ["no <title>", good.replace("<title>A title</title>", ""), page, "no <title>"],
    ["no canonical", good.replace(/<link rel="canonical"[^>]*>/, ""), page, "canonical is missing"],
    [
      "someone else's canonical",
      good.replace("/about/", "/"),
      page,
      "canonical is https://www.openindu.com/, expected https://www.openindu.com/about/",
    ],
    [
      "a public page that is noindex",
      good.replace("<link", '<meta name="robots" content="noindex,follow"><link'),
      page,
      "must not be noindex",
    ],
    [
      "no JSON-LD",
      good.replace(/<script type="application\/ld\+json"[\s\S]*?<\/script>/, ""),
      page,
      "no JSON-LD",
    ],
    [
      "JSON-LD that names another page",
      good.replace('"url":"https://www.openindu.com/about/"', '"url":"https://www.openindu.com/"'),
      page,
      "WebPage JSON-LD url is https://www.openindu.com/",
    ],
    [
      "an error page that is not noindex",
      goodErrorPage("/404").replace('<meta name="robots" content="noindex,follow">', ""),
      error,
      "an error page must be noindex",
    ],
    [
      "an error page with a canonical",
      goodErrorPage("/404").replace(
        "</head>",
        '<link rel="canonical" href="https://www.openindu.com/"></head>',
      ),
      error,
      "an error page must not have a canonical URL",
    ],
    [
      "an error page that describes itself as a page",
      pageHtml({
        lang: "zh-CN",
        robots: "noindex,follow",
        schemas: [...SITE_SCHEMAS, { "@type": "WebPage", url: "https://www.openindu.com/404/" }],
      }),
      error,
      "must not describe itself as a WebPage",
    ],
  ])("reports %s", (_name, html, target, problem) => {
    expect(snapshotProblems(html, target)).toEqual([expect.stringContaining(problem)]);
  });
});

// ── pageIsReady (runs in the browser; here against jsdom) ────────────

describe("pageIsReady", () => {
  const expectation = {
    lang: "zh-CN",
    canonical: "https://www.openindu.com/about/",
    noindex: false,
  };

  function setUp(options: {
    lang?: string;
    root?: string;
    robots?: string;
    canonical?: string;
    jsonLd?: string;
  }) {
    const o = {
      lang: "zh-CN",
      root: "<main>content</main>",
      canonical: "https://www.openindu.com/about/",
      jsonLd: JSON.stringify([
        ...SITE_SCHEMAS,
        { "@type": "WebPage", url: "https://www.openindu.com/about/" },
      ]),
      ...options,
    };
    document.documentElement.lang = o.lang;
    document.body.innerHTML = `<div id="root">${o.root}</div>`;
    document.head.innerHTML =
      (o.robots ? `<meta name="robots" content="${o.robots}">` : "") +
      (o.canonical ? `<link rel="canonical" href="${o.canonical}">` : "") +
      (o.jsonLd
        ? `<script type="application/ld+json" data-openindu-jsonld="1">${o.jsonLd}</script>`
        : "");
  }

  beforeEach(() => {
    document.documentElement.lang = "";
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });

  it("is ready once the route is rendered with its language, canonical URL and JSON-LD", () => {
    setUp({});
    expect(pageIsReady(expectation)).toBe(true);
  });

  it.each([
    ["nothing rendered yet", { root: "" }],
    ["still the other language", { lang: "en" }],
    ["JSON-LD not injected yet", { jsonLd: "" }],
    ["canonical not set yet", { canonical: "" }],
    ["canonical still the previous page's", { canonical: "https://www.openindu.com/" }],
    ["noindex left over from another page", { robots: "noindex,follow" }],
    [
      "JSON-LD of another page",
      { jsonLd: JSON.stringify([{ "@type": "WebPage", url: "https://www.openindu.com/" }]) },
    ],
  ])("is not ready: %s", (_name, options) => {
    setUp(options);
    expect(pageIsReady(expectation)).toBe(false);
  });

  it("an error page is ready when it is noindex with no canonical URL", () => {
    const errorPage = { lang: "zh-CN", canonical: "", noindex: true };
    setUp({ robots: "noindex,follow", canonical: "", jsonLd: JSON.stringify(SITE_SCHEMAS) });
    expect(pageIsReady(errorPage)).toBe(true);

    setUp({ robots: "noindex,follow", jsonLd: JSON.stringify(SITE_SCHEMAS) }); // canonical still there
    expect(pageIsReady(errorPage)).toBe(false);

    setUp({ canonical: "", jsonLd: JSON.stringify(SITE_SCHEMAS) }); // not noindex yet
    expect(pageIsReady(errorPage)).toBe(false);
  });
});
