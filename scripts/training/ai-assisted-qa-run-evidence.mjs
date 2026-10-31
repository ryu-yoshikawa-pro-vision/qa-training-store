import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoSecretText, sha256 } from "./ai-assisted-qa-assessment-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MODULE_SPECS = Object.freeze({
  M05: new Set(["product-link.spec.ts"]),
  M06: new Set(["cart-cases.spec.ts", "new-case.spec.ts"]),
  M07: new Set(["repaired-assertion.spec.ts", "maintenance.spec.ts"]),
});
const LABELS = new Set(["main", "initial", "repeat", "before", "after"]);
const MAX_EVIDENCE_BYTES = 256 * 1024;
const SOURCE_SHA = /^[a-f0-9]{40}$/;
const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message) {
  throw new Error(message);
}

function comparableMarkdown(value) {
  return value.replace(/^\ufeff/, "").replace(/\r\n?/g, "\n");
}

function lstatRegularFile(filePath, description) {
  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch {
    fail(description + " is missing");
  }
  if (stat.isSymbolicLink() || !stat.isFile()) fail(description + " must be a regular file");
  if (stat.size < 1 || stat.size > MAX_EVIDENCE_BYTES)
    fail(description + " size is outside the allowed bounds");
  return fs.readFileSync(filePath);
}

function assertSafeDirectory(root, target, { create = false } = {}) {
  const absoluteRoot = path.resolve(root);
  const absoluteTarget = path.resolve(target);
  if (
    !fs.existsSync(absoluteRoot) ||
    fs.lstatSync(absoluteRoot).isSymbolicLink() ||
    !fs.statSync(absoluteRoot).isDirectory()
  )
    fail("course run evidence root must be an existing regular directory");
  const relative = path.relative(absoluteRoot, absoluteTarget);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  )
    fail("course run evidence path escaped workspace");
  let current = absoluteRoot;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
      fail("course run evidence path contains a symlink");
    if (create && !fs.existsSync(current)) fs.mkdirSync(current, { mode: 0o700 });
    if (fs.existsSync(current) && !fs.statSync(current).isDirectory())
      fail("course run evidence path contains a non-directory");
  }
  return absoluteTarget;
}

function reportSpecs(suites, root, targetSpec, outputRoot) {
  const found = [];
  const attachments = [];
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) {
      const absoluteSpec = path.resolve(root, spec.file ?? "");
      if (absoluteSpec !== targetSpec) continue;
      for (const test of spec.tests ?? []) {
        const results = Array.isArray(test.results) ? test.results : [];
        const final = results.at(-1);
        if (!final || typeof final.status !== "string") continue;
        found.push({
          title: typeof spec.title === "string" ? spec.title : "",
          status: final.status,
          expected_status: typeof test.expectedStatus === "string" ? test.expectedStatus : "passed",
        });
        for (const attachment of final.attachments ?? []) {
          if (typeof attachment?.path !== "string") continue;
          const filePath = path.isAbsolute(attachment.path)
            ? path.resolve(attachment.path)
            : path.resolve(root, attachment.path);
          const relative = path.relative(outputRoot, filePath);
          if (
            relative === ".." ||
            relative.startsWith(".." + path.sep) ||
            path.isAbsolute(relative)
          )
            fail("Playwright attachment escaped its run output directory");
          if (path.dirname(filePath) !== outputRoot)
            assertSafeDirectory(outputRoot, path.dirname(filePath));
          const stat = fs.lstatSync(filePath);
          if (
            stat.isSymbolicLink() ||
            !stat.isFile() ||
            stat.size < 1 ||
            stat.size > 64 * 1024 * 1024
          )
            fail("Playwright attachment is missing, unsafe, or too large");
          attachments.push({
            path: relative.split(path.sep).join("/"),
            size: stat.size,
            name: typeof attachment.name === "string" ? attachment.name : "",
            content_type: typeof attachment.contentType === "string" ? attachment.contentType : "",
          });
        }
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of suites ?? []) visit(suite);
  return { tests: found, attachments };
}

function relativeWorkspacePath(filePath, root = ROOT) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function executeSpec({ moduleId, specName, label, root = ROOT, sourceSha }) {
  if (!SOURCE_SHA.test(sourceSha ?? ""))
    fail("course:run requires the verified distribution source SHA");
  const workspaceRoot = path.join(root, "workspace");
  const moduleRoot = assertSafeDirectory(workspaceRoot, path.join(workspaceRoot, moduleId));
  const specPath = path.join(moduleRoot, specName);
  const specBytes = lstatRegularFile(specPath, "learner Playwright spec");
  const runId = randomUUID();
  const runDirectory = assertSafeDirectory(
    workspaceRoot,
    path.join(moduleRoot, "evidence", "runs", runId),
    { create: true },
  );
  const reportPath = path.join(runDirectory, "playwright-result.json");
  const snapshotPath = path.join(runDirectory, "spec-snapshot.ts");
  const receiptPath = path.join(runDirectory, "run-evidence.json");
  fs.writeFileSync(snapshotPath, specBytes, { flag: "wx", mode: 0o600 });
  const sourceSha256 = sha256(specBytes);
  const relativeSpec = path.relative(moduleRoot, specPath).split(path.sep).join("/");
  const startedAt = new Date().toISOString();
  const commandArgs = [
    "pnpm",
    "exec",
    "playwright",
    "test",
    relativeSpec,
    "--config=playwright.ai-assisted-qa.config.ts",
    "--project=ai-assisted-qa-chromium",
    "--retries=0",
  ];
  const environment = {
    ...process.env,
    PLAYWRIGHT_TEST_ROOT: moduleRoot,
    AI_QA_OUTPUT_ROOT: runDirectory,
  };
  const launcher = process.platform === "win32" ? "corepack.cmd" : "corepack";
  const result = spawnSync(launcher, commandArgs, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024,
    shell: process.platform === "win32",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const finishedAt = new Date().toISOString();
  const currentSpec = lstatRegularFile(specPath, "learner Playwright spec after execution");
  const reportBytes = fs.existsSync(reportPath)
    ? lstatRegularFile(reportPath, "Playwright JSON report")
    : null;
  let report;
  let extracted = { tests: [], attachments: [] };
  if (reportBytes) {
    const reportText = reportBytes.toString("utf8");
    assertNoSecretText(reportText, "Playwright JSON report");
    report = JSON.parse(reportText);
    extracted = reportSpecs(report.suites, root, specPath, runDirectory);
  }
  const exitCode = result.error ? 1 : (result.status ?? 1);
  const environmentFailure =
    result.error ||
    /Executable doesn't exist|browser(?:s)?[^\n]*(?:not installed|missing)|ERR_CONNECTION_REFUSED|ECONNREFUSED|webServer.*failed|Timed out waiting .*webServer|EADDRINUSE/i.test(
      String(result.stdout ?? "") + "\n" + String(result.stderr ?? ""),
    );
  const outcome = environmentFailure
    ? "blocked"
    : exitCode === 0 &&
        extracted.tests.length > 0 &&
        extracted.tests.every((test) => test.status === "passed")
      ? "passed"
      : extracted.tests.some((test) => test.status === "failed")
        ? "failed"
        : "ungradable";
  const receipt = {
    schema_version: 1,
    kind: "ai-assisted-qa-playwright-run",
    producer: "course:run",
    run_id: runId,
    module_id: moduleId,
    source_sha: sourceSha,
    spec_path: relativeWorkspacePath(specPath, root),
    spec_sha256: sourceSha256,
    source_snapshot_path: relativeWorkspacePath(snapshotPath, root),
    source_snapshot_sha256: sha256(
      lstatRegularFile(snapshotPath, "saved Playwright spec snapshot"),
    ),
    label,
    project: "ai-assisted-qa-chromium",
    command: commandArgs.join(" "),
    started_at: startedAt,
    finished_at: finishedAt,
    exit_code: exitCode,
    outcome,
    report_path: relativeWorkspacePath(reportPath, root),
    report_sha256: reportBytes ? sha256(reportBytes) : null,
    tests: extracted.tests,
    attachments: extracted.attachments,
    spec_unchanged_during_run: sha256(currentSpec) === sourceSha256,
    environment_error: environmentFailure
      ? "Playwright could not run in the configured environment"
      : null,
  };
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    JSON.stringify(
      {
        run_id: runId,
        module_id: moduleId,
        label,
        outcome,
        spec_sha256: sourceSha256,
        evidence: relativeWorkspacePath(receiptPath, root),
      },
      null,
      2,
    ),
  );
  if (outcome !== "passed") process.exitCode = environmentFailure ? 2 : 1;
  return { receipt, receiptPath };
}

export function runAiAssistedQaSpecCli(
  argv = process.argv.slice(2),
  { root = ROOT, sourceSha } = {},
) {
  const moduleId = argv[0];
  const specName = argv[1];
  const labelIndex = argv.indexOf("--label");
  const label = labelIndex >= 0 ? argv[labelIndex + 1] : undefined;
  if (
    argv.length !== 4 ||
    labelIndex !== 2 ||
    !Object.hasOwn(MODULE_SPECS, moduleId) ||
    !MODULE_SPECS[moduleId].has(specName) ||
    !LABELS.has(label)
  )
    fail(
      "Usage: pnpm course:run M05|M06|M07 <allowed-spec.spec.ts> --label main|initial|repeat|before|after",
    );
  return executeSpec({ moduleId, specName, label, root, sourceSha });
}

function readRunRecord(workspaceRoot, moduleId, relativePath, sourceSha) {
  const root = path.dirname(workspaceRoot);
  const absolute = path.resolve(workspaceRoot, relativePath.replace(/^workspace\//, ""));
  const relative = path.relative(workspaceRoot, absolute);
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
    fail("course run evidence path escaped workspace");
  const bytes = lstatRegularFile(absolute, "course Playwright run evidence");
  const record = JSON.parse(bytes.toString("utf8"));
  if (
    record.kind !== "ai-assisted-qa-playwright-run" ||
    record.producer !== "course:run" ||
    record.schema_version !== 1 ||
    record.module_id !== moduleId ||
    !RUN_ID.test(record.run_id ?? "")
  )
    fail("course Playwright run evidence identity or schema is invalid");
  if (!SOURCE_SHA.test(record.source_sha ?? "") || record.source_sha !== sourceSha) return null;
  if (!MODULE_SPECS[moduleId]?.has(path.basename(record.spec_path)))
    fail("course Playwright run evidence spec is not allowed for its module");
  const runDirectory = path.join(workspaceRoot, moduleId, "evidence", "runs", record.run_id);
  if (path.dirname(absolute) !== runDirectory)
    fail("course Playwright run evidence ID does not match its directory");
  assertSafeDirectory(workspaceRoot, runDirectory);
  if (
    path.resolve(workspaceRoot, record.spec_path.replace(/^workspace\//, "")) !==
    path.join(workspaceRoot, moduleId, path.basename(record.spec_path))
  )
    fail("course Playwright run evidence points to a different learner spec");
  const specPath = path.resolve(workspaceRoot, record.spec_path.replace(/^workspace\//, ""));
  const snapshotPath = path.resolve(
    workspaceRoot,
    record.source_snapshot_path.replace(/^workspace\//, ""),
  );
  const reportPath = path.resolve(workspaceRoot, record.report_path.replace(/^workspace\//, ""));
  if (
    path.dirname(snapshotPath) !== runDirectory ||
    path.basename(snapshotPath) !== "spec-snapshot.ts" ||
    path.dirname(reportPath) !== runDirectory ||
    path.basename(reportPath) !== "playwright-result.json"
  )
    fail("course Playwright run evidence files are outside their run directory");
  for (const [filePath, field] of [
    [snapshotPath, "source_snapshot_sha256"],
    [reportPath, "report_sha256"],
  ]) {
    const fileBytes = lstatRegularFile(filePath, "course Playwright evidence file");
    if (sha256(fileBytes) !== record[field])
      fail("course Playwright evidence hash does not match its file");
  }
  const specBytes = lstatRegularFile(specPath, "learner Playwright spec");
  const snapshotBytes = lstatRegularFile(snapshotPath, "course Playwright source snapshot");
  if (sha256(snapshotBytes) !== record.spec_sha256)
    fail("course Playwright source snapshot hash is invalid");
  const reportBytes = lstatRegularFile(reportPath, "Playwright JSON report");
  const reportText = reportBytes.toString("utf8");
  assertNoSecretText(reportText, "Playwright JSON report");
  const report = JSON.parse(reportText);
  const outputRoot = path.dirname(reportPath);
  const extracted = reportSpecs(report.suites, root, specPath, outputRoot);
  if (JSON.stringify(extracted.tests) !== JSON.stringify(record.tests))
    fail("course Playwright run evidence results do not match its JSON report");
  if (JSON.stringify(extracted.attachments) !== JSON.stringify(record.attachments))
    fail("course Playwright run evidence attachments do not match its JSON report");
  if (record.spec_unchanged_during_run !== true && record.outcome !== "blocked")
    fail("learner Playwright spec changed while the run was executing");
  if (
    !Number.isInteger(record.exit_code) ||
    !["main", "initial", "repeat", "before", "after"].includes(record.label)
  )
    fail("course Playwright run evidence result fields are invalid");
  const startedAt = Date.parse(record.started_at);
  const finishedAt = Date.parse(record.finished_at);
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt) || finishedAt < startedAt)
    fail("course Playwright run evidence timestamps are invalid");
  if (
    record.project !== "ai-assisted-qa-chromium" ||
    record.command !==
      [
        "pnpm",
        "exec",
        "playwright",
        "test",
        path.basename(record.spec_path),
        "--config=playwright.ai-assisted-qa.config.ts",
        "--project=ai-assisted-qa-chromium",
        "--retries=0",
      ].join(" ")
  )
    fail("course Playwright run evidence command or project is invalid");
  return {
    record,
    current_spec_sha256: sha256(specBytes),
    paths: [
      relativeWorkspacePath(absolute, root),
      relativeWorkspacePath(reportPath, root),
      relativeWorkspacePath(snapshotPath, root),
    ],
  };
}

function runPassed(record, minimumTests) {
  return (
    record.outcome === "passed" &&
    record.exit_code === 0 &&
    record.tests.length >= minimumTests &&
    record.tests.every((test) => test.status === "passed")
  );
}

export function verifyM03SkillRuntimeEvidence({
  workspaceRoot,
  scoring,
  runtimeContractPath,
  runtimeContractSha256,
  externalSkillSource,
  pythonCommand = process.platform === "win32" ? "py" : "python3",
  pythonArgs = process.platform === "win32" ? ["-3.11"] : [],
  spawn = spawnSync,
}) {
  const contract = scoring?.evaluation_policy?.execution_evidence;
  const verifications = contract?.required_verifications;
  if (
    contract?.schema_version !== 1 ||
    contract?.kind !== "pinned-skill-runtime-contract" ||
    contract?.source_path !== "skills/test-condition-design/scripts/runtime_contract.py" ||
    !Array.isArray(verifications) ||
    verifications.length !== 2 ||
    !Array.isArray(externalSkillSource) ||
    externalSkillSource.length !== 2
  )
    return {
      status: "ungradable",
      reasons: ["M03 pinned Skill runtime contract is missing or invalid"],
      checks: [],
      evidence: [],
    };
  const root = path.dirname(workspaceRoot);
  const helperPath = path.resolve(runtimeContractPath);
  const helperRelative = path.relative(root, helperPath);
  if (
    helperRelative === ".." ||
    helperRelative.startsWith(".." + path.sep) ||
    path.isAbsolute(helperRelative)
  )
    return {
      status: "ungradable",
      reasons: ["M03 pinned runtime helper escaped the verified course root"],
      checks: [],
      evidence: [],
    };
  let helperBytes;
  try {
    const helperStat = fs.lstatSync(helperPath);
    if (
      helperStat.isSymbolicLink() ||
      !helperStat.isFile() ||
      helperStat.size < 1 ||
      helperStat.size > 1024 * 1024
    )
      fail("fixed Skill runtime verifier is missing, unsafe, or too large");
    helperBytes = fs.readFileSync(helperPath);
    if (sha256(helperBytes) !== runtimeContractSha256)
      fail("M03 fixed Skill runtime verifier SHA-256 does not match the pinned distribution");
  } catch (error) {
    return {
      status: "blocked",
      reasons: [error instanceof Error ? error.message : String(error)],
      checks: [],
      evidence: [],
    };
  }
  const expectedSource = externalSkillSource[0] + "@" + externalSkillSource[1];
  const expected = new Map([
    [
      "test-condition-design",
      {
        evidence: "workspace/M03/condition-runtime-evidence.json",
        artifact: "workspace/M03/condition-design.md",
      },
    ],
    [
      "test-case-design",
      { evidence: "workspace/M03/case-runtime-evidence.json", artifact: "workspace/M03/cases.md" },
    ],
  ]);
  const actual = new Map();
  for (const item of verifications) {
    if (
      !item ||
      !expected.has(item.skill) ||
      expected.get(item.skill).evidence !== item.evidence_path ||
      expected.get(item.skill).artifact !== item.artifact_path ||
      actual.has(item.skill)
    )
      return {
        status: "ungradable",
        reasons: ["M03 scoring contract has invalid Skill runtime evidence paths"],
        checks: [],
        evidence: [],
      };
    actual.set(item.skill, item);
  }
  if (actual.size !== expected.size)
    return {
      status: "ungradable",
      reasons: ["M03 scoring contract does not require both pinned Skill runtime verifications"],
      checks: [],
      evidence: [],
    };
  const version = spawn(pythonCommand, [...pythonArgs, "--version"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const versionText = String(version.stdout ?? "") + String(version.stderr ?? "");
  if (version.error)
    return {
      status: "blocked",
      reasons: ["Python 3.11 could not be started for pinned Skill runtime verification"],
      checks: [],
      evidence: [],
    };
  if (version.status !== 0 || !/^Python 3\.11\.\d+\s*$/m.test(versionText.trim()))
    return {
      status: "blocked",
      reasons: ["M03 pinned Skill runtime evidence requires Python 3.11"],
      checks: [],
      evidence: [],
    };
  const checks = [];
  const evidence = [];
  for (const skill of ["test-condition-design", "test-case-design"]) {
    const required = actual.get(skill);
    try {
      const requestPath = path.resolve(
        workspaceRoot,
        required.evidence_path.replace(/^workspace\//, ""),
      );
      const artifactPath = path.resolve(
        workspaceRoot,
        required.artifact_path.replace(/^workspace\//, ""),
      );
      const requestBytes = lstatRegularFile(requestPath, "M03 Skill runtime request");
      const requestText = requestBytes.toString("utf8");
      if (requestText.includes("\ufffd") || requestText.includes("\0"))
        fail("M03 Skill runtime request is not valid UTF-8 JSON");
      assertNoSecretText(requestText, "M03 Skill runtime request");
      const request = JSON.parse(requestText);
      if (
        request.operation !== "verify_runtime_evidence" ||
        request.skill !== skill ||
        typeof request.artifact_markdown !== "string" ||
        comparableMarkdown(request.artifact_markdown) !==
          comparableMarkdown(
            lstatRegularFile(artifactPath, "M03 Skill output artifact").toString("utf8"),
          )
      )
        fail("M03 Skill runtime request does not match its current pinned Skill output artifact");
      const result = spawn(pythonCommand, [...pythonArgs, helperPath], {
        cwd: root,
        input: requestBytes,
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
      if (result.error) {
        checks.push({
          id: "M03-" + skill + "-RUNTIME-EVIDENCE",
          status: "blocked",
          reason: "fixed Skill runtime verifier could not start",
        });
        continue;
      }
      const outputText = String(result.stdout ?? "").trim();
      let verified;
      try {
        verified = JSON.parse(outputText);
      } catch {
        checks.push({
          id: "M03-" + skill + "-RUNTIME-EVIDENCE",
          status: "ungradable",
          reason: "fixed Skill runtime verifier returned invalid JSON",
        });
        continue;
      }
      const emptyFields = [
        "issues",
        "missing",
        "extra",
        "incomplete_pairs",
        "duplicates",
        "missing_entities",
        "extra_entities",
        "duplicate_entities",
      ];
      const valid =
        result.status === 0 &&
        verified.valid === true &&
        emptyFields.every(
          (field) => Array.isArray(verified[field]) && verified[field].length === 0,
        ) &&
        Array.isArray(verified.expected_runtime_units) &&
        verified.expected_runtime_units.length > 0 &&
        Array.isArray(verified.actual_runtime_units) &&
        verified.actual_runtime_units.length > 0;
      checks.push({
        id: "M03-" + skill + "-RUNTIME-EVIDENCE",
        status: valid ? "passed" : "ungradable",
        verifier_source: contract.source_path,
        verifier_sha256: runtimeContractSha256,
        skill_source: expectedSource,
        request_sha256: sha256(requestBytes),
        artifact_sha256: sha256(Buffer.from(request.artifact_markdown, "utf8")),
        expected_runtime_units: verified.expected_runtime_units?.length ?? 0,
        actual_runtime_units: verified.actual_runtime_units?.length ?? 0,
        issue_count: Array.isArray(verified.issues) ? verified.issues.length : null,
      });
      evidence.push(required.evidence_path);
    } catch (error) {
      checks.push({
        id: "M03-" + skill + "-RUNTIME-EVIDENCE",
        status: "ungradable",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    status: checks.some((check) => check.status === "blocked")
      ? "blocked"
      : checks.length === 2 && checks.every((check) => check.status === "passed")
        ? "passed"
        : "ungradable",
    checks,
    evidence,
  };
}

export function verifyModuleRunEvidence({ workspaceRoot, moduleId, scoring, sourceSha }) {
  if (!Object.hasOwn(MODULE_SPECS, moduleId)) return { status: "passed", checks: [], evidence: [] };
  if (!SOURCE_SHA.test(sourceSha ?? ""))
    return {
      status: "ungradable",
      reasons: [moduleId + " verified distribution source SHA is missing or invalid"],
      checks: [],
      evidence: [],
    };
  const contract = scoring?.evaluation_policy?.execution_evidence;
  const requiredRuns = contract?.required_runs;
  if (
    contract?.schema_version !== 1 ||
    contract?.kind !== "playwright-run-record" ||
    !Array.isArray(requiredRuns) ||
    requiredRuns.length === 0 ||
    requiredRuns.some(
      (run) =>
        !MODULE_SPECS[moduleId].has(run?.spec) ||
        !LABELS.has(run?.label) ||
        !Number.isInteger(run?.minimum_tests) ||
        run.minimum_tests < 1 ||
        (run?.require_trace !== undefined && typeof run.require_trace !== "boolean") ||
        !["passed", "failed"].includes(run?.expected_outcome),
    )
  )
    return {
      status: "ungradable",
      reasons: [moduleId + " pinned scoring contract has no valid Playwright run requirements"],
      checks: [],
      evidence: [],
    };
  const uniqueRequirements = new Set(requiredRuns.map((run) => run.spec + "|" + run.label));
  if (uniqueRequirements.size !== requiredRuns.length)
    return {
      status: "ungradable",
      reasons: [moduleId + " scoring contract duplicates a Playwright run label"],
      checks: [],
      evidence: [],
    };
  const root = path.dirname(workspaceRoot);
  const runRoot = path.join(workspaceRoot, moduleId, "evidence", "runs");
  if (!fs.existsSync(runRoot))
    return {
      status: "ungradable",
      reasons: [moduleId + " Playwright run evidence is missing"],
      checks: requiredRuns.map((run) => ({
        id: moduleId + "-RUN-" + run.spec + "-" + run.label,
        status: "ungradable",
        reason: "required Playwright run is missing",
      })),
      evidence: [],
    };
  if (fs.lstatSync(runRoot).isSymbolicLink() || !fs.statSync(runRoot).isDirectory())
    return {
      status: "ungradable",
      reasons: [moduleId + " Playwright evidence path is unsafe"],
      checks: [],
      evidence: [],
    };
  try {
    const records = [];
    for (const runId of fs.readdirSync(runRoot)) {
      const runDirectory = path.join(runRoot, runId);
      if (fs.lstatSync(runDirectory).isSymbolicLink() || !fs.statSync(runDirectory).isDirectory())
        fail("course Playwright run folder is unsafe");
      const receiptPath = path.join(runDirectory, "run-evidence.json");
      if (!fs.existsSync(receiptPath)) continue;
      const verified = readRunRecord(
        workspaceRoot,
        moduleId,
        relativeWorkspacePath(receiptPath, root),
        sourceSha,
      );
      if (verified) records.push(verified);
    }
    const byKey = new Map();
    for (const verified of records) {
      const key = verified.record.spec_path + "|" + verified.record.label;
      const prior = byKey.get(key);
      if (
        !prior ||
        Date.parse(verified.record.started_at) > Date.parse(prior.record.started_at) ||
        (Date.parse(verified.record.started_at) === Date.parse(prior.record.started_at) &&
          verified.record.run_id.localeCompare(prior.record.run_id) > 0)
      )
        byKey.set(key, verified);
    }
    const checks = [];
    const evidence = [];
    for (const requirement of requiredRuns) {
      const key = "workspace/" + moduleId + "/" + requirement.spec + "|" + requirement.label;
      const verified = byKey.get(key);
      if (!verified) {
        checks.push({
          id: moduleId + "-RUN-" + requirement.spec + "-" + requirement.label,
          status: "ungradable",
          reason: "required Playwright run is missing",
        });
        continue;
      }
      const record = verified.record;
      const successful =
        requirement.expected_outcome === "passed"
          ? runPassed(record, requirement.minimum_tests) &&
            verified.current_spec_sha256 === record.spec_sha256
          : record.outcome === "failed" &&
            record.exit_code !== 0 &&
            record.tests.length >= requirement.minimum_tests &&
            record.tests.some((test) => test.status === "failed");
      const tracePresent =
        requirement.require_trace !== true ||
        record.attachments.some((attachment) => attachment.name.toLowerCase() === "trace");
      checks.push({
        id: moduleId + "-RUN-" + requirement.spec + "-" + requirement.label,
        status: successful ? "passed" : record.outcome === "blocked" ? "blocked" : "ungradable",
        run_id: record.run_id,
        spec_sha256: record.spec_sha256,
        outcome: record.outcome,
        test_count: record.tests.length,
        evidence: verified.paths,
      });
      if (!tracePresent) checks[checks.length - 1].status = "ungradable";
      evidence.push(...verified.paths);
    }
    for (const requirement of requiredRuns) {
      if (requirement.label !== "before") continue;
      const after = byKey.get("workspace/" + moduleId + "/" + requirement.spec + "|after");
      const before = byKey.get("workspace/" + moduleId + "/" + requirement.spec + "|before");
      if (!before || !after) continue;
      const changed = before.record.spec_sha256 !== after.record.spec_sha256;
      const ordered = Date.parse(after.record.started_at) > Date.parse(before.record.finished_at);
      checks.push({
        id: moduleId + "-BEFORE-AFTER-" + requirement.spec,
        status: changed && ordered ? "passed" : "ungradable",
        before_run_id: before.record.run_id,
        after_run_id: after.record.run_id,
        code_changed: changed,
        runs_are_separate_and_ordered: ordered,
      });
    }
    const statuses = checks.map((check) => check.status);
    return {
      status: statuses.includes("blocked")
        ? "blocked"
        : statuses.includes("ungradable")
          ? "ungradable"
          : "passed",
      checks,
      evidence: [...new Set(evidence)],
    };
  } catch (error) {
    return {
      status: "ungradable",
      reasons: [error instanceof Error ? error.message : String(error)],
      checks: [],
      evidence: [],
    };
  }
}
