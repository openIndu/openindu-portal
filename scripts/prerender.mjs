/**
 * Build-time prerender script for openIndu-portal.
 *
 * After `vite build`, this script:
 * 1. Keeps the build's own index.html as dist/app-shell.html (an empty page that boots the app)
 * 2. Starts a local `vite preview` server for the build's JS, CSS and images
 * 3. Uses Puppeteer to render each public route to static HTML, a few pages at a time
 * 4. Saves rendered HTML to `dist/<route>/index.html`, and the app's NotFound page as
 *    dist/404.html and dist/404.en.html
 *
 * nginx (see nginx.conf) then serves a prerendered route from its own file, a client-only
 * route (login, account, ...) from app-shell.html, and any other URL with a 404 status and
 * the 404 page. dist/index.html ends up as the prerendered home page, so it must never be
 * used as a fallback.
 *
 * Prerendered HTML includes:
 *   - Page-specific <title> and <meta> tags (set by SEO.tsx useEffect)
 *   - Page-specific JSON-LD structured data (set by StructuredData.tsx useEffect)
 *   - Visible text content for non-JS crawlers (GPTBot, Claude-Web, etc.)
 *
 * Every captured page is checked before it is written (see snapshotProblems), and any
 * page that fails fails the build.
 *
 * Requirements: puppeteer (devDependency — installs Chromium automatically)
 * Environment: PRERENDER_CONCURRENCY (default 4) sets how many pages render at once.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SHARED_ROUTES, ZH_ONLY_ROUTES } from "./public-routes.mjs";
import {
  SITE_ORIGIN,
  consentPreset,
  expectedCanonical,
  expectedLang,
  isPristineShell,
  pageIsReady,
  prerenderTargets,
  snapshotProblems,
} from "./prerender-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const PORT = 4173; // vite preview default
const ORIGIN = `http://localhost:${PORT}`;
const PAGE_TIMEOUT_MS = 30_000;
const ATTEMPTS = 2;

const requestedConcurrency = Number.parseInt(process.env.PRERENDER_CONCURRENCY ?? "", 10);
const CONCURRENCY =
  Number.isInteger(requestedConcurrency) && requestedConcurrency > 0 ? requestedConcurrency : 4;

/**
 * Pages to write — keep SHARED_ROUTES / ZH_ONLY_ROUTES aligned with src/app/routes.tsx
 * (src/__tests__/route-coverage.test.ts fails when a route is neither listed there nor a
 * client-only route in nginx). This is a DIFFERENT list from sitemap.xml: the 4 legal pages
 * are ZH-only and their /en/* counterparts 302 to the ZH version instead of being
 * prerendered separately.
 *
 * "/" is last: it replaces dist/index.html, so an interrupted run leaves a pristine one for
 * the next run to start from.
 */
const TARGETS = prerenderTargets(SHARED_ROUTES, ZH_ONLY_ROUTES);

// ── helpers ──────────────────────────────────────────────────────────

/** Spawn `vite preview` and resolve when the server is listening. */
function startPreviewServer() {
  return new Promise((resolvePromise, reject) => {
    const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      // Own process group on POSIX so stopServer() can signal the whole tree.
      detached: process.platform !== "win32",
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      stopServer(server).finally(() => {
        reject(new Error(`vite preview did not become ready on port ${PORT} within 30 seconds`));
      });
    }, 30_000);

    function onData(data) {
      const text = data.toString();
      process.stdout.write(text);
      if (!settled && (text.includes("Local:") || text.includes("localhost"))) {
        settled = true;
        clearTimeout(timeout);
        // Give Vite an extra moment to finish initialisation
        setTimeout(() => resolvePromise(server), 500);
      }
    }

    server.stdout.on("data", onData);
    server.stderr.on("data", onData);

    server.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(err);
    });

    server.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(
        new Error(
          `vite preview exited before becoming ready (code=${code ?? "null"}, signal=${signal ?? "null"})`
        )
      );
    });
  });
}

/** Stop the preview server and everything it spawned.
 *
 *  `shell: true` makes `server.pid` the wrapping shell rather than vite itself, so
 *  a plain `server.kill()` orphans the real `npm exec vite preview`. The orphan
 *  keeps the stdio pipes it inherited from us open, Node's event loop never
 *  drains, and the build hangs until the CI job hits its 6h timeout. */
function stopServer(server) {
  if (!server || server.exitCode !== null || server.signalCode !== null) {
    return Promise.resolve();
  }

  if (process.platform === "win32") {
    return new Promise((resolvePromise) => {
      const killer = spawn("taskkill", ["/F", "/T", "/PID", String(server.pid)], {
        stdio: "ignore",
      });
      killer.on("error", () => resolvePromise());
      killer.on("exit", () => resolvePromise());
    });
  }

  try {
    process.kill(-server.pid, "SIGTERM"); // negative pid = the whole process group
  } catch {
    try {
      server.kill("SIGTERM");
    } catch {
      // best-effort cleanup
    }
  }
  return Promise.resolve();
}

/**
 * The build's own index.html, kept as dist/app-shell.html and returned.
 *
 * A fresh build has an empty #root; that file is the shell. After a prerender dist/index.html
 * is the home page instead, so a second run (without a rebuild) starts from the saved copy.
 */
function prepareShell() {
  const indexPath = resolve(DIST, "index.html");
  const shellPath = resolve(DIST, "app-shell.html");
  if (!existsSync(indexPath)) {
    throw new Error("dist/index.html not found — run `vite build` first");
  }
  const index = readFileSync(indexPath, "utf-8");
  if (isPristineShell(index)) {
    writeFileSync(shellPath, index, "utf-8");
    return index;
  }
  if (existsSync(shellPath)) {
    console.log("dist/index.html is already prerendered — rendering from dist/app-shell.html\n");
    return readFileSync(shellPath, "utf-8");
  }
  throw new Error(
    "dist/index.html is not a fresh build output (its #root is not empty) and dist/app-shell.html " +
      "does not exist — run `vite build` first",
  );
}

/**
 * Serve the page's own document from the pristine shell rather than from `vite preview`,
 * whose fallback is whatever dist/ holds at that moment. Keep the build off the network.
 * API calls are left unanswered, so a page that loads data is captured in its loading
 * state instead of as an error message.
 */
async function interceptRequests(page, shell) {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/^https?:$/.test(url.protocol) && url.origin !== ORIGIN) {
      request.abort("blockedbyclient");
    } else if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      request.respond({ status: 200, contentType: "text/html; charset=utf-8", body: shell });
    } else if (url.pathname.startsWith("/api/")) {
      // never answered; the page is closed before it matters
    } else {
      request.continue();
    }
  });
}

/** Best-effort summary of what the page looks like, for a failure message. */
async function describePage(page) {
  try {
    return await page.evaluate(() =>
      JSON.stringify({
        lang: document.documentElement.lang,
        title: document.title,
        canonical:
          document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        robots: document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
        jsonLd: document.head.querySelector("script[data-openindu-jsonld]") !== null,
        rootChildren: document.getElementById("root")?.childElementCount ?? null,
      }),
    );
  } catch {
    return "(page state unavailable)";
  }
}

/** Render a single route once and return the page's HTML. */
async function renderOnce(browser, { route, noindex }, shell) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    // A stored consent choice keeps the cookie banner out of the static HTML; without it
    // every prerendered page would carry the banner a first-time visitor sees.
    await page.evaluateOnNewDocument(({ key, value }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // storage blocked: the banner will show up in the capture and fail the checks
      }
    }, consentPreset());
    await interceptRequests(page, shell);

    await page.goto(`${ORIGIN}${route}`, { waitUntil: "load", timeout: PAGE_TIMEOUT_MS });
    const expectation = {
      lang: expectedLang(route),
      canonical: expectedCanonical(route),
      noindex,
    };
    try {
      await page.waitForFunction(
        pageIsReady,
        { timeout: PAGE_TIMEOUT_MS, polling: 100 },
        expectation,
      );
    } catch (error) {
      const errors = pageErrors.length > 0 ? `; page errors: ${pageErrors.join(" | ")}` : "";
      throw new Error(`${error.message}; page state ${await describePage(page)}${errors}`);
    }
    return await page.content();
  } finally {
    await page.close();
  }
}

/** Render a route, check the result, and return the HTML to write. Tries twice. */
async function renderTarget(browser, target, shell) {
  let failure;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const html = await renderOnce(browser, target, shell);
      // Replace the prerender server origin with the production origin so that
      // canonical URLs, og:url, and JSON-LD url fields are correct.
      const fixed = html.replaceAll(ORIGIN, SITE_ORIGIN);
      const problems = snapshotProblems(fixed, target);
      if (problems.length > 0) throw new Error(problems.join("; "));
      return fixed;
    } catch (error) {
      failure = error;
      if (attempt < ATTEMPTS) console.log(`  ↻ ${target.route}: ${error.message} — retrying`);
    }
  }
  throw failure;
}

/** Write a page under dist/, creating directories as needed. */
function writeTarget({ file }, html) {
  const outPath = resolve(DIST, file);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf-8");
}

/** Run `worker` over `items`, at most `size` at a time. */
async function runPool(items, size, worker) {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, lane));
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔨 openIndu-portal prerender\n");
  const started = Date.now();

  let shell;
  try {
    shell = prepareShell();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // Dynamic import — puppeteer is a devDependency, only needed at build time
  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch {
    console.error(
      "❌ puppeteer is not installed. Run: npm install --save-dev puppeteer"
    );
    process.exit(1);
  }

  // 1. Start preview server
  console.log("Starting vite preview server...");
  const server = await startPreviewServer();
  console.log("✓ Preview server ready\n");

  // 2. Launch browser. Static HTML is a required production artifact, so a
  //    missing Chromium runtime must fail the build.
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      // --disable-dev-shm-usage: several pages at once can exhaust the 64 MB /dev/shm of a
      // default Docker build.
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (err) {
    console.error(
      `Could not launch Chromium for required prerendering: ${err.message}\n` +
        "Install Chromium before running the production build.\n"
    );
    await stopServer(server);
    process.exit(1);
  }

  let successCount = 0;
  const failed = [];

  const renderAndSave = async (target) => {
    const began = Date.now();
    try {
      const html = await renderTarget(browser, target, shell);
      writeTarget(target, html);
      const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "(no title)";
      console.log(`  ✓ ${target.route} "${title}" (${Date.now() - began} ms)`);
      successCount++;
    } catch (err) {
      console.log(`  ✗ ${target.route}: ${err.message}`);
      failed.push(target.route);
    }
  };

  try {
    // 3. Render every page, then "/" on its own (see TARGETS).
    await runPool(TARGETS.slice(0, -1), CONCURRENCY, renderAndSave);
    await renderAndSave(TARGETS[TARGETS.length - 1]);
  } finally {
    await browser.close();
    await stopServer(server);
  }

  // 4. Summary
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\n${successCount} prerendered, ${failed.length} failed, ${TARGETS.length} total ` +
      `in ${seconds}s (${CONCURRENCY} at a time)\n`,
  );

  // Exit explicitly — a stray handle left by the preview server would otherwise
  // keep this process alive, and a build step that never returns reads as a hang.
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
