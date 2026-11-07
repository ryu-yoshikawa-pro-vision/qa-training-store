#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildOpenCodeEnvironment,
  parseOpenCodeJsonEvents,
} from "./ai-assisted-qa-assessment-core.mjs";
import {
  buildTutorConfig,
  buildTutorRunArgs,
  buildTutorTurnPrompt,
  parseTutorArgs,
  readTutorPublicFile,
  readTutorWorkspaceExcerpt,
  REQUIRED_OPEN_CODE_VERSION,
  tutorPublicPaths,
  validateTutorText,
  MAX_TUTOR_QUESTION_BYTES,
} from "./ai-assisted-qa-course-tutor-core.mjs";
import { verifySyncedCourseDistribution } from "./ai-assisted-qa-course-core.mjs";
import { verifiedTutorRunSummary } from "./ai-assisted-qa-run-evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) {
  throw new Error("BLOCKED: " + message);
}

export function makeIsolatedEnvironment(directory, request) {
  for (const subdir of ["home", "config", "data", "cache"]) {
    fs.mkdirSync(path.join(directory, subdir), { mode: 0o700 });
  }
  const home = path.join(directory, "home");
  const config = path.join(directory, "config");
  const data = path.join(directory, "data");
  return buildOpenCodeEnvironment({
    extra: {
      HOME: home,
      USERPROFILE: home,
      APPDATA: config,
      LOCALAPPDATA: data,
      XDG_CONFIG_HOME: config,
      XDG_DATA_HOME: data,
      XDG_CACHE_HOME: path.join(directory, "cache"),
      OPENCODE_CONFIG_DIR: config,
      OPENCODE_DB: ":memory:",
      OPENCODE_DISABLE_PROJECT_CONFIG: "true",
      OPENCODE_DISABLE_AUTOUPDATE: "true",
      OPENCODE_CONFIG_CONTENT: JSON.stringify(buildTutorConfig(request)),
    },
  });
}

export function runValidatedTutorTurn({ request, question, documents, history = [], invoke }) {
  // The sole entry to the model subprocess: validation happens before invoke.
  const prompt = buildTutorTurnPrompt({
    moduleId: request.moduleId,
    question,
    documents,
    history,
  });
  if (typeof invoke !== "function") fail("model runner is missing");
  return invoke(prompt);
}

export function prepareTutorTurnForSend({
  root,
  request,
  question,
  documents,
  publishedFiles,
  history = [],
  pendingExcerpt = null,
  pendingRunSummary = null,
  sourceSha,
}) {
  // Read the actual pinned bytes, not previously buffered text, at both approval gates.
  const refreshedDocuments = documents.map(({ path: relativePath }) => ({
    path: relativePath,
    text: readTutorPublicFile(root, request.moduleId, relativePath, publishedFiles),
  }));
  const verifiedExcerpt = pendingExcerpt
    ? (() => {
        const range = pendingExcerpt.range.split("-").map(Number);
        const current = readTutorWorkspaceExcerpt(
          root,
          request.moduleId,
          pendingExcerpt.path,
          range[0],
          range[1],
        );
        if (
          current.source_sha256 !== pendingExcerpt.source_sha256 ||
          current.text !== pendingExcerpt.text
        )
          fail("selected learner file changed before sending");
        return current;
      })()
    : null;
  const verifiedRun = pendingRunSummary
    ? (() => {
        const current = verifiedTutorRunSummary({
          root,
          moduleId: request.moduleId,
          runId: pendingRunSummary.run_id,
          sourceSha,
        });
        if (JSON.stringify(current) !== JSON.stringify(pendingRunSummary))
          fail("selected Run metadata changed before sending");
        return current;
      })()
    : null;
  return buildTutorTurnPrompt({
    moduleId: request.moduleId,
    question,
    documents: refreshedDocuments,
    history,
    excerpt: verifiedExcerpt,
    runSummary: verifiedRun,
  });
}

export async function runTutorCli(argv = process.argv.slice(2)) {
  const request = parseTutorArgs(argv);
  const verifiedDistribution = verifySyncedCourseDistribution({ root: ROOT });
  const distribution = JSON.parse(
    fs.readFileSync(path.join(ROOT, ".course", "distribution-manifest.json"), "utf8"),
  );
  const publishedFiles = new Map(
    distribution.files.map((entry) => [entry.target_path, entry.sha256]),
  );
  if (publishedFiles.size !== verifiedDistribution.distribution_files_verified)
    fail("distribution file list changed after verification");
  if (process.platform === "win32")
    fail("native Windows .cmd process isolation has not been validated; use WSL2");
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    fail("interactive input and per-request send confirmation are required");

  const documents = tutorPublicPaths(request.moduleId).map((relativePath) => ({
    path: relativePath,
    text: readTutorPublicFile(ROOT, request.moduleId, relativePath, publishedFiles),
  }));
  const cli = "opencode";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const history = [];
  let pendingExcerpt = null;
  let pendingRunSummary = null;
  console.log(
    "通常チューターは公開教材3ファイル、/sourceで選んだ公開仕様1件と本人が確認した質問だけを送ります。" +
      "workspace・Run原本・正式評価・個人履歴は自動で読みません。",
  );
  console.log(
    "毎回送信確認を求めます。質問は8KiB以内。個人情報とSecretは拒否します。" +
      "/excerpt workspace/Mxx/ファイル名 1-10で選んだ成果物の最大40行、" +
      "/run UUIDで選んだ検証済Runの要約、直近4問答も送信確認対象です。" +
      "対話履歴はこの実行のメモリ内だけにあり、再開・保存・正式評価への転記はしません。" +
      "OpenCode側の実認証・履歴・保管条件は本人環境で確認するまで未受入です。",
  );
  try {
    if (
      (await rl.question("開始する場合だけ START " + request.modelId + " と入力: ")) !==
      "START " + request.modelId
    ) {
      console.log("チューターを起動しませんでした。");
      return;
    }
    for (;;) {
      const question = await rl.question("質問を入力（/exitで終了）: ");
      if (question === "/exit") break;
      if (question.startsWith("/run ")) {
        try {
          const runId = question.slice("/run ".length).trim();
          verifySyncedCourseDistribution({ root: ROOT });
          pendingRunSummary = verifiedTutorRunSummary({
            root: ROOT,
            moduleId: request.moduleId,
            runId,
            sourceSha: verifiedDistribution.source_sha,
          });
          console.log(
            "検証済みRunの件数・SHA・状態だけを選択しました。内容やTraceは送信しません。",
          );
        } catch {
          pendingRunSummary = null;
          console.error("BLOCKED: Runの照合に失敗しました。");
        }
        continue;
      }
      if (question.startsWith("/excerpt ")) {
        try {
          const match =
            /^\/excerpt (workspace\/M(?:0[0-9]|10)\/[A-Za-z0-9_./-]+) (\d+)-(\d+)$/.exec(question);
          if (!match) fail("excerpt usage is invalid");
          pendingExcerpt = readTutorWorkspaceExcerpt(
            ROOT,
            request.moduleId,
            match[1],
            Number(match[2]),
            Number(match[3]),
          );
          console.log("指定行を検査しました。次の質問への送信確認までは外部AIを起動しません。");
        } catch {
          pendingExcerpt = null;
          console.error("BLOCKED: 学習者ファイルの選択を拒否しました。");
        }
        continue;
      }
      if (question.startsWith("/source ")) {
        // An extra published specification is included only after an explicit choice.
        try {
          const source = question.slice("/source ".length).trim();
          verifySyncedCourseDistribution({ root: ROOT });
          const text = readTutorPublicFile(ROOT, request.moduleId, source, publishedFiles);
          documents[3] = { path: source, text };
          console.log("公開仕様を一件だけ選択しました。次の質問で送信確認します。");
        } catch {
          documents.length = 3;
          console.error("BLOCKED: 公開仕様の参照を拒否しました。");
        }
        continue;
      }
      // No OpenCode child process, including --version, runs before these checks.
      let prepared;
      try {
        prepared = prepareTutorTurnForSend({
          root: ROOT,
          request,
          question,
          documents,
          publishedFiles,
          history,
          pendingExcerpt,
          pendingRunSummary,
          sourceSha: verifiedDistribution.source_sha,
        });
      } catch {
        pendingExcerpt = null;
        pendingRunSummary = null;
        console.error("BLOCKED: 入力の安全検査に失敗しました。内容は外部AIへ渡しません。");
        continue;
      }
      console.log(
        "送信対象：公開教材3件、指定した公開仕様" +
          (documents[3] ? "1件" : "0件") +
          "、今回の質問、過去の会話" +
          history.length +
          "往復、指定抜粋" +
          (pendingExcerpt ? "1件" : "0件") +
          "、検証済Run要約" +
          (pendingRunSummary ? "1件" : "0件") +
          "。",
      );
      if (
        (await rl.question("送信する場合だけ SEND " + request.modelId + " と入力: ")) !==
        "SEND " + request.modelId
      ) {
        pendingExcerpt = null;
        pendingRunSummary = null;
        console.log("送信を取り消しました。");
        continue;
      }

      const approvedExcerpt = pendingExcerpt;
      const approvedRunSummary = pendingRunSummary;
      pendingExcerpt = null;
      pendingRunSummary = null;
      try {
        const currentDistribution = verifySyncedCourseDistribution({ root: ROOT });
        if (
          currentDistribution.source_sha !== verifiedDistribution.source_sha ||
          currentDistribution.distribution_files_verified !== publishedFiles.size
        )
          fail("distribution changed after SEND confirmation");
        const confirmedPrompt = prepareTutorTurnForSend({
          root: ROOT,
          request,
          question,
          documents,
          publishedFiles,
          history,
          pendingExcerpt: approvedExcerpt,
          pendingRunSummary: approvedRunSummary,
          sourceSha: verifiedDistribution.source_sha,
        });
        if (confirmedPrompt !== prepared) fail("model input changed after SEND confirmation");
      } catch {
        console.error(
          "BLOCKED: 送信確認後に教材・成果物・Runが変更されました。外部AIは起動しません。",
        );
        continue;
      }
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qa-course-tutor-"));
      try {
        const environment = makeIsolatedEnvironment(directory, request);
        const promptPath = path.join(directory, "request.txt");
        fs.writeFileSync(promptPath, prepared, { mode: 0o600, flag: "wx" });
        const version = spawnSync(cli, ["--version"], {
          cwd: directory,
          env: environment,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 10000,
          shell: false,
        });
        if (
          version.error ||
          version.status !== 0 ||
          version.stdout?.trim().split(/\r?\n/).at(-1)?.replace(/^v/, "") !==
            REQUIRED_OPEN_CODE_VERSION
        )
          fail("OpenCode CLI 2.0.22 is required");
        const result = spawnSync(cli, buildTutorRunArgs({ modelId: request.modelId, promptPath }), {
          cwd: directory,
          env: environment,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          maxBuffer: 1024 * 1024,
          timeout: 120000,
          shell: false,
        });
        if (result.error || result.status !== 0) fail("model command failed; no raw logs retained");
        const parsed = parseOpenCodeJsonEvents(result.stdout, result.status);
        const answer = validateTutorText(
          parsed.response,
          "model response",
          MAX_TUTOR_QUESTION_BYTES,
        );
        console.log(answer);
        history.push({ question, answer });
        if (history.length > 4) history.shift();
      } finally {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    }
  } finally {
    rl.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runTutorCli().catch((error) => {
    console.error(
      "course:tutor stopped: " + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 1;
  });
}
