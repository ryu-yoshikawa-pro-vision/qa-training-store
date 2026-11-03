import { createReadStream, existsSync, lstatSync, readdirSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import type { ServerResponse } from "node:http";

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);

const defaultBaseUrl = new URL("http://127.0.0.1:8081");
const configuredBaseUrl = new URL(process.env.PLAYWRIGHT_BASE_URL ?? defaultBaseUrl.toString());

if (configuredBaseUrl.protocol === "https:") {
  console.error("PLAYWRIGHT_BASE_URL uses https, but the local static server only supports http.");
  process.exit(1);
}

function resolvePort(envPort: string | undefined, urlPort: string, protocol: string): number {
  if (envPort !== undefined) {
    const p = Number(envPort);
    if (Number.isFinite(p) && p > 0 && p < 65536) return p;
  }
  if (urlPort !== "") return Number(urlPort);
  if (protocol === "http:") return 80;
  if (protocol === "https:") return 443;
  return 8081;
}

const host = (process.env.WEB_SERVER_HOST ?? configuredBaseUrl.hostname).toLowerCase();
const port = resolvePort(
  process.env.WEB_SERVER_PORT,
  configuredBaseUrl.port,
  configuredBaseUrl.protocol,
);

if (!loopbackHosts.has(host)) {
  console.error(`WEB_SERVER_HOST must be a loopback address, got: ${host}`);
  process.exit(1);
}

const configuredRoot = process.env.WEB_SERVER_DIST_ROOT ?? "dist";
const resolvedRoot = resolve(process.cwd(), configuredRoot);
const fallbackFile = resolve(resolvedRoot, "index.html");

function assertNoSymlinks(directory: string): void {
  const rootStat = lstatSync(directory);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink())
    throw new Error(`WEB_SERVER_DIST_ROOT must be a real directory: ${directory}`);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const child = resolve(directory, entry.name);
    const stat = lstatSync(child);
    if (stat.isSymbolicLink()) throw new Error(`Prepared Runtime contains a symlink: ${child}`);
    if (stat.isDirectory()) assertNoSymlinks(child);
  }
}

try {
  assertNoSymlinks(resolvedRoot);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function isSpaRoute(pathname: string): boolean {
  return extname(pathname) === "";
}

function resolvePathSafe(requestPath: string): string | null {
  const candidate = resolve(resolvedRoot, `.${requestPath}`);
  const rootPrefix = `${resolvedRoot}${sep}`;
  if (candidate !== resolvedRoot && !candidate.startsWith(rootPrefix)) {
    return null;
  }
  return candidate;
}

function send404(response: ServerResponse): void {
  response.statusCode = 404;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end("Not Found");
}

function send400(response: ServerResponse): void {
  response.statusCode = 400;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end("Bad Request");
}

function send405(response: ServerResponse): void {
  response.statusCode = 405;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end("Method Not Allowed");
}

function sendHead(response: ServerResponse, fileSize: number, mime: string): void {
  response.statusCode = 200;
  response.setHeader("Content-Length", fileSize);
  response.setHeader("Content-Type", mime);
  response.setHeader("Cache-Control", "no-store");
  response.end();
}

function send500(response: ServerResponse): void {
  response.statusCode = 500;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end("Internal Server Error");
}

function sendFile(
  response: ServerResponse,
  filePath: string,
  fileSize: number,
  mime: string,
): void {
  response.statusCode = 200;
  response.setHeader("Content-Length", fileSize);
  response.setHeader("Content-Type", mime);
  response.setHeader("Cache-Control", "no-store");
  const stream = createReadStream(filePath);
  stream.on("error", () => {
    if (!response.headersSent) {
      send500(response);
      return;
    }
    response.destroy();
  });
  stream.pipe(response);
}

function sendIndex(response: ServerResponse, method: string): void {
  if (!existsSync(fallbackFile)) {
    console.error("dist/index.html was not found. Run pnpm run build:web first.");
    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.end("dist/index.html was not found. Run pnpm run build:web first.");
    return;
  }

  stat(fallbackFile)
    .then((fileStat) => {
      if (method === "HEAD") {
        sendHead(response, fileStat.size, "text/html; charset=utf-8");
        return;
      }
      sendFile(response, fallbackFile, fileStat.size, "text/html; charset=utf-8");
    })
    .catch(() => {
      send500(response);
    });
}

const server = createServer((request, response) => {
  const method = request.method ?? "GET";

  if (method !== "GET" && method !== "HEAD") {
    send405(response);
    return;
  }

  let pathname: string;
  try {
    const hostHeader = request.headers.host ?? `${host}:${port}`;
    const requestUrl = new URL(request.url ?? "/", `http://${hostHeader}`);
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    send400(response);
    return;
  }

  const resolved = resolvePathSafe(pathname);
  if (resolved === null) {
    if (method === "HEAD") {
      send404(response);
      return;
    }
    send404(response);
    return;
  }

  stat(resolved)
    .then((fileStat) => {
      if (fileStat.isFile()) {
        const mime = contentTypes[extname(resolved)] ?? "application/octet-stream";
        if (method === "HEAD") {
          sendHead(response, fileStat.size, mime);
          return;
        }
        sendFile(response, resolved, fileStat.size, mime);
        return;
      }

      if (fileStat.isDirectory()) {
        const directoryIndex = resolve(resolved, "index.html");
        stat(directoryIndex)
          .then((indexStat) => {
            if (!indexStat.isFile()) throw new Error("Directory index is not a file");
            if (method === "HEAD") {
              sendHead(response, indexStat.size, "text/html; charset=utf-8");
              return;
            }
            sendFile(response, directoryIndex, indexStat.size, "text/html; charset=utf-8");
          })
          .catch(() => {
            if (isSpaRoute(pathname)) {
              sendIndex(response, method);
              return;
            }
            send404(response);
          });
        return;
      }

      if (isSpaRoute(pathname)) {
        sendIndex(response, method);
        return;
      }

      if (method === "HEAD") {
        send404(response);
        return;
      }
      send404(response);
    })
    .catch(() => {
      if (isSpaRoute(pathname)) {
        sendIndex(response, method);
        return;
      }

      if (method === "HEAD") {
        send404(response);
        return;
      }
      send404(response);
    });
});

server.listen(port, host, () => {
  console.log(`Static web server listening on http://${host}:${port}`);
});

server.on("error", (error: Error) => {
  console.error("Static web server failed:", error.message);
  process.exitCode = 1;
});

process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
