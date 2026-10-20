import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

type ProcessResult = {
  status: number;
  stdout: string;
  stderr: string;
};

type TextRule = {
  rule_id: string;
  pattern: string;
  match_type: "literal" | "regex";
  message: string;
  replacement?: string;
  case_sensitive?: boolean;
  normalization?: "none" | "trim" | "lowercase" | "lowercase-trim";
  ignore?: {
    fenced_code?: boolean;
    inline_code?: boolean;
    urls?: boolean;
    identifiers?: boolean;
  };
};

const repoRoot = path.resolve(process.cwd());
const scannerPath = path.join(repoRoot, "scripts", "lint-text-quality.mjs");
const comparisonPath = path.join(repoRoot, "scripts", "check-text-quality-changes.mjs");
const textlintConfigPath = path.join(repoRoot, ".textlintrc.json");

const rule: TextRule = {
  rule_id: "TEST-BANNED",
  pattern: "BAD",
  match_type: "literal",
  message: "文章品質ルール違反",
  replacement: "GOOD",
  case_sensitive: false,
  normalization: "lowercase",
};

function runNode(
  script: string,
  args: string[],
  cwd: string,
  input = "",
  env: NodeJS.ProcessEnv = process.env,
): ProcessResult {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    env,
    input,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function git(root: string, args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
}

function writeFile(root: string, relativePath: string, content: string) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function linkTextlintDependencies(root: string) {
  const nodeModulesPath = path.join(root, "node_modules");
  const scopedPath = path.join(nodeModulesPath, "@textlint-rule");
  fs.mkdirSync(scopedPath, { recursive: true });
  for (const packageName of [
    "textlint",
    "textlint-rule-no-zero-width-spaces",
    "textlint-rule-no-nfd",
    "textlint-rule-no-kangxi-radicals",
    "textlint-rule-no-hankaku-kana",
    "textlint-rule-no-doubled-conjunctive-particle-ga",
    "textlint-rule-no-dropping-the-ra",
  ]) {
    fs.symlinkSync(
      path.join(repoRoot, "node_modules", packageName),
      path.join(nodeModulesPath, packageName),
      "junction",
    );
  }
  for (const packageName of ["textlint-rule-no-invalid-control-character"]) {
    fs.symlinkSync(
      path.join(repoRoot, "node_modules", "@textlint-rule", packageName),
      path.join(scopedPath, packageName),
      "junction",
    );
  }
}

function createFixture(initialText = "GOOD\n", tempPrefix = "codex text quality 空白-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.copyFileSync(scannerPath, path.join(root, "scripts", "lint-text-quality.mjs"));
  fs.copyFileSync(comparisonPath, path.join(root, "scripts", "check-text-quality-changes.mjs"));
  fs.copyFileSync(textlintConfigPath, path.join(root, ".textlintrc.json"));
  writeFile(
    root,
    "rules.json",
    JSON.stringify({ version: 1, status: "configured", rules: [rule] }, null, 2),
  );
  writeFile(root, ".gitignore", "node_modules/\n");
  writeFile(root, "docs/existing.md", initialText);

  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "codex-contract@example.invalid"]);
  git(root, ["config", "user.name", "Codex Contract"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  linkTextlintDependencies(root);
  return root;
}

function removeFixtureEntry(entryPath: string) {
  const stats = fs.lstatSync(entryPath);
  if (stats.isSymbolicLink()) {
    fs.unlinkSync(entryPath);
    return;
  }
  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(entryPath)) {
      removeFixtureEntry(path.join(entryPath, entry));
    }
    fs.rmdirSync(entryPath);
    return;
  }
  fs.unlinkSync(entryPath);
}

function removeFixture(root: string) {
  process.chdir(repoRoot);
  if (!fs.existsSync(root)) return;

  // Remove children explicitly so Windows cleanup is stable for non-ASCII
  // fixture paths and junctions under the local Node runtime.
  for (const entry of fs.readdirSync(root)) {
    removeFixtureEntry(path.join(root, entry));
  }
  fs.rmdirSync(root);
}

function withFixture(
  test: (root: string) => void,
  initialText = "GOOD\n",
  tempPrefix = "codex text quality 空白-",
) {
  const root = createFixture(initialText, tempPrefix);
  try {
    test(root);
  } finally {
    removeFixture(root);
  }
}

function runComparison(root: string, extraArgs: string[] = [], workingTree = true) {
  return runNode(
    path.join(root, "scripts", "check-text-quality-changes.mjs"),
    [
      "--base-ref",
      "HEAD",
      ...(workingTree ? ["--working-tree"] : []),
      "--rules",
      path.join(root, "rules.json"),
      "--json",
      ...extraArgs,
    ],
    root,
  );
}

describe("Codex deterministic text quality contracts", () => {
  it("keeps production rules explicit and emits no raw match or full source line", () => {
    const productionRules = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".codex", "text-quality-rules.json"), "utf8"),
    ) as {
      version: number;
      status: string;
      rules: unknown[];
    };
    expect(productionRules.version).toBe(1);
    expect(productionRules.status).toBe("configured");
    expect(
      (productionRules.rules as { rule_id?: unknown }[]).map(
        (productionRule) => productionRule.rule_id,
      ),
    ).toEqual([
      "wording-common-core",
      "wording-completion-contract",
      "wording-common-completion",
      "wording-bounded-level-2",
    ]);

    withFixture((root) => {
      const result = runNode(
        path.join(root, "scripts", "lint-text-quality.mjs"),
        ["--rules", path.join(root, "rules.json"), "--json", "--text", "GOOD\nBAD\n"],
        root,
      );
      expect(result.status).toBe(1);
      const violations = JSON.parse(result.stdout) as Record<string, unknown>[];
      expect(violations).toEqual([
        {
          path: "<text>",
          line: 2,
          rule_id: "TEST-BANNED",
          message: "文章品質ルール違反",
          replacement: "GOOD",
        },
      ]);
      expect(result.stdout).not.toContain('"match"');
      expect(result.stdout).not.toContain("BAD");
    });
  }, 60_000);

  it("loads exactly the seven adopted production textlint rules and preserves stable fingerprints", () => {
    const textlintConfig = JSON.parse(fs.readFileSync(textlintConfigPath, "utf8")) as {
      rules: Record<string, unknown>;
    };
    expect(textlintConfig).toEqual({
      rules: {
        "@textlint-rule/no-invalid-control-character": { checkCode: false },
        "no-zero-width-spaces": true,
        "no-nfd": true,
        "no-kangxi-radicals": true,
        "no-hankaku-kana": true,
        "no-doubled-conjunctive-particle-ga": true,
        "no-dropping-the-ra": true,
      },
    });

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as {
      devDependencies: Record<string, string>;
    };
    expect(packageJson.devDependencies.textlint).toBeDefined();
    expect(
      Object.keys(packageJson.devDependencies).filter((packageName) =>
        packageName.includes("textlint-rule-preset"),
      ),
    ).toEqual([]);
    expect(packageJson.devDependencies["textlint-rule-no-doubled-conjunctive-particle-ga"]).toBe(
      "3.0.0",
    );
    expect(packageJson.devDependencies["textlint-rule-no-dropping-the-ra"]).toBe("3.0.0");
    expect(fs.readFileSync(path.join(repoRoot, "pnpm-lock.yaml"), "utf8")).not.toContain(
      "textlint-rule-preset-japanese",
    );

    const cases = [
      {
        name: "control",
        text: "prefix\u0001suffix\n",
        ruleId: "@textlint-rule/no-invalid-control-character",
        match: "\u0001",
        replacement: "",
      },
      {
        name: "zero-width",
        text: "prefix\u200b suffix\n",
        ruleId: "no-zero-width-spaces",
        match: "\u200b",
        replacement: "",
      },
      {
        name: "nfd",
        text: "か\u3099\n",
        ruleId: "no-nfd",
        match: "\u3099",
        replacement: "が",
      },
      {
        name: "kangxi",
        text: "⼀\n",
        ruleId: "no-kangxi-radicals",
        match: "⼀",
        replacement: "一",
      },
      {
        name: "hankaku-kana",
        text: "ｶﾀｶﾅ\n",
        ruleId: "no-hankaku-kana",
        match: "ｶﾀｶﾅ",
        replacement: "カタカナ",
      },
      {
        name: "doubled-ga",
        text: "今日は早朝から出発したが、定刻には間に合わなかったが、会場に到着した。\n",
        ruleId: "no-doubled-conjunctive-particle-ga",
        match: "が",
        replacement: undefined,
      },
      {
        name: "dropping-ra",
        text: "この機能は見れる。\n",
        ruleId: "no-dropping-the-ra",
        match: "れ",
        replacement: undefined,
      },
    ] as const;

    withFixture((root) => {
      const paths = cases.map(({ name, text }) => {
        const filePath = `docs/${name}.md`;
        writeFile(root, filePath, text);
        return filePath;
      });
      const normalPath = "docs/markdown-syntax.md";
      writeFile(
        root,
        normalPath,
        "# 見出し\n本文: `ｶﾀｶﾅ` [link](https://example.test/ｶﾀｶﾅ)\n```text\nｶﾀｶﾅ\n```\nidentifier: API_URL\n",
      );

      const result = runNode(
        path.join(root, "scripts", "lint-text-quality.mjs"),
        ["--rules", path.join(root, "rules.json"), "--json", ...paths, normalPath],
        root,
      );
      expect(result.status).toBe(1);
      const violations = JSON.parse(result.stdout) as Record<string, unknown>[];
      expect(violations.filter((violation) => violation.path === normalPath)).toEqual([]);
      for (const expected of cases) {
        expect(violations).toContainEqual({
          path: `docs/${expected.name}.md`,
          line: 1,
          rule_id: expected.ruleId,
          message: expect.any(String),
          ...(expected.replacement === undefined ? {} : { replacement: expected.replacement }),
        });
      }
    });
  }, 120_000);

  it("applies only explicitly configured scope exclusions", () => {
    withFixture((root) => {
      writeFile(
        root,
        "scope-rules.json",
        JSON.stringify({
          version: 1,
          rules: [
            {
              ...rule,
              pattern: "禁止語",
              replacement: "良い",
              ignore: { fenced_code: true, inline_code: true, urls: true, identifiers: true },
            },
          ],
        }),
      );
      const text =
        "禁止語\n`禁止語` https://example.test/禁止語\n```text\n禁止語\n```\nidentifier BAD\n";
      const result = runNode(
        path.join(root, "scripts", "lint-text-quality.mjs"),
        ["--rules", path.join(root, "scope-rules.json"), "--json", "--text", text],
        root,
      );
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout)).toHaveLength(1);
    });
  });

  it("blocks adopted repository wording rules while preserving Markdown code scopes", () => {
    const productionRules = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".codex", "text-quality-rules.json"), "utf8"),
    ) as { rules: TextRule[] };

    withFixture((root) => {
      const rulesPath = path.join(root, "adopted-rules.json");
      writeFile(root, "adopted-rules.json", JSON.stringify(productionRules, null, 2));
      const text =
        "Common Core\nCompletion contract\nCommon completion\nbounded Level 2\n`Common Core`\n```text\nCommon Core\n```\n";
      const result = runNode(
        path.join(root, "scripts", "lint-text-quality.mjs"),
        ["--rules", rulesPath, "--json", "--text", text],
        root,
      );
      expect(result.status).toBe(1);
      const violations = JSON.parse(result.stdout) as {
        line: number;
        rule_id: string;
        replacement?: string;
      }[];
      expect(
        violations.map(({ line, rule_id, replacement }) => ({ line, rule_id, replacement })),
      ).toEqual([
        { line: 1, rule_id: "wording-common-core", replacement: "共通課程" },
        { line: 2, rule_id: "wording-completion-contract", replacement: "修了条件" },
        { line: 3, rule_id: "wording-common-completion", replacement: "共通課程の修了" },
        { line: 4, rule_id: "wording-bounded-level-2", replacement: "対象範囲を限定したレベル2" },
      ]);
      expect(
        productionRules.rules.every(
          (productionRule) => productionRule.ignore?.identifiers === false,
        ),
      ).toBe(true);
    });
  });

  it("distinguishes new fingerprint counts from pre-existing violations", () => {
    withFixture((root) => {
      writeFile(root, "docs/existing.md", "BAD\nGOOD\nCHANGED\n");
      const result = runComparison(root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "pass",
        changed_files: 1,
        violations: [],
      });

      writeFile(root, "docs/existing.md", "BAD\nBAD\n");
      const changed = runComparison(root);
      expect(changed.status).toBe(1);
      const report = JSON.parse(changed.stdout) as {
        violations: { path: string; line: number }[];
      };
      expect(report.violations).toEqual([
        {
          path: "docs/existing.md",
          line: 1,
          rule_id: "TEST-BANNED",
          message: "文章品質ルール違反",
          replacement: "GOOD",
        },
      ]);

      const humanChanged = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--base-ref", "HEAD", "--working-tree", "--rules", path.join(root, "rules.json")],
        root,
      );
      expect(humanChanged.status).toBe(1);
      expect(humanChanged.stdout).toContain("FAIL: 1 new text quality violation(s)\n");
    }, "BAD\nGOOD\n");
  }, 30_000);

  it("includes staged, unstaged, and untracked Markdown in the working-tree comparison", () => {
    withFixture((root) => {
      writeFile(root, "docs/existing.md", "BAD\nBAD\n");
      writeFile(root, "docs/staged.md", "BAD\n");
      git(root, ["add", "docs/staged.md"]);
      writeFile(root, "docs/untracked.md", "BAD\n");

      const result = runComparison(root);
      expect(result.status).toBe(1);
      const report = JSON.parse(result.stdout) as { violations: { path: string }[] };
      expect(report.violations.map((violation) => violation.path)).toEqual([
        "docs/existing.md",
        "docs/staged.md",
        "docs/untracked.md",
      ]);
    }, "BAD\n");
  });

  it("scans all current Markdown, including untracked files, while excluding historical prefixes", () => {
    withFixture((root) => {
      writeFile(root, "docs/untracked.md", "BAD\n");
      writeFile(root, ".codex/runs/old.md", "BAD\n");
      writeFile(root, "docs/plans/old.md", "BAD\n");
      writeFile(root, "docs/reports/old.md", "BAD\n");
      writeFile(root, "docs/history/old.md", "BAD\n");
      writeFile(root, "docs/adr/old.md", "BAD\n");
      writeFile(root, "CHANGELOG.md", "BAD\n");

      const result = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--all", "--rules", path.join(root, "rules.json"), "--json"],
        root,
      );
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout)).toEqual({
        status: "violations",
        mode: "all",
        scanned_files: 2,
        violations: [
          {
            path: "docs/untracked.md",
            line: 1,
            rule_id: "TEST-BANNED",
            message: "文章品質ルール違反",
            replacement: "GOOD",
          },
        ],
      });

      const humanResult = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--all", "--rules", path.join(root, "rules.json")],
        root,
      );
      expect(humanResult.status).toBe(1);
      expect(humanResult.stdout).toBe(
        "FAIL: 1 text quality violation(s)\n" +
          'docs/untracked.md:1 [TEST-BANNED] 文章品質ルール違反 replacement="GOOD"\n',
      );
    });
  });

  it("rejects --all combined with --base-ref", () => {
    withFixture((root) => {
      const result = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--all", "--base-ref", "HEAD", "--rules", path.join(root, "rules.json")],
        root,
      );

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("--all cannot be combined with --base-ref or --working-tree");
    });
  });

  it("uses an exact-content fallback for a worktree-only pure move", () => {
    withFixture((root) => {
      fs.renameSync(path.join(root, "docs", "existing.md"), path.join(root, "docs", "renamed.md"));
      const result = runComparison(root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ status: "pass", changed_files: 1 });
    }, "BAD\n");
  });

  it("prefers Git rename mapping for a staged pure move", () => {
    withFixture((root) => {
      fs.renameSync(path.join(root, "docs", "existing.md"), path.join(root, "docs", "staged.md"));
      git(root, ["add", "--all"]);
      const result = runComparison(root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ status: "pass", changed_files: 1 });
    }, "BAD\n");
  });

  it.each([
    [
      "move plus content change",
      (root: string) => {
        fs.renameSync(
          path.join(root, "docs", "existing.md"),
          path.join(root, "docs", "renamed.md"),
        );
        writeFile(root, "docs/renamed.md", "BAD\nCHANGED\n");
      },
    ],
    [
      "ambiguous exact move",
      (root: string) => {
        fs.renameSync(
          path.join(root, "docs", "existing.md"),
          path.join(root, "docs", "renamed-a.md"),
        );
        writeFile(root, "docs/renamed-b.md", "BAD\n");
      },
    ],
  ] as const)(
    "fails closed when %s cannot be mapped safely",
    (_name, mutate) => {
      withFixture((root) => {
        mutate(root);
        const result = runComparison(root);
        expect(result.status).toBe(2);
        expect(result.stderr).toContain("comparison unavailable");
        expect(JSON.parse(result.stdout)).toMatchObject({ status: "comparison-error" });
      }, "BAD\n");
    },
    30_000,
  );

  it("uses merge-base and the same comparison tree for commit mode", () => {
    withFixture((root) => {
      const baseRef = git(root, ["rev-parse", "HEAD"]);
      writeFile(root, "docs/existing.md", "BAD\n");
      git(root, ["add", "docs/existing.md"]);
      git(root, ["commit", "--quiet", "-m", "introduce violation"]);
      const result = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--base-ref", baseRef, "--rules", path.join(root, "rules.json"), "--json"],
        root,
      );
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        mode: "commit",
        comparison_base: baseRef,
        status: "violations",
      });
    });
  }, 30_000);

  it("uses the workflow merge tree as the commit comparison current", () => {
    withFixture((root) => {
      const forkPoint = git(root, ["rev-parse", "HEAD"]);
      git(root, ["switch", "-c", "base"]);
      writeFile(root, "docs/base.md", "BAD\n");
      git(root, ["add", "docs/base.md"]);
      git(root, ["commit", "--quiet", "-m", "base change"]);
      const baseTip = git(root, ["rev-parse", "HEAD"]);

      git(root, ["switch", "--create", "pr", forkPoint]);
      writeFile(root, "docs/pr.md", "BAD\n");
      git(root, ["add", "docs/pr.md"]);
      git(root, ["commit", "--quiet", "-m", "pr change"]);
      git(root, ["switch", "base"]);
      git(root, ["merge", "--quiet", "--no-ff", "pr", "-m", "workflow merge"]);

      const result = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--base-ref", baseTip, "--rules", path.join(root, "rules.json"), "--json"],
        root,
      );
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        mode: "commit",
        comparison_base: baseTip,
        status: "violations",
        violations: [{ path: "docs/pr.md" }],
      });
    });
  }, 30_000);
});
