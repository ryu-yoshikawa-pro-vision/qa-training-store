const originalDeployedBaseUrl = process.env.DEPLOYED_BASE_URL;
const originalLocalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const localBaseUrl = "http://127.0.0.1:4173";

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

    expect(config.webServer).toMatchObject({ url: localBaseUrl });
    expect(deployedSmokeProject(config).use?.baseURL).toBe(localBaseUrl);
  });

  it("uses the deployed URL without starting the local web server", async () => {
    const deployedBaseUrl = "https://preview.example.test";
    const config = await loadPlaywrightConfig(deployedBaseUrl);

    expect(config.webServer).toBeUndefined();
    expect(deployedSmokeProject(config).use?.baseURL).toBe(deployedBaseUrl);
  });

  it("treats an empty deployed URL as a local run", async () => {
    const config = await loadPlaywrightConfig("");

    expect(config.webServer).toMatchObject({ url: localBaseUrl });
    expect(deployedSmokeProject(config).use?.baseURL).toBe(localBaseUrl);
  });
});
