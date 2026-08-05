import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Windows Android local validation contract", () => {
  it("exposes the bounded physical-device workflow through package scripts", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      "native:android:doctor": expect.stringContaining("-Action Doctor"),
      "native:android:prepare": expect.stringContaining("-Action Prepare"),
      "native:android:build:local": expect.stringContaining("-Action Build"),
      "native:android:install:local": expect.stringContaining("-Action Install"),
      "native:android:smoke:local": expect.stringContaining("-Action Smoke"),
      "native:android:test:control": expect.stringContaining("-Action Test"),
      "native:android:test:runtime": expect.stringContaining("-Action RuntimeSuite"),
      "native:android:test:boundary": expect.stringContaining("-Action BoundarySuite"),
      "native:android:evidence": expect.stringContaining("-Action Evidence"),
    });
  });

  it("keeps the runbook, script, and agent skill aligned", () => {
    const runbook = read("docs/native/windows-android-local-validation.md");
    const script = read("scripts/native/windows/android-local.ps1");
    const skill = read(".agents/skills/android-native-local-validation/SKILL.md");

    for (const action of [
      "Doctor",
      "Prepare",
      "Build",
      "Install",
      "Smoke",
      "Test",
      "RuntimeSuite",
      "BoundarySuite",
      "Evidence",
    ]) {
      expect(script).toContain(`"${action}"`);
    }

    expect(runbook).toContain("maestro/native-test-control.yaml");
    expect(runbook).toContain("単体 Flow が失敗した場合、他の Flow を実行しない");
    expect(skill).toContain("単体 Flow が失敗したら後続 Suite を実行せず");
  });

  it("enables Expo autolinking-aware Metro resolution", () => {
    const appConfig = read("app.config.ts");
    expect(appConfig).toContain("autolinkingModuleResolution: true");
  });

  it("does not track local Android evidence", () => {
    const gitignore = read(".gitignore");
    expect(gitignore).toContain(".artifacts/");
    expect(gitignore).toContain("android/");
    expect(gitignore).toContain("*.apk");
  });
});
