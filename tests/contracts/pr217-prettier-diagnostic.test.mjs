import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { it } from "vitest";

it("reports the formatter diff for PR 217 files (temporary)", () => {
  const paths = [
    "scripts/training/ai-assisted-qa-run-evidence.mjs",
    "tests/contracts/ai-assisted-qa-assessment-m07-dependencies.test.mjs",
    "tests/contracts/ai-assisted-qa-assessment-practical-criteria.test.mjs",
  ];
  const output = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "pr217-format-"));
  try {
    for (const target of paths) {
      const original = fs.readFileSync(target, "utf8");
      const formatted = spawnSync("pnpm", ["exec", "prettier", "--stdin-filepath", target], {
        input: original,
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
      });
      if (formatted.status !== 0) throw new Error(formatted.stderr);
      const before = path.join(temp, "before");
      const after = path.join(temp, "after");
      fs.writeFileSync(before, original);
      fs.writeFileSync(after, formatted.stdout);
      const diff = spawnSync("diff", ["-u", before, after], { encoding: "utf8" });
      if (diff.status === 1) output.push(target + "\n" + diff.stdout);
      else if (diff.status !== 0) throw new Error(diff.stderr);
    }
    if (output.length > 0) throw new Error("PR217_FORMAT_DIFF\n" + output.join("\n"));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
