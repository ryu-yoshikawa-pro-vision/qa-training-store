import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { assertNoSecretText, sha256 } from "./ai-assisted-qa-assessment-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MODULE_SPECS = Object.freeze({
  M05: new Set(["product-link.spec.ts", "p05-cart-locator.spec.ts"]),
  M06: new Set(["cart-cases.spec.ts", "new-case.spec.ts"]),
  M07: new Set(["failure-assertion.spec.ts", "repaired-assertion.spec.ts", "maintenance.spec.ts"]),
});
const LABELS = new Set(["main", "initial", "repeat", "before", "after"]);
const M06_CASE_IDS = Object.freeze({
  "cart-cases.spec.ts|main": ["CASE-CART-001", "CASE-CART-002", "CASE-CART-003"],
  "new-case.spec.ts|initial": ["CASE-CART-004", "CASE-CART-005"],
  "new-case.spec.ts|repeat": ["CASE-CART-004", "CASE-CART-005"],
});
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

function reportSpecs(report, moduleRoot, targetSpec, outputRoot, repositoryRoot) {
  // JSON reporter stores spec.file relative to config.rootDir (the learner module).
  // A report from another root must never satisfy the current learner's run.
  const reportRoot = report?.config?.rootDir;
  if (
    typeof reportRoot !== "string" ||
    !path.isAbsolute(reportRoot) ||
    path.resolve(reportRoot) !== path.resolve(moduleRoot) ||
    !Array.isArray(report.suites)
  )
    fail("Playwright JSON report rootDir does not match the learner module");

  const found = [];
  const attachments = [];
  let failedTracePresent = false;
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) {
      if (
        typeof spec.file !== "string" ||
        !spec.file ||
        path.isAbsolute(spec.file) ||
        path.resolve(reportRoot, spec.file) !== targetSpec
      )
        fail("Playwright JSON report contains an unexpected or unsafe spec");
      for (const test of spec.tests ?? []) {
        const results = test.results;
        const final = Array.isArray(results) ? results.at(-1) : null;
        if (
          test.projectName !== "ai-assisted-qa-chromium" ||
          test.expectedStatus !== "passed" ||
          !Array.isArray(results) ||
          results.length !== 1 ||
          !["passed", "failed"].includes(final?.status) ||
          test.status !== (final.status === "passed" ? "expected" : "unexpected")
        )
          fail(
            "Playwright JSON report contains a skipped, expected-failure, or invalid test result",
          );
        found.push({
          title: typeof spec.title === "string" ? spec.title : "",
          status: final.status,
          expected_status: test.expectedStatus,
        });
        for (const attachment of final.attachments ?? []) {
          if (typeof attachment?.path !== "string") continue;
          const filePath = path.isAbsolute(attachment.path)
            ? path.resolve(attachment.path)
            : path.resolve(repositoryRoot, attachment.path);
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
            sha256: sha256(fs.readFileSync(filePath)),
            name: typeof attachment.name === "string" ? attachment.name : "",
            content_type: typeof attachment.contentType === "string" ? attachment.contentType : "",
          });
          if (final.status === "failed" && attachment.name?.toLowerCase() === "trace")
            failedTracePresent = true;
        }
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites) visit(suite);
  return { tests: found, attachments, failedTracePresent };
}

/** Parse a learner spec and fail consistently on invalid TypeScript syntax. */
function parseSpecSource(bytes, specName, syntaxError) {
  const source = ts.createSourceFile(
    specName,
    bytes.toString("utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (source.parseDiagnostics.length > 0) fail(syntaxError);
  return source;
}

/** Visit named Playwright test declarations in the parsed source. */
function visitTestCalls(source, callback) {
  const scan = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "test" &&
      node.arguments.length >= 2 &&
      ts.isStringLiteral(node.arguments[0])
    )
      callback(node.arguments[0].text, node.arguments[1]);
    ts.forEachChild(node, scan);
  };
  scan(source);
}

export function assertM07SourceDependencies(specBytes, moduleId, specName) {
  if (moduleId !== "M07" || specName !== "maintenance.spec.ts") return;
  const source = parseSpecSource(
    specBytes,
    specName,
    "M07 maintenance source contains invalid TypeScript syntax",
  );
  const permitted = new Set([
    "@playwright/test",
    "../../training/playwright/support/reset-scenario",
  ]);
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const target = node.moduleSpecifier;
      if (target && (!ts.isStringLiteral(target) || !permitted.has(target.text)))
        fail("M07 maintenance imports an untracked Page Object, fixture, or module");
    }
    if (
      ts.isImportEqualsDeclaration(node) ||
      ts.isImportTypeNode(node) ||
      (ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require")))
    )
      fail("M07 maintenance uses a dynamic or untracked module import");
    ts.forEachChild(node, visit);
  };
  visit(source);
}

const STATIC_GLOBALS = new Set([
  "undefined",
  "NaN",
  "Infinity",
  "Math",
  "JSON",
  "Number",
  "String",
  "Boolean",
  "Object",
  "Array",
  "BigInt",
  "Symbol",
  "Date",
  "RegExp",
  "Promise",
]);

/** Check whether the assertion input depends on a runtime value rather than constants. */
function containsRuntimeReference(expression, constants, seen = new Set()) {
  if (ts.isIdentifier(expression)) {
    if (STATIC_GLOBALS.has(expression.text)) return false;
    if (!constants.has(expression.text)) return true;
    if (seen.has(expression.text)) return false;
    const next = new Set(seen);
    next.add(expression.text);
    return containsRuntimeReference(constants.get(expression.text), constants, next);
  }
  if (
    ts.isLiteralExpression(expression) ||
    [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(
      expression.kind,
    )
  )
    return false;
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  )
    return containsRuntimeReference(expression.expression, constants, seen);
  if (ts.isPropertyAccessExpression(expression))
    return containsRuntimeReference(expression.expression, constants, seen);
  if (ts.isObjectLiteralExpression(expression))
    return expression.properties.some((property) =>
      ts.isPropertyAssignment(property)
        ? containsRuntimeReference(property.initializer, constants, seen)
        : ts.isShorthandPropertyAssignment(property) &&
          containsRuntimeReference(property.name, constants, seen),
    );
  let runtime = false;
  ts.forEachChild(expression, (child) => {
    if (containsRuntimeReference(child, constants, seen)) runtime = true;
  });
  return runtime;
}

/** Find a Playwright matcher on expect, expect.soft, or expect.poll with runtime input. */
function hasPlaywrightAssertion(callback) {
  const constants = new Map();
  const collect = (node) => {
    if (ts.isVariableDeclarationList(node) && node.flags & ts.NodeFlags.Const)
      for (const declaration of node.declarations)
        if (ts.isIdentifier(declaration.name) && declaration.initializer)
          constants.set(declaration.name.text, declaration.initializer);
    ts.forEachChild(node, collect);
  };
  collect(callback);
  let matched = false;
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      /^to[A-Z]/.test(node.expression.name.text)
    ) {
      let receiver = node.expression.expression;
      while (
        ts.isPropertyAccessExpression(receiver) &&
        ["not", "resolves", "rejects"].includes(receiver.name.text)
      )
        receiver = receiver.expression;
      if (ts.isCallExpression(receiver)) {
        const callee = receiver.expression;
        const isExpect =
          (ts.isIdentifier(callee) && callee.text === "expect") ||
          (ts.isPropertyAccessExpression(callee) &&
            ts.isIdentifier(callee.expression) &&
            callee.expression.text === "expect" &&
            ["soft", "poll"].includes(callee.name.text));
        if (
          isExpect &&
          receiver.arguments.length >= 1 &&
          containsRuntimeReference(receiver.arguments[0], constants)
        )
          matched = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(callback, visit);
  return matched;
}

export function assertM07MaintenanceAssertions(specBytes, moduleId, specName, label) {
  if (moduleId !== "M07" || specName !== "maintenance.spec.ts") return;
  if (label !== "before" && label !== "after") return;
  const source = parseSpecSource(
    specBytes,
    specName,
    "M07 maintenance source contains invalid TypeScript syntax",
  );
  const titles = new Set();
  let testCount = 0;
  visitTestCalls(source, (title, callback) => {
    if (!title.trim() || titles.has(title))
      fail("M07 maintenance contains an empty or duplicate Playwright test title");
    titles.add(title);
    testCount += 1;
    if (!hasPlaywrightAssertion(callback))
      fail("M07 maintenance test lacks a Playwright business assertion: " + title);
  });
  if (testCount < (label === "before" ? 2 : 3))
    fail("M07 maintenance before/after has fewer than the required independent tests");
}

export function assertM06CaseAssertions(specBytes, specName, label) {
  const required = M06_CASE_IDS[specName + "|" + label];
  if (!required) return;
  const source = parseSpecSource(
    specBytes,
    specName,
    "M06 learner spec contains invalid TypeScript syntax",
  );
  const found = new Set();
  visitTestCalls(source, (title, callback) => {
    const ids = required.filter((id) => title.includes(id));
    if (ids.length === 1) {
      const id = ids[0];
      if (found.has(id)) fail("M06 spec duplicates a required CASE-CART test: " + id);
      found.add(id);
      if (!hasPlaywrightAssertion(callback))
        fail("M06 required CASE-CART test lacks a Playwright business assertion: " + id);
    }
  });
  if (found.size !== required.length)
    fail("M06 spec is missing one or more required CASE-CART tests");
}

export function assertReportedTestsMatchSnapshot(snapshotBytes, moduleId, specName, tests) {
  if (moduleId !== "M06" && moduleId !== "M07") return;
  const source = parseSpecSource(
    snapshotBytes,
    specName,
    "Playwright source snapshot contains invalid TypeScript syntax",
  );
  const declared = [];
  visitTestCalls(source, (title) => declared.push(title));
  const reported = Array.isArray(tests) ? tests.map((test) => test?.title) : [];
  if (
    declared.length === 0 ||
    declared.length !== reported.length ||
    new Set(declared).size !== declared.length ||
    new Set(reported).size !== reported.length ||
    declared.some((title) => !reported.includes(title))
  )
    fail("Playwright JSON report test titles do not match the saved source snapshot");
}

function m07QuantityAssertionsByTest(specBytes) {
  const source = parseSpecSource(
    specBytes,
    "maintenance.spec.ts",
    "M07 maintenance snapshot contains invalid TypeScript syntax",
  );
  const values = new Map();
  visitTestCalls(source, (title, callback) => {
    const titles = new Set();
    const scan = (child) => {
      if (
        ts.isCallExpression(child) &&
        ts.isPropertyAccessExpression(child.expression) &&
        child.expression.name.text === "toHaveValue" &&
        child.arguments.length === 1 &&
        ts.isStringLiteral(child.arguments[0]) &&
        ["1", "2"].includes(child.arguments[0].text)
      ) {
        const receiver = child.expression.expression;
        if (
          ts.isCallExpression(receiver) &&
          ts.isIdentifier(receiver.expression) &&
          receiver.expression.text === "expect"
        )
          titles.add(child.arguments[0].text);
      }
      ts.forEachChild(child, scan);
    };
    scan(callback);
    values.set(title, titles);
  });
  return values;
}

export function assertM07OriginalQuantityAssertions(beforeBytes, afterBytes) {
  const before = m07QuantityAssertionsByTest(beforeBytes);
  const after = m07QuantityAssertionsByTest(afterBytes);
  const hasOne = [...before.values()].some((values) => values.has("1"));
  const hasTwo = [...before.values()].some((values) => values.has("2"));
  const distinctOriginalTests = [...before.entries()].some(
    ([first, values]) =>
      values.has("1") &&
      [...before.entries()].some(([second, other]) => second !== first && other.has("2")),
  );
  if (!hasOne || !hasTwo || !distinctOriginalTests)
    fail("M07 before snapshot lacks independent quantity 1 and quantity 2 assertions");
  for (const [title, values] of before) {
    if (
      values.size > 0 &&
      (!after.has(title) || [...values].some((value) => !after.get(title).has(value)))
    )
      fail("M07 after snapshot changed an original quantity assertion: " + title);
  }
  if (![...after.entries()].some(([title, values]) => !before.has(title) && values.has("2")))
    fail("M07 after snapshot lacks an independent new quantity 2 regression assertion");
}

function relativeWorkspacePath(filePath, root = ROOT) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function executeSpec({ moduleId, specName, label, root = ROOT, sourceSha, spawn = spawnSync }) {
  if (!SOURCE_SHA.test(sourceSha ?? ""))
    fail("course:run requires the verified distribution source SHA");
  const workspaceRoot = path.join(root, "workspace");
  const moduleRoot = assertSafeDirectory(workspaceRoot, path.join(workspaceRoot, moduleId));
  const specPath = path.join(moduleRoot, specName);
  const specBytes = lstatRegularFile(specPath, "learner Playwright spec");
  assertM07SourceDependencies(specBytes, moduleId, specName);
  assertM07MaintenanceAssertions(specBytes, moduleId, specName, label);
  if (moduleId === "M06") assertM06CaseAssertions(specBytes, specName, label);
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
  const result = spawn(launcher, commandArgs, {
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
    extracted = reportSpecs(report, moduleRoot, specPath, runDirectory, root);
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
  { root = ROOT, sourceSha, spawn = spawnSync } = {},
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
  return executeSpec({ moduleId, specName, label, root, sourceSha, spawn });
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
  assertM07SourceDependencies(specBytes, moduleId, path.basename(record.spec_path));
  assertM07SourceDependencies(snapshotBytes, moduleId, path.basename(record.spec_path));
  assertM07MaintenanceAssertions(
    specBytes,
    moduleId,
    path.basename(record.spec_path),
    record.label,
  );
  assertM07MaintenanceAssertions(
    snapshotBytes,
    moduleId,
    path.basename(record.spec_path),
    record.label,
  );
  if (moduleId === "M06") {
    const name = path.basename(record.spec_path);
    assertM06CaseAssertions(specBytes, name, record.label);
    assertM06CaseAssertions(snapshotBytes, name, record.label);
  }
  if (sha256(snapshotBytes) !== record.spec_sha256)
    fail("course Playwright source snapshot hash is invalid");
  const reportBytes = lstatRegularFile(reportPath, "Playwright JSON report");
  const reportText = reportBytes.toString("utf8");
  assertNoSecretText(reportText, "Playwright JSON report");
  const report = JSON.parse(reportText);
  const outputRoot = path.dirname(reportPath);
  const extracted = reportSpecs(report, path.dirname(specPath), specPath, outputRoot, root);
  assertReportedTestsMatchSnapshot(
    snapshotBytes,
    moduleId,
    path.basename(record.spec_path),
    extracted.tests,
  );
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
    failed_trace_present: extracted.failedTracePresent,
    current_spec_sha256: sha256(specBytes),
    snapshot_bytes: snapshotBytes,
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
    record.tests.every((test) => test.status === "passed" && test.expected_status === "passed")
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
  const publishedRuns = contract?.required_runs;
  const requiredRuns = Array.isArray(publishedRuns)
    ? [
        ...publishedRuns,
        ...(moduleId === "M05"
          ? [
              {
                spec: "p05-cart-locator.spec.ts",
                label: "main",
                minimum_tests: 1,
                expected_outcome: "passed",
              },
            ]
          : []),
      ]
    : null;
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
        (moduleId === "M06" &&
          M06_CASE_IDS[run.spec + "|" + run.label]?.length !== run.minimum_tests) ||
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
      const caseIds = record.tests.map((test) => {
        const matched =
          typeof test.title === "string" ? test.title.match(/\bCASE-CART-00[1-5]\b/g) : null;
        return matched?.length === 1 ? matched[0] : null;
      });
      const requiredCaseIds =
        moduleId === "M06" ? M06_CASE_IDS[requirement.spec + "|" + requirement.label] : null;
      const casesComplete =
        requiredCaseIds === null ||
        (caseIds.length === requiredCaseIds.length &&
          new Set(caseIds).size === requiredCaseIds.length &&
          requiredCaseIds.every((id) => caseIds.includes(id)));
      const archivedM07Before =
        moduleId === "M07" &&
        requirement.spec === "maintenance.spec.ts" &&
        requirement.label === "before" &&
        requiredRuns.some((run) => run.spec === requirement.spec && run.label === "after");
      const successful =
        requirement.expected_outcome === "passed"
          ? runPassed(record, requirement.minimum_tests) &&
            (archivedM07Before || verified.current_spec_sha256 === record.spec_sha256)
          : record.outcome === "failed" &&
            record.exit_code !== 0 &&
            record.tests.length >= requirement.minimum_tests &&
            record.tests.some((test) => test.status === "failed");
      const tracePresent =
        requirement.require_trace !== true ||
        (requirement.expected_outcome === "failed"
          ? verified.failed_trace_present
          : record.attachments.some((attachment) => attachment.name.toLowerCase() === "trace"));
      checks.push({
        id: moduleId + "-RUN-" + requirement.spec + "-" + requirement.label,
        status:
          successful && casesComplete
            ? "passed"
            : record.outcome === "blocked"
              ? "blocked"
              : "ungradable",
        required_case_ids: requiredCaseIds ?? [],
        verified_case_ids: caseIds.filter(Boolean),
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
      if (moduleId === "M07" && requirement.spec === "maintenance.spec.ts")
        assertM07OriginalQuantityAssertions(before.snapshot_bytes, after.snapshot_bytes);
      checks.push({
        id: moduleId + "-BEFORE-AFTER-" + requirement.spec,
        status: changed && ordered ? "passed" : "ungradable",
        before_run_id: before.record.run_id,
        after_run_id: after.record.run_id,
        code_changed: changed,
        runs_are_separate_and_ordered: ordered,
      });
    }
    // M06 repeat evidence must follow the initial run of the unchanged learner spec.
    // Two passing receipts with reversed labels do not establish a rerun.
    for (const requirement of requiredRuns) {
      if (requirement.label !== "initial") continue;
      const key = "workspace/" + moduleId + "/" + requirement.spec;
      const initial = byKey.get(key + "|initial");
      const repeat = byKey.get(key + "|repeat");
      if (!initial || !repeat) continue;
      const sameSpec = initial.record.spec_sha256 === repeat.record.spec_sha256;
      const ordered = Date.parse(repeat.record.started_at) > Date.parse(initial.record.finished_at);
      checks.push({
        id: moduleId + "-INITIAL-REPEAT-" + requirement.spec,
        status: sameSpec && ordered ? "passed" : "ungradable",
        initial_run_id: initial.record.run_id,
        repeat_run_id: repeat.record.run_id,
        same_spec_sha256: sameSpec,
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
