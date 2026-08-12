import { createServer, type AddressInfo } from "node:net";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import type { IncomingHttpHeaders } from "node:http";

interface HttpTestResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

interface StartedProcess {
  process: ChildProcess;
  startupError: Promise<never>;
}

let tmpDir: string;
let serverProcess: ChildProcess;
let baseUrl: string;
let port: number;

const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const freePort = (srv.address() as AddressInfo).port;
      srv.close(() => resolve(freePort));
    });
    srv.on("error", reject);
  });
}

function fetchResponse(
  url: string,
  method = "GET",
  headers?: Record<string, string>,
): Promise<HttpTestResponse> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, { method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function fetchSubresource(url: string, method = "GET"): Promise<HttpTestResponse> {
  return fetchResponse(url, method, { "sec-fetch-dest": "script" });
}

function requestRawPath(
  targetPort: number,
  path: string,
  method = "GET",
): Promise<HttpTestResponse> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: "127.0.0.1",
        port: targetPort,
        path,
        method,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
}

async function waitForServer(
  url: string,
  childProc?: ChildProcess,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const intervalMs = options?.intervalMs ?? 100;
  const retries = Math.ceil(timeoutMs / intervalMs);
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    if (childProc?.exitCode !== null && childProc?.exitCode !== undefined) {
      const stderr = childProc?.stderr?.readable
        ? (childProc.stderr.read()?.toString("utf-8") ?? "")
        : "";
      throw new Error(
        [
          "Static server exited before becoming ready.",
          `exitCode: ${childProc.exitCode}`,
          `signal: ${childProc.signalCode}`,
          `url: ${url}`,
          `stderr: ${stderr}`,
          `waited: ${(i * intervalMs) / 1000}s`,
        ].join("\n"),
      );
    }

    try {
      await fetchResponse(url);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  const stderr = childProc?.stderr?.readable
    ? (childProc.stderr.read()?.toString("utf-8") ?? "")
    : "";
  throw new Error(
    [
      `Server at ${url} did not start within ${timeoutMs / 1000}s`,
      `exitCode: ${childProc?.exitCode ?? "null"}`,
      `signal: ${childProc?.signalCode ?? "null"}`,
      `stderr: ${stderr}`,
      `lastError: ${lastError?.message ?? "unknown"}`,
    ].join("\n"),
  );
}

function startServer(scriptPath: string, tmpCwd: string, targetPort: number): StartedProcess {
  const nodePath = process.execPath;

  const proc = spawn(nodePath, [tsxCli, scriptPath], {
    cwd: tmpCwd,
    env: {
      ...process.env,
      WEB_SERVER_HOST: "127.0.0.1",
      WEB_SERVER_PORT: String(targetPort),
      PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${targetPort}`,
    },
    stdio: "pipe",
    shell: false,
  });

  const startupError: Promise<never> = new Promise((_, reject) => {
    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn static server: ${err.message}`));
    });

    proc.on("exit", (code, signal) => {
      const stderr = proc.stderr?.readable ? (proc.stderr.read()?.toString("utf-8") ?? "") : "";
      if (code !== null || signal !== null) {
        reject(
          new Error(
            [
              "Static server exited before becoming ready.",
              `exitCode: ${code}`,
              `signal: ${signal}`,
              `url: http://127.0.0.1:${targetPort}`,
              `stderr: ${stderr}`,
            ].join("\n"),
          ),
        );
      }
    });
  });

  return { process: proc, startupError };
}

function killProcess(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!proc.pid) {
      resolve();
      return;
    }
    const pid = proc.pid;

    const timer = setTimeout(() => {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Already dead.
      }
      resolve();
    }, 3000);

    try {
      process.kill(pid, "SIGTERM");
    } catch {
      clearTimeout(timer);
      resolve();
      return;
    }

    proc.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "serve-web-dist-test-"));
  const distDir = join(tmpDir, "dist");
  mkdirSync(distDir, { recursive: true });

  writeFileSync(join(distDir, "index.html"), "<html><body>Hello</body></html>", "utf-8");
  writeFileSync(join(distDir, "app.js"), "console.log('hello');", "utf-8");

  const webpContent = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
  ]);
  writeFileSync(join(distDir, "product.webp"), webpContent);

  const woff2Content = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00]);
  writeFileSync(join(distDir, "inter.woff2"), woff2Content);

  const secretFixture = join(distDir, "..", "secret.txt");
  writeFileSync(secretFixture, "secret-data", "utf-8");

  port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;

  const scriptPath = join(process.cwd(), "scripts", "serve-web-dist.ts");
  if (!existsSync(scriptPath)) {
    throw new Error(`Server script not found at ${scriptPath}`);
  }

  const started = startServer(scriptPath, tmpDir, port);
  serverProcess = started.process;
  await Promise.race([waitForServer(baseUrl, serverProcess), started.startupError]);
}, 30_000);

afterAll(async () => {
  if (serverProcess) {
    await killProcess(serverProcess);
  }

  const remainingProcs = serverProcess?.pid
    ? (() => {
        try {
          process.kill(serverProcess.pid!, 0);
          return true;
        } catch {
          return false;
        }
      })()
    : false;
  if (remainingProcs) {
    try {
      process.kill(serverProcess.pid!, "SIGKILL");
    } catch {
      // Ignore.
    }
  }

  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}, 10_000);

describe("Static web server contract", () => {
  it("serves index.html at GET /", async () => {
    const res = await fetchResponse(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body.toString("utf-8")).toContain("Hello");
  });

  it("serves index.html for SPA routes without extension", async () => {
    const res = await fetchResponse(`${baseUrl}/products/product-1`);
    expect(res.status).toBe(200);
    expect(res.body.toString("utf-8")).toContain("Hello");
  });

  it("serves existing JavaScript with correct content type", async () => {
    const res = await fetchSubresource(`${baseUrl}/app.js`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/javascript");
    expect(res.body.toString("utf-8")).toBe("console.log('hello');");
  });

  it("serves WebP with correct content type", async () => {
    const res = await fetchResponse(`${baseUrl}/product.webp`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/webp");
  });

  it("serves WOFF2 with correct content type", async () => {
    const res = await fetchResponse(`${baseUrl}/inter.woff2`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("font/woff2");
  });

  it("returns 404 for missing assets", async () => {
    const res = await fetchResponse(`${baseUrl}/missing.js`);
    expect(res.status).toBe(404);
    expect(res.body.toString("utf-8")).not.toContain("Hello");
  });

  it("returns HEAD with content headers but no body", async () => {
    const res = await fetchSubresource(`${baseUrl}/app.js`, "HEAD");
    expect(res.status).toBe(200);
    expect(res.headers["content-length"]).toBeDefined();
    expect(res.headers["content-type"]).toContain("text/javascript");
    expect(res.body.toString("utf-8")).toBe("");
  });

  it("returns 405 for unsupported POST method", async () => {
    const res = await fetchResponse(`${baseUrl}/`, "POST");
    expect(res.status).toBe(405);
  });

  it("returns 400 for malformed percent encoding", async () => {
    const res = await fetchResponse(`${baseUrl}/%GG`);
    expect(res.status).toBe(400);
  });

  it("prevents path traversal outside dist", async () => {
    const res = await fetchResponse(`${baseUrl}/../secret.txt`);
    expect(res.status).toBe(404);
    expect(res.body.toString("utf-8")).not.toContain("secret-data");
  });

  it("prevents encoded path traversal via raw path", async () => {
    const res = await requestRawPath(port, "/..%2Fsecret.txt");
    expect([400, 404]).toContain(res.status);
    expect(res.body.toString("utf-8")).not.toContain("secret-data");
  });

  it("prevents double-encoded path traversal", async () => {
    const res = await requestRawPath(port, "/%2E%2E%2Fsecret.txt");
    expect([400, 404]).toContain(res.status);
    expect(res.body.toString("utf-8")).not.toContain("secret-data");
  });

  it("prevents backslash-encoded path traversal", async () => {
    const res = await requestRawPath(port, "/..%5Csecret.txt");
    expect([400, 404]).toContain(res.status);
    expect(res.body.toString("utf-8")).not.toContain("secret-data");
  });

  it("prevents double-encoded backslash path traversal", async () => {
    const res = await requestRawPath(port, "/%2E%2E%5Csecret.txt");
    expect([400, 404]).toContain(res.status);
    expect(res.body.toString("utf-8")).not.toContain("secret-data");
  });

  it("continues serving after traversal request", async () => {
    await requestRawPath(port, "/..%2Fsecret.txt");
    const health = await fetchResponse(`${baseUrl}/`);
    expect(health.status).toBe(200);
    expect(health.body.toString("utf-8")).toContain("Hello");
  });

  it("serves asset with query string", async () => {
    const res = await fetchSubresource(`${baseUrl}/app.js?v=1`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/javascript");
    expect(res.body.toString("utf-8")).toBe("console.log('hello');");
  });

  it("serves WebP with query string", async () => {
    const res = await fetchResponse(`${baseUrl}/product.webp?cache=1`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/webp");
  });

  it("serves WOFF2 with query string", async () => {
    const res = await fetchResponse(`${baseUrl}/inter.woff2?v=20260728`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("font/woff2");
  });

  it("serves SPA route with query string", async () => {
    const res = await fetchResponse(`${baseUrl}/products?sort=price`);
    expect(res.status).toBe(200);
    expect(res.body.toString("utf-8")).toContain("Hello");
  });

  it("returns 404 for missing asset with query string", async () => {
    const res = await fetchResponse(`${baseUrl}/missing.js?v=1`);
    expect(res.status).toBe(404);
    expect(res.body.toString("utf-8")).not.toContain("Hello");
  });

  it("returns 404 for HEAD on missing asset", async () => {
    const res = await fetchResponse(`${baseUrl}/missing.css`, "HEAD");
    expect(res.status).toBe(404);
    expect(res.body.toString("utf-8")).toBe("");
  });

  it("sets Cache-Control: no-store on all responses", async () => {
    const res = await fetchResponse(`${baseUrl}/`);
    expect(res.headers["cache-control"]).toContain("no-store");

    const res2 = await fetchSubresource(`${baseUrl}/app.js`);
    expect(res2.headers["cache-control"]).toContain("no-store");
  });

  it("denies direct navigation to implementation resources", async () => {
    const res = await fetchResponse(`${baseUrl}/app.js`);
    expect(res.status).toBe(403);
    expect(res.body.toString("utf-8")).toBe("Forbidden");
  });
});
