import type { PlaywrightTestConfig } from "@playwright/test";

const originalDeployedBaseUrl = process.env.DEPLOYED_BASE_URL;
const originalLocalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const localBaseUrl = "http://127.0.0.1:4173";

function webServerAsObject(ws: PlaywrightTestConfig["webServer"]) {
  if (Array.isArray(ws)) return ws[0];
  return ws;
}

async function loadPlaywrightConfig(deployedBaseUrl: string | undefined) {
  process.env.PLAYWRIGHT_BASE_URL = localBaseUrl;
  if (deployedBaseUrl === undefined) {
    delete process.env.DEPLOYED_BASE_URL;
  } else {
    process.env.DEPLOYED_BASE_URL = deployedBaseUrl;
  }
  vi.resetModules();
  return (await import("../../playwright.config")).default;
}

function deployedSmokeProject(config: Awaited<ReturnType<typeof loadPlaywrightConfig>>) {
  const project = config.projects?.find(({ name }) => name === "deployed-smoke");
  expect(project).toBeDefined();
  return project!;
}

afterEach(() => {
  if (originalDeployedBaseUrl === undefined) {
    delete process.env.DEPLOYED_BASE_URL;
  } else {
    process.env.DEPLOYED_BASE_URL = originalDeployedBaseUrl;
  }
  if (originalLocalBaseUrl === undefined) {
    delete process.env.PLAYWRIGHT_BASE_URL;
  } else {
    process.env.PLAYWRIGHT_BASE_URL = originalLocalBaseUrl;
  }
  vi.resetModules();
});

describe("Playwright local and deployed target boundary", () => {
  it("starts the local web server when DEPLOYED_BASE_URL is not set", async () => {
    const config = await loadPlaywrightConfig(undefined);
    const ws = webServerAsObject(config.webServer);

    expect(ws).toBeDefined();
    expect(ws!.url).toBe(localBaseUrl);
    expect(ws!.command).toContain("serve-web-dist.ts");
    expect(ws!.timeout).toBe(120_000);
    if (process.env.CI) {
      expect(ws!.reuseExistingServer).toBe(false);
    } else {
      expect(ws!.reuseExistingServer).toBe(true);
    }
    expect(deployedSmokeProject(config).use?.baseURL).toBe(localBaseUrl);
  });

  it("uses the deployed URL without starting the local web server", async () => {
    const deployedBaseUrl = "https://preview.example.test";
    const config = await loadPlaywrightConfig(deployedBaseUrl);

    expect(webServerAsObject(config.webServer)).toBeUndefined();
    expect(deployedSmokeProject(config).use?.baseURL).toBe(deployedBaseUrl);
  });

  it("treats an empty deployed URL as a local run", async () => {
    const config = await loadPlaywrightConfig("");
    const ws = webServerAsObject(config.webServer);

    expect(ws).toBeDefined();
    expect(ws!.url).toBe(localBaseUrl);
    expect(deployedSmokeProject(config).use?.baseURL).toBe(localBaseUrl);
  });

  it("resolves the webServer URL from PLAYWRIGHT_BASE_URL", async () => {
    process.env.PLAYWRIGHT_BASE_URL = "http://127.0.0.1:4173";
    delete process.env.DEPLOYED_BASE_URL;
    vi.resetModules();
    const config = (await import("../../playwright.config")).default;
    const ws = webServerAsObject(config.webServer);

    expect(ws).toBeDefined();
    expect(ws!.url).toBe("http://127.0.0.1:4173");
  });

  it("defaults the webServer URL when PLAYWRIGHT_BASE_URL is unset", async () => {
    delete process.env.PLAYWRIGHT_BASE_URL;
    delete process.env.DEPLOYED_BASE_URL;
    vi.resetModules();
    const config = (await import("../../playwright.config")).default;
    const ws = webServerAsObject(config.webServer);

    expect(ws).toBeDefined();
    expect(ws!.url).toBe("http://127.0.0.1:8081");
  });
});
