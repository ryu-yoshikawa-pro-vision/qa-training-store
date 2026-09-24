import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const prettierCli = path.join(repoRoot, "node_modules", "prettier", "bin", "prettier.cjs");

function git(root: string, args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
}

function runPrettier(root: string, localTolerant: boolean) {
  const args = [
    prettierCli,
    "--check",
    path.join(root, "app", "index.js"),
    "--ignore-path",
    path.join(root, ".prettierignore"),
    ...(localTolerant ? ["--end-of-line", "auto"] : []),
  ];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  return {
    status: result.status ?? -1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("local and CI Prettier EOL contract", () => {
  it("tolerates correctly formatted CRLF locally while strict LF and style checks still fail", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "prettier-eol-contract-"));
    try {
      fs.mkdirSync(path.join(root, "app"), { recursive: true });
      fs.writeFileSync(path.join(root, ".gitattributes"), "* text=auto eol=lf\n", "utf8");
      fs.writeFileSync(path.join(root, ".prettierignore"), "\n", "utf8");
      fs.writeFileSync(
        path.join(root, ".prettierrc.json"),
        '{\n  "semi": true,\n  "endOfLine": "lf"\n}\n',
        "utf8",
      );
      fs.writeFileSync(
        path.join(root, ".editorconfig"),
        "root = true\n\n[*]\nend_of_line = lf\n",
        "utf8",
      );
      fs.writeFileSync(
        path.join(root, "app", "index.js"),
        "const value = { answer: 42 };\n",
        "utf8",
      );
      git(root, ["init", "--quiet"]);
      git(root, ["config", "user.email", "prettier-eol@example.invalid"]);
      git(root, ["config", "user.name", "Prettier EOL Contract"]);
      git(root, ["config", "core.autocrlf", "true"]);
      git(root, ["add", "."]);
      git(root, ["commit", "--quiet", "-m", "fixture"]);

      fs.writeFileSync(
        path.join(root, "app", "index.js"),
        "const value = { answer: 42 };\r\n",
        "utf8",
      );
      const local = runPrettier(root, true);
      const strict = runPrettier(root, false);
      expect(local.status).toBe(0);
      expect(strict.status).toBe(1);

      git(root, ["add", "--", "app/index.js"]);
      expect(git(root, ["ls-files", "--eol", "--", "app/index.js"])).toMatch(/i\/lf\s+w\/crlf/u);
      expect(git(root, ["show", ":app/index.js"])).not.toContain("\r");

      fs.writeFileSync(path.join(root, "app", "index.js"), "const value={answer:42}\r\n", "utf8");
      const styleViolation = runPrettier(root, true);
      expect(styleViolation.status).toBe(1);
      expect(styleViolation.output).toContain("app/index.js");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
