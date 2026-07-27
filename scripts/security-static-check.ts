import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const self = "scripts/security-static-check.ts";
const textExtensions = new Set([
  "",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

async function collect(relativePath: string): Promise<string[]> {
  const absolutePath = path.join(root, relativePath);
  let entry;
  try {
    entry = await stat(absolutePath);
  } catch {
    return [];
  }
  if (entry.isFile()) {
    return textExtensions.has(path.extname(relativePath))
      ? [relativePath.replaceAll("\\", "/")]
      : [];
  }
  const children = await readdir(absolutePath);
  return (
    await Promise.all(children.map((child) => collect(path.join(relativePath, child))))
  ).flat();
}

async function read(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), "utf8");
}

const credentialPatterns: [string, RegExp][] = [
  ["GitHub classic token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "hard-coded secret assignment",
    /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token)\b\s*[:=]\s*["'][A-Za-z0-9_./+=-]{16,}["']/i,
  ],
];

const forbiddenRuntimePatterns: [string, RegExp][] = [
  ["external fetch", /\bfetch\s*\(/],
  ["XMLHttpRequest", /\bXMLHttpRequest\b/],
  ["WebSocket", /\bWebSocket\s*\(/],
  ["EventSource", /\bEventSource\s*\(/],
  ["GitHub API", /\bapi\.github\.com\b/i],
  ["GitHub client", /\b(?:octokit|@octokit)\b/i],
  ["runtime manifest fetch", /product-image-manifest\.json/],
  ["raw HTML injection", /\bdangerouslySetInnerHTML\b/],
];

async function main(): Promise<void> {
  const runtimeFiles = (
    await Promise.all(["src", "app"].map((directory) => collect(directory)))
  ).flat();
  const credentialFiles = (
    await Promise.all(
      ["src", "app", "config", "public", "scripts", ".github", "dist"].map((directory) =>
        collect(directory),
      ),
    )
  )
    .flat()
    .filter((file) => file !== self);
  const failures: string[] = [];

  for (const file of credentialFiles) {
    const source = await read(file);
    for (const [label, pattern] of credentialPatterns) {
      if (pattern.test(source)) {
        failures.push(`${file}: ${label}`);
      }
    }
  }

  const runtimeSource = (
    await Promise.all(runtimeFiles.map(async (file) => `${file}\n${await read(file)}`))
  ).join("\n");

  for (const [label, pattern] of forbiddenRuntimePatterns) {
    if (pattern.test(runtimeSource)) {
      failures.push(`runtime: ${label}`);
    }
  }

  for (const seedDirectory of ["src/seeds", "src/infrastructure/database"]) {
    for (const file of await collect(seedDirectory)) {
      if ((await read(file)).includes("testpass1")) {
        failures.push(`${file}: plaintext test password in runtime seed/database source`);
      }
    }
  }

  const testApiSource = await read("src/test-controls/test-api.web.ts");
  if (!testApiSource.includes('buildKind === "automation" || buildKind === "local"')) {
    failures.push("Test API build allow-list is missing automation/local");
  }
  if (!testApiSource.includes("!isTestApiBuild(buildKind)")) {
    failures.push("Test API installation is not guarded by the build allow-list");
  }

  if (failures.length > 0) {
    console.error("Security static check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `Security static check passed (${runtimeFiles.length} runtime files, ${credentialFiles.length} credential-scan files).`,
    );
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
