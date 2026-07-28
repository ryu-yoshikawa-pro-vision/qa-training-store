import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const rootDir = join(process.cwd(), "dist");
const host = process.env.WEB_SERVER_HOST ?? "127.0.0.1";
const port = Number(process.env.WEB_SERVER_PORT ?? "8081");
const fallbackFile = join(rootDir, "index.html");

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function resolvePath(requestPath: string) {
  const safePath = normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(rootDir, safePath);
}

async function streamFile(filePath: string, response: import("node:http").ServerResponse) {
  const fileStat = await stat(filePath);
  response.statusCode = 200;
  response.setHeader("Content-Length", fileStat.size);
  response.setHeader("Content-Type", contentTypes[extname(filePath)] ?? "application/octet-stream");
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const filePath = resolvePath(pathname);

  if (method !== "GET" && method !== "HEAD") {
    response.statusCode = 405;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("Method Not Allowed");
    return;
  }

  if (existsSync(filePath)) {
    try {
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        if (method === "HEAD") {
          response.statusCode = 200;
          response.setHeader("Content-Length", fileStat.size);
          response.setHeader("Content-Type", contentTypes[extname(filePath)] ?? "application/octet-stream");
          response.end();
          return;
        }
        await streamFile(filePath, response);
        return;
      }
    } catch {
      // Fall back to index.html below.
    }
  }

  if (method === "HEAD") {
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end();
    return;
  }

  await streamFile(fallbackFile, response);
});

server.listen(port, host, () => {
  // Keep the startup message concise so Playwright logs stay readable.
  console.log(`Static web server listening on http://${host}:${port}`);
});

process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
