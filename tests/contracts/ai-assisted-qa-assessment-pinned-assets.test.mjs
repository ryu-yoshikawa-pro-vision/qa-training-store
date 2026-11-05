import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fetchPinnedAssessmentAsset } from "../../scripts/training/ai-assisted-qa-course-core.mjs";

const SOURCE_SHA = "a".repeat(40);
const SCORING_PATH = "training/ai-assisted-qa-course/assessment/scoring-tests/M00.json";
const RUBRIC_PATH = "training/ai-assisted-qa-course/assessment/phase-1-rubric.md";

function assetFor(sourcePath, content) {
  const bytes = Buffer.from(content, "utf8");
  const scoring = sourcePath === SCORING_PATH;
  return {
    source_path: sourcePath,
    source_sha: SOURCE_SHA,
    asset_type: scoring ? "scoring" : "rubric",
    module_id: scoring ? "M00" : null,
    phase_id: "P1",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
  };
}

function serve(asset, content, overrides = {}) {
  const expectedUrl = [
    "https://raw.githubusercontent.com/ryu-yoshikawa-pro-vision/qa-training-store",
    SOURCE_SHA,
    asset.source_path,
  ].join("/");
  return (url, options) => {
    expect(url).toBe(expectedUrl);
    expect(options).toMatchObject({ method: "GET", redirect: "manual" });
    return {
      status: 200,
      redirected: false,
      url: expectedUrl,
      headers: { get: () => "application/json" },
      arrayBuffer: async () => Buffer.from(content, "utf8"),
      ...overrides,
    };
  };
}

describe("formal assessment pinned HTTP assets", () => {
  const scoringText = JSON.stringify({
    schema_version: 1,
    module_id: "M00",
    revision: "assessment-reference-v1",
  });
  const rubricText = "# Phase 1 rubric\n";

  it("accepts scoring and rubric only at their fixed source SHA", async () => {
    const cases = [
      [SCORING_PATH, scoringText],
      [RUBRIC_PATH, rubricText],
    ];
    for (const [sourcePath, content] of cases) {
      const asset = assetFor(sourcePath, content);
      const bytes = await fetchPinnedAssessmentAsset({
        asset,
        sourceSha: SOURCE_SHA,
        fetchImpl: serve(asset, content),
      });
      expect(bytes.equals(Buffer.from(content, "utf8"))).toBe(true);
    }
  });

  it("rejects unsafe HTTP assets and mismatched content", async () => {
    const asset = assetFor(SCORING_PATH, scoringText);
    const changed = [
      { status: 302 },
      { redirected: true },
      { url: "https://example.org/assessment.json" },
      { headers: { get: () => "text/html" } },
    ];
    for (const change of changed) {
      await expect(
        fetchPinnedAssessmentAsset({
          asset,
          sourceSha: SOURCE_SHA,
          fetchImpl: serve(asset, scoringText, change),
        }),
      ).rejects.toThrow(/redirect|HTML/);
    }
    await expect(
      fetchPinnedAssessmentAsset({
        asset,
        sourceSha: SOURCE_SHA,
        fetchImpl: serve(asset, scoringText + " "),
      }),
    ).rejects.toThrow(/hash or size/);
    await expect(
      fetchPinnedAssessmentAsset({
        asset,
        sourceSha: SOURCE_SHA,
        fetchImpl: serve(asset, scoringText, {
          headers: {
            get: (name) => {
              if (name === "content-length") return "2000000";
              return "application/json";
            },
          },
        }),
      }),
    ).rejects.toThrow(/exceeds/);
  });

  it("rejects unknown sources and incompatible scoring schema", async () => {
    const asset = assetFor(SCORING_PATH, scoringText);
    for (const invalid of [
      { ...asset, source_sha: "b".repeat(40) },
      { ...asset, source_path: "../scoring.json" },
    ]) {
      await expect(
        fetchPinnedAssessmentAsset({
          asset: invalid,
          sourceSha: SOURCE_SHA,
          fetchImpl: () => {
            throw Error("must reject before fetch");
          },
        }),
      ).rejects.toThrow(/source SHA|allowlist/);
    }
    for (const change of [
      { schema_version: 2 },
      { module_id: "M01" },
      { revision: "unknown" },
    ]) {
      const content = JSON.stringify({ ...JSON.parse(scoringText), ...change });
      const changedAsset = assetFor(SCORING_PATH, content);
      await expect(
        fetchPinnedAssessmentAsset({
          asset: changedAsset,
          sourceSha: SOURCE_SHA,
          fetchImpl: serve(changedAsset, content),
        }),
      ).rejects.toThrow(/schema\/module\/revision/);
    }
  });
});
