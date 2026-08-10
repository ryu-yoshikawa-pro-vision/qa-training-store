import crypto from "node:crypto";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "@playwright/test";
import {
  answerKeySchema,
  challengeIdSchema,
  challengeSchema,
  forbiddenProbeResultsSchema,
  parseJsonWithSchema,
  runIdSchema,
  toolProfileSchema,
  type AnswerKey,
  type ActualToolScope,
  type Challenge,
  type ToolProfile,
} from "./contracts";
import { buildLearnerBundle } from "./build-learner-bundle";
import { createBenchmarkRevision, benchmarkIdentity } from "./benchmark-revision";
import {
  createIsolatedRunnerRoot,
  probeForbiddenCapabilities,
  assertForbiddenProbePasses,
  type ForbiddenProbeResult,
  type IsolatedRunnerRoot,
} from "./isolation";
import { createRunnerProfile } from "./runner";
import { optionValue, requiredOptionValue } from "./cli";

export type PatchPreparation = {
  patch_path: string | null;
  apply_check: "skipped" | "passed" | "failed";
  applied: boolean;
  disposable_copy: "created_and_cleaned";
};

export type RuntimeSanityPhase = {
  build: "passed";
  sanity: "passed";
  status: 200;
  title: string;
  url: string;
  ground_truth: {
    scenario: string;
    path: string;
    expected: "clean" | "defect";
    observation: string;
  };
};

export type RuntimeSanity = {
  platform: "web";
  baseline: RuntimeSanityPhase;
  patched: RuntimeSanityPhase;
  scored_initial_state_reset: {
    passed: true;
    scenario: string;
    observation: string;
  };
};

/**
 * Internal-only handle for deterministic Web preparation and sanity checks.
 * It is never serialized or exposed as a Coding Agent orchestration API.
 */
type PreparedWebRuntimeHandle = {
  readonly baseUrl: string;
  withPage<T>(callback: (page: Page) => Promise<T>): Promise<T>;
  stop(): Promise<void>;
};

export type ChallengePreparation = {
  challenge: Challenge;
  answer_key: AnswerKey;
  learner_bundle: ReturnType<typeof buildLearnerBundle>;
  benchmark_revision: ReturnType<typeof createBenchmarkRevision>;
  benchmark_identity: ReturnType<typeof benchmarkIdentity>;
  runner_profile: ReturnType<typeof createRunnerProfile>;
  patch: PatchPreparation;
  runtime_sanity: RuntimeSanity;
  isolated_root: IsolatedRunnerRoot;
  forbidden_probe: ForbiddenProbeResult[];
  actual_tool_scope: ActualToolScope;
  tool_scope_validated: false;
  preparation_order: string[];
  run_dir: string;
};

function readJson(filePath: string, rootDir = process.cwd()): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid JSON at ${path.relative(rootDir, filePath).replace(/\\/g, "/")}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function challengePaths(
  rootDir: string,
  challengeId: string,
): { directory: string; challenge: string; answer: string; patch: string } {
  const directory = path.join(rootDir, "training", "agentic-qa", "challenges", challengeId);
  return {
    directory,
    challenge: path.join(directory, "challenge.json"),
    answer: path.join(
      rootDir,
      "training",
      "agentic-qa",
      "instructor",
      "answer-key",
      `${challengeId}.json`,
    ),
    patch: path.join(
      rootDir,
      "training",
      "agentic-qa",
      "instructor",
      "challenge-patches",
      `${challengeId}.patch`,
    ),
  };
}

function patchRelativePaths(patchFile: string): string[] {
  const paths: string[] = [];
  for (const line of fs.readFileSync(patchFile, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("--- ") && !line.startsWith("+++ ")) continue;
    const raw = line.slice(4).split("\t", 1)[0] ?? "";
    if (raw === "/dev/null") continue;
    const match = /^(?:a|b)\/(.+)$/.exec(raw);
    if (match?.[1] !== undefined && !paths.includes(match[1])) paths.push(match[1]);
  }
  return paths;
}

function copyDisposableSource(rootDir: string): string {
  const disposable = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-qa-source-"));
  fs.cpSync(rootDir, disposable, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(rootDir, source).split(path.sep).join("/");
      return ![".git", "node_modules", "output", "dist", ".artifacts", ".codex"].some(
        (prefix) => relative === prefix || relative.startsWith(`${prefix}/`),
      );
    },
  });
  const dependencies = path.join(rootDir, "node_modules");
  if (fs.existsSync(dependencies)) {
    const link = path.join(disposable, "node_modules");
    try {
      fs.mkdirSync(link, { recursive: true });
      for (const entry of fs.readdirSync(dependencies, { withFileTypes: true })) {
        const source = path.join(dependencies, entry.name);
        const destination = path.join(link, entry.name);
        const sourceStats = fs.statSync(source);
        if (!sourceStats.isDirectory()) continue;
        const resolvedSource = fs.realpathSync(source);
        if ([".bin", "expo-router", "tsx"].includes(entry.name) && sourceStats.isDirectory()) {
          fs.cpSync(resolvedSource, destination, { recursive: true });
          continue;
        }
        fs.symlinkSync(
          resolvedSource,
          destination,
          process.platform === "win32"
            ? sourceStats.isDirectory()
              ? "junction"
              : "file"
            : sourceStats.isDirectory()
              ? "dir"
              : "file",
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to prepare disposable dependency overlay: ${commandFailureText(error)}`,
        { cause: error },
      );
    }
  }
  return disposable;
}

function cleanupDisposableSource(disposable: string): void {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      fs.rmSync(disposable, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
  }
}

function cleanupStaleDisposableSources(): void {
  const staleAfterMs = 60 * 60 * 1000;
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(os.tmpdir(), { withFileTypes: true });
  } catch {
    return;
  }
  const now = performance.timeOrigin + performance.now();
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("agentic-qa-source-")) continue;
    const disposable = path.join(os.tmpdir(), entry.name);
    try {
      if (now - fs.statSync(disposable).mtimeMs < staleAfterMs) continue;
      cleanupDisposableSource(disposable);
    } catch {
      // Stale cleanup is best effort; the current preparation owns its own
      // cleanup and will fail closed if that cleanup cannot complete.
    }
  }
}

function applyPatchToDisposable(
  rootDir: string,
  disposable: string,
  patchFile: string | null,
): PatchPreparation {
  if (patchFile === null)
    return {
      patch_path: null,
      apply_check: "skipped",
      applied: false,
      disposable_copy: "created_and_cleaned",
    };
  try {
    for (const relativePath of patchRelativePaths(patchFile)) {
      const source = path.join(rootDir, relativePath);
      const destination = path.join(disposable, relativePath);
      if (fs.existsSync(source)) {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(source, destination);
      }
    }
    const gitArgs = ["apply", "--check", "--", patchFile];
    execFileSync("git", gitArgs, { cwd: disposable, stdio: "pipe" });
    execFileSync("git", ["apply", "--", patchFile], { cwd: disposable, stdio: "pipe" });
    return {
      patch_path: path.relative(rootDir, patchFile).split(path.sep).join("/"),
      apply_check: "passed",
      applied: true,
      disposable_copy: "created_and_cleaned",
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Challenge patch preparation failed: ${detail}`);
  }
}

function pnpmInvocation(args: string[]): { command: string; args: string[] } {
  if (process.platform === "win32") {
    const command = args.join(" ");
    return {
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", `pnpm ${command}`],
    };
  }
  return { command: "pnpm", args };
}

function commandFailureText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const result = error as { message?: unknown; stdout?: unknown; stderr?: unknown };
    return [result.message, result.stdout, result.stderr]
      .filter((value) => value !== undefined && value !== null)
      .map((value) => (Buffer.isBuffer(value) ? value.toString("utf8") : String(value)))
      .join("\n");
  }
  return String(error);
}

function runWebBuild(
  disposable: string,
  preparationRoot: string,
  phase: "baseline" | "patched",
): void {
  const logPath = path.join(preparationRoot, `${phase}-build.log`);
  try {
    const invocation = pnpmInvocation(["run", "build:web"]);
    const output = execFileSync(invocation.command, invocation.args, {
      cwd: disposable,
      encoding: "utf8",
      env: {
        ...process.env,
        EXPO_PUBLIC_BUILD_KIND: "automation",
        EXPO_PUBLIC_TEST_MODE: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 600_000,
    });
    fs.writeFileSync(logPath, output, "utf8");
  } catch (error) {
    fs.writeFileSync(logPath, commandFailureText(error), "utf8");
    throw new Error(`${phase} web build failed: ${commandFailureText(error)}`);
  }
}

async function findFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || address === null) {
        server.close();
        reject(new Error("Could not reserve a local web server port"));
        return;
      }
      const port = address.port;
      server.close((error) => (error === undefined ? resolve(port) : reject(error)));
    });
  });
}

async function waitForWebRuntime(url: string): Promise<Omit<RuntimeSanityPhase, "ground_truth">> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      const body = await response.text();
      if (response.status === 200 && body.includes("Scenario Shop")) {
        const title = /<title>([^<]*)<\/title>/i.exec(body)?.[1] ?? "";
        return { build: "passed", sanity: "passed", status: 200, title, url };
      }
    } catch {
      // The server may still be starting; the bounded polling loop is the evidence window.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Web runtime did not become ready: ${url}`);
}

async function resetBrowserScenario(
  page: Page,
  baseUrl: string,
  scenario: string,
  clearSession = false,
): Promise<void> {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => (window as unknown as { __TEST_API__?: unknown }).__TEST_API__ !== undefined,
  );
  await page.evaluate(async (scenarioName) => {
    const api = (
      window as unknown as {
        __TEST_API__?: { reset: (input: { scenario: string }) => Promise<unknown> };
      }
    ).__TEST_API__;
    if (api === undefined) throw new Error("Browser test control API is unavailable");
    await api.reset({ scenario: scenarioName });
  }, scenario);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => (window as unknown as { __TEST_API__?: unknown }).__TEST_API__ !== undefined,
  );
  if (clearSession) {
    await page.evaluate(() => localStorage.removeItem("scenario-shop.session-id"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => (window as unknown as { __TEST_API__?: unknown }).__TEST_API__ !== undefined,
    );
  }
}

async function runChallengeGroundTruthSanity(
  page: Page,
  baseUrl: string,
  challenge: Challenge,
  phase: "baseline" | "patched",
): Promise<RuntimeSanityPhase["ground_truth"]> {
  const expected = phase === "baseline" ? "clean" : "defect";
  if (challenge.challenge_id === "CHALLENGE-BASIC-001") {
    await resetBrowserScenario(page, baseUrl, "suspended-user", true);
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("メールアドレス").fill("suspended@example.com");
    await page.getByLabel("パスワード").fill("testpass1");
    await page.getByRole("button", { name: "ログイン", exact: true }).click();
    if (phase === "baseline") {
      const alert = page.getByRole("alert");
      await alert.waitFor({ state: "visible" });
      const message = await alert.innerText();
      const sessionId = await page.evaluate(() => localStorage.getItem("scenario-shop.session-id"));
      if (!message.includes("利用停止中") || sessionId !== null)
        throw new Error("Basic baseline sanity did not reject the suspended account");
      return {
        scenario: "suspended-user",
        path: "/login",
        expected,
        observation: "suspended login rejected and no session was created",
      };
    }
    await page.waitForFunction(() => localStorage.getItem("scenario-shop.session-id") !== null);
    await page.waitForURL(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    const pathname = await page.evaluate(() => window.location.pathname);
    if (pathname !== "/") throw new Error(`Basic patched sanity landed on ${pathname}`);
    return {
      scenario: "suspended-user",
      path: "/login",
      expected,
      observation: "suspended login created a session and navigated to the customer home",
    };
  }

  if (challenge.challenge_id === "CHALLENGE-INTERMEDIATE-001") {
    await resetBrowserScenario(page, baseUrl, "orders-phase1-statuses");
    await page.goto(`${baseUrl}/admin/orders/order-paid`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "発送準備を開始", exact: true }).waitFor();
    const invalidAction = page.getByRole("button", { name: "配達完了にする", exact: true });
    const invalidActionCount = await invalidAction.count();
    if (phase === "baseline" && invalidActionCount !== 0)
      throw new Error("Intermediate baseline exposes an invalid paid-order action");
    if (phase === "patched" && invalidActionCount !== 1)
      throw new Error("Intermediate patched sanity did not expose the injected invalid action");
    return {
      scenario: "orders-phase1-statuses",
      path: "/admin/orders/order-paid",
      expected,
      observation:
        phase === "baseline"
          ? "paid order exposes only the preparing action"
          : "paid order also exposes the invalid delivery-complete action",
    };
  }

  if (challenge.challenge_id === "CHALLENGE-ADVANCED-001") {
    await resetBrowserScenario(page, baseUrl, "default");
    await page.goto(`${baseUrl}/products`, { waitUntil: "domcontentloaded" });
    await page.locator(".catalog-page__header").waitFor();
    const restrictedProduct = page.getByText("ランニングシューズ", { exact: true });
    const restrictedProductCount = await restrictedProduct.count();
    if (phase === "baseline" && restrictedProductCount !== 0)
      throw new Error("Advanced baseline exposes the rank-restricted product to a guest");
    if (phase === "patched" && restrictedProductCount === 0)
      throw new Error("Advanced patched sanity did not expose the injected product");
    return {
      scenario: "default",
      path: "/products",
      expected,
      observation:
        phase === "baseline"
          ? "guest storefront hides the rank-restricted product"
          : "guest storefront exposes the rank-restricted product",
    };
  }

  throw new Error(`No Web Ground Truth Sanity adapter for ${challenge.challenge_id}`);
}

async function stopWebServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    server.once("exit", finish);
    if (process.platform === "win32" && server.pid !== undefined) {
      try {
        execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      } catch {
        server.kill();
      }
    } else {
      server.kill();
    }
    setTimeout(() => {
      if (server.exitCode === null) server.kill("SIGKILL");
      finish();
    }, 2_000);
  });
}

type RunningWebRuntime = PreparedWebRuntimeHandle & {
  readonly readiness: Omit<RuntimeSanityPhase, "ground_truth">;
};

async function startWebRuntime(
  disposable: string,
  preparationRoot: string,
  phase: "baseline" | "patched",
): Promise<RunningWebRuntime> {
  runWebBuild(disposable, preparationRoot, phase);
  const port = await findFreePort();
  const url = `http://127.0.0.1:${port}/`;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const invocation = pnpmInvocation(["exec", "tsx", "scripts/serve-web-dist.ts"]);
  const server = spawn(invocation.command, invocation.args, {
    cwd: disposable,
    env: { ...process.env, WEB_SERVER_HOST: "127.0.0.1", WEB_SERVER_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk: Buffer | string) => stdout.push(chunk.toString()));
  server.stderr.on("data", (chunk: Buffer | string) => stderr.push(chunk.toString()));
  const browserDiagnostics: string[] = [];
  let stopped = false;
  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    await stopWebServer(server);
    fs.writeFileSync(
      path.join(preparationRoot, `${phase}-browser-diagnostics.log`),
      browserDiagnostics.join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(preparationRoot, `${phase}-server-stdout.log`),
      stdout.join(""),
      "utf8",
    );
    fs.writeFileSync(
      path.join(preparationRoot, `${phase}-server-stderr.log`),
      stderr.join(""),
      "utf8",
    );
  };
  const withPage = async <T>(callback: (page: Page) => Promise<T>): Promise<T> => {
    if (stopped) throw new Error(`${phase} Web runtime is already stopped`);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      page.on("console", (message) =>
        browserDiagnostics.push(`console:${message.type()}:${message.text()}`),
      );
      page.on("pageerror", (error) => browserDiagnostics.push(`pageerror:${error.message}`));
      return await callback(page);
    } finally {
      await browser.close();
    }
  };
  try {
    const result = await waitForWebRuntime(url);
    return {
      baseUrl: url.replace(/\/$/, ""),
      readiness: result,
      withPage,
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
}

async function runWebRuntimePhase(
  disposable: string,
  preparationRoot: string,
  phase: "baseline" | "patched",
  challenge: Challenge,
): Promise<RuntimeSanityPhase> {
  const runtime = await startWebRuntime(disposable, preparationRoot, phase);
  try {
    const groundTruth = await runtime.withPage((page) =>
      runChallengeGroundTruthSanity(page, runtime.baseUrl, challenge, phase),
    );
    return { ...runtime.readiness, ground_truth: groundTruth };
  } finally {
    await runtime.stop();
  }
}

function initialStateForChallenge(challenge: Challenge): {
  scenario: string;
  clearSession: boolean;
} {
  if (challenge.challenge_id === "CHALLENGE-BASIC-001")
    return { scenario: "suspended-user", clearSession: true };
  if (challenge.challenge_id === "CHALLENGE-INTERMEDIATE-001")
    return { scenario: "orders-phase1-statuses", clearSession: false };
  if (challenge.challenge_id === "CHALLENGE-ADVANCED-001")
    return { scenario: "default", clearSession: false };
  throw new Error(`No scored runtime reset adapter for ${challenge.challenge_id}`);
}

async function prepareWebRuntime(
  rootDir: string,
  disposable: string,
  patchFile: string | null,
  preparationRoot: string,
  challenge: Challenge,
): Promise<{
  patch: PatchPreparation;
  runtimeSanity: RuntimeSanity;
}> {
  const reset = initialStateForChallenge(challenge);
  const baseline = await runWebRuntimePhase(disposable, preparationRoot, "baseline", challenge);
  fs.rmSync(path.join(disposable, "dist"), { recursive: true, force: true });
  const patch = applyPatchToDisposable(rootDir, disposable, patchFile);
  const patchedRuntime = await startWebRuntime(disposable, preparationRoot, "patched");
  try {
    const patchedGroundTruth = await patchedRuntime.withPage((page) =>
      runChallengeGroundTruthSanity(page, patchedRuntime.baseUrl, challenge, "patched"),
    );
    await patchedRuntime.withPage((page) =>
      resetBrowserScenario(page, patchedRuntime.baseUrl, reset.scenario, reset.clearSession),
    );
    const scoredInitialStateReset = {
      passed: true as const,
      scenario: reset.scenario,
      observation: "The patched runtime was reset after post-patch sanity on the same server.",
    };
    const runtimeSanity: RuntimeSanity = {
      platform: "web",
      baseline,
      patched: { ...patchedRuntime.readiness, ground_truth: patchedGroundTruth },
      scored_initial_state_reset: scoredInitialStateReset,
    };
    const order = [
      "baseline_build",
      "pre_patch_sanity",
      "baseline_runtime_cleanup",
      "git_apply_check_and_apply",
      "patched_build",
      "post_patch_sanity",
      "scored_initial_state_reset",
    ];
    fs.writeFileSync(
      path.join(preparationRoot, "runtime-sanity.json"),
      JSON.stringify(
        {
          platform: "web",
          baseline,
          patched: runtimeSanity.patched,
          patch,
          scored_initial_state_reset: scoredInitialStateReset,
          order,
        },
        null,
        2,
      ),
      "utf8",
    );
    return {
      patch,
      runtimeSanity,
    };
  } finally {
    await patchedRuntime.stop();
  }
}

function copyToolProfile(rootDir: string): { profile: ToolProfile; revision: `sha256:${string}` } {
  const profilePath = path.join(
    rootDir,
    "training",
    "agentic-qa",
    "tool-profiles",
    "scored-v1.json",
  );
  const profile = parseJsonWithSchema(
    readJson(profilePath, rootDir),
    toolProfileSchema,
    "training/agentic-qa/tool-profiles/scored-v1.json",
  );
  return { profile, revision: `sha256:${sha256File(profilePath)}` };
}

export async function prepareChallenge(input: {
  rootDir?: string;
  challengeId: string;
  runId: string;
  runDir: string;
  runtimeVariantId?: string | null;
  model?: string;
}): Promise<ChallengePreparation> {
  const rootDir = input.rootDir ?? process.cwd();
  const runId = runIdSchema.parse(input.runId);
  challengeIdSchema.parse(input.challengeId);
  cleanupStaleDisposableSources();
  const runtimeVariantId = input.runtimeVariantId ?? null;
  const paths = challengePaths(rootDir, input.challengeId);
  const challenge = parseJsonWithSchema(
    readJson(paths.challenge, rootDir),
    challengeSchema,
    "training/agentic-qa/challenges/" + input.challengeId + "/challenge.json",
  );
  const answerKey = parseJsonWithSchema(
    readJson(paths.answer, rootDir),
    answerKeySchema,
    "training/agentic-qa/instructor/answer-key/" + input.challengeId + ".json",
  );
  const artifactRoot = path.join(rootDir, ".artifacts", "agentic-qa", runId, input.challengeId);
  const learnerBundle = buildLearnerBundle(
    rootDir,
    challenge,
    path.join(artifactRoot, "learner-spec"),
  );
  const patchFile = fs.existsSync(paths.patch) ? paths.patch : null;
  const tool = copyToolProfile(rootDir);
  const runnerProfile = createRunnerProfile({
    model: input.model ?? "local-deterministic-runner",
    toolProfileRevision: tool.revision,
    challenge,
  });
  const benchmarkRevision = createBenchmarkRevision({
    rootDir,
    challenge,
    answerKey,
    learnerBundle,
    runtimeVariantId,
    patchPath:
      patchFile === null
        ? null
        : `training/agentic-qa/instructor/challenge-patches/${challenge.challenge_id}.patch`,
    runnerProfile,
  });
  const preparationRoot = path.join(artifactRoot, "preparation");
  fs.mkdirSync(preparationRoot, { recursive: true });
  const disposable = copyDisposableSource(rootDir);
  let patch: PatchPreparation;
  let runtimeSanity: RuntimeSanity;
  let isolatedRoot: IsolatedRunnerRoot | undefined;
  let forbiddenProbe: ForbiddenProbeResult[] | undefined;
  let actualToolScope: ActualToolScope | undefined;
  try {
    if (challenge.target_platform !== "web")
      throw new Error(`Runtime sanity adapter is not implemented for ${challenge.target_platform}`);
    const prepared = await prepareWebRuntime(
      rootDir,
      disposable,
      patchFile,
      preparationRoot,
      challenge,
    );
    patch = prepared.patch;
    runtimeSanity = prepared.runtimeSanity;
    isolatedRoot = createIsolatedRunnerRoot({
      outputRoot: path.join(artifactRoot, "isolated-run-root"),
      learnerBundle,
      challengeDirectory: paths.directory,
      challenge,
    });
    actualToolScope = {
      measured: false,
      source: "unavailable",
      exposed_capabilities: [],
    };
    const measuredProbe = probeForbiddenCapabilities(
      isolatedRoot.root,
      tool.profile,
      actualToolScope,
    );
    forbiddenProbe = parseJsonWithSchema(
      measuredProbe,
      forbiddenProbeResultsSchema,
      "forbidden-probe",
    );
    assertForbiddenProbePasses(tool.profile, forbiddenProbe);
    fs.writeFileSync(
      path.join(preparationRoot, "forbidden-probe.json"),
      `${JSON.stringify(forbiddenProbe, null, 2)}\n`,
      "utf8",
    );
    fs.writeFileSync(
      path.join(preparationRoot, "tool-scope.json"),
      `${JSON.stringify(actualToolScope, null, 2)}\n`,
      "utf8",
    );
  } finally {
    cleanupDisposableSource(disposable);
  }
  if (isolatedRoot === undefined || forbiddenProbe === undefined || actualToolScope === undefined)
    throw new Error("Preparation did not execute the isolated-root and Forbidden Probe step");
  const revisionIdentity = benchmarkIdentity(
    challenge.challenge_id,
    benchmarkRevision.revision,
    runtimeVariantId,
  );
  const preparationOrder = [
    "machine_contract_validation",
    "required_coverage_derive",
    "learner_safe_spec_bundle",
    "benchmark_revision_and_identity",
    "runner_profile",
    "disposable_source_copy",
    "baseline_build_serve_install",
    "pre_patch_baseline_sanity",
    "baseline_runtime_cleanup",
    "git_apply_check_and_apply",
    "patched_build_serve_install",
    "post_patch_sanity",
    "scored_initial_state_reset",
    "isolated_execution_root",
    "actual_tool_scope_unavailable",
    "positive_tool_allowlist_and_forbidden_probe",
    "runtime_stop_and_disposable_cleanup",
  ];
  fs.writeFileSync(
    path.join(preparationRoot, "preparation-order.json"),
    `${JSON.stringify(preparationOrder, null, 2)}\n`,
    "utf8",
  );
  fs.mkdirSync(input.runDir, { recursive: true });
  fs.writeFileSync(
    path.join(input.runDir, `benchmark-manifest-${challenge.challenge_id}.json`),
    benchmarkRevision.serialized_manifest,
    "utf8",
  );
  return {
    challenge,
    answer_key: answerKey,
    learner_bundle: learnerBundle,
    benchmark_revision: benchmarkRevision,
    benchmark_identity: revisionIdentity,
    runner_profile: runnerProfile,
    patch,
    runtime_sanity: runtimeSanity,
    isolated_root: isolatedRoot,
    forbidden_probe: forbiddenProbe,
    actual_tool_scope: actualToolScope,
    tool_scope_validated: false,
    preparation_order: preparationOrder,
    run_dir: input.runDir,
  };
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const challengeId = requiredOptionValue(args, "--challenge");
  challengeIdSchema.parse(challengeId);
  const runDir = requiredOptionValue(args, "--run-dir");
  const model = optionValue(args, "--model");
  const result = await prepareChallenge({
    challengeId,
    runId: path.basename(runDir),
    runDir,
    ...(model === undefined ? {} : { model }),
  });
  console.log(
    `Prepared ${result.challenge.challenge_id} with ${result.learner_bundle.entries.length} learner spec file(s), revision ${result.benchmark_revision.revision}`,
  );
}

if (isMainModule()) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exitCode = 1;
  });
}
