import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";
import { it } from "vitest";

it("reports the evaluator Prettier changes", async () => {
  for (const relative of [
    "scripts/training/ai-assisted-qa-assessment.mjs",
    "tests/contracts/ai-assisted-qa-assessment.test.mjs",
  ]) {
    const file = path.resolve(relative);
  const original = fs.readFileSync(file, "utf8");
  const formatted = await prettier.format(original, {
    ...(await prettier.resolveConfig(file)),
    filepath: file,
  });
  const left = original.split("\n");
  const right = formatted.split("\n");
  const n = left.length;
  const m = right.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] =
        left[i] === right[j]
          ? 1 + dp[i + 1][j + 1]
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  let pending = null;
  const changes = [];
  const flush = () => {
    if (pending) changes.push(pending);
    pending = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && left[i] === right[j]) {
      flush();
      i += 1;
      j += 1;
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      if (!pending) pending = { line: i, removed: [], added: [] };
      pending.added.push(right[j]);
      j += 1;
    } else {
      if (!pending) pending = { line: i, removed: [], added: [] };
      pending.removed.push(left[i]);
      i += 1;
    }
  }
  flush();
    console.log("PRETTIER_DIFF_JSON=" + JSON.stringify({ relative, changes }));
  }
});
