import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

/**
 * Runs the repository's real nginx config (nginx.conf or nginx.k8s.conf) against a
 * throw-away document root, so behaviour that only nginx decides (cache headers,
 * fallbacks, redirects) can be asserted over HTTP. Only the listen address, the
 * document root and the compose variant's upstream host are rewritten.
 */

const repoRoot = resolve(__dirname, "../../..");
const slash = (path: string) => path.split("\\").join("/");

export type ConfName = "nginx.conf" | "nginx.k8s.conf";

export interface RunningNginx {
  baseUrl: string;
  stop(): Promise<void>;
}

/** $NGINX_BIN, else the first `nginx` found on PATH or in the usual install locations. */
export function findNginx(): string | null {
  const candidates = [
    process.env.NGINX_BIN,
    "nginx",
    "/usr/sbin/nginx",
    "/usr/local/sbin/nginx",
    "/usr/local/bin/nginx",
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["-v"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) return candidate;
  }
  return null;
}

/** The nginx binary, or a skip signal. REQUIRE_NGINX=1 (set in CI) turns "not found" into a failure. */
export function nginxOrSkip(): string | null {
  const nginx = findNginx();
  if (!nginx && process.env.REQUIRE_NGINX) {
    throw new Error("REQUIRE_NGINX is set but no nginx binary was found (set NGINX_BIN)");
  }
  return nginx;
}

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolvePort(port));
    });
  });
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

export async function startNginx(
  nginx: string,
  confName: ConfName,
  files: Record<string, string>,
): Promise<RunningNginx> {
  // realpath expands Windows 8.3 short names (C:\Users\NAME~1), which nginx for Windows cannot open.
  const prefix = mkdtempSync(join(realpathSync.native(tmpdir()), "portal-nginx-"));
  const html = join(prefix, "html");
  for (const [path, content] of Object.entries(files)) {
    const target = join(html, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  for (const dir of ["body", "proxy", "fastcgi", "uwsgi", "scgi"]) {
    mkdirSync(join(prefix, `tmp-${dir}`), { recursive: true });
  }

  const port = await freePort();
  const site = readFileSync(join(repoRoot, confName), "utf8")
    .replace("listen 80;", `listen 127.0.0.1:${port};`)
    .replace("root /usr/share/nginx/html;", `root ${slash(html)};`)
    // compose variant only: `web-api` is a docker-compose service name
    .replace("proxy_pass http://web-api:8004/api/;", "proxy_pass http://127.0.0.1:9/api/;");
  if (!site.includes(`listen 127.0.0.1:${port};`) || !site.includes(`root ${slash(html)};`)) {
    throw new Error(`${confName} no longer contains the listen/root lines this harness rewrites`);
  }
  writeFileSync(join(prefix, "site.conf"), site);

  const main = join(prefix, "nginx.conf");
  writeFileSync(
    main,
    `worker_processes 1;
pid ${slash(join(prefix, "nginx.pid"))};
error_log ${slash(join(prefix, "error.log"))} warn;
events { worker_connections 64; }
http {
  types {
    text/html html htm;
    text/css css;
    application/javascript js;
    application/json json;
    application/xml xml;
    text/plain txt;
    image/png png;
    image/jpeg jpg jpeg;
    image/webp webp;
    image/svg+xml svg;
    image/x-icon ico;
  }
  default_type application/octet-stream;
  access_log off;
  client_body_temp_path ${slash(join(prefix, "tmp-body"))};
  proxy_temp_path ${slash(join(prefix, "tmp-proxy"))};
  fastcgi_temp_path ${slash(join(prefix, "tmp-fastcgi"))};
  uwsgi_temp_path ${slash(join(prefix, "tmp-uwsgi"))};
  scgi_temp_path ${slash(join(prefix, "tmp-scgi"))};
  include ${slash(join(prefix, "site.conf"))};
}
`,
  );

  const args = [
    "-p",
    `${slash(prefix)}/`,
    "-c",
    slash(main),
    "-e",
    slash(join(prefix, "early.log")),
  ];
  const child = spawn(nginx, args, { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  let exited = false;
  child.once("exit", () => {
    exited = true;
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const errorLog = () => {
    let log = "(no error log)";
    try {
      log = readFileSync(join(prefix, "error.log"), "utf8");
    } catch {
      // nginx can fail before it opens the error log; its own output is below
    }
    return `${log}
nginx output: ${output || "(none)"}`;
  };
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (exited) throw new Error(`nginx exited during startup:\n${errorLog()}`);
    try {
      await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(500) });
      break;
    } catch {
      await sleep(100);
    }
    if (attempt === 99) throw new Error(`nginx did not answer on ${baseUrl}:\n${errorLog()}`);
  }

  return {
    baseUrl,
    async stop() {
      spawnSync(nginx, [...args, "-s", "stop"], { stdio: "ignore" });
      for (let attempt = 0; attempt < 50 && !exited; attempt += 1) await sleep(100);
      if (!exited) child.kill();
      try {
        rmSync(prefix, { recursive: true, force: true });
      } catch {
        // Windows may still hold a log file for a moment; the temp dir is disposable.
      }
    },
  };
}
