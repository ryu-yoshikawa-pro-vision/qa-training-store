import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { it } from "vitest";

const FILES = [
  "scripts/training/ai-assisted-qa-assessment.mjs",
  "scripts/training/ai-assisted-qa-run-evidence.mjs",
  "tests/contracts/ai-assisted-qa-assessment-m06-assertions.test.mjs",
  "tests/contracts/ai-assisted-qa-assessment-untrusted-input.test.mjs",
];

it("reports exact temporary Prettier deltas for assessment implementation", async () => {
  const prettier = await import("prettier");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "assessment-format-"));
  try {
    for (const file of FILES) {
      const input = path.resolve(file);
      const expected = await prettier.format(fs.readFileSync(input, "utf8"), {
        ...(await prettier.resolveConfig(input)),
        filepath: input,
      });
      const output = path.join(directory, path.basename(input));
      fs.writeFileSync(output, expected);
      const diff = spawnSync("diff", ["-u", input, output], { encoding: "utf8" });
      if (diff.status === 1) {
        console.log("ASSESSMENT_FORMAT_START " + file);
        console.log(diff.stdout.slice(0, 20000));
        console.log("ASSESSMENT_FORMAT_END " + file);
      }
      if (![0, 1].includes(diff.status)) throw Error("diff command could not run");
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
