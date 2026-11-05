import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { it } from "vitest";

const files = [
  "scripts/training/ai-assisted-qa-assessment.mjs",
  "scripts/training/ai-assisted-qa-run-evidence.mjs",
  "tests/contracts/ai-assisted-qa-assessment-resume-current.test.mjs",
  "tests/contracts/ai-assisted-qa-assessment.test.mjs",
];

it("temporarily prints Prettier differences in assessment contracts", async () => {
  const prettier = await import("prettier");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "assessment-prettier-"));
  try {
    for (const name of files) {
      const file = path.resolve(name);
      const expected = await prettier.format(fs.readFileSync(file, "utf8"), {
        ...(await prettier.resolveConfig(file)),
        filepath: file,
      });
      const formatted = path.join(directory, path.basename(file));
      fs.writeFileSync(formatted, expected);
      const diff = spawnSync("diff", ["-u", file, formatted], { encoding: "utf8" });
      if (diff.status === 1) {
        console.log("ASSESSMENT_FORMAT_START " + name);
        console.log(diff.stdout.slice(0, 22000));
        console.log("ASSESSMENT_FORMAT_END " + name);
      }
      if (![0, 1].includes(diff.status)) throw Error("diff tool unavailable");
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
