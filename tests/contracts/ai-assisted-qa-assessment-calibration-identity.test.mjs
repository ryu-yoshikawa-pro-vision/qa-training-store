import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { obtainCalibration } from "../../scripts/training/ai-assisted-qa-assessment.mjs";

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

it("binds calibration to model, CLI, prompts, and pinned assets", async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "assessment-calibration-"));
  roots.push(workspaceRoot);
  const sourceHashes = [
    {
      source_path: "training/ai-assisted-qa-course/assessment/phase-1-rubric.md",
      sha256: "a".repeat(64),
    },
    {
      source_path: "training/ai-assisted-qa-course/assessment/scoring-tests/M04.json",
      sha256: "b".repeat(64),
    },
  ];
  const inputs = {
    phaseId: "P1",
    modules: ["M04"],
    rubric: { text: "Pinned Phase rubric" },
    scoringByModule: new Map([
      [
        "M04",
        {
          criteria: [],
          cases: [
            {
              id: "CAL-01",
              response: "A supported learner answer",
              evidence: [],
              expected_decision: "pass",
            },
          ],
        },
      ],
    ]),
    sourceMaterials: [],
    assetHashes: sourceHashes,
  };
  let calls = 0;
  const evaluate = (name, override = {}) => {
    const attemptDirectory = path.join(workspaceRoot, name);
    fs.mkdirSync(attemptDirectory, { recursive: true });
    return obtainCalibration({
      inputs: { ...inputs, ...override.inputs },
      modelId: override.modelId ?? "opencode/free-model",
      version: override.version ?? "2.0.22",
      attemptDirectory,
      workspaceRoot,
      runModel: async () => {
        calls += 1;
        return {
          value: {
            case_results: [{ case_id: "CAL-01", decision: "pass", rationale: "source backed" }],
          },
          sessionId: "session-calibration",
        };
      },
    });
  };

  const baseline = await evaluate("first");
  expect(baseline.status).toBe("passed");
  const pristine = await evaluate("identical");
  expect(pristine.id).toBe(baseline.id);
  expect(calls).toBe(1);

  const revisions = [
    { modelId: "opencode/other-free-model" },
    { version: "2.0.23" },
    {
      inputs: {
        assetHashes: sourceHashes.map((asset, index) =>
          index === 0 ? { ...asset, sha256: "c".repeat(64) } : asset,
        ),
      },
    },
    {
      inputs: {
        assetHashes: sourceHashes.map((asset, index) =>
          index === 1 ? { ...asset, sha256: "d".repeat(64) } : asset,
        ),
      },
    },
  ];
  const ids = new Set([baseline.id]);
  for (const [index, revision] of revisions.entries()) {
    const updated = await evaluate("revision-" + index, revision);
    expect(updated.status).toBe("passed");
    expect(ids.has(updated.id)).toBe(false);
    ids.add(updated.id);
  }
  expect(calls).toBe(1 + revisions.length);
  const oldCachePath = path.join(
    workspaceRoot,
    ".course-assessments",
    "calibrations",
    baseline.id + ".json",
  );
  const oldCache = JSON.parse(fs.readFileSync(oldCachePath, "utf8"));
  expect(oldCache.identity).toMatchObject({
    model_id: "opencode/free-model",
    opencode_version: "2.0.22",
    calibration_prompt_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    evaluator_prompt_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    asset_hashes: sourceHashes,
  });
  oldCache.identity.asset_hashes = [{ ...sourceHashes[0], sha256: "0".repeat(64) }];
  fs.writeFileSync(oldCachePath, JSON.stringify(oldCache));
  await expect(evaluate("tampered")).rejects.toThrow(/identity or case count is invalid/);
  expect(calls).toBe(1 + revisions.length);
});
