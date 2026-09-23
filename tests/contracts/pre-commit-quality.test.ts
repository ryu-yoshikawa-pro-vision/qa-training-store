import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const checkerPath = path.join(repoRoot, "scripts", "pre-commit-quality-check.mjs");
const qualityConfigPaths = [
  ".prettierignore",
  ".prettierrc.json",
  ".editorconfig",
  "eslint.config.js",
];

function git(root: string, args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
}

function writeFile(root: string, filePath: string, source: string) {
  const absolutePath = path.join(root, filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, source, "utf8");
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pre-commit-quality-"));
  writeFile(root, ".gitattributes", "* text=auto eol=lf\n");
  writeFile(root, ".prettierignore", "ignored.js\nignored-eslint.js\n");
  writeFile(
    root,
    ".prettierrc.json",
    '{\n  "semi": true,\n  "singleQuote": false,\n  "endOfLine": "lf"\n}\n',
  );
  writeFile(root, ".editorconfig", "root = true\n\n[*]\nend_of_line = lf\n");
  writeFile(
    root,
    "eslint.config.js",
    [
      "module.exports = [",
      '  { ignores: ["ignored-eslint.js"] },',
      '  { files: ["**/*.js"], languageOptions: { ecmaVersion: 2019 }, rules: { "no-undef": "error", "no-unused-vars": "warn" } },',
      "];",
      "",
    ].join("\n"),
  );
  writeFile(root, "before name.js", 'const before = "ok";\n');
  writeFile(root, "to-delete.js", 'const toDelete = "ok";\n');

  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "pre-commit-quality@example.invalid"]);
  git(root, ["config", "user.name", "Pre-commit Quality Contract"]);
  git(root, ["config", "core.autocrlf", "true"]);
  git(root, ["config", "commit.gpgsign", "false"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  return root;
}

function removeEntry(target: string) {
  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(target);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  if (stats.isSymbolicLink()) {
    fs.unlinkSync(target);
    return;
  }
  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(target)) removeEntry(path.join(target, entry));
    fs.rmdirSync(target);
    return;
  }
  fs.unlinkSync(target);
}

function withFixture(test: (root: string) => void) {
  const root = createFixture();
  try {
    test(root);
  } finally {
    removeEntry(root);
  }
}

function runChecker(root: string) {
  const result = spawnSync(process.execPath, [checkerPath], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function expectConfigMismatch(root: string) {
  const result = runChecker(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("matching quality configuration");
  expect(result.stderr).not.toContain("node_modules");
}

describe("staged Prettier and ESLint contract", () => {
  it("fails a staged Prettier violation even after the worktree is fixed", () => {
    withFixture((root) => {
      writeFile(root, "sample.js", 'const sample={answer:"ok"}\n');
      git(root, ["add", "--", "sample.js"]);
      writeFile(root, "sample.js", 'const sample = { answer: "ok" };\n');

      const result = runChecker(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("staged Prettier check failed");
    });
  });

  it("passes staged clean content when the worktree has an unstaged Prettier violation", () => {
    withFixture((root) => {
      writeFile(root, "sample.js", 'const sample = { answer: "ok" };\n');
      git(root, ["add", "--", "sample.js"]);
      writeFile(root, "sample.js", 'const sample={answer:"ok"}\n');

      const result = runChecker(root);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PASS: staged Prettier and ESLint checks");
    });
  });

  it("passes an EOL-only worktree difference using the staged LF blob", () => {
    withFixture((root) => {
      const source = 'const sample = { answer: "ok" };\n';
      writeFile(root, "sample.js", source);
      git(root, ["add", "--", "sample.js"]);
      fs.writeFileSync(path.join(root, "sample.js"), source.replaceAll("\n", "\r\n"), "utf8");

      const diff = spawnSync("git", ["diff", "--quiet", "--", "sample.js"], { cwd: root });
      expect(diff.status).toBe(0);
      expect(git(root, ["ls-files", "--eol", "--", "sample.js"])).toMatch(/i\/lf\s+w\/crlf/u);
      expect(git(root, ["show", ":sample.js"])).not.toContain("\r");

      const result = runChecker(root);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PASS: staged Prettier and ESLint checks");
    });
  });

  it("checks a partial stage from the stage 0 blob", () => {
    withFixture((root) => {
      writeFile(root, "partial.js", 'const partial={first:"ok"}\n');
      git(root, ["add", "--", "partial.js"]);
      writeFile(root, "partial.js", 'const partial = { first: "ok", second: "unstaged" };\n');

      const result = runChecker(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("staged Prettier check failed");
    });
  });

  it("uses the rename destination and handles a path with spaces", () => {
    withFixture((root) => {
      git(root, ["mv", "--", "before name.js", "after name.js"]);

      const result = runChecker(root);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PASS: staged Prettier and ESLint checks");
    });
  });

  it("does not send staged deletions to either checker", () => {
    withFixture((root) => {
      git(root, ["rm", "--", "to-delete.js"]);

      const result = runChecker(root);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PASS: no staged Prettier or ESLint targets");
    });
  });

  it("passes when all staged files are ignored by Prettier and ESLint", () => {
    withFixture((root) => {
      writeFile(root, "ignored.js", 'const ignored={bad:"format"}\n');
      writeFile(root, "ignored-eslint.js", "const = ;\n");
      git(root, ["add", "--", "ignored.js", "ignored-eslint.js"]);

      const result = runChecker(root);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PASS: staged Prettier and ESLint checks");
    });
  }, 60_000);

  it("passes warning-only ESLint output", () => {
    withFixture((root) => {
      writeFile(root, "warning.js", "const unused = 1;\n");
      git(root, ["add", "--", "warning.js"]);

      const result = runChecker(root);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PASS: staged Prettier and ESLint checks");
    });
  });

  it("fails ESLint errors", () => {
    withFixture((root) => {
      writeFile(root, "error.js", "const answer = missing;\n");
      git(root, ["add", "--", "error.js"]);

      const result = runChecker(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("staged ESLint check failed");
    });
  });

  it("fails fatal ESLint parse errors", () => {
    withFixture((root) => {
      writeFile(
        root,
        "fatal.js",
        "const target = { answer: 42 };\nconst value = target?.answer;\n",
      );
      git(root, ["add", "--", "fatal.js"]);

      const result = runChecker(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("staged ESLint check failed");
    });
  }, 60_000);

  it("passes with no staged formatter or linter targets", () => {
    withFixture((root) => {
      const result = runChecker(root);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PASS: no staged Prettier or ESLint targets");
    });
  });

  for (const configPath of qualityConfigPaths) {
    it(`fails an unstaged change to ${configPath}`, () => {
      withFixture((root) => {
        writeFile(root, "sample.js", 'const sample = "ok";\n');
        git(root, ["add", "--", "sample.js"]);
        fs.appendFileSync(path.join(root, configPath), "# unstaged configuration change\n", "utf8");
        expectConfigMismatch(root);
      });
    });

    it(`fails a staged and then unstaged change to ${configPath}`, () => {
      withFixture((root) => {
        writeFile(root, "sample.js", 'const sample = "ok";\n');
        git(root, ["add", "--", "sample.js"]);
        fs.appendFileSync(path.join(root, configPath), "# staged configuration change\n", "utf8");
        git(root, ["add", "--", configPath]);
        fs.appendFileSync(path.join(root, configPath), "# later unstaged change\n", "utf8");
        expectConfigMismatch(root);
      });
    });

    it(`allows an EOL-only worktree difference in ${configPath}`, () => {
      withFixture((root) => {
        const target = path.join(root, configPath);
        const lf = fs.readFileSync(target, "utf8");
        fs.writeFileSync(target, lf.replaceAll("\n", "\r\n"), "utf8");
        const diff = spawnSync("git", ["diff", "--quiet", "--", configPath], { cwd: root });
        expect(diff.status).toBe(0);

        const result = runChecker(root);
        expect(result.status).toBe(0);
        expect(result.stdout).toContain("PASS: no staged Prettier or ESLint targets");
      });
    });
  }

  it("allows an actual git commit --allow-empty through a Git hook invoking the checker", () => {
    withFixture((root) => {
      writeFile(
        root,
        ".hooks/pre-commit",
        [
          "#!/bin/sh",
          `node "${checkerPath.replaceAll("\\", "/")}" || exit $?`,
          "printf 'ran\\n' > .hook-ran",
          "",
        ].join("\n"),
      );
      git(root, ["config", "core.hooksPath", ".hooks"]);
      git(root, ["add", ".hooks/pre-commit"]);
      git(root, ["update-index", "--chmod=+x", ".hooks/pre-commit"]);
      git(root, ["commit", "--quiet", "-m", "install test hook"]);
      fs.rmSync(path.join(root, ".hook-ran"), { force: true });
      const before = git(root, ["rev-parse", "HEAD"]);

      const result = spawnSync("git", ["commit", "--allow-empty", "-m", "empty"], {
        cwd: root,
        encoding: "utf8",
      });
      expect(result.status).toBe(0);
      expect(fs.readFileSync(path.join(root, ".hook-ran"), "utf8")).toBe("ran\n");
      expect(git(root, ["rev-parse", "HEAD"])).not.toBe(before);
    });
  });
});
