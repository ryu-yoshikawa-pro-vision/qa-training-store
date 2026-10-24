import path from "node:path";

export type AiAssistedQaPlaywrightEnvironment = {
  baseUrl?: string;
  testRoot?: string;
};

export type AiAssistedQaPlaywrightSettings = {
  baseUrl: string;
  testDir: string;
  testArea: "workspace" | "assessment";
};

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const WORKSPACE_MODULES = ["M05", "M06", "M07", "M08", "M10"] as const;
const ASSESSMENT_MODULES = ["M05", "M06", "M07"] as const;

function isWithin(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  );
}

export function resolveAiAssistedQaPlaywrightSettings(
  repositoryRoot: string,
  environment: AiAssistedQaPlaywrightEnvironment = {},
): AiAssistedQaPlaywrightSettings {
  const baseUrl = environment.baseUrl?.trim() || "http://127.0.0.1:8082";
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error(`PLAYWRIGHT_BASE_URLが不正です: ${baseUrl}`);
  }
  if (
    parsedUrl.protocol !== "http:" ||
    !LOOPBACK_HOSTS.has(parsedUrl.hostname.toLowerCase()) ||
    parsedUrl.port !== "8082" ||
    parsedUrl.username !== "" ||
    parsedUrl.password !== "" ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search !== "" ||
    parsedUrl.hash !== ""
  ) {
    throw new Error("新課程Playwrightは資格情報や追加パスのないloopback HTTP 8082だけを使用します");
  }

  const testDir = path.resolve(repositoryRoot, environment.testRoot?.trim() || "workspace/M06");
  const workspaceRoots = WORKSPACE_MODULES.map((moduleId) =>
    path.resolve(repositoryRoot, "workspace", moduleId),
  );
  const assessmentRoots = ASSESSMENT_MODULES.map((moduleId) =>
    path.resolve(repositoryRoot, "training/ai-assisted-qa-course/assessment/playwright", moduleId),
  );
  const testArea = workspaceRoots.some((root) => isWithin(testDir, root))
    ? "workspace"
    : assessmentRoots.some((root) => isWithin(testDir, root))
      ? "assessment"
      : null;
  if (testArea === null) {
    throw new Error(
      "新課程Playwrightはworkspace/M05・M06・M07・M08・M10またはassessment/playwright/M05・M06・M07配下だけを許可します",
    );
  }
  return { baseUrl: parsedUrl.toString().replace(/\/$/, ""), testDir, testArea };
}
