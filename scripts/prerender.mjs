/**
 * Build-time prerender script for openIndu-portal.
 *
 * After `vite build`, this script:
 * 1. Starts a local `vite preview` server
 * 2. Uses Puppeteer to render each key route to static HTML
 * 3. Saves rendered HTML to `dist/<route>/index.html`
 *
 * The static HTML files are then served by nginx via the existing
 * `try_files $uri $uri/ /index.html` fallback — no nginx config change needed.
 *
 * Prerendered HTML includes:
 *   - Page-specific <title> and <meta> tags (set by SEO.tsx useEffect)
 *   - Page-specific JSON-LD structured data (set by StructuredData.tsx useEffect)
 *   - Visible text content for non-JS crawlers (GPTBot, Claude-Web, etc.)
 *
 * Requirements: puppeteer (devDependency — installs Chromium automatically)
 */

import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SHARED_ROUTES, ZH_ONLY_ROUTES } from "./public-routes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const PORT = 4173; // vite preview default

/**
 * Routes to prerender — keep this list aligned with src/app/routes.tsx.
 * This is a DIFFERENT list from sitemap.xml: the 4 legal pages are
 * ZH-only and their /en/* counterparts 302 to the ZH version instead of being
 * prerendered separately.
 *
 * "/" MUST stay last: saveHtml("/") overwrites dist/index.html, which is also
 * the SPA-fallback source every other route's `vite preview` request resolves
 * through. Rendering it first would pollute EN routes with whatever <head>
 * state (lang, hreflang) `/` last left behind — see ADR C2.
 */
const ROUTES = [
  ...SHARED_ROUTES,
  ...ZH_ONLY_ROUTES,
  ...SHARED_ROUTES.map((p) => `/en${p}`),
  "/en",
  "/",
];

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
          `vite preview exited before becoming ready (code=${code ?? "null"}, signal=${signal ?? "null"})`,
        ),
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

/** Render a single route to static HTML. Returns the HTML string. */
async function renderRoute(browser, route) {
  const page = await browser.newPage();

  try {
    await page.goto(`http://localhost:${PORT}${route}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for React useEffect hooks to fire:
    //   - SEO.tsx sets document.title + meta tags
    //   - StructuredData.tsx injects <script type="application/ld+json">
    // A small fixed delay is more robust than polling for specific titles.
    await new Promise((r) => setTimeout(r, 1500));

    // Verify that JSON-LD structured data was injected
    const hasJsonLd = await page.evaluate(() => {
      return document.head.querySelector("script[data-openindu-jsonld]") !== null;
    });
    if (!hasJsonLd) {
      console.warn(`  ⚠ JSON-LD not injected for ${route} — waiting extra 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }

    const html = await page.content();
    return html;
  } finally {
    await page.close();
  }
}

/** Write HTML to dist/<route>/index.html, creating directories as needed.
 *  Also replaces localhost origin with the production domain so that
 *  canonical URLs, og:url, and JSON-LD url fields are correct. */
function saveHtml(route, html) {
  // Replace prerender server origin with production origin
  const prodOrigin = "https://www.openindu.com";
  const localOrigin = `http://localhost:${PORT}`;
  const fixed = html.replaceAll(localOrigin, prodOrigin);

  const segments = route.split("/").filter(Boolean);
  const outDir = segments.length === 0 ? DIST : resolve(DIST, ...segments);
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "index.html");
  writeFileSync(outPath, fixed, "utf-8");
  return outPath;
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔨 openIndu-portal prerender\n");

  // Dynamic import — puppeteer is a devDependency, only needed at build time
  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch {
    console.error("❌ puppeteer is not installed. Run: npm install --save-dev puppeteer");
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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (err) {
    console.error(
      `Could not launch Chromium for required prerendering: ${err.message}\n` +
        "Install Chromium before running the production build.\n",
    );
    await stopServer(server);
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  try {
    // 3. Render each route
    for (const route of ROUTES) {
      try {
        process.stdout.write(`  Rendering ${route}... `);
        const html = await renderRoute(browser, route);
        saveHtml(route, html);

        // Extract title for verification
        const titleMatch = html.match(/<title>([^<]*)<\/title>/);
        const title = titleMatch ? titleMatch[1] : "(no title)";
        console.log(`✓ "${title}"`);
        successCount++;
      } catch (err) {
        console.log(`✗ ${err.message}`);
        failCount++;
      }
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }

  // 4. Summary
  console.log(`\n${successCount} prerendered, ${failCount} failed, ${ROUTES.length} total\n`);

  // Exit explicitly — a stray handle left by the preview server would otherwise
  // keep this process alive, and a build step that never returns reads as a hang.
  process.exit(failCount > 0 ? 1 : 0);
}

main();
