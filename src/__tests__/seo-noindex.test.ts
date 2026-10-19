import { createElement as h, Fragment } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SEO } from "@/app/components/SEO";
import { StructuredData } from "@/app/components/StructuredData";
import { NotFound } from "@/app/components/NotFound";
import i18n from "@/i18n";

// No JSX here on purpose: the test then compiles the same with or without a JSX runtime
// configured for vitest, and needs no `import React`.

function setPathname(pathname: string) {
  Object.defineProperty(window, "location", {
    value: {
      ...window.location,
      pathname,
      origin: "https://www.openindu.com",
    },
    writable: true,
  });
}

/** Reset head state between tests so meta/link/JSON-LD don't leak. */
function resetHead() {
  document.head
    .querySelectorAll(
      'meta, link[rel="canonical"], link[rel="alternate"][hreflang], script[data-openindu-jsonld]',
    )
    .forEach((el) => el.remove());
  document.title = "";
  document.documentElement.lang = "";
}

const robots = () =>
  document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.getAttribute("content") ??
  null;
const canonical = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute("href") ??
  null;
const ogUrl = () =>
  document.head
    .querySelector<HTMLMetaElement>('meta[property="og:url"]')
    ?.getAttribute("content") ?? null;
const alternates = () => document.head.querySelectorAll('link[rel="alternate"][hreflang]').length;

// StructuredData's props default to {}, which createElement can't infer a props type from.
const structuredData = (pagePath: string) => h<{ pagePath: string }>(StructuredData, { pagePath });

function schemaTypes(): string[] {
  const payload = document.head.querySelector("script[data-openindu-jsonld]")?.textContent;
  return payload ? (JSON.parse(payload) as Array<{ "@type": string }>).map((e) => e["@type"]) : [];
}

describe("SEO noindex", () => {
  beforeEach(resetHead);

  it("emits robots noindex and drops the canonical URL, og:url and hreflang alternates", () => {
    setPathname("/definitely-missing");
    // what an indexable page (or the index.html shell) leaves in the head
    document.head.insertAdjacentHTML(
      "beforeend",
      '<link rel="canonical" href="https://www.openindu.com/">' +
        '<meta property="og:url" content="https://www.openindu.com/">' +
        '<link rel="alternate" hreflang="en" href="https://www.openindu.com/en/">',
    );

    render(h(SEO, { title: "Page not found", description: "Gone.", noindex: true }));

    expect(robots()).toBe("noindex,follow");
    expect(canonical()).toBeNull();
    expect(ogUrl()).toBeNull();
    expect(alternates()).toBe(0);
    expect(document.title).toBe("Page not found");
  });

  it("an indexable page has no robots directive", () => {
    setPathname("/about");
    render(h(SEO, { title: "About", description: "d", canonicalPath: "/about" }));
    expect(robots()).toBeNull();
    expect(canonical()).toBe("https://www.openindu.com/about/");
    expect(ogUrl()).toBe("https://www.openindu.com/about/");
  });

  it("navigating from a noindex page to a real one clears the directive and restores the URLs", () => {
    // A single-page app: the head the 404 page wrote stays until the next page overwrites it.
    setPathname("/definitely-missing");
    const { rerender } = render(
      h(SEO, { title: "Page not found", description: "d", noindex: true }),
    );
    expect(robots()).toBe("noindex,follow");

    setPathname("/about");
    rerender(h(SEO, { title: "About", description: "d", canonicalPath: "/about" }));

    expect(robots()).toBeNull();
    expect(canonical()).toBe("https://www.openindu.com/about/");
    expect(ogUrl()).toBe("https://www.openindu.com/about/");
    expect(alternates()).toBe(3);
  });
});

describe("StructuredData on a noindex page", () => {
  beforeEach(resetHead);

  // Layout renders <StructuredData> before the routed page, so on first load its effect runs
  // before the page's <SEO> effect; it reads the head one tick later, after both.
  it("keeps only the site-level schemas, even though it renders first", async () => {
    setPathname("/definitely-missing");
    render(
      h(
        Fragment,
        null,
        structuredData("/definitely-missing"),
        h(SEO, { title: "Page not found", description: "Gone.", noindex: true }),
      ),
    );

    await waitFor(() => expect(schemaTypes()).not.toEqual([]));
    expect(schemaTypes()).toEqual(["Organization", "WebSite"]);
  });

  it("an indexable page still gets its page-level schemas", async () => {
    setPathname("/vision");
    render(
      h(
        Fragment,
        null,
        structuredData("/vision"),
        h(SEO, { title: "Vision", description: "d", canonicalPath: "/vision" }),
      ),
    );

    await waitFor(() => expect(schemaTypes()).not.toEqual([]));
    expect(schemaTypes()).toEqual(["Organization", "WebSite", "BreadcrumbList", "WebPage"]);
  });
});

describe("NotFound", () => {
  beforeEach(resetHead);
  afterEach(async () => {
    await i18n.changeLanguage("zh");
  });

  const renderNotFound = () => render(h(MemoryRouter, null, h(NotFound)));

  // Golden strings: typed here, not read back from the locale files.
  it("is a Chinese noindex page on a Chinese URL", async () => {
    setPathname("/definitely-missing");
    await i18n.changeLanguage("zh");
    renderNotFound();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("页面未找到");
    expect(screen.getByRole("link", { name: /返回首页/ }).getAttribute("href")).toBe("/");
    expect(document.title).toBe("页面未找到｜openIndu");
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(robots()).toBe("noindex,follow");
    expect(canonical()).toBeNull();
  });

  it("is an English noindex page under /en/", async () => {
    setPathname("/en/definitely-missing");
    await i18n.changeLanguage("en");
    renderNotFound();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Page not found");
    expect(screen.getByRole("link", { name: /Back to home/ })).toBeTruthy();
    expect(document.title).toBe("Page not found | openIndu");
    expect(document.documentElement.lang).toBe("en");
    expect(robots()).toBe("noindex,follow");
    expect(canonical()).toBeNull();
  });
});
