import path from "node:path";

export type AiAssistedQaPlaywrightEnvironment = {
  baseUrl?: string;
  testRoot?: string;
};

export type AiAssistedQaPlaywrightSettings = {
  baseUrl: string;
  testDir: string;
};

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const COURSE_MODULES = ["M05", "M06", "M07"] as const;

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
  const allowedRoots = COURSE_MODULES.map((moduleId) =>
    path.resolve(repositoryRoot, "workspace", moduleId),
  );
  const allowed = allowedRoots.some((allowedRoot) => {
    const relative = path.relative(allowedRoot, testDir);
    return (
      relative === "" ||
      (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
    );
  });
  if (!allowed) {
    throw new Error(
      "新課程Playwrightの対象はworkspace/M05、workspace/M06またはworkspace/M07配下に限ります",
    );
  }
  return { baseUrl: parsedUrl.toString().replace(/\/$/, ""), testDir };
}
