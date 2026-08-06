import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const guardRoot = join(root, "output", "native-bundle-guard");
const marker = "__SCENARIO_SHOP_NATIVE_AUTOMATION__";
const harnessMarker = "__SCENARIO_SHOP_NATIVE_CONTRACT_HARNESS__";

function bundleFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...bundleFiles(path));
    else if (/\.(js|hbc|map|json)$/.test(entry.name)) files.push(path);
  }
  return files;
}

function build(kind: "automation" | "production"): string {
  const outputDirectory = join(guardRoot, `${kind}-${randomUUID()}`);
  mkdirSync(outputDirectory, { recursive: true });
  execFileSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "expo", "export", "--platform", "android", "--output-dir", outputDirectory],
    {
      cwd: root,
      env: {
        ...process.env,
        EXPO_PUBLIC_APP_ENV: kind === "production" ? "production" : "automation",
        EXPO_PUBLIC_BUILD_KIND: kind,
        EXPO_PUBLIC_TEST_MODE: kind === "production" ? "false" : "true",
      },
      shell: process.platform === "win32",
      stdio: "inherit",
    },
  );
  const files = bundleFiles(outputDirectory);
  if (files.length === 0) throw new Error(`No native bundle output found for ${kind}`);
  return files.map((file) => readFileSync(file, "utf8")).join("\n");
}

const automationBundle = build("automation");
if (!automationBundle.includes(marker) || !automationBundle.includes(harnessMarker)) {
  throw new Error("Automation bundle does not contain the Test Control/Harness markers");
}

const productionBundle = build("production");
if (productionBundle.includes(marker) || productionBundle.includes(harnessMarker)) {
  throw new Error("Production bundle contains the Test Control/Harness marker");
}
if (productionBundle.includes("NativeTestControlService")) {
  throw new Error("Production bundle contains NativeTestControlService");
}

console.log(
  "Native production bundle guard PASS: automation markers present, production markers absent",
);
