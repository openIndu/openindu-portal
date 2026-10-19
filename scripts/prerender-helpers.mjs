// Pure helpers for scripts/prerender.mjs. They live apart so unit tests can import
// them: prerender.mjs runs the whole prerender when it is executed.

export const SITE_ORIGIN = "https://www.openindu.com";

/**
 * A stored "reject analytics" cookie consent. Without it the prerendered browser has
 * no consent on record, so the cookie banner is rendered into every static page, and a
 * visitor who already chose sees it flash until the script has booted.
 *
 * The shape must stay readable by src/lib/cookieConsent.ts; a unit test feeds this
 * through that module's own parser.
 */
export function consentPreset() {
  return {
    key: "openindu_cookie_consent",
    value: JSON.stringify({
      version: 1,
      necessary: true,
      analytics: false,
      updatedAt: "2000-01-01T00:00:00.000Z",
    }),
  };
}

/** The canonical URL SEO.tsx emits for a prerendered route ("/" and "/en" included). */
export function expectedCanonical(route) {
  const path = route === "/" ? "/" : `${route.replace(/\/+$/, "")}/`;
  return `${SITE_ORIGIN}${path}`;
}

/** The <html lang> SEO.tsx sets for a route. */
export function expectedLang(route) {
  return route === "/en" || route.startsWith("/en/") ? "en" : "zh-CN";
}

/** Vite's own index.html has an empty mount point; a prerendered page does not. */
export function isPristineShell(html) {
  return html.includes('<div id="root"></div>');
}

/**
 * Every file the prerender writes, in render order.
 *
 * The two 404 pages are the app's own NotFound page, rendered at a URL that no route
 * matches; nginx serves them (with a 404 status) for any URL that is neither a file nor
 * a client-only route. "/" goes last because it replaces dist/index.html.
 */
export function prerenderTargets(sharedRoutes, zhOnlyRoutes) {
  const pages = [
    ...sharedRoutes,
    ...zhOnlyRoutes,
    ...sharedRoutes.map((route) => `/en${route}`),
    "/en",
  ].map((route) => ({ route, file: `${route.slice(1)}/index.html`, noindex: false }));
  return [
    ...pages,
    { route: "/404", file: "404.html", noindex: true },
    { route: "/en/404", file: "404.en.html", noindex: true },
    { route: "/", file: "index.html", noindex: false },
  ];
}

/**
 * Runs inside the browser: has the app rendered this route and applied its head tags?
 * Puppeteer serialises the function, so it must not reference anything outside its body.
 *
 * SEO.tsx writes lang/canonical/robots in an effect and StructuredData.tsx injects the
 * JSON-LD one tick later, so JSON-LD naming this page's canonical URL means both ran.
 */
export function pageIsReady({ lang, canonical, noindex }) {
  const root = document.getElementById("root");
  if (!root || root.childElementCount === 0) return false;
  if (document.documentElement.lang !== lang) return false;
  const jsonLd = document.head.querySelector("script[data-openindu-jsonld]");
  if (!jsonLd) return false;
  const robots = document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
  const link = document.head.querySelector('link[rel="canonical"]');
  if (noindex) return robots.includes("noindex") && !link;
  if (robots.includes("noindex") || !link || link.getAttribute("href") !== canonical) return false;
  return (jsonLd.textContent ?? "").includes(`"url":"${canonical}"`);
}

function attributeOf(html, tag, identifying, attribute) {
  const element = new RegExp(`<${tag}\\b[^>]*${identifying}[^>]*>`).exec(html)?.[0];
  return element ? new RegExp(`\\b${attribute}="([^"]*)"`).exec(element)?.[1] : undefined;
}

function schemasIn(html) {
  const body = /<script\b[^>]*data-openindu-jsonld[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/**
 * What is wrong with a captured page, as a list of sentences (empty when it is fine).
 * Checked on the HTML that is about to be written, so a problem fails the build instead
 * of shipping.
 */
export function snapshotProblems(html, { route, noindex }) {
  const problems = [];
  if (isPristineShell(html)) problems.push("the app did not render (#root is empty)");
  if (html.includes('data-testid="cookie-consent-banner"')) {
    problems.push("the cookie banner is baked into the page");
  }

  const lang = /<html\b[^>]*\blang="([^"]*)"/.exec(html)?.[1];
  if (lang !== expectedLang(route)) {
    problems.push(`<html lang> is ${lang ?? "missing"}, expected ${expectedLang(route)}`);
  }
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push("the page has no <title>");

  const robots = attributeOf(html, "meta", 'name="robots"', "content") ?? "";
  const canonical = attributeOf(html, "link", 'rel="canonical"', "href");
  const schemas = schemasIn(html);
  const webPage = Array.isArray(schemas)
    ? schemas.find((entry) => entry?.["@type"] === "WebPage")
    : undefined;
  if (!schemas) problems.push("the page has no JSON-LD");

  if (noindex) {
    if (!robots.includes("noindex")) problems.push("an error page must be noindex");
    if (canonical) problems.push(`an error page must not have a canonical URL (${canonical})`);
    if (webPage) problems.push("an error page must not describe itself as a WebPage in JSON-LD");
  } else {
    if (robots.includes("noindex")) problems.push("a public page must not be noindex");
    if (canonical !== expectedCanonical(route)) {
      problems.push(`canonical is ${canonical ?? "missing"}, expected ${expectedCanonical(route)}`);
    }
    if (schemas && webPage?.url !== expectedCanonical(route)) {
      problems.push(`the WebPage JSON-LD url is ${webPage?.url ?? "missing"}`);
    }
  }
  return problems;
}
