import { runInNewContext } from "node:vm";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/security-dependency-fallback.yml", "utf8");
const validatorSource = readFileSync("scripts/validate-security-dependency-fix.mjs", "utf8");
const config = JSON.parse(readFileSync(".github/opencode/security-fallback.json", "utf8")) as {
  model?: string;
  small_model?: string;
  formatter?: boolean;
  lsp?: boolean;
  permission?: Record<string, unknown>;
};
const allWorkflowSource = readdirSync(".github/workflows")
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .map((file) => readFileSync(`.github/workflows/${file}`, "utf8"))
  .join("\n");

function jobBlock(jobName: string, nextJobName?: string) {
  const start = workflow.indexOf(`  ${jobName}:`);
  expect(start).toBeGreaterThanOrEqual(0);
  if (nextJobName === undefined) return workflow.slice(start);
  const end = workflow.indexOf(`  ${nextJobName}:`, start + 1);
  expect(end).toBeGreaterThan(start);
  return workflow.slice(start, end);
}

function stepBlock(job: string, stepName: string) {
  const start = job.indexOf(`      - name: ${stepName}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = job.indexOf("\n      - name:", start + 1);
  return job.slice(start, next === -1 ? undefined : next);
}

function heredocNodeScript(block: string, occurrence = 0) {
  const marker = "node --input-type=module <<'NODE'\n";
  let start = -1;
  let from = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    start = block.indexOf(marker, from);
    expect(start).toBeGreaterThanOrEqual(0);
    from = start + marker.length;
  }
  const end = block.indexOf("\n          NODE", from);
  expect(end).toBeGreaterThan(from);
  return block.slice(from, end).replace(/^ {10}/gm, "");
}

async function runNodeScript(script: string, env: Readonly<Record<string, string>>) {
  const fsImport = 'import fs from "node:fs/promises";';
  expect(script).toContain(fsImport);
  const executableScript = script.replace(fsImport, "const fs = __workflowFs;");
  const allowedFixtureFiles = new Set(
    Object.values(env).filter((value) => value.startsWith(tmpdir() + "/")),
  );
  const assertFixturePath = (path: string) => {
    if (!allowedFixtureFiles.has(path)) throw new Error("fixture_file_path_outside_allowlist");
    return path;
  };
  const workflowFs = {
    readFile: async (path: string, encoding: BufferEncoding) =>
      readFileSync(assertFixturePath(path), encoding),
    writeFile: async (path: string, data: string, encoding: BufferEncoding) =>
      writeFileSync(assertFixturePath(path), data, encoding),
  };
  const output = { stdout: [] as string[], stderr: [] as string[] };
  const workflowConsole = {
    log: (...args: unknown[]) => output.stdout.push(args.map(String).join(" ")),
    error: (...args: unknown[]) => output.stderr.push(args.map(String).join(" ")),
    warn: (...args: unknown[]) => output.stderr.push(args.map(String).join(" ")),
  };
  const context = {
    __workflowFs: workflowFs,
    process: { env: { ...env } },
    URL,
    console: workflowConsole,
  };

  try {
    const execution = runInNewContext(
      "(async () => {\n" + executableScript + "\n})()",
      context,
    ) as Promise<void>;
    await execution;
    return { status: 0, stdout: output.stdout.join("\n"), stderr: output.stderr.join("\n") };
  } catch (error) {
    const diagnostic = error instanceof Error ? (error.stack ?? error.message) : String(error);
    return {
      status: 1,
      stdout: output.stdout.join("\n"),
      stderr: [...output.stderr, diagnostic].filter(Boolean).join("\n"),
    };
  }
}

const paginationTargets = [
  {
    name: "read-alert",
    jobName: "read-alert",
    nextJobName: "opencode-edit",
    stepName: "Read and sanitize public security context",
    filesInvalidDiagnostic: "open_pr_files_invalid",
    filesHttpDiagnosticPrefix: "open_pr_files_http",
    filesTruncatedDiagnostic: "open_pr_files_truncated",
    conflictDiagnostic: "target_dependency_open_pr_conflict",
  },
  {
    name: "opencode-edit",
    jobName: "opencode-edit",
    nextJobName: "validate-exec",
    stepName: "Recheck related open PRs after graph resolution",
    filesInvalidDiagnostic: "related_pr_files_invalid",
    filesHttpDiagnosticPrefix: "related_pr_files_http",
    filesTruncatedDiagnostic: "related_pr_files_truncated",
    conflictDiagnostic: "related_pr_conflict",
  },
  {
    name: "publish",
    jobName: "publish",
    nextJobName: undefined,
    stepName: "Recheck alert advisory and duplicate branch conditions",
    filesInvalidDiagnostic: "publish_pr_files_invalid",
    filesHttpDiagnosticPrefix: "publish_pr_files_http",
    filesTruncatedDiagnostic: "publish_pr_files_truncated",
    conflictDiagnostic: "publish_pr_conflict",
  },
] as const;

const paginationResponseMarker = "private-fixture-response-marker";
const paginationCredential = "synthetic-pagination-test-credential";

type PaginationTarget = (typeof paginationTargets)[number];
type PaginationResponse = {
  body?: unknown;
  status?: number;
  transportError?: boolean;
  jsonError?: boolean;
};

function paginationNodeScript(target: PaginationTarget) {
  const job = target.nextJobName
    ? jobBlock(target.jobName, target.nextJobName)
    : jobBlock(target.jobName);
  const step = stepBlock(job, target.stepName);
  const scriptCount = (step.match(/node --input-type=module <<'NODE'/g) ?? []).length;
  for (let occurrence = 0; occurrence < scriptCount; occurrence += 1) {
    const script = heredocNodeScript(step, occurrence);
    if (script.includes("const fetchPullFiles = async (pull) =>")) return script;
  }
  throw new Error("workflow step does not contain its fetchPullFiles Node script");
}

function injectPaginationFetch(script: string) {
  const fsImport = 'import fs from "node:fs/promises";';
  expect(script).toContain(fsImport);
  const fetchFixture = [
    'const testResponses = JSON.parse(await fs.readFile(process.env.PAGINATION_RESPONSES_FILE, "utf8"));',
    "const testRequests = [];",
    "const fetch = async (input, options = {}) => {",
    "  const url = new URL(String(input));",
    "  const request = {",
    "    origin: url.origin,",
    "    pathname: url.pathname,",
    '    perPage: url.searchParams.get("per_page"),',
    '    page: url.searchParams.get("page"),',
    "    accept: options.headers?.Accept ?? null,",
    '    authorizationPresent: options.headers?.Authorization === "Bearer " + process.env.GITHUB_TOKEN,',
    "  };",
    "  testRequests.push(request);",
    '  await fs.writeFile(process.env.PAGINATION_REQUESTS_FILE, JSON.stringify(testRequests), "utf8");',
    "  const response = testResponses[Number(request.page) - 1];",
    '  if (response === undefined) throw new Error("fixture_response_missing");',
    '  if (response.transportError === true) throw new Error("fixture_transport_error");',
    "  const status = response.status ?? 200;",
    "  return {",
    "    ok: status >= 200 && status < 300,",
    "    status,",
    "    async json() {",
    '      if (response.jsonError === true) throw new SyntaxError("fixture_json_parse_error");',
    "      return response.body;",
    "    },",
    "  };",
    "};",
  ].join("\n");
  return script.replace(fsImport, fsImport + "\n" + fetchFixture);
}

function paginationFiles(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    filename: "docs/pagination-fixture-" + index + ".md",
    patch: paginationResponseMarker,
  }));
}

function paginationPages(files: unknown[], pageSizes: number[]): PaginationResponse[] {
  let offset = 0;
  return pageSizes.map((size) => {
    const body = files.slice(offset, offset + size);
    offset += size;
    return { body };
  });
}

async function runPaginationFixture(target: PaginationTarget, responses: PaginationResponse[]) {
  const directory = mkdtempSync(join(tmpdir(), "security-fallback-pagination-"));
  const fixturePath = join(directory, "responses.json");
  const requestsPath = join(directory, "requests.json");
  const repository = "example/repository";
  const pull = { number: 123, base: { repo: { full_name: repository } } };
  const alert = {
    state: "open",
    dependency: {
      package: { ecosystem: "npm", name: "example-package" },
      manifest_path: "package.json",
    },
    security_advisory: { ghsa_id: "GHSA-aaaa-bbbb-cccc" },
    security_vulnerability: {
      package: { ecosystem: "npm", name: "example-package" },
      vulnerable_version_range: ">= 1.0.0, < 2.0.0",
      first_patched_version: { identifier: "2.0.0" },
    },
  };
  const advisory = {
    ghsa_id: "GHSA-aaaa-bbbb-cccc",
    vulnerabilities: [
      {
        package: { ecosystem: "npm", name: "example-package" },
        vulnerable_version_range: ">= 1.0.0, < 2.0.0",
        first_patched_version: "2.0.0",
      },
    ],
  };
  const authorization = {
    dependency: "example-package",
    ecosystem: "npm",
    ghsa_id: "GHSA-aaaa-bbbb-cccc",
    vulnerable_range: ">= 1.0.0 < 2.0.0",
    first_patched_version: "2.0.0",
    root_parent: null,
    override: null,
    conflict_terms: ["example-package"],
  };
  const alertPath = join(directory, "alert.json");
  const advisoryPath = join(directory, "advisory.json");
  const contextPath = join(directory, "context.json");
  const openPullsPath = join(directory, "open-pulls.json");
  const authorizationPath = join(directory, "authorization.json");
  const pullsPath = join(directory, "pulls.json");

  try {
    writeFileSync(fixturePath, JSON.stringify(responses), "utf8");
    writeFileSync(requestsPath, "[]", "utf8");
    writeFileSync(alertPath, JSON.stringify(alert), "utf8");
    writeFileSync(advisoryPath, JSON.stringify(advisory), "utf8");
    writeFileSync(contextPath, "", "utf8");
    writeFileSync(openPullsPath, JSON.stringify([pull]), "utf8");
    writeFileSync(authorizationPath, JSON.stringify(authorization), "utf8");
    writeFileSync(pullsPath, JSON.stringify([pull]), "utf8");

    const env: Record<string, string> = {
      API_URL: "https://api.example.test/api/v3/",
      REPOSITORY: repository,
      GITHUB_TOKEN: paginationCredential,
      PAGINATION_RESPONSES_FILE: fixturePath,
      PAGINATION_REQUESTS_FILE: requestsPath,
    };
    if (target.name === "read-alert") {
      Object.assign(env, {
        ALERT_FILE: alertPath,
        ADVISORY_FILE: advisoryPath,
        CONTEXT_FILE: contextPath,
        OPEN_PRS_FILE: openPullsPath,
      });
    } else if (target.name === "opencode-edit") {
      Object.assign(env, {
        AUTHORIZATION_FILE: authorizationPath,
        PULLS_FILE: pullsPath,
      });
    } else {
      Object.assign(env, {
        AUTH_FILE: authorizationPath,
        ALERT_FILE: alertPath,
        PULLS_FILE: pullsPath,
      });
    }

    const result = await runNodeScript(injectPaginationFetch(paginationNodeScript(target)), env);
    const requests = JSON.parse(readFileSync(requestsPath, "utf8")) as {
      origin: string;
      pathname: string;
      perPage: string | null;
      page: string | null;
      accept: string | null;
      authorizationPresent: boolean;
    }[];
    return { result, requests };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function expectPaginationOutputIsSanitized(result: Awaited<ReturnType<typeof runNodeScript>>) {
  expect(result.stdout).not.toContain(paginationResponseMarker);
  expect(result.stderr).not.toContain(paginationResponseMarker);
  expect(result.stdout).not.toContain(paginationCredential);
  expect(result.stderr).not.toContain(paginationCredential);
}

describe("Security dependency fallback workflow", () => {
  it("executes each workflow pagination path across file-count boundaries", async () => {
    const boundaryCases = [
      { name: "0 files", sizes: [0], total: 0, expectedRequests: 1 },
      { name: "1 file", sizes: [1], total: 1, expectedRequests: 1 },
      { name: "99 files", sizes: [99], total: 99, expectedRequests: 1 },
      { name: "100 files", sizes: [100, 0], total: 100, expectedRequests: 2 },
      { name: "101 files", sizes: [100, 1], total: 101, expectedRequests: 2 },
      { name: "451 files", sizes: [100, 100, 100, 100, 51], total: 451, expectedRequests: 5 },
      {
        name: "3000 files",
        sizes: Array.from({ length: 30 }, () => 100),
        total: 3000,
        expectedRequests: 30,
      },
    ];

    for (const target of paginationTargets) {
      for (const boundary of boundaryCases) {
        const files = paginationFiles(boundary.total);
        const { result, requests } = await runPaginationFixture(
          target,
          paginationPages(files, boundary.sizes),
        );
        const isAtThreeThousandLimit = boundary.total === 3000;

        if (isAtThreeThousandLimit) {
          expect(result.status, target.name + " " + boundary.name).not.toBe(0);
          expect(result.stderr).toContain(target.filesTruncatedDiagnostic);
        } else {
          expect(result.status, target.name + " " + boundary.name).toBe(0);
          expect(result.stderr).not.toContain("needs_human:");
        }
        expect(requests).toHaveLength(boundary.expectedRequests);
        expect(requests.map((request) => request.page)).toEqual(
          Array.from({ length: boundary.expectedRequests }, (_, index) => String(index + 1)),
        );
        for (const request of requests) {
          expect(request).toMatchObject({
            origin: "https://api.example.test",
            pathname: "/api/v3/repos/example/repository/pulls/123/files",
            perPage: "100",
            accept: "application/vnd.github+json",
            authorizationPresent: true,
          });
        }
        expectPaginationOutputIsSanitized(result);
      }
    }
  });

  it.each(paginationTargets)(
    "rejects a missing filename in [ {} ] through the $name workflow script",
    async (target) => {
      const { result, requests } = await runPaginationFixture(target, [{ body: [{}] }]);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(target.filesInvalidDiagnostic);
      expect(requests).toHaveLength(1);
      expectPaginationOutputIsSanitized(result);
    },
  );

  it("rejects malformed file-list responses in all three workflow scripts", async () => {
    const invalidBodies: { name: string; body: unknown }[] = [
      { name: "null response", body: null },
      { name: "object response", body: {} },
      { name: "files wrapper", body: { files: [] } },
      { name: "null entry", body: [null] },
      { name: "missing filename", body: [{}] },
      { name: "null filename", body: [{ filename: null, private: paginationResponseMarker }] },
      { name: "numeric filename", body: [{ filename: 123, private: paginationResponseMarker }] },
      { name: "empty filename", body: [{ filename: "", private: paginationResponseMarker }] },
      { name: "blank filename", body: [{ filename: "  \t ", private: paginationResponseMarker }] },
      { name: "array entry", body: [[]] },
      { name: "string entry", body: ["file"] },
    ];

    for (const target of paginationTargets) {
      for (const invalid of invalidBodies) {
        const { result, requests } = await runPaginationFixture(target, [{ body: invalid.body }]);

        expect(result.status, target.name + " " + invalid.name).not.toBe(0);
        expect(result.stderr).toContain(target.filesInvalidDiagnostic);
        expect(requests).toHaveLength(1);
        expectPaginationOutputIsSanitized(result);
      }
    }
  });

  it("rejects oversized single pages and HTTP, transport, JSON, and later-page failures", async () => {
    for (const target of paginationTargets) {
      const oversized = await runPaginationFixture(target, [{ body: paginationFiles(101) }]);
      expect(oversized.result.status).not.toBe(0);
      expect(oversized.result.stderr).toContain(target.filesInvalidDiagnostic);
      expect(oversized.requests).toHaveLength(1);
      expectPaginationOutputIsSanitized(oversized.result);

      for (const status of [403, 404, 500]) {
        const httpFailure = await runPaginationFixture(target, [
          { status, body: { message: paginationResponseMarker } },
        ]);
        expect(httpFailure.result.status).not.toBe(0);
        expect(httpFailure.result.stderr).toContain(
          target.filesHttpDiagnosticPrefix + "_" + status,
        );
        expect(httpFailure.requests).toHaveLength(1);
        expectPaginationOutputIsSanitized(httpFailure.result);
      }

      const transportFailure = await runPaginationFixture(target, [{ transportError: true }]);
      expect(transportFailure.result.status).not.toBe(0);
      expect(transportFailure.result.stderr).toContain("fixture_transport_error");
      expectPaginationOutputIsSanitized(transportFailure.result);

      const jsonFailure = await runPaginationFixture(target, [{ jsonError: true }]);
      expect(jsonFailure.result.status).not.toBe(0);
      expect(jsonFailure.result.stderr).toContain("fixture_json_parse_error");
      expectPaginationOutputIsSanitized(jsonFailure.result);

      const laterPageFailure = await runPaginationFixture(target, [
        { body: paginationFiles(100) },
        { status: 500, body: { message: paginationResponseMarker } },
      ]);
      expect(laterPageFailure.result.status).not.toBe(0);
      expect(laterPageFailure.result.stderr).toContain(target.filesHttpDiagnosticPrefix + "_500");
      expect(laterPageFailure.requests.map((request) => request.page)).toEqual(["1", "2"]);
      expectPaginationOutputIsSanitized(laterPageFailure.result);
    }
  });

  it("detects dependency conflicts on the fifth page of a 451-file response", async () => {
    for (const target of paginationTargets) {
      const files = paginationFiles(450);
      files.push({
        filename: "package.json",
        patch: "update example-package " + paginationResponseMarker,
      });
      const { result, requests } = await runPaginationFixture(
        target,
        paginationPages(files, [100, 100, 100, 100, 51]),
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(target.conflictDiagnostic);
      expect(requests.map((request) => request.page)).toEqual(["1", "2", "3", "4", "5"]);
      expectPaginationOutputIsSanitized(result);
    }
  });

  it("uses only manual dispatch with a required numeric alert input and fixed serialization", () => {
    const parsed = parse(workflow) as {
      on?: {
        workflow_dispatch?: { inputs?: Record<string, { required?: boolean; type?: string }> };
        schedule?: unknown;
      };
      concurrency?: { group?: string; "cancel-in-progress"?: boolean };
    };
    expect(parsed.on?.workflow_dispatch?.inputs?.alert_number).toMatchObject({
      required: true,
      type: "number",
    });
    expect(parsed.on?.schedule).toBeUndefined();
    expect(parsed.concurrency).toEqual({
      group: "security-dependency-fallback",
      "cancel-in-progress": false,
    });
    expect(workflow).toContain("permissions: {}");
    expect(workflow).not.toContain("${{ inputs.alert_number }}" + "-${{");
  });

  it("keeps the six jobs and prevents every rerun from entering the fallback", () => {
    const jobs = [
      "preflight",
      "read-alert",
      "opencode-edit",
      "validate-exec",
      "finalize",
      "publish",
    ];
    for (const [index, job] of jobs.entries()) {
      const block = jobBlock(job, jobs[index + 1]);
      expect(block).toContain("github.run_attempt == 1");
    }
    expect(workflow).toContain("base_sha: ${{ steps.preflight.outputs.base_sha }}");
    expect(jobBlock("preflight", "read-alert")).toContain("BASE_SHA_INPUT: ${{ github.sha }}");
    for (const [job, nextJob] of [
      ["opencode-edit", "validate-exec"],
      ["validate-exec", "finalize"],
      ["finalize", "publish"],
      ["publish", undefined],
    ] as const) {
      const block = jobBlock(job, nextJob);
      expect(stepBlock(block, "Checkout immutable base")).toContain("ref: main");
      expect(stepBlock(block, "Verify checkout matches immutable base")).toContain(
        "git rev-parse HEAD",
      );
      expect(stepBlock(block, "Verify checkout matches immutable base")).toContain(
        "EXPECTED_BASE_SHA: ${{ needs.preflight.outputs.base_sha }}",
      );
    }
  });

  it("uses the planned job permissions and reserves OIDC for publish", () => {
    const readAlert = jobBlock("read-alert", "opencode-edit");
    const opencode = jobBlock("opencode-edit", "validate-exec");
    const validate = jobBlock("validate-exec", "finalize");
    const finalize = jobBlock("finalize", "publish");
    const publish = jobBlock("publish");

    expect(readAlert).toContain("pull-requests: read");
    expect(readAlert).toContain("vulnerability-alerts: read");
    expect(readAlert).not.toContain("contents:");
    expect(opencode).toContain("contents: read");
    expect(opencode).toContain("pull-requests: read");
    expect(opencode).not.toContain("id-token: write");
    expect(opencode).not.toContain("vulnerability-alerts: read");
    expect(validate).toMatch(/\n    permissions:\n      contents: read\n/);
    expect(validate).not.toContain("id-token: write");
    expect(validate).not.toContain("vulnerability-alerts: read");
    expect(validate).not.toContain("contents: write");
    expect(validate).not.toContain("pull-requests: write");
    expect(finalize).toMatch(/\n    permissions:\n      contents: read\n/);
    expect(finalize).not.toContain("id-token: write");
    expect(finalize).not.toContain("vulnerability-alerts: read");
    expect(finalize).not.toContain("contents: write");
    expect(finalize).not.toContain("pull-requests: write");
    expect(publish).toContain("contents: read");
    expect(publish).toContain("pull-requests: read");
    expect(publish).toContain("vulnerability-alerts: read");
    expect(publish).toContain("id-token: write");
    expect((allWorkflowSource.match(/id-token:\s*write/g) ?? []).length).toBe(1);
    expect(allWorkflowSource).not.toMatch(/permissions:\s*write-all/);
  });

  it("rechecks main at both publish boundaries and leaves stale branches for humans", () => {
    const publish = jobBlock("publish");
    const beforePush = publish.indexOf("latest_main_before_push");
    const push = publish.indexOf('git push origin "$branch"');
    const afterPush = publish.indexOf("latest_main_after_push");
    const createPullRequest = publish.indexOf("gh pr create");

    expect(beforePush).toBeGreaterThanOrEqual(0);
    expect(beforePush).toBeLessThan(push);
    expect(afterPush).toBeGreaterThan(push);
    expect(afterPush).toBeLessThan(createPullRequest);
    expect(publish).toContain('if [[ "$latest_main_before_push" != "$BASE_SHA" ]]');
    expect(publish).toContain('if [[ "$latest_main_after_push" != "$BASE_SHA" ]]');
    expect(publish).toContain("needs_human:main_advanced_before_push");
    expect(publish).toContain("needs_human:main_advanced_after_push");
    expect(publish).not.toContain("opencode run");
    expect(publish).not.toMatch(/git\s+rebase/);
    expect(publish).not.toMatch(/git\s+push[^\n]*--force/);
    expect(publish).not.toMatch(/git\s+(?:branch\s+-D|push[^\n]*--delete)/);
    expect(workflow).not.toMatch(/GITHUB_TOKEN:\s*write/);
    expect(workflow).not.toMatch(/contents:\s*write/);
  });

  it("installs the immutable baseline before validate-exec imports the validator", () => {
    const validate = jobBlock("validate-exec", "finalize");
    const install = stepBlock(validate, "Install baseline dependencies before validator");
    const inputValidation = stepBlock(
      validate,
      "Verify inputs and validate semantic package change",
    );
    const firstValidator = validate.indexOf("node scripts/validate-security-dependency-fix.mjs");
    const installPosition = validate.indexOf("Install baseline dependencies before validator");
    const candidateCopyPosition = validate.indexOf('cp "$candidate/package.json" package.json');

    expect(install).toContain("corepack pnpm@10.34.5 install --frozen-lockfile --ignore-scripts");
    expect(install).toContain("env -i");
    expect(install).toContain("baseline-install-home");
    expect(install).toContain("baseline-install-tmp");
    expect(install).not.toContain("OPENCODE_API_KEY");
    expect(install).not.toContain("GITHUB_TOKEN");
    expect(install).not.toContain("ACTIONS_ID_TOKEN");
    expect(installPosition).toBeGreaterThanOrEqual(0);
    expect(candidateCopyPosition).toBeGreaterThanOrEqual(0);
    expect(installPosition).toBeLessThan(candidateCopyPosition);
    expect(installPosition).toBeLessThan(firstValidator);
    expect(inputValidation).toContain('cp pnpm-lock.yaml "$baseline_lockfile"');
    expect(validate).toContain("--baseline-lockfile");
  });

  it("uses the GitHub Global Security Advisory endpoint in read-alert and publish", () => {
    const readAlert = jobBlock("read-alert", "opencode-edit");
    const publish = jobBlock("publish");
    const endpoint = "https://api.github.com/advisories/$ghsa_id";

    expect(readAlert).toContain(endpoint);
    expect(publish).toContain(endpoint);
    expect(workflow).not.toContain("https://api.github.com/security-advisories/$ghsa_id");
  });

  it("accepts npm Dependabot alerts from package.json and pnpm-lock.yaml only", () => {
    const readAlert = jobBlock("read-alert", "opencode-edit");

    for (const manifestPath of [
      '"package.json"',
      '"/package.json"',
      '"pnpm-lock.yaml"',
      '"/pnpm-lock.yaml"',
    ]) {
      expect(readAlert).toContain(manifestPath);
    }
    expect(readAlert).toContain('needsHuman("unsupported_manifest")');
    expect(readAlert).not.toContain('!["/package.json", "package.json"].includes(manifestPath)');
  });

  it("matches the alert-specific vulnerability to the Global Advisory schema", async () => {
    const readAlert = jobBlock("read-alert", "opencode-edit");
    const readStep = stepBlock(readAlert, "Read and sanitize public security context");
    const script = heredocNodeScript(readStep);
    const directory = mkdtempSync(join(tmpdir(), "security-fallback-advisory-"));
    const alertFile = join(directory, "alert.json");
    const advisoryFile = join(directory, "advisory.json");
    const contextFile = join(directory, "context.json");
    const openPrsFile = join(directory, "open-prs.json");
    const alert = {
      state: "open",
      dependency: {
        package: { ecosystem: "npm", name: "example-package" },
        manifest_path: "pnpm-lock.yaml",
      },
      security_advisory: { ghsa_id: "GHSA-aaaa-bbbb-cccc" },
      security_vulnerability: {
        package: { ecosystem: "npm", name: "example-package" },
        vulnerable_version_range: ">= 1.0.0, < 1.2.3",
        first_patched_version: { identifier: "1.2.3" },
      },
    };
    const advisory = {
      ghsa_id: "GHSA-aaaa-bbbb-cccc",
      vulnerabilities: [
        {
          package: { ecosystem: "npm", name: "example-package" },
          vulnerable_version_range: "< 0.9.0",
          first_patched_version: "0.9.0",
        },
        {
          package: { ecosystem: "npm", name: "example-package" },
          vulnerable_version_range: ">= 1.0.0, < 1.2.3",
          first_patched_version: "1.2.3",
        },
      ],
    };

    try {
      writeFileSync(alertFile, JSON.stringify(alert));
      writeFileSync(advisoryFile, JSON.stringify(advisory));
      writeFileSync(openPrsFile, "[]");
      const env = {
        ALERT_FILE: alertFile,
        ADVISORY_FILE: advisoryFile,
        CONTEXT_FILE: contextFile,
        OPEN_PRS_FILE: openPrsFile,
        API_URL: "https://api.github.com",
        REPOSITORY: "example/repository",
        GITHUB_TOKEN: "test-token",
      };
      const result = await runNodeScript(script, env);
      expect(result.status).toBe(0);
      expect(JSON.parse(readFileSync(contextFile, "utf8"))).toMatchObject({
        dependency: "example-package",
        ecosystem: "npm",
        ghsa_id: "GHSA-aaaa-bbbb-cccc",
        vulnerable_range: ">= 1.0.0 < 1.2.3",
        first_patched_version: "1.2.3",
      });

      writeFileSync(
        advisoryFile,
        JSON.stringify({
          ...advisory,
          vulnerabilities: advisory.vulnerabilities.map((entry) => ({
            ...entry,
            first_patched_version: "9.9.9",
          })),
        }),
      );
      const mismatch = await runNodeScript(script, {
        ...env,
        CONTEXT_FILE: join(directory, "mismatch-context.json"),
      });
      expect(mismatch.status).not.toBe(0);
      expect(mismatch.stderr).toContain("needs_human:advisory_vulnerability_entry_ambiguous");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    expect(readAlert).toContain("alert.security_vulnerability");
    expect(readAlert).toContain("entry.package?.ecosystem === ecosystem");
    expect(readAlert).toContain("(entry.first_patched_version ?? null) === firstPatchedVersion");
    expect(readAlert).not.toContain('entry.ecosystem === "npm"');

    const publish = stepBlock(
      jobBlock("publish"),
      "Recheck alert advisory and duplicate branch conditions",
    );
    expect(publish).toContain("alert.security_vulnerability");
    expect(publish).toContain("needs_human:publish_alert_vulnerability_changed");
    expect(publish).toContain("entry.package?.ecosystem === auth.ecosystem");
    expect(publish).toContain(
      "(entry.first_patched_version ?? null) === auth.first_patched_version",
    );
    expect(publish).not.toContain("entries[0].first_patched_version?.identifier");
  });

  it("keeps the workflow_dispatch alert number out of step env logs", () => {
    const readAlert = jobBlock("read-alert", "opencode-edit");
    const publish = jobBlock("publish");

    expect(workflow).not.toContain("ALERT_NUMBER: ${{ inputs.alert_number }}");
    expect(readAlert).toContain("process.env.GITHUB_EVENT_PATH");
    expect(publish).toContain("process.env.GITHUB_EVENT_PATH");
    expect(workflow).toContain("needs_human:alert_input_read_failed");
  });

  it("emits reason-coded diagnostics without exposing security identifiers or credentials", () => {
    expect(workflow).not.toContain('throw new Error("needs_human")');
    expect(workflow).not.toMatch(/echo\s+needs_human\s+>&2/);
    expect(workflow).not.toMatch(/^\s*test\b/gm);
    expect(workflow).toContain("needs_human:${diagnostic}_http_${http_status}");
    expect(workflow).toContain("needs_human:invalid_diagnostic_code");
    expect(workflow).toContain('needsHuman("unsupported_manifest")');
    expect(workflow).toContain("needs_human:model_discovery_failed");
    expect(workflow).toContain("needs_human:oidc_token_request_failed");
    expect(workflow).toContain("needs_human:publish_pr_create_failed");

    const diagnosticLines = workflow.split(/\r?\n/).filter((line) => line.includes("needs_human:"));
    expect(diagnosticLines.length).toBeGreaterThan(0);
    for (const line of diagnosticLines) {
      expect(line).not.toMatch(
        /\$ALERT_NUMBER|\$ghsa_id|\$dependency|\$\{dependency\}|\$GITHUB_TOKEN|\$OPENCODE_API_KEY|\$oidc_token|\$installation_token/,
      );
    }

    const helperCalls = [...workflow.matchAll(/needsHuman\(([^)]+)\)/g)].map((match) => match[1]);
    expect(helperCalls.length).toBeGreaterThan(0);
    for (const codeExpression of helperCalls) {
      expect(codeExpression).toMatch(/^(?:"[a-z0-9_]+"|`[a-z0-9_]+_\$\{response\.status\}`)$/);
    }

    const fetchJsonDiagnostics = [...workflow.matchAll(/^\s*fetch_json\s+([^\s]+)\s+/gm)].map(
      (match) => match[1],
    );
    expect(fetchJsonDiagnostics.length).toBeGreaterThan(0);
    for (const diagnostic of fetchJsonDiagnostics) {
      expect(diagnostic).toMatch(/^"[a-z0-9_]+"$/);
    }
  });

  it("rejects validator trust dependencies before any fallback execution", () => {
    const readAlert = jobBlock("read-alert", "opencode-edit");
    const guard = readAlert.indexOf('dependency === "semver" || dependency === "yaml"');
    const readAlertStart = workflow.indexOf("  read-alert:");
    const opencode = workflow.indexOf("  opencode-edit:");
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(readAlertStart + guard).toBeLessThan(opencode);
    expect(validatorSource).toContain('authorization.dependency === "semver"');
    expect(validatorSource).toContain('authorization.dependency === "yaml"');
  });

  it("keeps raw alerts and Zen credentials inside their intended boundaries", () => {
    const readAlert = jobBlock("read-alert", "opencode-edit");
    const opencode = jobBlock("opencode-edit", "validate-exec");
    const validate = jobBlock("validate-exec", "finalize");
    const finalize = jobBlock("finalize", "publish");
    const publish = jobBlock("publish");

    expect(readAlert).not.toContain("actions/checkout");
    expect(readAlert).not.toContain("pnpm install");
    expect(readAlert).toContain("raw-alert.json");
    expect(readAlert).toContain("sanitized-security-context.json");
    expect(opencode).toContain("OPENCODE_API_KEY");
    expect(opencode).toContain("env -i");
    expect(stepBlock(opencode, "Select a Free model without fallback")).not.toContain(
      "GITHUB_TOKEN",
    );
    expect(stepBlock(opencode, "Select a Free model without fallback")).not.toContain("GH_TOKEN");
    expect(stepBlock(opencode, "Run one constrained OpenCode edit")).not.toContain("GITHUB_TOKEN");
    expect(stepBlock(opencode, "Run one constrained OpenCode edit")).not.toContain("GH_TOKEN");
    expect(opencode).not.toContain("ACTIONS_ID_TOKEN");
    expect(opencode).not.toContain("raw-alert");
    expect(opencode).not.toContain("ALERT_NUMBER:");
    expect(stepBlock(opencode, "Prepare constrained OpenCode prompt and config")).not.toContain(
      "OPENCODE_API_KEY",
    );
    for (const block of [validate, finalize]) {
      expect(block).not.toContain("OPENCODE_API_KEY");
      expect(block).not.toContain("vulnerability-alerts: read");
      expect(block).not.toContain("ACTIONS_ID_TOKEN");
      expect(block).not.toContain("alert_number");
    }
    expect(publish).not.toContain("OPENCODE_API_KEY");
    expect(publish).toContain("https://api.opencode.ai/exchange_github_app_token");
    expect(publish).toContain("audience=opencode-github-action");
    expect(publish).toContain("--request POST");
    expect(publish).toContain("Authorization: Bearer $oidc_token");
    expect(publish).not.toMatch(/--data(?:-raw|-binary)?\b/);
    expect(publish).not.toMatch(/\bPAT\b/);
    expect(publish).not.toContain("write-enabled GITHUB_TOKEN");
  });

  it("keeps the model discovery output and error stream inside runner temp", () => {
    const opencode = jobBlock("opencode-edit", "validate-exec");
    const models = stepBlock(opencode, "Select a Free model without fallback");
    const uploadCandidate = stepBlock(opencode, "Upload candidate artifact");

    expect(models).toContain('model_json="$RUNNER_TEMP/opencode-models.json"');
    expect(models).toContain('models_stderr="$RUNNER_TEMP/opencode-tmp/models-stderr.log"');
    expect(models).toContain('> "$model_json" 2> "$models_stderr"');
    expect(models).toContain('OPENCODE_API_KEY="$OPENCODE_API_KEY"');
    for (const variable of [
      "OPENCODE_DISABLE_PROJECT_CONFIG=1",
      "OPENCODE_PURE=1",
      "OPENCODE_DISABLE_DEFAULT_PLUGINS=1",
      "OPENCODE_DISABLE_AUTOUPDATE=1",
      "OPENCODE_DISABLE_LSP_DOWNLOAD=1",
      "OPENCODE_DISABLE_SHARE=1",
    ]) {
      expect(models).toContain(variable);
    }
    expect(models).not.toContain('cat "$models_stderr"');
    expect(uploadCandidate).not.toContain("models-stderr.log");
  });

  it("uses masked Basic credentials for Git push and keeps the App token API-only afterward", () => {
    const publish = jobBlock("publish");
    expect(publish).toContain("printf 'x-access-token:%s' \"$installation_token\"");
    expect(publish).toContain("base64 -w 0");
    expect(publish).toContain('echo "::add-mask::$git_credential"');
    expect(publish).toContain("AUTHORIZATION: basic $git_credential");
    expect(publish).not.toContain("AUTHORIZATION: bearer $installation_token");
    expect(publish).not.toContain("https://x-access-token:");
    expect(publish).toContain(
      "unset GIT_CONFIG_COUNT GIT_CONFIG_KEY_0 GIT_CONFIG_VALUE_0 git_credential",
    );
    expect(publish).toContain('GH_TOKEN="$installation_token" gh pr create');
    expect(workflow).not.toMatch(/GITHUB_TOKEN:\s*write/);
  });

  it("pins pnpm, the OpenCode binary, and the fixed one-shot edit", () => {
    expect(workflow).not.toContain("pnpm@9");
    expect(workflow).toContain('PNPM_VERSION: "10.34.5"');
    expect(workflow).toContain("corepack pnpm@10.34.5");
    expect(workflow).toContain('OPENCODE_VERSION: "v1.18.31"');
    expect(workflow).toContain("opencode-linux-x64.tar.gz");
    expect(workflow).toContain("e9312be75ed803b7415fc2aeabda1f4fe938912a39673762dc0c38c0e11ebde4");
    expect(workflow).toContain('if [[ "$RUNNER_ARCH" != X64 ]]');
    expect(workflow).toContain("timeout --signal=TERM --kill-after=30s 600");
    expect(workflow).toContain("--title security-dependency-fallback");
    expect(workflow).toContain("OPENCODE_DISABLE_DEFAULT_PLUGINS=1");
    expect(workflow).toContain("OPENCODE_PURE=1");
    expect(workflow).not.toContain("opencode github run");
    expect(workflow).not.toContain("anomalyco/opencode/github");
  });

  it("uses artifact IDs, short retention, immutable hashes, and exact artifact boundaries", () => {
    for (const artifactName of [
      "security-context-${{ github.run_id }}",
      "security-candidate-${{ github.run_id }}",
      "prepared-security-fix-${{ github.run_id }}",
      "validated-security-fix-${{ github.run_id }}",
    ]) {
      expect(workflow).toContain(`name: ${artifactName}`);
    }
    expect(workflow).not.toContain("artifact-digest");
    expect(workflow).toContain("retention-days: 1");
    expect(workflow).toContain("overwrite: false");
    expect(workflow).toContain("include-hidden-files: true");
    expect(workflow).toContain("steps.upload_context.outputs.artifact-id");
    expect(workflow).toContain("steps.upload_candidate.outputs.artifact-id");
    expect(workflow).toContain("steps.upload_prepared.outputs.artifact-id");
    expect(workflow).toContain("steps.upload_validated.outputs.artifact-id");
    expect((workflow.match(/artifact-ids:/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect(workflow).toContain("runs/${{ steps.create_run.outputs.run_id }}/PLAN.md");
    expect(workflow).toContain("runs/${{ steps.create_run.outputs.run_id }}/TASKS.md");
    expect(workflow).toContain("runs/${{ steps.create_run.outputs.run_id }}/REPORT.md");
    expect(workflow).not.toContain(".codex/runs/");
    expect(workflow).toContain("validated-fix.json");
    expect(workflow).toContain("conflict_terms");
  });

  it("records fixed diagnostic reasons at artifact trust boundaries", () => {
    const opencode = jobBlock("opencode-edit", "validate-exec");
    const validate = jobBlock("validate-exec", "finalize");
    const finalize = jobBlock("finalize", "publish");
    const publish = jobBlock("publish");

    for (const reason of [
      "needs_human:context_artifact_hash_mismatch",
      "needs_human:candidate_artifact_file_set_invalid",
    ]) {
      expect(opencode).toContain(reason);
    }
    for (const reason of [
      "needs_human:validate_candidate_package_hash_mismatch",
      "needs_human:prepared_lockfile_hash_mismatch",
    ]) {
      expect(validate).toContain(reason);
    }
    for (const reason of [
      "needs_human:finalize_prepared_lockfile_hash_mismatch",
      "needs_human:final_guard_authorization_hash_mismatch",
      "needs_human:finalize_change_set_invalid",
    ]) {
      expect(finalize).toContain(reason);
    }
    for (const reason of [
      "needs_human:validated_artifact_manifest_missing",
      "needs_human:publish_lockfile_hash_mismatch",
      "needs_human:publish_change_set_invalid",
    ]) {
      expect(publish).toContain(reason);
    }
  });

  it("runs the final guard after Run Artifact sanitization and before validated upload", () => {
    const finalize = jobBlock("finalize", "publish");
    const createRun = stepBlock(finalize, "Verify prepared input and create public Run Artifact");
    const finalGuard = stepBlock(finalize, "Run final guard and build validated manifest");
    const upload = stepBlock(finalize, "Upload validated artifact with exact six-file allowlist");
    const createRunIndex = finalize.indexOf(
      "- name: Verify prepared input and create public Run Artifact",
    );
    const finalGuardIndex = finalize.indexOf(
      "- name: Run final guard and build validated manifest",
    );
    const uploadIndex = finalize.indexOf(
      "- name: Upload validated artifact with exact six-file allowlist",
    );

    expect(createRunIndex).toBeGreaterThanOrEqual(0);
    expect(finalGuardIndex).toBeGreaterThan(createRunIndex);
    expect(uploadIndex).toBeGreaterThan(finalGuardIndex);

    expect(createRun).toContain('> "$RUNNER_TEMP/pre-run-validation.json"');
    expect(createRun).toContain('> "$RUNNER_TEMP/pre-run-graph.json"');
    expect(createRun).toContain("scripts/new-run.sh");
    expect(createRun).toContain("node scripts/sanitize-codex-artifacts.mjs");
    expect(createRun.match(/node scripts\/sanitize-codex-artifacts\.mjs/gu)).toHaveLength(2);
    expect(createRun).toContain("--write");
    expect(createRun).toContain("--check");
    expect(createRun).not.toContain("finalize-validation.json");
    expect(createRun).toContain("needs_human:run_strategy_invalid");

    for (const file of ["package.json", "pnpm-lock.yaml"]) {
      expect(finalGuard).toContain(`sha256sum ${file}`);
    }
    expect(finalGuard).toContain('sha256sum "$AUTHORIZATION_FILE"');
    expect(finalGuard).toContain('git show "$BASE_SHA:package.json"');
    expect(finalGuard).toContain('git show "$BASE_SHA:pnpm-lock.yaml"');
    expect(finalGuard).toContain(
      'corepack pnpm@10.34.5 list --json --depth Infinity > "$RUNNER_TEMP/finalize-graph.json"',
    );
    expect(finalGuard).toContain("--validate-prepared");
    expect(finalGuard).toContain('> "$FINALIZE_VALIDATION_FILE"');
    expect(finalGuard).toContain("needs_human:final_strategy_invalid");
    expect(finalGuard).toContain("needs_human:finalize_strategy_changed");
    expect(finalGuard).toContain("needs_human:run_plan_strategy_mismatch");
    expect(finalGuard).toContain("needs_human:run_report_strategy_mismatch");
    expect(finalGuard).toContain("git diff --name-only");
    expect(finalGuard).toContain("git ls-files --others --exclude-standard");
    expect(finalGuard).toContain("git diff --check");
    expect(finalGuard).toContain("strategy: validation.strategy");

    const finalValidationIndex = finalGuard.indexOf('> "$FINALIZE_VALIDATION_FILE"');
    const fileSetIndex = finalGuard.indexOf("expected_changes=");
    const manifestIndex = finalGuard.indexOf("const manifest =");
    expect(finalValidationIndex).toBeGreaterThanOrEqual(0);
    expect(fileSetIndex).toBeGreaterThan(finalValidationIndex);
    expect(manifestIndex).toBeGreaterThan(fileSetIndex);

    expect(upload).toContain("validated-fix.json");
    const afterFinalGuard = finalize.slice(uploadIndex);
    for (const forbidden of [
      "scripts/new-run.sh",
      "sanitize-codex-artifacts.mjs",
      "pnpm run verify",
      "pnpm run test",
      "pnpm run build",
      "pnpm install",
      "validate-security-dependency-fix.mjs",
    ]) {
      expect(afterFinalGuard).not.toContain(forbidden);
    }

    expect(createRun).toContain("selected_strategy=");
    expect(createRun).toContain("value.strategy");
    expect(createRun).toContain("選択strategy: $selected_strategy");
    expect(createRun).toContain("- strategy: $selected_strategy");
    expect(finalGuard).toContain(
      "FINALIZE_VALIDATION_FILE: ${{ runner.temp }}/finalize-validation.json",
    );
    expect(workflow).not.toContain("allowed_strategies.join");
    expect(workflow).not.toContain("strategy: authorization.allowed_strategies");
  });

  it("builds parent-scoped authorization from every baseline lockfile edge", () => {
    expect(workflow).toContain("collectBaselineSelectorProof");
    expect(workflow).toContain("baseline_selector_edges");
    expect(workflow).toContain("--lockfile pnpm-lock.yaml");
    expect(validatorSource).toContain('const LOCKFILE_SECTIONS = ["packages", "snapshots"]');
    expect(validatorSource).toContain("baseline selector target edges are missing");
    expect(validatorSource).toContain(
      "prepared override selector edge is not the expected exact version",
    );
    expect(validatorSource).toContain(
      "root parent update changed an unauthorized lockfile resolution",
    );
    expect(workflow).toContain("--baseline-lockfile");
  });

  it("keeps the OpenCode permission config deny-first and path-limited", () => {
    expect(Object.keys(config.permission ?? {})[0]).toBe("*");
    expect(config.permission?.["*"]).toBe("deny");
    expect(config.model).toBe("opencode/__SELECTED_FREE_MODEL_ID__");
    expect(config.small_model).toBe(config.model);
    expect(config.formatter).toBe(false);
    expect(config.lsp).toBe(false);
    expect(config.permission?.["read"]).toEqual({
      "package.json": "allow",
      "AGENTS.md": "allow",
      ".agents/skills/repair-loop/SKILL.md": "allow",
      ".agents/skills/repair-loop/references/repair-workflow.md": "allow",
      "docs/plans/2026-08-16_162000_public-repository-hardening.md": "allow",
    });
    expect(config.permission?.["edit"]).toEqual({ "package.json": "allow" });
  });

  it("does not run repository verification in finalize and never adds retry or auto-merge paths", () => {
    const validate = jobBlock("validate-exec", "finalize");
    const finalize = jobBlock("finalize", "publish");
    expect(finalize).not.toContain("pnpm run verify");
    expect(finalize).not.toContain("pnpm run test");
    expect(finalize).not.toContain("pnpm run build");
    expect(finalize).not.toContain("pnpm run lint");
    expect(stepBlock(validate, "Run repository verification on the prepared workspace")).toContain(
      "env -i",
    );
    expect(workflow).not.toMatch(/retry-on|max-attempts|automatic retry/i);
    expect(workflow).not.toContain("auto-merge");
    expect(workflow).toContain('git config user.name "github-actions[bot]"');
  });
});
