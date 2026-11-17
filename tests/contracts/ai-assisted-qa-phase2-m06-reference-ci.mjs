import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testRoot = "training/ai-assisted-qa-course/assessment/playwright/M06";
const configFile = "playwright.ai-assisted-qa.config.ts";
const project = "ai-assisted-qa-chromium";
const outputRoot = path.resolve("output/training/ai-assisted-qa/pr215-m06-reference");
const runs = [
  { label: "fixed", files: ["cart-cases.spec.ts"], expected: 3 },
  { label: "initial", files: ["remove-item.spec.ts", "quantity-update.spec.ts"], expected: 2 },
  { label: "repeat", files: ["remove-item.spec.ts", "quantity-update.spec.ts"], expected: 2 },
];

/** Compute a content hash for the exact checked-out reference implementation. */
function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** Reject missing, skipped, unrelated and expected-to-fail tests in a Playwright JSON report. */
export function validateReport(file, selectedFiles, count) {
  if (!fs.existsSync(file)) throw new Error("Playwright JSON report is missing");
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  const expectedRoot = path.resolve(testRoot);
  if (path.resolve(report.config?.rootDir ?? "") !== expectedRoot) {
    throw new Error("JSON report config.rootDir does not match the M06 reference directory");
  }
  const specs = [];
  function visit(suite) {
    for (const spec of suite.specs ?? []) specs.push(spec);
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);

  // Playwright JSON emits one spec entry per test, even for tests sharing a spec file.
  const foundFiles = [...new Set(specs.map((spec) => spec.file))].sort();
  const requiredFiles = [...selectedFiles].sort();
  if (JSON.stringify(foundFiles) !== JSON.stringify(requiredFiles)) {
    throw new Error("JSON report contains unexpected or missing spec files");
  }

  const tests = specs.flatMap((spec) => spec.tests ?? []);
  if (tests.length !== count) {
    throw new Error("JSON report contains " + tests.length + " tests, expected " + count);
  }
  for (const test of tests) {
    if (test.projectName !== project || test.expectedStatus !== "passed") {
      throw new Error("JSON report has wrong project or expected failure/skip");
    }
    if (test.results?.length !== 1 || test.results[0].status !== "passed") {
      throw new Error("JSON report has failed, skipped, retried or missing test results");
    }
  }
  return tests.length;
}

/** Execute all three separate reference runs and preserve evidence even after failure. */
function main() {
  if (process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:8082") {
    throw new Error("M06 reference CI requires loopback HTTP port 8082");
  }
  if (process.env.PLAYWRIGHT_SKIP_WEB_SERVER !== "true") {
    throw new Error("M06 reference CI requires the pre-started artifact web server");
  }
  if (process.env.PLAYWRIGHT_USE_PREBUILT_DIST === "true") {
    throw new Error("The course distribution flag requires a course manifest, not a CI dist");
  }
  const distIndex = path.resolve("dist/index.html");
  if (!fs.existsSync(distIndex)) throw new Error("CI automation build artifact is missing");

  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const prHeadSha = process.env.PR_HEAD_SHA;
  if (!prHeadSha || !/^[0-9a-f]{40}$/.test(prHeadSha)) {
    throw new Error("M06 reference CI requires the pull request source SHA");
  }
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== headSha) {
    throw new Error("Checkout HEAD differs from the GitHub Actions SHA");
  }

  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const sourceFiles = ["cart-cases.spec.ts", "remove-item.spec.ts", "quantity-update.spec.ts"];
  const sourceHashes = Object.fromEntries(
    sourceFiles.map((name) => [name, sha256(path.join(testRoot, name))]),
  );
  const summary = {
    checkout_head_sha: headSha,
    pr_head_sha: prHeadSha,
    config: configFile,
    project,
    test_root: testRoot,
    base_url: process.env.PLAYWRIGHT_BASE_URL,
    dist_index_sha256: sha256(distIndex),
    source_sha256: sourceHashes,
    runs: [],
  };

  for (const run of runs) {
    const directory = fs.mkdtempSync(path.join(outputRoot, run.label + "-"), {
      encoding: "utf8",
    });
    fs.writeFileSync(path.join(directory, "head-sha.txt"), headSha + "\n");
    fs.writeFileSync(
      path.join(directory, "spec-sha256.txt"),
      sourceFiles.map((name) => sourceHashes[name] + "  " + path.join(testRoot, name)).join("\n") +
        "\n",
    );

    const args = [
      "exec",
      "playwright",
      "test",
      ...run.files,
      "--config=" + configFile,
      "--project=" + project,
      "--retries=0",
      "--workers=1",
    ];
    const command = spawnSync("pnpm", args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        AI_QA_OUTPUT_ROOT: directory,
        PLAYWRIGHT_TEST_ROOT: testRoot,
      },
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    fs.writeFileSync(
      path.join(directory, "console.log"),
      (command.stdout ?? "") + (command.stderr ?? ""),
    );
    const exitCode = command.status ?? 1;
    fs.writeFileSync(path.join(directory, "exit-code.txt"), exitCode + "\n");
    if (command.error) {
      fs.writeFileSync(path.join(directory, "spawn-error.txt"), String(command.error) + "\n");
    }
    let count = 0;
    let validationError = null;
    try {
      count = validateReport(
        path.join(directory, "playwright-result.json"),
        run.files,
        run.expected,
      );
    } catch (error) {
      validationError = String(error);
    }
    const status = exitCode === 0 && validationError === null ? "PASS" : "FAIL";
    summary.runs.push({
      label: run.label,
      directory: path.relative(process.cwd(), directory),
      expected_test_count: run.expected,
      observed_test_count: count,
      selected_files: run.files,
      exit_code: exitCode,
      status,
      validation_error: validationError,
    });
    console.log("M06 reference " + run.label + ": " + status + " (" + count + " tests)");
    if (validationError) console.error(validationError);
  }

  const resultPath = path.join(outputRoot, "summary.json");
  fs.writeFileSync(resultPath, JSON.stringify(summary, null, 2) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = summary.runs.map(
      (run) =>
        "| " +
        run.label +
        " | " +
        run.observed_test_count +
        "/" +
        run.expected_test_count +
        " | " +
        run.exit_code +
        " | " +
        run.status +
        " |",
    );
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        "### PR #215 M06 reference Chromium",
        "",
        "Checkout merge HEAD: " + headSha,
        "Pull request source HEAD: " + prHeadSha,
        "",
        "| Run | Tests | Exit code | Result |",
        "| --- | --- | --- | --- |",
        ...rows,
        "",
      ].join("\n"),
    );
  }
  if (summary.runs.some((run) => run.status !== "PASS")) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
