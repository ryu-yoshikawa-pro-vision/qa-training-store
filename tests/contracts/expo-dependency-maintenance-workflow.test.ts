import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readWorkflow(filePath: string): string {
  return readFileSync(resolve(process.cwd(), filePath), "utf8").replace(/\r\n/g, "\n");
}

function workflowSteps(source: string): string[] {
  return source
    .split("\n      - name: ")
    .slice(1)
    .map((step) => `      - name: ${step}`);
}

function topLevelBlockLines(source: string, key: string): string[] {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start < 0) return [];

  const blockLines: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line === "" || !line.startsWith("  ") || line.startsWith("    ")) break;
    blockLines.push(line.trim());
  }
  return blockLines;
}

const workflow = readWorkflow(".github/workflows/expo-dependency-maintenance.yml");
const steps = workflowSteps(workflow);
const updateGuard = "if: steps.expo_check.outputs.needs_fix == 'true'";

describe("Expo dependency maintenance workflow contracts", () => {
  it("runs on the planned triggers with bounded permissions and main safety guards", () => {
    expect(workflow).toContain('cron: "0 0 * * 1"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/^\s+(pull_request|push):/m);
    expect(topLevelBlockLines(workflow, "permissions")).toEqual([
      "contents: write",
      "pull-requests: write",
    ]);
    expect(workflow).toContain(
      "concurrency:\n  group: expo-dependency-maintenance\n  cancel-in-progress: false",
    );

    const manualGuard =
      "if: github.event_name == 'workflow_dispatch' && github.ref != 'refs/heads/main'";
    const checkout = steps.find((step) => step.includes("actions/checkout@"));
    expect(checkout).toBeDefined();
    expect(workflow).toContain(manualGuard);
    expect(workflow.indexOf(manualGuard)).toBeLessThan(workflow.indexOf("actions/checkout@"));
    expect(checkout).toContain("actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8");
    expect(checkout).toContain("ref: main");
    expect(checkout).toContain("persist-credentials: false");
    expect(workflow).toContain("pnpm/action-setup@a15d269cd4658e1107c09f1fabf4cbd7bd1f308a");
    expect(workflow).toContain("actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444");
  });

  it("converts the initial Expo check into an explicit no-op or update decision", () => {
    const duplicateCheck = steps.find((step) => step.includes("gh pr list"));
    const expoCheck = steps.find((step) => step.includes("id: expo_check"));
    const noOp = steps.find((step) => step.includes("needs_fix == 'false'"));

    expect(duplicateCheck).toBeDefined();
    expect(duplicateCheck).toContain("--base main");
    expect(duplicateCheck).toContain("--state open");
    expect(duplicateCheck).toContain("--json headRefName");
    expect(duplicateCheck).toContain("automation/expo-compatible-dependencies-");
    expect(duplicateCheck).not.toContain("--title");

    expect(expoCheck).toBeDefined();
    expect(expoCheck).toContain("id: expo_check");
    expect(expoCheck).toContain("if pnpm exec expo install --check; then");
    expect(expoCheck).toContain('echo "needs_fix=false" >> "$GITHUB_OUTPUT"');
    expect(expoCheck).toContain('echo "needs_fix=true" >> "$GITHUB_OUTPUT"');
    expect(expoCheck).not.toContain("set +e");
    expect(expoCheck).not.toContain("continue-on-error");

    expect(noOp).toBeDefined();
    expect(noOp).toContain("needs_fix == 'false'");
    expect(noOp).not.toContain("expo install --fix");
  });

  it("guards every update-path step and preserves the dependency safety checks", () => {
    const fixIndex = steps.findIndex((step) => step.includes("pnpm exec expo install --fix"));
    const prIndex = steps.findIndex((step) => step.includes("gh pr create"));
    expect(fixIndex).toBeGreaterThanOrEqual(0);
    expect(prIndex).toBeGreaterThan(fixIndex);

    for (const step of steps.slice(fixIndex, prIndex + 1)) {
      expect(step).toContain(updateGuard);
    }

    const versionCapture = steps.find((step) => step.includes("dependencies[packageName]"));
    const majorMinorGuard = steps.find((step) => step.includes("EXPECTED_EXPO_MAJOR_MINOR"));
    const postFixCheck = steps.find((step) => step.includes("run: pnpm exec expo install --check"));
    const diffCheck = steps.find((step) => step.includes("git diff --check HEAD"));
    const allowlist = steps.find((step) => step.includes("git ls-files --others"));
    const initialInstall = steps.find((step) =>
      step.includes("run: pnpm install --frozen-lockfile"),
    );

    expect(versionCapture).toBeDefined();
    expect(versionCapture).toContain("dependencies[packageName]");
    expect(versionCapture).toContain('majorMinor("expo")');
    expect(versionCapture).toContain('majorMinor("react-native")');
    expect(initialInstall).toBeDefined();
    expect(initialInstall).not.toContain(updateGuard);

    expect(majorMinorGuard).toBeDefined();
    expect(majorMinorGuard).toContain("EXPECTED_REACT_NATIVE_MAJOR_MINOR");
    expect(majorMinorGuard).toContain("major.minor");
    expect(majorMinorGuard).toContain("throw new Error");

    expect(postFixCheck).toBeDefined();
    expect(postFixCheck).toContain(updateGuard);
    expect(postFixCheck).not.toContain("continue-on-error");
    expect(diffCheck).toBeDefined();
    expect(diffCheck).toContain(updateGuard);

    expect(allowlist).toBeDefined();
    expect(allowlist).toContain("git diff --name-only HEAD");
    expect(allowlist).toContain("git ls-files --others --exclude-standard");
    expect(allowlist).toContain("package.json|pnpm-lock.yaml");
    expect(allowlist).toContain("No changed files");
    expect(workflow.indexOf("git ls-files --others --exclude-standard")).toBeLessThan(
      workflow.indexOf("git add package.json pnpm-lock.yaml"),
    );
  });

  it("synchronizes the repository-specific expo-constants override in the update path", () => {
    const fixIndex = steps.findIndex((step) => step.includes("pnpm exec expo install --fix"));
    const sync = steps.find((step) => step.includes("Sync expo-constants override"));
    const syncIndex = steps.findIndex((step) => step.includes("Sync expo-constants override"));
    const majorMinorIndex = steps.findIndex((step) =>
      step.includes("Verify Expo and React Native major.minor guard"),
    );

    expect(sync).toBeDefined();
    expect(sync).toContain(updateGuard);
    expect(sync).toContain("packageJson.pnpm?.overrides");
    expect(sync).toContain('hasOwnProperty.call(overrides, "expo-constants")');
    expect(sync).toContain('const directVersion = dependencies["expo-constants"]');
    expect(sync).toContain('typeof directVersion !== "string"');
    expect(sync).toContain('overrides["expo-constants"] = directVersion');
    expect(sync).not.toContain("Object.entries");
    expect(sync).not.toContain("Object.keys");
    expect(syncIndex).toBeGreaterThan(fixIndex);
    expect(syncIndex).toBeLessThan(majorMinorIndex);
  });

  it("uses run identity for a non-forced bot branch and creates only a main-based PR", () => {
    const branch = steps.find((step) => step.includes("GITHUB_RUN_ID"));
    const commit = steps.find((step) => step.includes("git commit -m"));
    const push = steps.find((step) => step.includes("git push"));
    const pullRequest = steps.find((step) => step.includes("gh pr create"));

    expect(branch).toBeDefined();
    expect(branch).toContain(
      "automation/expo-compatible-dependencies-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}",
    );
    expect(branch).toContain("GITHUB_RUN_ID");
    expect(branch).toContain("GITHUB_RUN_ATTEMPT");
    expect(branch).toContain(updateGuard);

    expect(commit).toBeDefined();
    expect(commit).toContain("git add package.json pnpm-lock.yaml");
    expect(commit).toContain('git commit -m "chore: align Expo SDK compatible dependencies"');
    expect(commit).toContain("github-actions[bot]");

    expect(push).toBeDefined();
    expect(push).toContain("GH_TOKEN: ${{ github.token }}");
    expect(push).toContain("gh auth setup-git");
    expect(push).not.toContain("--force");
    expect(push).not.toContain("force-with-lease");

    expect(pullRequest).toBeDefined();
    expect(pullRequest).toContain("GH_TOKEN: ${{ github.token }}");
    expect(pullRequest).toContain("--base main");
    expect(pullRequest).toContain('--title "chore: Expo SDK推奨依存へ同期する"');
    expect(workflow).not.toContain("gh workflow run");
    expect(workflow).not.toContain("gh pr merge");
    expect(workflow).not.toContain("--auto-merge");
    expect(workflow).not.toMatch(/\b(PAT|GitHub App)\b/);
  });
});
