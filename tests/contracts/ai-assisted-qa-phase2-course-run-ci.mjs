import { Buffer } from "node:buffer";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { verifyModuleRunEvidence } from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const sourceRoot = process.cwd();
const targetRoot = process.argv[2];
const head = process.env.PR_HEAD_SHA;
const outputRoot = path.join(
  sourceRoot,
  "output/training/ai-assisted-qa/pr199-course-run-evidence",
);

function fail(message) {
  throw new Error(message);
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readPinned(relativePath) {
  const disk = fs.readFileSync(path.join(sourceRoot, relativePath));
  const pinned = execFileSync("git", ["show", "HEAD:" + relativePath], {
    cwd: sourceRoot,
    maxBuffer: 1024 * 1024,
  });
  if (!disk.equals(pinned)) fail("reference is not the checked-out Git blob: " + relativePath);
  return disk.toString("utf8");
}

function forWorkspace(reference) {
  const expression = /from "(\.\.\/)+training\/playwright\/support\/reset-scenario"/g;
  const matches = [...reference.matchAll(expression)];
  if (matches.length !== 1) fail("reference does not contain exactly one tracked Reset import");
  return reference.replace(expression, 'from "../../training/playwright/support/reset-scenario"');
}

function testBodies(relativePath) {
  const reference = readPinned(relativePath);
  const first = reference.indexOf("\ntest(");
  if (first < 0) fail("reference has no standalone Playwright test: " + relativePath);
  return reference.slice(first + 1).trimEnd();
}

function writeLearnerSpec(moduleId, specName, source) {
  const destination = path.join(targetRoot, "workspace", moduleId, specName);
  const previous = fs.lstatSync(destination);
  if (!previous.isFile() || previous.isSymbolicLink())
    fail("learner exercise target is not a regular file: " + specName);
  fs.writeFileSync(destination, source, { mode: 0o600 });
  return hash(Buffer.from(source));
}

function command(args, expectedExit = 0) {
  const result = spawnSync("pnpm", args, {
    cwd: targetRoot,
    env: { ...process.env, CI: "true" },
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== expectedExit) {
    fail(
      "pnpm " +
        args.join(" ") +
        " exited " +
        String(result.status) +
        ": " +
        String(result.stderr ?? "").slice(-1500),
    );
  }
}

function run(moduleId, specName, label, expectedOutcome, minimumTests) {
  const directory = path.join(targetRoot, "workspace", moduleId, "evidence", "runs");
  const before = new Set(fs.existsSync(directory) ? fs.readdirSync(directory) : []);
  const expectedExit = expectedOutcome === "failed" ? 1 : 0;
  command(["course:run", moduleId, specName, "--label", label], expectedExit);
  const added = fs.readdirSync(directory).filter((name) => !before.has(name));
  if (added.length !== 1) fail("course:run did not preserve one distinct Run directory");
  const saved = path.join(directory, added[0]);
  if (fs.lstatSync(saved).isSymbolicLink()) fail("run directory is a symlink");
  const receiptBytes = fs.readFileSync(path.join(saved, "run-evidence.json"));
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  const specBytes = fs.readFileSync(path.join(saved, "spec-snapshot.ts"));
  const reportBytes = fs.readFileSync(path.join(saved, "playwright-result.json"));
  if (
    receipt.producer !== "course:run" ||
    receipt.run_id !== added[0] ||
    receipt.module_id !== moduleId ||
    receipt.label !== label ||
    receipt.source_sha !== head ||
    receipt.spec_sha256 !== hash(specBytes) ||
    receipt.source_snapshot_sha256 !== hash(specBytes) ||
    receipt.report_sha256 !== hash(reportBytes) ||
    receipt.outcome !== expectedOutcome ||
    receipt.exit_code !== expectedExit ||
    receipt.spec_unchanged_during_run !== true ||
    receipt.tests.length < minimumTests
  )
    fail(
      "course:run receipt, snapshot, report, result, or test count mismatch: " +
        moduleId +
        "/" +
        label,
    );
  return {
    module_id: moduleId,
    spec: specName,
    label,
    run_id: receipt.run_id,
    outcome: receipt.outcome,
    exit_code: receipt.exit_code,
    test_count: receipt.tests.length,
    source_sha: receipt.source_sha,
    spec_sha256: receipt.spec_sha256,
    source_snapshot_sha256: receipt.source_snapshot_sha256,
    report_sha256: receipt.report_sha256,
    receipt_sha256: hash(receiptBytes),
    attachment_count: receipt.attachments.length,
  };
}

function verify(moduleId) {
  const scoring = JSON.parse(
    readPinned("training/ai-assisted-qa-course/assessment/scoring-tests/" + moduleId + ".json"),
  );
  const result = verifyModuleRunEvidence({
    workspaceRoot: path.join(targetRoot, "workspace"),
    moduleId,
    scoring,
    sourceSha: head,
  });
  if (result.status !== "passed" || result.checks.some((check) => check.status !== "passed"))
    fail(
      moduleId +
        " formal Run verifier rejected actual receipts: " +
        JSON.stringify(result.reasons ?? result.checks),
    );
  return result.checks.map(({ id, status, run_id, spec_sha256, test_count }) => ({
    id,
    status,
    ...(run_id ? { run_id } : {}),
    ...(spec_sha256 ? { spec_sha256 } : {}),
    ...(test_count !== undefined ? { test_count } : {}),
  }));
}

function main() {
  if (
    process.env.GITHUB_ACTIONS !== "true" ||
    !/^[a-f0-9]{40}$/.test(head ?? "") ||
    !targetRoot ||
    !path.isAbsolute(targetRoot) ||
    !process.env.RUNNER_TEMP ||
    !fs.realpathSync(targetRoot).startsWith(fs.realpathSync(process.env.RUNNER_TEMP) + path.sep)
  )
    fail("the development Run harness requires an isolated GitHub Actions learner directory");
  const checkedOut = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: sourceRoot,
    encoding: "utf8",
  }).trim();
  if (checkedOut !== head) fail("the checked-out source is not the PR head");
  const distribution = JSON.parse(
    fs.readFileSync(path.join(targetRoot, ".course", "distribution-manifest.json"), "utf8"),
  );
  if (distribution.source_sha !== head)
    fail("the learner distribution source SHA is not the PR head");

  command(["course:load", "M06"]);
  command(["course:load", "M07"]);
  const m06 = "training/ai-assisted-qa-course/assessment/playwright/M06/";
  const m07 = "training/ai-assisted-qa-course/assessment/playwright/M07/";
  writeLearnerSpec(
    "M06",
    "cart-cases.spec.ts",
    forWorkspace(readPinned(m06 + "cart-cases.spec.ts")),
  );
  const newCase =
    'import { expect, test } from "@playwright/test";\n' +
    'import { resetScenario } from "../../training/playwright/support/reset-scenario";\n\n' +
    testBodies(m06 + "remove-item.spec.ts") +
    "\n\n" +
    testBodies(m06 + "quantity-update.spec.ts") +
    "\n";
  writeLearnerSpec("M06", "new-case.spec.ts", newCase);
  const runs = [
    run("M06", "cart-cases.spec.ts", "main", "passed", 3),
    run("M06", "new-case.spec.ts", "initial", "passed", 2),
    run("M06", "new-case.spec.ts", "repeat", "passed", 2),
    run("M07", "failure-assertion.spec.ts", "main", "failed", 1),
    run("M07", "repaired-assertion.spec.ts", "before", "failed", 1),
  ];

  writeLearnerSpec(
    "M07",
    "repaired-assertion.spec.ts",
    forWorkspace(readPinned(m07 + "repaired/repaired-assertion.spec.ts")),
  );
  runs.push(run("M07", "repaired-assertion.spec.ts", "after", "passed", 1));
  runs.push(run("M07", "maintenance.spec.ts", "before", "passed", 2));
  writeLearnerSpec(
    "M07",
    "maintenance.spec.ts",
    forWorkspace(readPinned(m07 + "maintenance-after/cart.spec.ts")),
  );
  runs.push(run("M07", "maintenance.spec.ts", "after", "passed", 3));

  const checks = {
    M06: verify("M06"),
    M07: verify("M07"),
  };
  const summary = {
    schema_version: 1,
    purpose:
      "development-only actual course:run contract; not learner completion or model calibration",
    head_sha: head,
    distribution_sha: distribution.source_sha,
    runs,
    verification: checks,
  };
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        head_sha: head,
        runs: runs.map(({ module_id, label, outcome, test_count }) => ({
          module_id,
          label,
          outcome,
          test_count,
        })),
        verified_checks: Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, v.length])),
        completed_reference_sources_in_artifact: false,
      },
      null,
      2,
    ),
  );
}

main();
