import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { parseDocument } from "yaml";

const OWNER_REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/;
const SHA_RE = /^[a-f0-9]{40}$/;
const WORKFLOW_PATH_RE = /^\.github\/workflows\/[A-Za-z0-9._-]+\.ya?ml$/;
const MAX_WORKFLOW_BYTES = 1024 * 1024;
const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
const EXPECTED_ARTIFACT_FILES = new Set(["target-sha.txt", "playwright-result.json"]);
const ALLOWED_TARGET_SPECS = new Map([
  ["workspace/M07/repaired-assertion.spec.ts", "workspace/M07"],
  ["workspace/M10/public-sample/handoff-smoke.spec.ts", "workspace/M10/public-sample"],
]);

function fail(message) {
  throw new Error(message);
}

export function validateGitHubRunEvidence(value) {
  const allowedFields = new Set([
    "schema_version",
    "repository",
    "pull_request_number",
    "head_sha",
    "run_id",
    "check_name",
    "artifact_name",
    "workflow_path",
    "test_file",
    "test_root",
  ]);
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("M10 run evidence must be a JSON object");
  if (Object.keys(value).some((key) => !allowedFields.has(key)))
    fail("M10 run evidence has unsupported fields");
  if (
    value.schema_version !== 1 ||
    !OWNER_REPO.test(value.repository ?? "") ||
    !Number.isSafeInteger(value.pull_request_number) ||
    value.pull_request_number < 1 ||
    !SHA_RE.test(value.head_sha ?? "") ||
    !Number.isSafeInteger(value.run_id) ||
    value.run_id < 1 ||
    value.check_name !== "course-e2e" ||
    value.artifact_name !== "course-playwright-results" ||
    !WORKFLOW_PATH_RE.test(value.workflow_path ?? "") ||
    !ALLOWED_TARGET_SPECS.has(value.test_file) ||
    ALLOWED_TARGET_SPECS.get(value.test_file) !== value.test_root
  )
    fail(
      "M10 run evidence has invalid repository, PR, SHA, Run, Check, Artifact, or workflow metadata",
    );
  return value;
}

function requireOnlyWorkflowFields(value, allowed, description) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.includes(key))
  )
    fail(`M10 workflow contains unapproved ${description} fields`);
}

export function validateCourseWorkflow(document, workflowPath, target) {
  const parsed = parseDocument(document, { uniqueKeys: true, maxAliasCount: 20 });
  if (parsed.errors.length) fail(`M10 workflow YAML is invalid: ${parsed.errors[0].message}`);
  const workflow = parsed.toJS();
  if (!workflow || typeof workflow !== "object") fail("M10 workflow must be a YAML object");
  requireOnlyWorkflowFields(workflow, ["name", "on", "permissions", "jobs"], "top-level");
  if (/\bsecrets\s*\./i.test(document) || /\bdeploy\b/i.test(document))
    fail("M10 workflow must not access repository Secrets or deploy application code");
  const triggers = workflow.on;
  if (
    !triggers ||
    typeof triggers !== "object" ||
    Object.keys(triggers).length !== 1 ||
    !Object.hasOwn(triggers, "pull_request")
  )
    fail("M10 workflow must run only for pull_request events");
  const permissions = workflow.permissions;
  if (!permissions || Object.keys(permissions).length !== 1 || permissions.contents !== "read")
    fail("M10 workflow must request only contents: read");
  const jobEntries = Object.entries(workflow.jobs ?? {});
  if (jobEntries.length !== 1 || jobEntries[0][0] !== "course-e2e")
    fail("M10 workflow must contain only the dedicated course-e2e job");
  const [job] = jobEntries.map(([, value]) => value);
  if (!job || job["runs-on"] !== "ubuntu-latest")
    fail("M10 workflow must use the standard GitHub-hosted Linux runner");
  if (job.name !== undefined && job.name !== "course-e2e")
    fail("M10 workflow job must retain the course-e2e Check name");
  requireOnlyWorkflowFields(job, ["name", "runs-on", "steps"], "job");
  const steps = Array.isArray(job.steps) ? job.steps : [];
  const allowedActions = new Set([
    "actions/checkout@v4",
    "pnpm/action-setup@v4",
    "actions/setup-node@v4",
    "actions/upload-artifact@v4",
  ]);
  if (steps.some((step) => step.uses && !allowedActions.has(step.uses)))
    fail("M10 workflow contains an unapproved action");
  const requiredTestCommand = target
    ? `pnpm run training:ai-assisted-qa:test -- ${target.test_file}`
    : null;
  const allowedCommands = new Set([
    "pnpm install --frozen-lockfile",
    "pnpm exec playwright install --with-deps chromium",
    "mkdir -p output/training/ai-assisted-qa",
    'test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD_SHA"',
    "git rev-parse HEAD > output/training/ai-assisted-qa/target-sha.txt",
    ...(requiredTestCommand ? [requiredTestCommand] : []),
  ]);
  const actionOptions = new Map([
    ["actions/checkout@v4", ["ref", "persist-credentials"]],
    ["pnpm/action-setup@v4", ["version"]],
    ["actions/setup-node@v4", ["node-version", "cache"]],
    ["actions/upload-artifact@v4", ["name", "path", "if-no-files-found"]],
  ]);
  for (const step of steps) {
    const isAction = step && typeof step === "object" && typeof step.uses === "string";
    requireOnlyWorkflowFields(
      step,
      isAction
        ? step.uses === "actions/upload-artifact@v4"
          ? ["uses", "with", "if"]
          : ["uses", "with"]
        : ["run", "env"],
      "step",
    );
    if (isAction) {
      requireOnlyWorkflowFields(step.with, actionOptions.get(step.uses) ?? [], "action options");
      continue;
    }
    if (typeof step.run !== "string" || !allowedCommands.has(step.run))
      fail("M10 workflow contains an unapproved shell command");
    if (step.run === 'test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD_SHA"') {
      requireOnlyWorkflowFields(step.env, ["EXPECTED_HEAD_SHA"], "SHA step environment");
      if (step.env.EXPECTED_HEAD_SHA !== "${{ github.event.pull_request.head.sha }}")
        fail("M10 workflow must verify the PR head SHA against the same checkout");
    } else if (step.run === requiredTestCommand) {
      requireOnlyWorkflowFields(step.env, ["PLAYWRIGHT_TEST_ROOT"], "test step environment");
    } else if (step.env !== undefined) {
      fail("M10 workflow contains unapproved shell environment variables");
    }
  }
  const reviewedStepOrder = [
    "actions/checkout@v4",
    "pnpm/action-setup@v4",
    "actions/setup-node@v4",
    "pnpm install --frozen-lockfile",
    "pnpm exec playwright install --with-deps chromium",
    'test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD_SHA"',
    "mkdir -p output/training/ai-assisted-qa",
    "git rev-parse HEAD > output/training/ai-assisted-qa/target-sha.txt",
    requiredTestCommand,
    "actions/upload-artifact@v4",
  ];
  if (steps.some((step, index) => (step.uses ?? step.run) !== reviewedStepOrder[index]))
    fail("M10 workflow steps must follow the reviewed checkout, SHA, test, and upload order");
  const pnpmSetup = steps.find((step) => step.uses === "pnpm/action-setup@v4");
  const nodeSetup = steps.find((step) => step.uses === "actions/setup-node@v4");
  if (
    pnpmSetup.with.version !== "10.34.5" ||
    nodeSetup.with["node-version"] !== 24 ||
    nodeSetup.with.cache !== "pnpm"
  )
    fail("M10 workflow must retain the reviewed Node and pnpm versions");
  if (
    steps.length !== 10 ||
    [...allowedActions].some(
      (action) => steps.filter((step) => step.uses === action).length !== 1,
    ) ||
    [...allowedCommands].some(
      (command) => steps.filter((step) => step.run === command).length !== 1,
    )
  )
    fail("M10 workflow must contain exactly the reviewed actions and shell commands");
  const checkout = steps.find(
    (step) => typeof step.uses === "string" && step.uses.startsWith("actions/checkout@"),
  );
  if (
    !checkout ||
    checkout.with?.ref !== "${{ github.event.pull_request.head.sha }}" ||
    checkout.with?.["persist-credentials"] !== false
  )
    fail("M10 workflow must checkout the exact PR head SHA without persisted credentials");
  const playwrightStep = steps.find(
    (step) =>
      typeof step.run === "string" && step.run.includes("pnpm run training:ai-assisted-qa:test"),
  );
  if (
    !playwrightStep ||
    !target ||
    playwrightStep.run !== `pnpm run training:ai-assisted-qa:test -- ${target.test_file}` ||
    target.test_root !== ALLOWED_TARGET_SPECS.get(target.test_file) ||
    playwrightStep.env?.PLAYWRIGHT_TEST_ROOT !== target.test_root
  )
    fail(
      "M10 workflow must execute the selected allowed M07/M10 spec through the dedicated Playwright config",
    );
  if (
    !steps.some(
      (step) =>
        typeof step.run === "string" &&
        /git rev-parse HEAD\s*>\s*output\/training\/ai-assisted-qa\/target-sha\.txt/.test(step.run),
    )
  )
    fail("M10 workflow does not record the checked-out target SHA");
  const uploader = steps.find(
    (step) => typeof step.uses === "string" && step.uses.startsWith("actions/upload-artifact@"),
  );
  if (
    !uploader ||
    uploader.with?.name !== "course-playwright-results" ||
    typeof uploader.with?.path !== "string" ||
    JSON.stringify(
      uploader.with.path
        .trim()
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .sort(),
    ) !==
      JSON.stringify([
        "output/training/ai-assisted-qa/playwright-result.json",
        "output/training/ai-assisted-qa/target-sha.txt",
      ]) ||
    uploader.with?.["if-no-files-found"] !== "error" ||
    uploader.if !== "always()"
  )
    fail("M10 workflow does not upload the required target-SHA and Playwright evidence artifact");
  return {
    path: workflowPath,
    sha256: createHash("sha256").update(document, "utf8").digest("hex"),
    check_name: "course-e2e",
  };
}

export function readEvidenceZipEntries(archive) {
  if (!Buffer.isBuffer(archive) || archive.length < 22 || archive.length > MAX_ARCHIVE_BYTES)
    fail("M10 GitHub Artifact archive size is invalid");
  let eocd = -1;
  const searchStart = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= searchStart; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) fail("M10 GitHub Artifact is not a supported ZIP archive");
  const entriesCount = archive.readUInt16LE(eocd + 10);
  const directorySize = archive.readUInt32LE(eocd + 12);
  let cursor = archive.readUInt32LE(eocd + 16);
  if (entriesCount === 0xffff || directorySize === 0xffffffff || cursor === 0xffffffff)
    fail("M10 GitHub Artifact ZIP64 archives are not supported");
  if (cursor + directorySize > eocd) fail("M10 GitHub Artifact ZIP directory is malformed");
  const files = new Map();
  for (let index = 0; index < entriesCount; index += 1) {
    if (archive.readUInt32LE(cursor) !== 0x02014b50)
      fail("M10 GitHub Artifact ZIP directory entry is malformed");
    const method = archive.readUInt16LE(cursor + 10);
    const flags = archive.readUInt16LE(cursor + 8);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    cursor += 46 + nameLength + extraLength + commentLength;
    if (name.includes("\\") || name.startsWith("/") || name.split("/").includes(".."))
      fail("M10 GitHub Artifact ZIP contains an unsafe path");
    if (!EXPECTED_ARTIFACT_FILES.has(name))
      fail(`M10 GitHub Artifact contains an unexpected file: ${name}`);
    if (files.has(name)) fail(`M10 GitHub Artifact contains duplicate evidence: ${name}`);
    if (uncompressedSize > MAX_WORKFLOW_BYTES)
      fail(`M10 GitHub Artifact evidence is too large: ${name}`);
    if (flags & 1) fail("M10 GitHub Artifact ZIP must not encrypt evidence files");
    if (archive.readUInt32LE(localOffset) !== 0x04034b50)
      fail("M10 GitHub Artifact ZIP local entry is malformed");
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const localName = archive
      .subarray(localOffset + 30, localOffset + 30 + localNameLength)
      .toString("utf8");
    if (localName !== name || archive.readUInt16LE(localOffset + 8) !== method)
      fail("M10 GitHub Artifact central and local ZIP entries differ");
    const compressed = archive.subarray(dataOffset, dataOffset + compressedSize);
    if (compressed.length !== compressedSize)
      fail(`M10 GitHub Artifact evidence is truncated: ${name}`);
    let content;
    if (method === 0) content = compressed;
    else if (method === 8)
      content = inflateRawSync(compressed, { maxOutputLength: MAX_WORKFLOW_BYTES });
    else fail(`M10 GitHub Artifact uses unsupported ZIP compression method ${method}`);
    if (content.length !== uncompressedSize)
      fail(`M10 GitHub Artifact evidence size mismatch: ${name}`);
    if (
      crc32(content) !==
      archive.readUInt32LE(cursor - (46 + nameLength + extraLength + commentLength) + 16)
    )
      fail(`M10 GitHub Artifact evidence checksum mismatch: ${name}`);
    files.set(name, content);
  }
  if (files.size !== EXPECTED_ARTIFACT_FILES.size)
    fail("M10 GitHub Artifact is missing required evidence files");
  return files;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function readJsonResponse(response, description) {
  if (response.status === 429 || response.status >= 500)
    fail(`BLOCKED: GitHub API is rate-limited or unavailable while reading ${description}`);
  if (response.status !== 200 || response.redirected)
    fail(`${description} was not returned by the expected GitHub API endpoint`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_WORKFLOW_BYTES)
    fail(`${description} response size is invalid`);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${description} response is invalid JSON`);
  }
}

function verifyPlaywrightJsonTests(report, target) {
  const allowedPaths = new Set([
    target.test_file,
    target.test_file.slice(target.test_root.length + 1),
  ]);
  let observed = 0;
  const visit = (suite) => {
    if (!suite || typeof suite !== "object" || Array.isArray(suite))
      fail("ungradable: Playwright JSON suite is malformed");
    for (const spec of suite.specs ?? []) {
      if (!allowedPaths.has(spec?.file) || !Array.isArray(spec.tests) || !spec.tests.length)
        fail("ungradable: Playwright JSON results do not contain only the selected spec");
      for (const test of spec.tests) {
        if (
          test?.projectName !== "ai-assisted-qa-chromium" ||
          test.expectedStatus !== "passed" ||
          test.status !== "expected" ||
          !Array.isArray(test.results) ||
          test.results.length !== 1 ||
          test.results[0]?.status !== "passed" ||
          test.results[0].retry !== 0
        )
          fail(
            "ungradable: selected Playwright spec has an unexpected project, retry, or unsuccessful test",
          );
        observed += 1;
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  if (!Array.isArray(report.suites) || report.suites.length === 0)
    fail("ungradable: Playwright JSON is missing the selected spec results");
  for (const suite of report.suites) visit(suite);
  if (observed === 0 || observed !== report.stats.expected)
    fail("ungradable: Playwright JSON summary does not match the selected spec tests");
}

export async function verifyGitHubRunEvidence({
  evidence,
  currentHeadSha,
  token,
  fetchImpl = fetch,
}) {
  const source = validateGitHubRunEvidence(evidence);
  if (!SHA_RE.test(currentHeadSha ?? "") || source.head_sha !== currentHeadSha)
    fail("BLOCKED: M10 Run evidence does not match the current local HEAD SHA");
  if (typeof token !== "string" || token.length < 10)
    fail("BLOCKED: provide a GitHub token with read access to Actions and pull requests");
  const apiRoot = `https://api.github.com/repos/${source.repository}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "qa-training-course",
  };
  const requestJson = async (url, label) => {
    let response;
    try {
      response = await fetchImpl(url, { method: "GET", redirect: "manual", headers });
    } catch {
      fail(`BLOCKED: GitHub API request failed while reading ${label}`);
    }
    if (response.status === 401 || response.status === 403)
      fail(`BLOCKED: GitHub token cannot read ${label}`);
    if (response.status === 404)
      fail(`BLOCKED: GitHub ${label} was not found or is not readable with the supplied token`);
    return readJsonResponse(response, label);
  };
  const workflowBody = await requestJson(
    `${apiRoot}/contents/${source.workflow_path}?ref=${source.head_sha}`,
    "pinned M10 workflow",
  );
  if (workflowBody.encoding !== "base64" || typeof workflowBody.content !== "string")
    fail("M10 workflow source must be a pinned base64 GitHub content response");
  const workflowBytes = Buffer.from(workflowBody.content.replace(/\s/g, ""), "base64");
  if (workflowBytes.length === 0 || workflowBytes.length > MAX_WORKFLOW_BYTES)
    fail("M10 workflow source size is invalid");
  const workflowText = workflowBytes.toString("utf8");
  if (workflowText.includes("\ufffd")) fail("M10 workflow source is not valid UTF-8");
  const workflow = validateCourseWorkflow(workflowText, source.workflow_path, source);

  const pullRequest = await requestJson(
    `${apiRoot}/pulls/${source.pull_request_number}`,
    "current M10 pull request",
  );
  if (
    pullRequest.number !== source.pull_request_number ||
    pullRequest.base?.repo?.full_name?.toLowerCase() !== source.repository.toLowerCase() ||
    pullRequest.head?.sha !== currentHeadSha
  )
    fail("BLOCKED: the recorded PR no longer points to the supplied exact HEAD SHA");
  const run = await requestJson(`${apiRoot}/actions/runs/${source.run_id}`, "Actions Run");
  const runWorkflowPath = typeof run.path === "string" ? run.path.split("@", 1)[0] : "";
  if (
    run.id !== source.run_id ||
    run.repository?.full_name?.toLowerCase() !== source.repository.toLowerCase() ||
    runWorkflowPath !== source.workflow_path ||
    run.event !== "pull_request" ||
    run.status !== "completed" ||
    run.conclusion !== "success" ||
    !run.pull_requests?.some(
      (associated) =>
        associated.number === source.pull_request_number &&
        (associated.head?.sha === undefined || associated.head.sha === currentHeadSha),
    )
  )
    fail(
      "ungradable: Actions Run is not a successful pull_request Run for this repository, PR, and workflow",
    );
  if (!Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1)
    fail("ungradable: Actions Run attempt is missing or invalid");

  const checkResponse = await requestJson(
    `${apiRoot}/commits/${run.head_sha}/check-runs?check_name=${encodeURIComponent(source.check_name)}&per_page=100`,
    "M10 Check Run",
  );
  const matchingChecks = (checkResponse.check_runs ?? []).filter(
    (check) =>
      check.name === source.check_name &&
      check.head_sha === run.head_sha &&
      check.status === "completed" &&
      check.conclusion === "success" &&
      new RegExp(`/actions/runs/${source.run_id}(?:/|$)`).test(check.details_url ?? ""),
  );
  if (matchingChecks.length !== 1)
    fail("ungradable: a successful Check Run tied to this exact Actions Run was not found");

  const attemptJobs = await requestJson(
    `${apiRoot}/actions/runs/${source.run_id}/attempts/${run.run_attempt}/jobs?per_page=100`,
    "M10 Actions attempt jobs",
  );
  if (
    attemptJobs.total_count !== 1 ||
    !Array.isArray(attemptJobs.jobs) ||
    attemptJobs.jobs.length !== 1
  )
    fail("ungradable: M10 Run attempt must contain exactly one dedicated course-e2e job");
  const attemptJob = attemptJobs.jobs[0];
  if (
    attemptJob.id !== matchingChecks[0].id ||
    attemptJob.run_id !== source.run_id ||
    attemptJob.run_attempt !== run.run_attempt ||
    attemptJob.name !== source.check_name ||
    attemptJob.head_sha !== run.head_sha ||
    attemptJob.status !== "completed" ||
    attemptJob.conclusion !== "success" ||
    attemptJob.check_run_url !== `${apiRoot}/check-runs/${attemptJob.id}`
  )
    fail("ungradable: the successful Check does not belong to the current Run attempt");

  const artifactResponse = await requestJson(
    `${apiRoot}/actions/runs/${source.run_id}/artifacts?per_page=100`,
    "M10 Artifact list",
  );
  const artifacts = (artifactResponse.artifacts ?? []).filter(
    (artifact) =>
      artifact.name === source.artifact_name &&
      artifact.expired !== true &&
      artifact.workflow_run?.id === source.run_id &&
      artifact.workflow_run?.head_sha === run.head_sha,
  );
  if (artifacts.length !== 1)
    fail("ungradable: the required non-expired Artifact for this Run was not found");
  const artifactCreatedAt = Date.parse(artifacts[0].created_at);
  const jobStartedAt = Date.parse(attemptJob.started_at);
  const jobCompletedAt = Date.parse(attemptJob.completed_at);
  if (
    !Number.isFinite(artifactCreatedAt) ||
    !Number.isFinite(jobStartedAt) ||
    !Number.isFinite(jobCompletedAt) ||
    jobStartedAt > jobCompletedAt ||
    artifactCreatedAt < jobStartedAt ||
    artifactCreatedAt > jobCompletedAt
  )
    fail("ungradable: Artifact creation time does not belong to the current Run attempt");
  let archiveResponse;
  try {
    archiveResponse = await fetchImpl(`${apiRoot}/actions/artifacts/${artifacts[0].id}/zip`, {
      method: "GET",
      redirect: "follow",
      headers,
    });
  } catch {
    fail("BLOCKED: the M10 GitHub Artifact could not be downloaded");
  }
  if (archiveResponse.status !== 200 || !archiveResponse.redirected)
    fail(
      "BLOCKED: the M10 Artifact download did not complete through GitHub's signed download URL",
    );
  const archiveBytes = Buffer.from(await archiveResponse.arrayBuffer());
  const artifactDigest = artifacts[0].digest;
  if (typeof artifactDigest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(artifactDigest))
    fail("ungradable: GitHub Artifact SHA-256 digest is missing or invalid");
  if (createHash("sha256").update(archiveBytes).digest("hex") !== artifactDigest.slice(7))
    fail("ungradable: downloaded Artifact does not match the GitHub artifact digest");
  const files = readEvidenceZipEntries(archiveBytes);
  const targetShaFile = files.get("target-sha.txt");
  const playwrightFile = files.get("playwright-result.json");
  if (!targetShaFile || !playwrightFile)
    fail("ungradable: M10 Artifact is missing target-sha.txt or Playwright JSON results");
  const artifactSha = targetShaFile.toString("utf8").trim();
  if (artifactSha !== currentHeadSha)
    fail("ungradable: Artifact target-sha.txt does not match the current HEAD SHA");
  let playwright;
  try {
    playwright = JSON.parse(playwrightFile.toString("utf8"));
  } catch {
    fail("ungradable: Playwright JSON result is invalid");
  }
  const stats = playwright.stats;
  if (
    !stats ||
    !Number.isSafeInteger(stats.expected) ||
    stats.expected < 1 ||
    stats.unexpected !== 0 ||
    stats.flaky !== 0 ||
    stats.skipped !== 0
  )
    fail(
      "ungradable: Playwright JSON results contain no tests, failures, retries, skips, or malformed totals",
    );
  verifyPlaywrightJsonTests(playwright, source);
  return {
    status: "passed",
    checks: [
      {
        id: "M10-WORKFLOW",
        status: "passed",
        workflow_path: source.workflow_path,
        workflow_sha256: workflow.sha256,
      },
      {
        id: "M10-RUN",
        status: "passed",
        run_id: run.id,
        run_attempt: run.run_attempt,
        job_id: attemptJob.id,
        workflow_run_head_sha: run.head_sha,
        pull_request_head_sha: pullRequest.head.sha,
        event: run.event,
        conclusion: run.conclusion,
      },
      { id: "M10-CHECK", status: "passed", check_name: matchingChecks[0].name, check_run_id: matchingChecks[0].id },
      {
        id: "M10-ARTIFACT",
        status: "passed",
        artifact_id: artifacts[0].id,
        artifact_name: artifacts[0].name,
        digest: artifactDigest,
        target_sha: artifactSha,
      },
      {
        id: "M10-PLAYWRIGHT",
        status: "passed",
        stats: {
          expected: stats.expected,
          unexpected: stats.unexpected,
          flaky: stats.flaky,
          skipped: stats.skipped,
        },
      },
    ],
  };
}
