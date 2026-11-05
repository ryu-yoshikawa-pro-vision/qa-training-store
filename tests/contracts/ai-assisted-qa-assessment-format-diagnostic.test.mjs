import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { it } from "vitest";

it("diagnoses the exact Prettier delta for the assessment contract", async () => {
  const prettier = await import("prettier");
  const sourcePath = path.resolve("tests/contracts/ai-assisted-qa-assessment.test.mjs");
  const contents = fs.readFileSync(sourcePath, "utf8");
  const options = await prettier.resolveConfig(sourcePath);
  const expected = await prettier.format(contents, { ...options, filepath: sourcePath });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "assessment-format-delta-"));
  try {
    const formattedPath = path.join(directory, "formatted.mjs");
    fs.writeFileSync(formattedPath, expected);
    const result = spawnSync("diff", ["-u", sourcePath, formattedPath], {
      encoding: "utf8",
    });
    if (result.status === 1) {
      console.log("ASSESSMENT_PRETTIER_DIFF_START");
      console.log(result.stdout.slice(0, 18_000));
      console.log("ASSESSMENT_PRETTIER_DIFF_END");
    }
    if (![0, 1].includes(result.status)) throw new Error("diff command failed");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
