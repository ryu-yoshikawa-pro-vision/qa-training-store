import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const report = fs.readFileSync(
  path.join(process.cwd(), "docs/reports/2026-11-04_pr215-phase2-acceptance.md"),
  "utf8",
);
const specPaths = [
  "training/ai-assisted-qa-course/assessment/playwright/M06/cart-cases.spec.ts",
  "training/ai-assisted-qa-course/assessment/playwright/M06/remove-item.spec.ts",
  "training/ai-assisted-qa-course/assessment/playwright/M06/quantity-update.spec.ts",
  "training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-before/cart.spec.ts",
  "training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-after/cart.spec.ts",
];
const outputParent = "output/training/ai-assisted-qa";
const head = "1234567890abcdef1234567890abcdef12345678";
const tempRoots = [];

afterEach(() => {
  for (const directory of tempRoots.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** 受入レポートの指定節からLinux/Bash実行例を取り出す。 */
function scriptUnder(heading) {
  const index = report.indexOf(heading);
  expect(index).toBeGreaterThanOrEqual(0);
  const nextHeading = report.indexOf("\n## ", index + heading.length);
  const section = report.slice(index, nextHeading < 0 ? undefined : nextHeading);
  const match = section.match(
    /^[ \t]*\x60\x60\x60bash[ \t]*\r?\n([\s\S]*?)^[ \t]*\x60\x60\x60[ \t]*$/m,
  );
  expect(match, heading).not.toBeNull();
  return match[1];
}

/** 実Chromiumや実際の採点器を起動せず、参考コマンドの記録動作だけを隔離する。 */
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pr215-reference-evidence-"));
  tempRoots.push(root);
  for (const relative of specPaths) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "// stub fixture; not a browser execution\n");
  }
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, "pnpm"),
    [
      "#!/bin/sh",
      'printf "%s\\n" "$*" > "$AI_QA_OUTPUT_ROOT/arguments.txt"',
      'printf "%s\\n" "$PLAYWRIGHT_TEST_ROOT" > "$AI_QA_OUTPUT_ROOT/test-root.txt"',
      'printf \'{"suites":[],"stub":true}\\n\' > "$AI_QA_OUTPUT_ROOT/playwright-result.json"',
      'if [ -n "$FAIL_MATCH" ] && printf "%s" "$PLAYWRIGHT_TEST_ROOT:$*" | grep -Fq "$FAIL_MATCH"; then exit 9; fi',
      "exit 0",
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(bin, "git"),
    [
      "#!/bin/sh",
      '[ "$*" = "rev-parse HEAD" ] || exit 2',
      'printf "%s\\n" "' + head + '"',
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  return { root, bin };
}

/** set -e有効のBashで参考コマンドを実行し、毎回の成果物ディレクトリを検査する。 */
function runReferenceScript(script, failMatch = "") {
  const { root, bin } = fixture();
  const result = spawnSync("bash", ["-e", "-c", script], {
    cwd: root,
    env: {
      ...process.env,
      PATH: bin + path.delimiter + process.env.PATH,
      FAIL_MATCH: failMatch,
    },
    encoding: "utf8",
    timeout: 15_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr + result.stdout).toBe(0);
  const output = path.join(root, outputParent);
  const entries = fs.readdirSync(output, { withFileTypes: true });
  expect(entries.every((entry) => entry.isDirectory())).toBe(true);
  return entries.map((entry) => {
    const directory = path.join(output, entry.name);
    const read = (name) => fs.readFileSync(path.join(directory, name), "utf8").trim();
    return {
      name: entry.name,
      exitCode: read("exit-code.txt"),
      head: read("head-sha.txt"),
      sha: read("spec-sha256.txt"),
      arguments: read("arguments.txt"),
      testRoot: read("test-root.txt"),
      report: JSON.parse(read("playwright-result.json")),
    };
  });
}

/** prefixが一致するRunを1件だけ取り出す。 */
function runWithPrefix(runs, prefix) {
  const matching = runs.filter((run) => run.name.startsWith(prefix));
  expect(matching, prefix).toHaveLength(1);
  return matching[0];
}

describe("M06/M07公開参考Runの成果物保全（隔離stub。実Chromiumではない）", () => {
  const linuxIt = process.platform === "linux" ? it : it.skip;
  const m06Script = scriptUnder("## 2026-11-05 M06公開参考specの実行手順");
  const m07Script = scriptUnder("### M07公開参考specのbefore/after");

  linuxIt("M06固定3件・004/005初回・再実行を3つの独立したRunに記録する", () => {
    const runs = runReferenceScript(m06Script);
    expect(runs).toHaveLength(3);
    for (const prefix of [
      "m06-reference-fixed-",
      "m06-reference-initial-",
      "m06-reference-repeat-",
    ]) {
      const run = runWithPrefix(runs, prefix);
      expect(run.exitCode).toBe("0");
      expect(run.head).toBe(head);
      expect(run.testRoot).toBe("training/ai-assisted-qa-course/assessment/playwright/M06");
      expect(run.sha.split("\n")).toHaveLength(3);
      expect(run.arguments).toContain("--config=playwright.ai-assisted-qa.config.ts");
      expect(run.arguments).toContain("--project=ai-assisted-qa-chromium");
      expect(run.arguments).toContain("--retries=0");
      expect(run.report.stub).toBe(true);
    }
    expect(runWithPrefix(runs, "m06-reference-fixed-").arguments).toContain("cart-cases.spec.ts");
    for (const prefix of ["m06-reference-initial-", "m06-reference-repeat-"]) {
      expect(runWithPrefix(runs, prefix).arguments).toContain(
        "remove-item.spec.ts quantity-update.spec.ts",
      );
    }
  });

  linuxIt("M06初回のPlaywright失敗を記録し、set -eでも再実行を続ける", () => {
    const runs = runReferenceScript(m06Script, "remove-item.spec.ts");
    expect(runs).toHaveLength(3);
    expect(runWithPrefix(runs, "m06-reference-fixed-").exitCode).toBe("0");
    expect(runWithPrefix(runs, "m06-reference-initial-").exitCode).toBe("9");
    expect(runWithPrefix(runs, "m06-reference-repeat-").exitCode).toBe("9");
  });

  linuxIt("M07 before2/after3の参考実行を別Runとして保存する", () => {
    const runs = runReferenceScript(m07Script);
    expect(runs).toHaveLength(2);
    for (const [prefix, specDir] of [
      ["m07-reference-before-", "maintenance-before"],
      ["m07-reference-after-", "maintenance-after"],
    ]) {
      const run = runWithPrefix(runs, prefix);
      expect(run.exitCode).toBe("0");
      expect(run.head).toBe(head);
      expect(run.testRoot).toBe(
        "training/ai-assisted-qa-course/assessment/playwright/M07/" + specDir,
      );
      expect(run.sha).toContain(specDir + "/cart.spec.ts");
      expect(run.arguments).toContain("playwright test cart.spec.ts");
      expect(run.arguments).toContain("--config=playwright.ai-assisted-qa.config.ts");
      expect(run.report.stub).toBe(true);
    }
  });

  linuxIt("M07 afterのPlaywright失敗も終了コードとreportを保全する", () => {
    const runs = runReferenceScript(m07Script, "maintenance-after");
    expect(runs).toHaveLength(2);
    expect(runWithPrefix(runs, "m07-reference-before-").exitCode).toBe("0");
    expect(runWithPrefix(runs, "m07-reference-after-").exitCode).toBe("9");
  });
});
