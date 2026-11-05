import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { it } from "vitest";

it("temporarily prints exact Prettier output for the isolated evaluator test", async () => {
  const prettier = await import("prettier");
  const file = path.resolve("tests/contracts/ai-assisted-qa-assessment-isolation.test.mjs");
  const config = await prettier.resolveConfig(file);
  const expected = await prettier.format(fs.readFileSync(file, "utf8"), {
    ...config,
    filepath: file,
  });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qa-prettier-isolation-"));
  try {
    const target = path.join(directory, "isolation.mjs");
    fs.writeFileSync(target, expected);
    const diff = spawnSync("diff", ["-u", file, target], { encoding: "utf8" });
    if (diff.status === 1) {
      console.log("ISOLATION_PRETTIER_DIFF_START");
      console.log(diff.stdout.slice(0, 16000));
      console.log("ISOLATION_PRETTIER_DIFF_END");
    }
    if (![0, 1].includes(diff.status)) throw Error("diff executable unavailable");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
