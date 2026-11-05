import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { it } from "vitest";

const FILES = [
  "scripts/training/ai-assisted-qa-assessment.mjs",
  "tests/contracts/ai-assisted-qa-assessment-calibration-fixtures.test.mjs",
  "tests/contracts/ai-assisted-qa-assessment-free-pricing.test.mjs",
];

it("prints temporary exact Prettier deltas for assessment files", async () => {
  const prettier = await import("prettier");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "assessment-prettier-"));
  try {
    for (const file of FILES) {
      const absolute = path.resolve(file);
      const original = fs.readFileSync(absolute, "utf8");
      const settings = await prettier.resolveConfig(absolute);
      const expected = await prettier.format(original, {
        ...settings,
        filepath: absolute,
      });
      const formatted = path.join(directory, path.basename(file));
      fs.writeFileSync(formatted, expected);
      const result = spawnSync("diff", ["-u", absolute, formatted], {
        encoding: "utf8",
      });
      if (result.status === 1) {
        console.log("ASSESSMENT_PRETTIER_START " + file);
        console.log(result.stdout.slice(0, 20_000));
        console.log("ASSESSMENT_PRETTIER_END " + file);
      }
      if (![0, 1].includes(result.status)) throw Error("diff command failed");
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
