import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";
import { describe, expect, it } from "vitest";

const files = [
  "tests/contracts/ai-assisted-qa-phase2-export-guard.test.mjs",
  "tests/contracts/ai-assisted-qa-phase2-m05-locator.test.mjs",
  "tests/contracts/ai-assisted-qa-phase2-m06-reset-isolation.test.mjs",
  "tests/contracts/ai-assisted-qa-phase2-m06-separate-cases.test.mjs",
];

describe("temporary Phase 2 format diagnosis", () => {
  it("prints the formatted versions of nonconforming files", async () => {
    const changed = [];
    for (const file of files) {
      const absolute = path.join(process.cwd(), file);
      const before = fs.readFileSync(absolute, "utf8");
      const options = (await prettier.resolveConfig(absolute)) ?? {};
      const after = await prettier.format(before, { ...options, filepath: absolute });
      if (before === after) continue;
      changed.push(file);
      console.log(`FORMAT-DIFF-START ${file}\n${after}FORMAT-DIFF-END ${file}`);
    }
    expect(changed).toEqual([]);
  });
});
