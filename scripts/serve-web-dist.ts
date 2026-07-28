import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

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

const resolvedRoot = resolve(process.cwd(), "dist");
const fallbackFile = resolve(resolvedRoot, "index.html");

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
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

async function send404(response: import("node:http").ServerResponse) {
  response.statusCode = 404;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end("Not Found");
}

async function send400(response: import("node:http").ServerResponse) {
  response.statusCode = 400;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end("Bad Request");
}

async function sendMethodNotAllowed(response: import("node:http").ServerResponse) {
  response.statusCode = 405;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end("Method Not Allowed");
}

function sendHead(response: import("node:http").ServerResponse, fileSize: number, mime: string) {
  response.statusCode = 200;
  response.setHeader("Content-Length", fileSize);
  response.setHeader("Content-Type", mime);
  response.setHeader("Cache-Control", "no-store");
  response.end();
}

function sendFile(
  response: import("node:http").ServerResponse,
  filePath: string,
  fileSize: number,
  mime: string,
) {
  response.statusCode = 200;
  response.setHeader("Content-Length", fileSize);
  response.setHeader("Content-Type", mime);
  response.setHeader("Cache-Control", "no-store");
  const stream = createReadStream(filePath);
  stream.on("error", () => {
    if (!response.headersSent) {
      send500(response);
    }
  });
  stream.pipe(response);
}

async function send500(response: import("node:http").ServerResponse) {
  response.statusCode = 500;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end("Internal Server Error");
}

function sendIndex(response: import("node:http").ServerResponse, method: string) {
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

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";

  if (method !== "GET" && method !== "HEAD") {
    await sendMethodNotAllowed(response);
    return;
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(request.url ?? "/");
  } catch {
    await send400(response);
    return;
  }

  const urlPath = pathname;

  const resolved = resolvePathSafe(urlPath);
  if (resolved === null) {
    if (method === "HEAD") {
      await send404(response);
      return;
    }
    await send404(response);
    return;
  }

  try {
    const fileStat = await stat(resolved);
    if (fileStat.isFile()) {
      const mime = contentTypes[extname(resolved)] ?? "application/octet-stream";
      if (method === "HEAD") {
        sendHead(response, fileStat.size, mime);
        return;
      }
      sendFile(response, resolved, fileStat.size, mime);
      return;
    }
  } catch {
    // File not found or stat failure – fall through to SPA or 404.
  }

  if (isSpaRoute(urlPath)) {
    sendIndex(response, method);
    return;
  }

  if (method === "HEAD") {
    await send404(response);
    return;
  }
  await send404(response);
});

server.listen(port, host, () => {
  console.log(`Static web server listening on http://${host}:${port}`);
});

process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
