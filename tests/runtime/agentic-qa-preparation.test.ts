import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OFFICIAL_PREPARATION_SEQUENCE } from "../../scripts/agentic-qa/contracts";
import { prepareChallenge } from "../../scripts/agentic-qa/prepare-challenge";

const rootDir = path.resolve(__dirname, "../..");

describe("Agentic QA preparation runtime", () => {
  it("prepares a challenge through deterministic preparation only", async () => {
    const runId = "20260810-211500-JST";
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-qa-preparation-contract-"));
    const artifactDir = path.join(rootDir, ".artifacts", "agentic-qa", runId);
    try {
      const result = await prepareChallenge({
        rootDir,
        challengeId: "CHALLENGE-BASIC-001",
        runId,
        runDir,
      });
      expect(result.preparation_order).toEqual([...OFFICIAL_PREPARATION_SEQUENCE]);
      expect(Object.keys(result).some((key) => key.endsWith("_handoff"))).toBe(false);
      expect(result.patch.apply_check).toBe("passed");
      expect(result.runtime_sanity.scored_initial_state_reset.passed).toBe(true);
      expect(fs.existsSync(path.join(result.isolated_root.root, "node_modules"))).toBe(false);
      expect(result.benchmark_revision.manifest.runner_profile).toBeUndefined();
    } finally {
      fs.rmSync(runDir, { recursive: true, force: true });
      fs.rmSync(artifactDir, { recursive: true, force: true });
    }
  }, 360_000);
});
