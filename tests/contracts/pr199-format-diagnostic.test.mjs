import fs from "node:fs";
import { Buffer } from "node:buffer";
import { it } from "vitest";
import * as prettier from "prettier";

it("PR #199 formatting diagnostic (temporary; remove after repair)", async () => {
  const files = [
    "scripts/training/ai-assisted-qa-course-tutor-core.mjs",
    "scripts/training/ai-assisted-qa-course-tutor.mjs",
    "scripts/training/validate-ai-assisted-qa.ts",
    "tests/contracts/ai-assisted-qa-course-tutor.test.mjs",
    "tests/contracts/ai-assisted-qa-shared-assessment-contract.test.mjs",
    "training/ai-assisted-qa-course/assessment/scoring-tests/M00.json",
    "training/ai-assisted-qa-course/assessment/scoring-tests/M05.json",
  ];
  for (const file of files) {
    const input = fs.readFileSync(file, "utf8");
    const config = (await prettier.resolveConfig(file)) ?? {};
    const output = await prettier.format(input, { ...config, filepath: file });
    const encoded = Buffer.from(output, "utf8").toString("base64");
    const chunkSize = 4000;
    const total = Math.ceil(encoded.length / chunkSize);
    for (let part = 0; part < total; part += 1) {
      console.log(
        "PR199_FORMAT_PART:" + file + ":" + part + ":" + total + ":" +
          encoded.slice(part * chunkSize, (part + 1) * chunkSize),
      );
    }
  }
});
