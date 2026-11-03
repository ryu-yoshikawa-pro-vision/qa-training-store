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

function acceptedPlaywrightReport() {
  return {
    stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0 },
    suites: [
      {
        title: "handoff-smoke.spec.ts",
        file: "handoff-smoke.spec.ts",
        specs: [
          {
            title: "checks the public handoff",
            file: "handoff-smoke.spec.ts",
            tests: [
              {
                projectName: "ai-assisted-qa-chromium",
                expectedStatus: "passed",
                status: "expected",
                results: [{ status: "passed", retry: 0 }],
              },
            ],
          },
        ],
      },
    ],
  };
}

function acceptedGitHubResponses(workflow, archive) {
  const digest = createHash("sha256").update(archive).digest("hex");
  return [
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
      run_attempt: 1,
      pull_requests: [{ number: 12, head: { sha: SHA } }],
    }),
    jsonResponse({
      check_runs: [
        {
          id: 1,
          name: "course-e2e",
          head_sha: MERGE_SHA,
          status: "completed",
          conclusion: "success",
          details_url: "https://github.com/owner/course/actions/runs/345/job/1",
        },
      ],
    }),
    jsonResponse({
      total_count: 1,
      jobs: [
        {
          id: 1,
          run_id: 345,
          run_attempt: 1,
          name: "course-e2e",
          head_sha: MERGE_SHA,
          status: "completed",
          conclusion: "success",
          check_run_url: "https://api.github.com/repos/owner/course/check-runs/1",
          started_at: "2026-11-03T12:00:00Z",
          completed_at: "2026-11-03T12:03:00Z",
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
          created_at: "2026-11-03T12:02:00Z",
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
    ).toThrow(/unapproved shell command/);
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
    expect(() =>
      validateCourseWorkflow(
        workflow.replace(
          "      - uses: actions/upload-artifact@v4",
          "      - run: pnpm run training:ai-assisted-qa:test -- workspace/M10/public-sample/handoff-smoke.spec.ts; echo unsafe\n      - uses: actions/upload-artifact@v4",
        ),
        evidence.workflow_path,
        evidence,
      ),
    ).toThrow(/unapproved shell command/);
    expect(() =>
      validateCourseWorkflow(
        workflow.replace(
          "      - uses: actions/upload-artifact@v4",
          "      - run: pnpm install --frozen-lockfile\n      - uses: actions/upload-artifact@v4",
        ),
        evidence.workflow_path,
        evidence,
      ),
    ).toThrow(/reviewed checkout, SHA, test, and upload order/);
  });

  it("rejects workflow-level privilege, job overrides, and step-level bypasses", () => {
    const workflow = fs.readFileSync(
      path.join(
        root,
        "training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled",
      ),
      "utf8",
    );
    const cases = [
      [
        workflow.replace("jobs:\n", "env:\n  BASH_ENV: ./bootstrap.sh\njobs:\n"),
        /unapproved top-level fields/,
      ],
      [
        workflow.replace(
          "    runs-on: ubuntu-latest\n",
          "    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n",
        ),
        /unapproved job fields/,
      ],
      [
        workflow.replace(
          "    runs-on: ubuntu-latest\n",
          "    runs-on: ubuntu-latest\n    continue-on-error: true\n",
        ),
        /unapproved job fields/,
      ],
      [
        workflow.replace(
          "      - run: pnpm install --frozen-lockfile\n",
          "      - run: pnpm install --frozen-lockfile\n        continue-on-error: true\n",
        ),
        /unapproved step fields/,
      ],
      [
        workflow.replace(
          "      - run: pnpm install --frozen-lockfile\n",
          "      - run: pnpm install --frozen-lockfile\n        env:\n          NODE_OPTIONS: --require ./bootstrap.js\n",
        ),
        /unapproved shell environment variables/,
      ],
      [
        workflow.replace(
          "          persist-credentials: false\n",
          "          persist-credentials: false\n          submodules: true\n",
        ),
        /unapproved action options fields/,
      ],
      [
        workflow.replace(
          "          PLAYWRIGHT_TEST_ROOT: workspace/M10/public-sample\n",
          "          PLAYWRIGHT_TEST_ROOT: workspace/M10/public-sample\n          BASH_ENV: ./bootstrap.sh\n",
        ),
        /unapproved test step environment fields/,
      ],
      [
        workflow.replace(
          "          EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha }}",
          "          EXPECTED_HEAD_SHA: deadbeef",
        ),
        /must verify the PR head SHA/,
      ],
      [
        workflow.replace(
          "      - run: mkdir -p output/training/ai-assisted-qa\n      - run: git rev-parse HEAD > output/training/ai-assisted-qa/target-sha.txt",
          "      - run: git rev-parse HEAD > output/training/ai-assisted-qa/target-sha.txt\n      - run: mkdir -p output/training/ai-assisted-qa",
        ),
        /reviewed checkout, SHA, test, and upload order/,
      ],
      [
        workflow.replace("version: 10.34.5", "version: 10.34.6"),
        /retain the reviewed Node and pnpm versions/,
      ],
    ];
    for (const [changed, reason] of cases) {
      expect(changed).not.toBe(workflow);
      expect(() => validateCourseWorkflow(changed, evidence.workflow_path, evidence)).toThrow(
        reason,
      );
    }
  });

  it("extracts only expected, bounded evidence from ZIP and rejects traversal", () => {
    const archive = makeZip([
      ["target-sha.txt", SHA],
      ["playwright-result.json", JSON.stringify(acceptedPlaywrightReport())],
    ]);
    const files = readEvidenceZipEntries(archive);
    expect(files.get("target-sha.txt").toString()).toBe(SHA);
    expect(() => readEvidenceZipEntries(makeZip([["../target-sha.txt", SHA]]))).toThrow(
      /unsafe path/,
    );
  });

  it("rejects oversized GitHub API JSON responses before unbounded buffering", async () => {
    const workflow = fs.readFileSync(
      path.join(
        root,
        "training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled",
      ),
    );
    const archive = makeZip([
      ["target-sha.txt", SHA],
      ["playwright-result.json", JSON.stringify(acceptedPlaywrightReport())],
    ]);
    const rejectFirstResponse = async (apiResponse) => {
      const responses = acceptedGitHubResponses(workflow, archive);
      responses[0] = apiResponse;
      await expect(
        verifyGitHubRunEvidence({
          evidence,
          currentHeadSha: SHA,
          token: "test-token-value",
          fetchImpl: async () => responses.shift(),
        }),
      ).rejects.toThrow(/pinned M10 workflow response exceeds the allowed size/);
    };
    let readBody = false;
    await rejectFirstResponse({
      status: 200,
      redirected: false,
      headers: { get: () => String(1024 * 1024 + 1) },
      arrayBuffer: async () => {
        readBody = true;
        throw new Error("oversized API response must not be buffered");
      },
    });
    expect(readBody).toBe(false);

    let cancelled = false;
    const chunk = Buffer.alloc(256 * 1024);
    await rejectFirstResponse({
      status: 200,
      redirected: false,
      headers: { get: () => null },
      body: {
        getReader: () => ({
          read: async () => ({ done: false, value: chunk }),
          cancel: async () => {
            cancelled = true;
          },
          releaseLock: () => {},
        }),
      },
      arrayBuffer: async () => {
        throw new Error("streaming API response must not use arrayBuffer");
      },
    });
    expect(cancelled).toBe(true);
  });

  it("rejects oversized Artifact responses before unbounded buffering", async () => {
    const workflow = fs.readFileSync(
      path.join(
        root,
        "training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled",
      ),
    );
    const archive = makeZip([
      ["target-sha.txt", SHA],
      ["playwright-result.json", JSON.stringify(acceptedPlaywrightReport())],
    ]);
    const assertRejected = async (artifactResponse) => {
      const responses = acceptedGitHubResponses(workflow, archive);
      responses[6] = artifactResponse;
      await expect(
        verifyGitHubRunEvidence({
          evidence,
          currentHeadSha: SHA,
          token: "test-token-value",
          fetchImpl: async () => responses.shift(),
        }),
      ).rejects.toThrow(/Artifact archive exceeds the allowed size/);
    };

    let arrayBufferRead = false;
    await assertRejected({
      status: 200,
      redirected: true,
      headers: { get: () => String(32 * 1024 * 1024 + 1) },
      arrayBuffer: async () => {
        arrayBufferRead = true;
        throw new Error("oversized Artifact body must not be buffered");
      },
    });
    expect(arrayBufferRead).toBe(false);

    let cancelled = false;
    const chunk = Buffer.alloc(1024 * 1024);
    await assertRejected({
      status: 200,
      redirected: true,
      headers: { get: () => null },
      body: {
        getReader: () => ({
          read: async () => ({ done: false, value: chunk }),
          cancel: async () => {
            cancelled = true;
          },
          releaseLock: () => {},
        }),
      },
      arrayBuffer: async () => {
        throw new Error("streamed Artifact must not use arrayBuffer");
      },
    });
    expect(cancelled).toBe(true);
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
      ["playwright-result.json", JSON.stringify(acceptedPlaywrightReport())],
    ]);
    const responses = acceptedGitHubResponses(workflow, archive);
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
    expect(result.checks.find((check) => check.id === "M10-RUN")).toMatchObject({
      run_id: 345,
      run_attempt: 1,
      job_id: 1,
    });
    expect(result.checks.find((check) => check.id === "M10-CHECK")).toMatchObject({
      check_run_id: 1,
    });
    expect(result.checks.find((check) => check.id === "M10-ARTIFACT")).toMatchObject({
      digest: `sha256:${createHash("sha256").update(archive).digest("hex")}`,
    });
    expect(urls).toHaveLength(7);
    expect(urls[3]).toContain(`/commits/${MERGE_SHA}/check-runs`);

    expect(responses).toHaveLength(0);
    for (const [mutate, message] of [
      [
        (report) => {
          report.suites = [];
        },
        /missing the selected spec results/,
      ],
      [
        (report) => {
          report.suites[0].specs[0].file = "unrelated.spec.ts";
        },
        /only the selected spec/,
      ],
      [
        (report) => {
          report.suites[0].specs[0].tests[0].results[0].status = "failed";
        },
        /unexpected project, retry, or unsuccessful test/,
      ],
      [
        (report) => {
          report.suites[0].specs[0].tests[0].projectName = "unrelated-project";
        },
        /unexpected project, retry, or unsuccessful test/,
      ],
      [
        (report) => {
          report.suites[0].specs[0].tests[0].results[0].retry = 1;
        },
        /unexpected project, retry, or unsuccessful test/,
      ],
      [
        (report) => {
          report.suites[0].specs[0].tests[0].results.push({ status: "passed", retry: 1 });
        },
        /unexpected project, retry, or unsuccessful test/,
      ],
      [
        (report) => {
          report.stats.expected = 2;
        },
        /summary does not match/,
      ],
    ]) {
      const wrongReport = acceptedPlaywrightReport();
      mutate(wrongReport);
      const badArchive = makeZip([
        ["target-sha.txt", SHA],
        ["playwright-result.json", JSON.stringify(wrongReport)],
      ]);
      const badResponses = acceptedGitHubResponses(workflow, badArchive);
      await expect(
        verifyGitHubRunEvidence({
          evidence,
          currentHeadSha: SHA,
          token: "test-token-value",
          fetchImpl: async () => badResponses.shift(),
        }),
      ).rejects.toThrow(message);
    }
    for (const [digest, rejection] of [
      [undefined, /Artifact SHA-256 digest is missing or invalid/],
      [`sha256:${"0".repeat(64)}`, /downloaded Artifact does not match/],
    ]) {
      const artifactResponses = acceptedGitHubResponses(workflow, archive);
      artifactResponses[5] = jsonResponse({
        artifacts: [
          {
            id: 555,
            name: evidence.artifact_name,
            expired: false,
            created_at: "2026-11-03T12:02:00Z",
            ...(digest === undefined ? {} : { digest }),
            workflow_run: { id: 345, head_sha: MERGE_SHA },
          },
        ],
      });
      await expect(
        verifyGitHubRunEvidence({
          evidence,
          currentHeadSha: SHA,
          token: "test-token-value",
          fetchImpl: async () => artifactResponses.shift(),
        }),
      ).rejects.toThrow(rejection);
    }
    const wrongAttemptJob = {
      id: 1,
      run_id: 345,
      run_attempt: 2,
      name: "course-e2e",
      head_sha: MERGE_SHA,
      status: "completed",
      conclusion: "success",
      check_run_url: "https://api.github.com/repos/owner/course/check-runs/1",
      started_at: "2026-11-03T12:00:00Z",
      completed_at: "2026-11-03T12:03:00Z",
    };
    for (const [index, replacement, rejection] of [
      [
        4,
        jsonResponse({ total_count: 1, jobs: [wrongAttemptJob] }),
        /Check does not belong to the current Run attempt/,
      ],
      [
        4,
        jsonResponse({
          total_count: 1,
          jobs: [{ ...wrongAttemptJob, run_attempt: 1, id: 2 }],
        }),
        /Check does not belong to the current Run attempt/,
      ],
      [
        5,
        jsonResponse({
          artifacts: [
            {
              id: 555,
              name: evidence.artifact_name,
              expired: false,
              digest: `sha256:${createHash("sha256").update(archive).digest("hex")}`,
              created_at: "2026-11-03T11:59:59Z",
              workflow_run: { id: 345, head_sha: MERGE_SHA },
            },
          ],
        }),
        /creation time does not belong to the current Run attempt/,
      ],
    ]) {
      const attemptResponses = acceptedGitHubResponses(workflow, archive);
      attemptResponses[index] = replacement;
      await expect(
        verifyGitHubRunEvidence({
          evidence,
          currentHeadSha: SHA,
          token: "test-token-value",
          fetchImpl: async () => attemptResponses.shift(),
        }),
      ).rejects.toThrow(rejection);
    }
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
