import { createServer, type AddressInfo } from "node:net";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";

let tmpDir: string;
let serverProcess: ChildProcess;
let baseUrl: string;

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function fetch(
  url: string,
  method = "GET",
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, { method }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers as Record<string, string>,
          body: Buffer.concat(chunks).toString("utf-8"),
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer(url: string, retries = 30, interval = 500): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, interval));
    }
  }
  throw new Error(`Server at ${url} did not start within ${(retries * interval) / 1000}s`);
}

function startServer(scriptPath: string, tmpCwd: string, port: number): ChildProcess {
  const nodePath = process.execPath;
  const tsxCli = join(
    process.cwd(),
    "node_modules",
    ".pnpm",
    "tsx@4.23.1",
    "node_modules",
    "tsx",
    "dist",
    "cli.mjs",
  );

  const proc = spawn(nodePath, [tsxCli, scriptPath], {
    cwd: tmpCwd,
    env: {
      ...process.env,
      WEB_SERVER_HOST: "127.0.0.1",
      WEB_SERVER_PORT: String(port),
      PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${port}`,
    },
    stdio: "pipe",
    shell: false,
  });

  proc.on("error", () => {});
  return proc;
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

  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;

  const scriptPath = join(process.cwd(), "scripts", "serve-web-dist.ts");
  if (!existsSync(scriptPath)) {
    throw new Error(`Server script not found at ${scriptPath}`);
  }

  serverProcess = startServer(scriptPath, tmpDir, port);
  await waitForServer(baseUrl, 90, 1000);
}, 120_000);

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
    rmSync(tmpDir, { recursive: true, force: true });
  }
}, 30_000);

describe("Static web server contract", () => {
  it("serves index.html at GET /", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("Hello");
  });

  it("serves index.html for SPA routes without extension", async () => {
    const res = await fetch(`${baseUrl}/products/product-1`);
    expect(res.status).toBe(200);
    expect(res.body).toContain("Hello");
  });

  it("serves existing JavaScript with correct content type", async () => {
    const res = await fetch(`${baseUrl}/app.js`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/javascript");
    expect(res.body).toBe("console.log('hello');");
  });

  it("serves WebP with correct content type", async () => {
    const res = await fetch(`${baseUrl}/product.webp`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/webp");
  });

  it("serves WOFF2 with correct content type", async () => {
    const res = await fetch(`${baseUrl}/inter.woff2`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("font/woff2");
  });

  it("returns 404 for missing assets", async () => {
    const res = await fetch(`${baseUrl}/missing.js`);
    expect(res.status).toBe(404);
    expect(res.body).not.toContain("Hello");
  });

  it("returns HEAD with content headers but no body", async () => {
    const res = await fetch(`${baseUrl}/app.js`, "HEAD");
    expect(res.status).toBe(200);
    expect(res.headers["content-length"]).toBeDefined();
    expect(res.headers["content-type"]).toContain("text/javascript");
    expect(res.body).toBe("");
  });

  it("returns 405 for unsupported POST method", async () => {
    const res = await fetch(`${baseUrl}/`, "POST");
    expect(res.status).toBe(405);
  });

  it("returns 400 for malformed percent encoding", async () => {
    const res = await fetch(`${baseUrl}/%GG`);
    expect(res.status).toBe(400);
  });

  it("prevents path traversal outside dist", async () => {
    const res = await fetch(`${baseUrl}/../secret.txt`);
    expect(res.status).toBe(404);
    expect(res.body).not.toContain("secret-data");
  });

  it("prevents encoded path traversal", async () => {
    const res = await fetch(`${baseUrl}/..%252Fsecret.txt`);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.body).not.toContain("secret-data");
  });

  it("returns 404 for HEAD on missing asset", async () => {
    const res = await fetch(`${baseUrl}/missing.css`, "HEAD");
    expect(res.status).toBe(404);
    expect(res.body).toBe("");
  });

  it("sets Cache-Control: no-store on all responses", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.headers["cache-control"]).toContain("no-store");

    const res2 = await fetch(`${baseUrl}/app.js`);
    expect(res2.headers["cache-control"]).toContain("no-store");
  });
});
