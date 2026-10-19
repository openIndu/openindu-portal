import { test, expect } from "@playwright/test";

/**
 * Verifies the prerendered dist/ output, not the dev-server SPA.
 * Run with: npm run build && npm run test:prerender
 * (this spec is excluded from the default playwright.config.ts run — see
 * playwright.prerender.config.ts's header comment for why the two are
 * kept separate).
 *
 * Prerendered routes are directories, so their canonical form has a
 * trailing slash. All navigation below uses that representation. The
 * production origin must survive hydration on the local preview origin.
 */

const SHARED = [
  "/architecture",
  "/craftsmanship",
  "/use-cases",
  "/about",
  "/developers",
  "/team",
  "/edge-computing",
  "/forum",
  "/motion-control",
  "/motion-control/studio",
  "/vision",
  "/vision/station",
  "/iiot-platform",
  "/infrastructure",
  "/pricing",
  "/resources",
];
const ZH_ONLY = ["/privacy", "/legal", "/cookies", "/legal-center"];

// Golden titles -- cross-checked against the `npm run build` prerender log
// output, not derived from the locale JSON (see i18n-test-rework-plan.md
// 1.1 on why golden values must hold their own opinion).
const TITLES: Record<string, string> = {
  "/": "openIndu Community｜开源智能制造工业生态",
  "/en": "openIndu Community | Open Smart Manufacturing Ecosystem",
  "/architecture": "社区路线图｜openIndu",
  "/en/architecture": "Community Roadmap | openIndu",
  "/craftsmanship": "工艺知识库｜openIndu 社区论坛",
  "/en/craftsmanship": "Craftsmanship Knowledge | openIndu Community Forum",
  "/use-cases": "行业场景参考｜openIndu 社区",
  "/en/use-cases": "Industry Scenario References | openIndu Community",
  "/about": "关于 openIndu｜openIndu 社区",
  "/en/about": "About openIndu | openIndu Community",
  "/developers": "开发者｜openIndu 社区",
  "/en/developers": "Developers | openIndu Community",
  "/team": "团队｜openIndu 社区",
  "/en/team": "Team | openIndu Community",
  "/edge-computing": "openIndu-cim | Edge Computing | openIndu",
  "/en/edge-computing": "openIndu-cim | Edge Computing | openIndu",
  "/forum": "论坛 | openIndu Community",
  "/en/forum": "Forum | openIndu Community",
  "/motion-control": "AI+运动控制｜openIndu 智能制造",
  "/en/motion-control": "AI + Motion Control | openIndu Smart Manufacturing",
  "/motion-control/studio": "openIndu-studio 介绍｜openIndu",
  "/en/motion-control/studio": "openIndu-studio Overview | openIndu",
  "/vision": "AI+视觉｜openIndu 工业机器视觉",
  "/en/vision": "AI + Machine Vision | openIndu Industrial Machine Vision",
  "/vision/station": "openIndu-station 介绍｜openIndu",
  "/en/vision/station": "openIndu-station Overview | openIndu",
  "/iiot-platform": "工业互联网平台 IIoT｜openIndu",
  "/en/iiot-platform": "Industrial IoT Platform | openIndu",
  "/infrastructure": "AI+基础设施｜openIndu",
  "/en/infrastructure": "AI + Infrastructure | openIndu",
  "/pricing": "部署路径｜openIndu 社区",
  "/en/pricing": "Deployment Paths | openIndu Community",
  "/resources": "下载中心｜openIndu",
  "/en/resources": "Downloads | openIndu",
  "/privacy": "隐私声明｜openIndu社区",
  "/legal": "法律声明｜openIndu社区",
  "/cookies": "关于 Cookies｜openIndu社区",
  "/legal-center": "法律与隐私｜openIndu社区",
};

const PRERENDERED = [...SHARED, ...ZH_ONLY, ...SHARED.map((p) => `/en${p}`), "/en", "/"];
expect(PRERENDERED.length).toBe(38);

/** vite preview needs the trailing slash to resolve <path>/index.html; nginx doesn't. */
function servePath(path: string) {
  return path === "/" ? "/" : `${path}/`;
}

function webPageJsonLd(html: string) {
  const marker = 'data-openindu-jsonld="1">';
  const start = html.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const from = start + marker.length;
  const end = html.indexOf("</script>", from);
  const payload = JSON.parse(html.slice(from, end)) as Array<Record<string, unknown>>;
  return payload.find((item) => item["@type"] === "WebPage") as Record<string, unknown>;
}

test.describe("Prerendered HTML", () => {
  for (const path of PRERENDERED) {
    test(`${path} serves its own file with the right title`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const response = await page.goto(servePath(path));
      expect(response?.status()).toBe(200);

      const html = await response!.text();
      expect(html).toContain(`<title>${TITLES[path]}</title>`);
      expect(html).toMatch(/<h1[\s>]/);

      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }

  test("EN home lang/canonical are correct in the raw response and it carries no ZH-only content", async ({
    page,
  }) => {
    const response = await page.goto(servePath("/en"));
    const html = await response!.text();

    expect(html).toContain('lang="en"');
    // The sitemap, canonical and server's directory URL are all slash-normalized.
    expect(html).toContain('<link rel="canonical" href="https://www.openindu.com/en/"');
    // Hero tagline is ZH-only; its presence would mean the EN build got
    // ZH content baked in (ADR C1 -- locale must resolve from the URL at
    // runtime, never get baked into the shared build).
    expect(html).not.toContain("一栈贯通");
  });

  test("ZH home raw response has lang=zh-CN and its own canonical", async ({ page }) => {
    const response = await page.goto(servePath("/"));
    const html = await response!.text();
    expect(html).toContain('lang="zh-CN"');
    expect(html).toContain('<link rel="canonical" href="https://www.openindu.com/"');
  });

  test("hydration keeps canonical and structured URLs on the production HTTPS host", async ({
    page,
  }) => {
    await page.goto(servePath("/resources"));
    await page.waitForLoadState("networkidle");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.openindu.com/resources/",
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      "https://www.openindu.com/resources/",
    );
    await expect
      .poll(async () => {
        const payload = await page.locator("script[data-openindu-jsonld]").textContent();
        return payload
          ? JSON.parse(payload).find((entry: { "@type": string }) => entry["@type"] === "WebPage")
              ?.url
          : null;
      })
      .toBe("https://www.openindu.com/resources/");
  });

  test("EN subpage raw response canonical self-references correctly", async ({ page }) => {
    const response = await page.goto(servePath("/en/motion-control"));
    const html = await response!.text();
    expect(html).toContain(
      '<link rel="canonical" href="https://www.openindu.com/en/motion-control/"',
    );
  });

  test("ZH subpage raw response canonical self-references correctly", async ({ page }) => {
    const response = await page.goto(servePath("/motion-control"));
    const html = await response!.text();
    expect(html).toContain('<link rel="canonical" href="https://www.openindu.com/motion-control/"');
  });

  test("EN structured data matches the visible page metadata and canonical URL", async ({
    page,
  }) => {
    const response = await page.goto(servePath("/en/architecture"));
    const html = await response!.text();
    const schema = webPageJsonLd(html);
    expect(schema.name).toBe(TITLES["/en/architecture"]);
    expect(schema.url).toBe("https://www.openindu.com/en/architecture/");
    expect(schema.description).toContain("openIndu community roadmap");
    expect((schema.about as Record<string, unknown>).name).toBe(
      "Smart Manufacturing and Industrial Automation",
    );
  });

  test("sitemap contains every localized public route", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain("<loc>https://www.openindu.com/en/</loc>");
    expect(xml).not.toContain("https://www.openindu.com/en//");
    for (const path of SHARED) {
      expect(xml).toContain(`https://www.openindu.com${path}/`);
      expect(xml).toContain(`https://www.openindu.com/en${path}/`);
    }
  });

  test("EN/ZH raw responses carry hreflang alternates pointing back at each other", async ({
    page,
  }) => {
    const enResponse = await page.goto(servePath("/en/vision"));
    const enHtml = await enResponse!.text();
    expect(enHtml).toContain('hreflang="zh-Hans" href="https://www.openindu.com/vision/"');
    expect(enHtml).toContain('hreflang="en" href="https://www.openindu.com/en/vision/"');

    const zhResponse = await page.goto(servePath("/vision"));
    const zhHtml = await zhResponse!.text();
    expect(zhHtml).toContain('hreflang="zh-Hans" href="https://www.openindu.com/vision/"');
    expect(zhHtml).toContain('hreflang="en" href="https://www.openindu.com/en/vision/"');
  });

  test("ZH-only legal page raw response emits no hreflang alternates", async ({ page }) => {
    const response = await page.goto(servePath("/privacy"));
    const html = await response!.text();
    expect(html).not.toContain('rel="alternate"');
  });
});

test.describe("Lazy route chunks", () => {
  test("a deep link keeps its prerendered content until the route chunk has loaded", async ({
    page,
  }) => {
    // Hold the chunk back so that any gap between "prerendered DOM removed" and
    // "route rendered" is long enough to be seen.
    await page.route("**/assets/Architecture-*.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    // Runs before the page's own scripts. React replaces the prerendered markup in
    // one commit, which is never observable as "empty"; rendering a placeholder
    // first (what an uninitialised lazy router does) empties #root until the
    // chunk arrives, and the observer's callback sees exactly that state.
    await page.addInitScript(() => {
      const w = window as unknown as { __rootWasEmpty: boolean };
      w.__rootWasEmpty = false;
      new MutationObserver(() => {
        const root = document.getElementById("root");
        if (root && root.childElementCount === 0) w.__rootWasEmpty = true;
      }).observe(document, { childList: true, subtree: true });
    });

    await page.goto(servePath("/architecture"));
    await page.waitForLoadState("networkidle");

    // Guard against a vacuous pass: React must really have taken the page over
    // (it tags the DOM nodes it creates; the prerendered markup has no such tag).
    await expect
      .poll(() =>
        page.evaluate(() => {
          const header = document.querySelector("#root header");
          return !!header && Object.keys(header).some((key) => key.startsWith("__reactFiber"));
        }),
      )
      .toBe(true);
    const rootWasEmpty = await page.evaluate(
      () => (window as unknown as { __rootWasEmpty: boolean }).__rootWasEmpty,
    );
    expect(rootWasEmpty).toBe(false);
  });

  test("a missing route chunk reloads once and then stops", async ({ page }) => {
    // A deploy deletes the old hashed chunks, so a tab opened before it can 404
    // on its next lazy import. Simulate that chunk being gone.
    await page.route("**/assets/Architecture-*.js", (route) => route.abort());
    // Count document requests for the page. `framenavigated` would also count the
    // router's own history.replaceState, and the first document is replaced by the
    // reload before its `load` event fires, so `load` undercounts.
    let documentRequests = 0;
    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        documentRequests += 1;
      }
    });

    await page.goto(servePath("/architecture"));
    await page.waitForTimeout(2500);

    // The initial load plus exactly one recovery reload -- never a reload loop.
    expect(documentRequests).toBe(2);
  });
});

test.describe("EN legal-page client-side fallback (ZhOnlyGuard)", () => {
  // Covers only the client-side fallback -- the authoritative redirect is
  // nginx's `return 302` (nginx.conf / nginx.k8s.conf), which needs the
  // real container to verify; `vite preview` has no nginx in front of it.
  for (const path of ["/en/privacy", "/en/legal", "/en/cookies", "/en/legal-center"]) {
    test(`${path} replaces to the ZH URL client-side`, async ({ page }) => {
      await page.goto(servePath(path));
      await page.waitForURL((url) => !url.pathname.startsWith("/en"));
      expect(new URL(page.url()).pathname.replace(/\/$/, "") || "/").toBe(path.replace("/en", ""));
    });
  }
});

// nginx answers a missing URL with dist/404.html (status 404) and a client-only route such as
// /login with dist/app-shell.html; vite preview serves both as plain files, so these tests
// check the files. How nginx picks them is covered by src/__tests__/nginx-routing.test.ts.
test.describe("404 pages and the app shell", () => {
  const errorPages = [
    {
      file: "/404.html",
      lang: "zh-CN",
      title: "页面未找到｜openIndu",
      heading: "页面未找到",
    },
    {
      file: "/404.en.html",
      lang: "en",
      title: "Page not found | openIndu",
      heading: "Page not found",
    },
  ];

  for (const { file, lang, title, heading } of errorPages) {
    test(`${file} is the NotFound page, kept out of search indexes`, async ({ request }) => {
      const response = await request.get(file);
      expect(response.status()).toBe(200);
      const html = await response.text();

      expect(html).toContain(`<html lang="${lang}"`);
      expect(html).toContain(`<title>${title}</title>`);
      expect(html).toContain(`>${heading}</h1>`);
      expect(html).toMatch(/<meta name="robots" content="noindex,follow"/);
      // no URL for crawlers to treat as this page's address, and no page-level structured data
      expect(html).not.toContain('rel="canonical"');
      expect(html).not.toContain('property="og:url"');
      expect(html).not.toContain('"@type":"WebPage"');
    });
  }

  test("/app-shell.html is the bare shell, not a page snapshot", async ({ request }) => {
    const response = await request.get("/app-shell.html");
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<div id="root"></div>');
    expect(html).not.toMatch(/<h1[\s>]/);
    expect(html).not.toContain("data-openindu-jsonld");
  });

  test("the home page is still a prerendered snapshot, unlike the shell", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).not.toContain('<div id="root"></div>');
    expect(html).toMatch(/<h1[\s>]/);
  });

  test("an unknown URL renders the 404 page, and leaving it restores the indexable head", async ({
    page,
  }) => {
    await page.goto("/definitely-missing/");
    await expect(page.locator("h1")).toHaveText("页面未找到");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

    // This is a single-page app: the head the 404 page wrote has to be undone on the way out.
    await page.getByRole("link", { name: "返回首页" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.openindu.com/",
    );
  });

  test("an unknown English URL renders the English 404 page", async ({ page }) => {
    await page.goto("/en/definitely-missing/");
    await expect(page.locator("h1")).toHaveText("Page not found");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
  });
});

test.describe("Cookie banner", () => {
  // The prerender browser has a stored consent choice, so the banner is not part of the static
  // HTML. A real first-time visitor still has to get it once the app has booted.
  for (const path of ["/", "/en", "/about", "/en/resources", "/privacy"]) {
    test(`the static HTML of ${path} carries no banner`, async ({ request }) => {
      const html = await (await request.get(servePath(path))).text();
      expect(html).not.toContain("cookie-consent-banner");
    });
  }

  test("a first-time visitor gets the banner once the app has booted", async ({ page }) => {
    await page.goto(servePath("/about"));
    await expect(page.getByTestId("cookie-consent-banner")).toBeVisible();
  });

  test("a visitor who already chose does not see it", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "openindu_cookie_consent",
        JSON.stringify({
          version: 1,
          necessary: true,
          analytics: false,
          updatedAt: "2000-01-01T00:00:00.000Z",
        }),
      );
    });
    await page.goto(servePath("/about"));
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByTestId("cookie-consent-banner")).toHaveCount(0);
  });
});
