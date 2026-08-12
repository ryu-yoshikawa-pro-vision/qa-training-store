import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  packageManager,
  [
    "exec",
    "playwright",
    "test",
    "training/playwright/failure-exercises",
    "--config=playwright.training.config.ts",
    "--project=training-chromium",
  ],
  { stdio: "inherit", env: process.env, shell: process.platform === "win32" },
);

if (result.error) throw result.error;

const evidenceRoot = resolve("output/training/playwright");
function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

const evidenceFiles = listFiles(evidenceRoot);
const evidenceExists = evidenceFiles.length > 0;
const requiredEvidence = [".zip", ".png", ".webm", ".html"];
const missingEvidence = requiredEvidence.filter(
  (extension) => !evidenceFiles.some((file) => statSync(file).isFile() && file.endsWith(extension)),
);

if (result.status === 0) {
  throw new Error("The expected-failure exercise unexpectedly passed.");
}
if (!evidenceExists) {
  throw new Error(`Expected-failure evidence was not generated under ${evidenceRoot}.`);
}
if (missingEvidence.length > 0) {
  throw new Error(`Expected-failure evidence is missing: ${missingEvidence.join(", ")}.`);
}

console.log("Expected failure and evidence contract passed.");
