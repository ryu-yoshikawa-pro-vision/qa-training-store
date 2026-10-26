#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildOpenCodeEnvironment } from "./ai-assisted-qa-assessment-core.mjs";
import {
  buildTutorConfig,
  buildTutorInitialPrompt,
  parseTutorArgs,
  REQUIRED_OPEN_CODE_VERSION,
} from "./ai-assisted-qa-course-tutor-core.mjs";
import { verifySyncedCourseDistribution } from "./ai-assisted-qa-course-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) {
  throw new Error(message);
}

function readConfirmation() {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    fail(
      "BLOCKED: interactive confirmation is required before opening an external AI tutor session",
    );
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return rl;
}

export async function runTutorCli(argv = process.argv.slice(2)) {
  const request = parseTutorArgs(argv);
  verifySyncedCourseDistribution({ root: ROOT });
  const lesson = path.join(ROOT, "course", "modules", request.moduleId, "README.md");
  const submission = path.join(ROOT, "workspace", request.moduleId);
  const fs = await import("node:fs");
  if (!fs.existsSync(lesson) || !fs.statSync(lesson).isFile())
    fail(
      `${request.moduleId} is not available in the verified course distribution; run pnpm course:load ${request.moduleId} first`,
    );
  if (!fs.existsSync(submission) || !fs.statSync(submission).isDirectory())
    fail(
      `${request.moduleId} workspace is not loaded; run pnpm course:load ${request.moduleId} first`,
    );
  const executable = process.platform === "win32" ? "opencode.cmd" : "opencode";
  const versionResult = spawnSync(executable, ["--version"], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    shell: process.platform === "win32",
  });
  if (versionResult.error) fail(`OpenCode CLI is unavailable: ${versionResult.error.message}`);
  const actualVersion = versionResult.stdout?.trim().split(/\r?\n/).at(-1)?.replace(/^v/, "");
  if (versionResult.status !== 0 || actualVersion !== REQUIRED_OPEN_CODE_VERSION)
    fail(
      `OpenCode CLI ${REQUIRED_OPEN_CODE_VERSION} is required; found ${actualVersion || "no version"}`,
    );
  console.log(`対象モジュール: ${request.moduleId}`);
  console.log(`モデル: ${request.modelId}`);
  console.log(
    "外部AIへ送る内容は、この対話で本人が入力した質問と、読み取り許可された公開教材・選択モジュールの成果物です。環境変数、Secret、他モジュール、正式評価記録は読み取りません。",
  );
  console.log(
    "モデル利用条件と費用を本人が確認してください。自動モデル切替はありません。対話はOpenCodeの通常の保存設定に従います。",
  );
  const rl = readConfirmation();
  let consent;
  try {
    consent =
      (await rl.question(`開始する場合だけ START ${request.modelId} と入力: `)) ===
      `START ${request.modelId}`;
  } finally {
    rl.close();
  }
  if (!consent) {
    console.log("チューターを起動しませんでした。");
    return;
  }
  const environment = buildOpenCodeEnvironment({
    extra: {
      OPENCODE_DISABLE_PROJECT_CONFIG: "true",
      OPENCODE_CONFIG_CONTENT: JSON.stringify(buildTutorConfig(request)),
    },
  });
  const result = spawnSync(
    executable,
    ["mini", "--model", request.modelId, "--prompt", buildTutorInitialPrompt(request.moduleId)],
    {
      cwd: ROOT,
      env: environment,
      stdio: "inherit",
      windowsHide: true,
      shell: process.platform === "win32",
    },
  );
  if (result.error) fail(`OpenCode tutor could not start: ${result.error.message}`);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runTutorCli().catch((error) => {
    console.error(
      `course:tutor stopped: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
