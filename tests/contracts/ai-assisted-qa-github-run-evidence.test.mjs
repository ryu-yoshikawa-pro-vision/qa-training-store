import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import {
  readEvidenceZipEntries,
  validateCourseWorkflow,
  validateGitHubRunEvidence,
  verifyGitHubRunEvidence,
} from "../../scripts/training/ai-assisted-qa-github-run-evidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHA = "a".repeat(40);
const MERGE_SHA = "b".repeat(40);
const evidence = {
  schema_version: 1,
  repository: "owner/course",
  pull_request_number: 12,
  head_sha: SHA,
  run_id: 345,
  check_name: "course-e2e",
  artifact_name: "course-playwright-results",
  workflow_path: ".github/workflows/course-e2e.yml",
  test_file: "workspace/M10/public-sample/handoff-smoke.spec.ts",
  test_root: "workspace/M10/public-sample",
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const [name, contentValue] of entries) {
    const nameBytes = Buffer.from(name);
    const content = Buffer.from(contentValue);
    const checksum = crc32(content);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);
    localParts.push(local, content);

    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(localOffset, 42);
    nameBytes.copy(central, 46);
    centralParts.push(central);
    localOffset += local.length + content.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const footer = Buffer.alloc(22);
  footer.writeUInt32LE(0x06054b50, 0);
  footer.writeUInt16LE(entries.length, 8);
  footer.writeUInt16LE(entries.length, 10);
  footer.writeUInt32LE(centralDirectory.length, 12);
  footer.writeUInt32LE(localDirectory.length, 16);
  return Buffer.concat([localDirectory, centralDirectory, footer]);
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("M10 GitHub Run evidence contract", () => {
  it("accepts exact identifiers and rejects placeholders or unsupported fields", () => {
    expect(validateGitHubRunEvidence(evidence).head_sha).toBe(SHA);
    expect(() => validateGitHubRunEvidence({ ...evidence, pull_request_number: 0 })).toThrow(
      /invalid repository/,
    );
    expect(() => validateGitHubRunEvidence({ ...evidence, access_token: "forbidden" })).toThrow(
      /unsupported fields/,
    );
  });

  it("restricts the workflow to exact PR-head checkout, one target spec and result artifact", () => {
    const workflow = fs.readFileSync(
      path.join(
        root,
        "training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled",
      ),
      "utf8",
    );
    const result = validateCourseWorkflow(workflow, evidence.workflow_path, evidence);
    expect(result.check_name).toBe("course-e2e");
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() =>
      validateCourseWorkflow(
        workflow.replace("contents: read", "contents: write"),
        evidence.workflow_path,
        evidence,
      ),
    ).toThrow(/only contents: read/);
    expect(() =>
      validateCourseWorkflow(
        workflow.replace("handoff-smoke.spec.ts", "other.spec.ts"),
        evidence.workflow_path,
        evidence,
      ),
    ).toThrow(/selected allowed M07\/M10 spec/);
    const m07Evidence = {
      ...evidence,
      test_file: "workspace/M07/repaired-assertion.spec.ts",
      test_root: "workspace/M07",
    };
    const m07Workflow = workflow
      .replace("workspace/M10/public-sample/handoff-smoke.spec.ts", m07Evidence.test_file)
      .replace(
        "PLAYWRIGHT_TEST_ROOT: workspace/M10/public-sample",
        "PLAYWRIGHT_TEST_ROOT: workspace/M07",
      );
    expect(
      validateCourseWorkflow(m07Workflow, evidence.workflow_path, m07Evidence).check_name,
    ).toBe("course-e2e");
  });

  it("extracts only expected, bounded evidence from ZIP and rejects traversal", () => {
    const archive = makeZip([
      ["target-sha.txt", SHA],
      [
        "playwright-result.json",
        JSON.stringify({ stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0 } }),
      ],
    ]);
    const files = readEvidenceZipEntries(archive);
    expect(files.get("target-sha.txt").toString()).toBe(SHA);
    expect(() => readEvidenceZipEntries(makeZip([["../target-sha.txt", SHA]]))).toThrow(
      /unsafe path/,
    );
  });

  it("binds PR head, successful Run/Check and Artifact contents", async () => {
    const workflow = fs.readFileSync(
      path.join(
        root,
        "training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled",
      ),
    );
    const archive = makeZip([
      ["target-sha.txt", SHA],
      [
        "playwright-result.json",
        JSON.stringify({ stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0 } }),
      ],
    ]);
    const digest = createHash("sha256").update(archive).digest("hex");
    const responses = [
      jsonResponse({ encoding: "base64", content: workflow.toString("base64") }),
      jsonResponse({
        number: 12,
        base: { repo: { full_name: "owner/course" } },
        head: { sha: SHA },
      }),
      jsonResponse({
        id: 345,
        repository: { full_name: "owner/course" },
        path: `${evidence.workflow_path}@refs/pull/12/merge`,
        event: "pull_request",
        status: "completed",
        conclusion: "success",
        head_sha: MERGE_SHA,
        pull_requests: [{ number: 12, head: { sha: SHA } }],
      }),
      jsonResponse({
        check_runs: [
          {
            name: "course-e2e",
            head_sha: MERGE_SHA,
            status: "completed",
            conclusion: "success",
            details_url: "https://github.com/owner/course/actions/runs/345/job/1",
          },
        ],
      }),
      jsonResponse({
        artifacts: [
          {
            id: 555,
            name: evidence.artifact_name,
            expired: false,
            digest: `sha256:${digest}`,
            workflow_run: { id: 345, head_sha: MERGE_SHA },
          },
        ],
      }),
      {
        status: 200,
        redirected: true,
        arrayBuffer: async () =>
          archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength),
      },
    ];
    const urls = [];
    const fetchImpl = async (url) => {
      urls.push(String(url));
      const response = responses.shift();
      expect(response, `unexpected GitHub API request: ${url}`).toBeTruthy();
      return response;
    };
    const result = await verifyGitHubRunEvidence({
      evidence,
      currentHeadSha: SHA,
      token: "test-token-value",
      fetchImpl,
    });
    expect(result.status).toBe("passed");
    expect(result.checks.map((check) => check.id)).toEqual([
      "M10-WORKFLOW",
      "M10-RUN",
      "M10-CHECK",
      "M10-ARTIFACT",
      "M10-PLAYWRIGHT",
    ]);
    expect(urls).toHaveLength(6);
    expect(urls[3]).toContain(`/commits/${MERGE_SHA}/check-runs`);
    expect(responses).toHaveLength(0);
    const staleResponses = [
      jsonResponse({ encoding: "base64", content: workflow.toString("base64") }),
      jsonResponse({
        number: 12,
        base: { repo: { full_name: "owner/course" } },
        head: { sha: MERGE_SHA },
      }),
    ];
    await expect(
      verifyGitHubRunEvidence({
        evidence,
        currentHeadSha: SHA,
        token: "test-token-value",
        fetchImpl: async () => staleResponses.shift(),
      }),
    ).rejects.toThrow(/PR no longer points to the supplied exact HEAD SHA/);
    await expect(
      verifyGitHubRunEvidence({
        evidence,
        currentHeadSha: "c".repeat(40),
        token: "test-token-value",
        fetchImpl,
      }),
    ).rejects.toThrow(/does not match the current local HEAD SHA/);
  });
});
