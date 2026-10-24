#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkState,
  loadCourseManifest,
  loadModule,
  syncCourse,
  validateCourseManifest,
  verifySyncedCourseDistribution,
} from "./ai-assisted-qa-course-core.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function option(args, name) {
  const index = args.indexOf(name);
  if (index < 0 || index + 1 >= args.length) throw new Error(`${name} is required`);
  return args[index + 1];
}

function printState(result) {
  const labels = {
    ready: "配布・構造一致（実行環境は未確認）",
    insufficient: "不足・未達",
    mismatch: "不整合",
    unverifiable: "確認不能",
  };
  console.log(
    JSON.stringify({ ...result, status_label: labels[result.status] ?? result.status }, null, 2),
  );
  if (result.status !== "ready") process.exitCode = 1;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "verify-distribution") {
    if (args.length > 0) throw new Error("verify-distribution accepts no arguments");
    const result = verifySyncedCourseDistribution({ root: process.cwd() });
    console.log(
      JSON.stringify({ message: "学習用の固定配布物を検証しました", ...result }, null, 2),
    );
    return;
  }
  if (command === "sync") {
    const sourceSha = option(args, "--source-sha");
    const target = option(args, "--target");
    const manifest = loadCourseManifest(sourceRoot);
    validateCourseManifest(manifest);
    const result = await syncCourse({
      root: sourceRoot,
      sourceSha,
      target: path.resolve(process.cwd(), target),
    });
    console.log(
      JSON.stringify({ message: "公開教材を固定SHAから同期しました", ...result }, null, 2),
    );
    return;
  }
  if (command === "load") {
    const moduleId = args[0];
    if (args.length !== 1)
      throw new Error("Usage: pnpm course:load M00|M01|...|M10 (one module only)");
    const result = loadModule({ root: process.cwd(), moduleId });
    console.log(
      JSON.stringify({ message: "指定した1モジュールだけをロードしました", ...result }, null, 2),
    );
    return;
  }
  if (command === "check") {
    const moduleId = args[0];
    if (!moduleId) throw new Error("Usage: pnpm course:check M00|...|M10 --state start|end");
    const stateName = option(args, "--state");
    if (args.some((arg) => arg !== "--state" && arg !== stateName && arg !== moduleId))
      throw new Error("course:check accepts one module and one --state value");
    printState(checkState({ root: process.cwd(), moduleId, stateName }));
    return;
  }
  throw new Error(
    "Usage: pnpm course:sync --source-sha <full-sha> --target <existing-dir> | pnpm course:load Mxx | pnpm course:check Mxx --state start|end | node scripts/training/ai-assisted-qa-course.mjs verify-distribution",
  );
}

main().catch((error) => {
  console.error(`AI協働QAコースCLI: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
