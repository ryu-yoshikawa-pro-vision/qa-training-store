import { createHash } from "node:crypto";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { VISUAL_CAPTURE_CASE_BY_KEY, visualAssetPath } from "./visual-registry";

export const ANDROID_CANONICAL_PROFILE = {
  api_level: 34,
  system_image: "google_apis",
  abi: "x86_64",
  avd_profile: "pixel_2",
  locale: "ja-JP",
  font_scale: 1,
  ui_mode: "light",
  orientation: "portrait",
} as const;

export type AndroidVisualCaptureManifest = {
  capture_case_key: string;
  source_commit_sha: string;
  automation_apk_sha256: string;
  api_level: number;
  system_image: string;
  abi: string;
  avd_profile: string;
  resolution: string;
  density: number;
  locale: string;
  font_scale: number;
  ui_mode: string;
  orientation: string;
  workflow_run_id?: string;
  captured_at?: string;
};

export type AndroidVisualManifestValidationOptions = {
  expectedCaptureCaseKey: string;
  expectedSourceCommitSha: string;
  automationApkPath?: string;
};

function isSha(value: string, length: number): boolean {
  return new RegExp(`^[0-9a-f]{${length}}$`).test(value);
}

async function sha256(filePath: string): Promise<string> {
  const digest = createHash("sha256");
  digest.update(await readFile(filePath));
  return digest.digest("hex");
}

export async function validateAndroidVisualManifest(
  manifest: AndroidVisualCaptureManifest,
  options: AndroidVisualManifestValidationOptions,
): Promise<string[]> {
  const issues: string[] = [];
  const captureCase = VISUAL_CAPTURE_CASE_BY_KEY.get(manifest.capture_case_key);
  if (captureCase === undefined)
    issues.push(`capture_case_key is not registered: ${manifest.capture_case_key}`);
  else if (captureCase.platform !== "android")
    issues.push(`capture_case_key is not an Android target: ${manifest.capture_case_key}`);
  if (manifest.capture_case_key !== options.expectedCaptureCaseKey)
    issues.push(
      `capture_case_key does not match expected target: ${manifest.capture_case_key} !== ${options.expectedCaptureCaseKey}`,
    );
  if (!isSha(manifest.source_commit_sha, 40))
    issues.push("source_commit_sha must be a 40-character lowercase Git SHA");
  if (!isSha(manifest.automation_apk_sha256, 64))
    issues.push("automation_apk_sha256 must be a 64-character lowercase SHA-256");
  if (!isSha(options.expectedSourceCommitSha, 40))
    issues.push("expectedSourceCommitSha must be a 40-character lowercase Git SHA");
  if (manifest.source_commit_sha !== options.expectedSourceCommitSha)
    issues.push(
      `source_commit_sha does not match expected source: ${manifest.source_commit_sha} !== ${options.expectedSourceCommitSha}`,
    );
  if (manifest.api_level !== ANDROID_CANONICAL_PROFILE.api_level)
    issues.push(`api_level must be ${ANDROID_CANONICAL_PROFILE.api_level}`);
  for (const field of [
    "system_image",
    "abi",
    "avd_profile",
    "locale",
    "ui_mode",
    "orientation",
  ] as const) {
    if (manifest[field] !== ANDROID_CANONICAL_PROFILE[field])
      issues.push(`${field} must be ${ANDROID_CANONICAL_PROFILE[field]}`);
  }
  if (!/^\d+x\d+$/.test(manifest.resolution)) issues.push("resolution must be WIDTHxHEIGHT");
  if (!Number.isFinite(manifest.density) || manifest.density <= 0)
    issues.push("density must be a positive number");
  if (manifest.font_scale !== ANDROID_CANONICAL_PROFILE.font_scale)
    issues.push(`font_scale must be ${ANDROID_CANONICAL_PROFILE.font_scale}`);
  if (options.automationApkPath !== undefined) {
    if (!fs.existsSync(options.automationApkPath)) {
      issues.push(`automation APK does not exist: ${options.automationApkPath}`);
    } else {
      const actualDigest = await sha256(options.automationApkPath);
      if (actualDigest !== manifest.automation_apk_sha256)
        issues.push(
          `automation_apk_sha256 does not match APK: ${manifest.automation_apk_sha256} !== ${actualDigest}`,
        );
    }
  }
  return issues;
}

export type PromoteAndroidVisualCaptureOptions = AndroidVisualManifestValidationOptions & {
  manifest: AndroidVisualCaptureManifest;
  rootDir: string;
  rawPngPath: string;
  outputPath?: string;
};

export type WriteAndroidVisualManifestOptions = AndroidVisualManifestValidationOptions & {
  automationApkPath: string;
  captureCaseKey: string;
  rawPngPath: string;
  outputPath: string;
  resolution: string;
  density: number;
  workflowRunId?: string;
};

export async function writeAndroidVisualManifest(
  options: WriteAndroidVisualManifestOptions,
): Promise<AndroidVisualCaptureManifest> {
  if (!fs.existsSync(options.rawPngPath)) {
    throw new Error(`raw Android screenshot does not exist: ${options.rawPngPath}`);
  }
  if (!fs.existsSync(options.automationApkPath)) {
    throw new Error(`automation APK does not exist: ${options.automationApkPath}`);
  }
  const manifest: AndroidVisualCaptureManifest = {
    capture_case_key: options.captureCaseKey,
    source_commit_sha: options.expectedSourceCommitSha,
    automation_apk_sha256: await sha256(options.automationApkPath),
    ...ANDROID_CANONICAL_PROFILE,
    resolution: options.resolution,
    density: options.density,
    captured_at: new Date().toISOString(),
  };
  if (options.workflowRunId !== undefined) manifest.workflow_run_id = options.workflowRunId;
  const issues = await validateAndroidVisualManifest(manifest, {
    expectedCaptureCaseKey: options.expectedCaptureCaseKey,
    expectedSourceCommitSha: options.expectedSourceCommitSha,
    automationApkPath: options.automationApkPath,
  });
  if (issues.length > 0) throw new Error(issues.join("\n"));
  await fs.promises.mkdir(path.dirname(path.resolve(options.outputPath)), { recursive: true });
  await fs.promises.writeFile(options.outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function readCliOption(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value === undefined || value.trim() === "") throw new Error(`Missing CLI option: ${name}`);
  return value;
}

async function runCli(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command !== "write-manifest") return;
  const captureCaseKey = readCliOption(args, "--capture-case-key");
  const sourceCommitSha = readCliOption(args, "--source-commit-sha");
  const automationApkPath = readCliOption(args, "--automation-apk-path");
  const rawPngPath = readCliOption(args, "--raw-png-path");
  const outputPath = readCliOption(args, "--output");
  const resolution = readCliOption(args, "--resolution");
  const density = Number(readCliOption(args, "--density"));
  if (!Number.isFinite(density)) throw new Error("--density must be numeric");
  const workflowRunId = args.includes("--workflow-run-id")
    ? readCliOption(args, "--workflow-run-id")
    : undefined;
  await writeAndroidVisualManifest({
    expectedCaptureCaseKey: captureCaseKey,
    expectedSourceCommitSha: sourceCommitSha,
    automationApkPath,
    captureCaseKey,
    rawPngPath,
    outputPath,
    resolution,
    density,
    ...(workflowRunId === undefined ? {} : { workflowRunId }),
  });
  console.log(`Wrote Android visual manifest: ${outputPath}`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("android-visual-capture.ts")) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export async function promoteAndroidVisualCapture(
  options: PromoteAndroidVisualCaptureOptions,
): Promise<string> {
  const issues = await validateAndroidVisualManifest(options.manifest, options);
  if (issues.length > 0) throw new Error(issues.join("\n"));

  const captureCase = VISUAL_CAPTURE_CASE_BY_KEY.get(options.expectedCaptureCaseKey);
  if (captureCase === undefined || captureCase.platform !== "android")
    throw new Error(`Android Capture Case is not registered: ${options.expectedCaptureCaseKey}`);
  if (!fs.existsSync(options.rawPngPath))
    throw new Error(`raw Android screenshot does not exist: ${options.rawPngPath}`);

  const expectedOutput = path.resolve(options.rootDir, visualAssetPath(captureCase));
  const outputPath = path.resolve(options.rootDir, options.outputPath ?? expectedOutput);
  if (outputPath !== expectedOutput)
    throw new Error(`Android promotion output must be the canonical asset: ${outputPath}`);
  if (path.extname(outputPath).toLowerCase() !== ".webp")
    throw new Error(`Android promotion output must be WebP: ${outputPath}`);

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(options.rawPngPath).webp({ quality: 88 }).toFile(outputPath);
  return path.relative(options.rootDir, outputPath).split(path.sep).join("/");
}
