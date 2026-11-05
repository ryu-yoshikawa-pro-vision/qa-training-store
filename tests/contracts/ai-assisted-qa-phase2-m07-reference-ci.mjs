import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = "ai-assisted-qa-chromium";
const configFile = "playwright.ai-assisted-qa.config.ts";
const m07Root = "training/ai-assisted-qa-course/assessment/playwright/M07";
const outputRoot = path.resolve("output/training/ai-assisted-qa/pr215-m07-reference");
const referenceCommit = "44afe46fe2d53ec4f1f7d94f671a07d9e3621c3e";
const referenceBlob = "7a488032ae98efcbcf63fd867234fd7b44ee2613";
const referenceCheckout = "reference-pr217";

/** Calculate the content SHA-256 of a checked-out source or prepared build file. */
function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** Verify that each expected test really passed once under the selected Playwright project. */
export function validateM07Report(file, root, expectedNames) {
  if (!fs.existsSync(file)) throw new Error("M07 Playwright JSON report is missing");
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  if (path.resolve(report.config?.rootDir ?? "") !== path.resolve(root)) {
    throw new Error("M07 report config.rootDir does not match the requested test directory");
  }

  const specs = [];
  function collect(suite) {
    for (const spec of suite.specs ?? []) specs.push(spec);
    for (const child of suite.suites ?? []) collect(child);
  }
  for (const suite of report.suites ?? []) collect(suite);
  if (specs.length !== expectedNames.length || specs.some((spec) => spec.file !== "cart.spec.ts")) {
    throw new Error("M07 report contains an unexpected spec or test count");
  }
  const names = specs.map((spec) => spec.title).sort();
  if (JSON.stringify(names) !== JSON.stringify([...expectedNames].sort())) {
    throw new Error("M07 report test names do not match the reference cases");
  }
  for (const spec of specs) {
    if (spec.tests?.length !== 1) throw new Error("M07 report has invalid test entries");
    const [test] = spec.tests;
    if (
      test.projectName !== project ||
      test.expectedStatus !== "passed" ||
      test.results?.length !== 1 ||
      test.results[0].status !== "passed"
    ) {
      throw new Error("M07 report has an unexpected project, status, skip or retry");
    }
  }
  if (
    report.stats?.expected !== expectedNames.length ||
    report.stats?.unexpected !== 0 ||
    report.stats?.flaky !== 0 ||
    report.stats?.skipped !== 0
  ) {
    throw new Error("M07 report stats contain an unexpected result");
  }
  return specs.length;
}

/** Verify the immutable PR #217 source and stage only its after spec for a separate run. */
function prepareAfterReference() {
  const revision = execFileSync("git", ["-C", referenceCheckout, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (revision !== referenceCommit) {
    throw new Error("PR #217 reference checkout SHA does not match the pinned revision");
  }
  const source = path.join(referenceCheckout, m07Root, "maintenance-after", "cart.spec.ts");
  const blob = execFileSync("git", ["hash-object", source], { encoding: "utf8" }).trim();
  if (blob !== referenceBlob) {
    throw new Error("PR #217 M07 after spec does not match the pinned Git blob");
  }

  // The staged file is untracked and never committed to PR #215.
  const directory = fs.mkdtempSync(path.join(m07Root, "pr217-after-"));
  const staged = path.join(directory, "cart.spec.ts");
  fs.copyFileSync(source, staged, fs.constants.COPYFILE_EXCL);
  if (sha256(staged) !== sha256(source)) {
    throw new Error("PR #217 M07 after source changed while staging");
  }
  const thirdTest = fs
    .readFileSync(staged, "utf8")
    .split('test("数量2への変更はカートを開き直しても維持される"')[1];
  if (
    !thirdTest ||
    !thirdTest.includes('page.goto("/products/product-mug")') ||
    !thirdTest.includes('page.goto("/cart")') ||
    thirdTest.includes("page.reload()")
  ) {
    throw new Error("PR #217 after test does not navigate away and return to Cart");
  }
  return { directory, source, staged, blob, revision };
}

/** Run before from PR #215 and after from a pinned, untracked copy of PR #217. */
function main() {
  if (
    process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:8082" ||
    process.env.PLAYWRIGHT_SKIP_WEB_SERVER !== "true" ||
    process.env.PLAYWRIGHT_USE_PREBUILT_DIST === "true"
  ) {
    throw new Error("M07 CI requires prestarted local Shop on HTTP port 8082");
  }
  if (!fs.existsSync("dist/index.html")) throw new Error("Automation Shop dist is missing");
  const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const prHeadSha = process.env.PR_HEAD_SHA;
  if (!prHeadSha || !/^[0-9a-f]{40}$/.test(prHeadSha)) {
    throw new Error("PR #215 source SHA is missing or invalid");
  }
  if (process.env.GITHUB_SHA && checkoutSha !== process.env.GITHUB_SHA) {
    throw new Error("GitHub Actions merge checkout SHA mismatch");
  }

  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const before = path.join(m07Root, "maintenance-before");
  const after = prepareAfterReference();
  const cases = [
    {
      label: "before",
      root: before,
      expectedNames: ["追加したマグは数量1", "数量を2へ変更できる"],
    },
    {
      label: "after-pr217",
      root: after.directory,
      expectedNames: [
        "追加したマグは数量1",
        "数量を2へ変更できる",
        "数量2への変更はカートを開き直しても維持される",
      ],
    },
  ];
  const summary = {
    pr215_source_head_sha: prHeadSha,
    pr215_checkout_merge_sha: checkoutSha,
    pr217_reference_head_sha: after.revision,
    pr217_reference_blob_sha: after.blob,
    pr217_integrated_into_pr215: false,
    base_url: process.env.PLAYWRIGHT_BASE_URL,
    project,
    config: configFile,
    shop_index_sha256: sha256("dist/index.html"),
    before_source_sha256: sha256(path.join(before, "cart.spec.ts")),
    after_pr217_source_sha256: sha256(after.source),
    runs: [],
  };

  for (const entry of cases) {
    const directory = fs.mkdtempSync(path.join(outputRoot, entry.label + "-"));
    const source = path.join(entry.root, "cart.spec.ts");
    fs.writeFileSync(
      path.join(directory, "spec-sha256.txt"),
      sha256(source) + "  " + source + "\n",
    );
    fs.writeFileSync(path.join(directory, "checkout-sha.txt"), checkoutSha + "\n");
    fs.writeFileSync(path.join(directory, "source-pr-sha.txt"), prHeadSha + "\n");
    const args = [
      "exec",
      "playwright",
      "test",
      "cart.spec.ts",
      "--config=" + configFile,
      "--project=" + project,
      "--retries=0",
      "--workers=1",
    ];
    const result = spawnSync("pnpm", args, {
      cwd: process.cwd(),
      env: { ...process.env, AI_QA_OUTPUT_ROOT: directory, PLAYWRIGHT_TEST_ROOT: entry.root },
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    fs.writeFileSync(
      path.join(directory, "console.log"),
      (result.stdout ?? "") + (result.stderr ?? ""),
    );
    const exitCode = result.status ?? 1;
    fs.writeFileSync(path.join(directory, "exit-code.txt"), exitCode + "\n");
    if (result.error) {
      fs.writeFileSync(path.join(directory, "spawn-error.txt"), String(result.error) + "\n");
    }
    let count = 0;
    let validationError = null;
    try {
      count = validateM07Report(
        path.join(directory, "playwright-result.json"),
        entry.root,
        entry.expectedNames,
      );
    } catch (error) {
      validationError = String(error);
    }
    const status = exitCode === 0 && validationError === null ? "PASS" : "FAIL";
    summary.runs.push({
      label: entry.label,
      source_root: entry.root,
      output_dir: path.relative(process.cwd(), directory),
      expected_test_count: entry.expectedNames.length,
      observed_test_count: count,
      exit_code: exitCode,
      status,
      validation_error: validationError,
    });
    console.log("M07 reference " + entry.label + ": " + status + " (" + count + " tests)");
    if (validationError) console.error(validationError);
  }
  fs.writeFileSync(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        "### PR #215 M07 before / pinned PR #217 after",
        "",
        "This is separate-source verification, **not** integration of PR #217.",
        "",
        "| Run | Tests | Result |",
        "| --- | --- | --- |",
        ...summary.runs.map(
          (run) =>
            "| " +
            run.label +
            " | " +
            run.observed_test_count +
            "/" +
            run.expected_test_count +
            " | " +
            run.status +
            " |",
        ),
        "",
      ].join("\n"),
    );
  }
  if (summary.runs.some((run) => run.status !== "PASS")) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
