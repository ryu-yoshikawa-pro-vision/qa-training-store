import { createHash } from "node:crypto";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  NATIVE_CAPTURE_READY_CONDITIONS,
  NATIVE_CAPTURE_SETUP_PLANS,
} from "./android-visual-setup";
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
  resolution: "1080x1920",
  density: 440,
} as const;

export const ANDROID_BATCH_MANIFEST_SCHEMA_VERSION = 1 as const;

export type AndroidObservedVisualProfile = {
  api_level: number;
  abi: string;
  resolution: string;
  density: number;
  locale: string;
  font_scale: number;
  ui_mode: string;
  orientation: string;
};

export type AndroidVisualProfileProvenance = {
  runtime_observed: readonly (keyof AndroidObservedVisualProfile)[];
  workflow_configuration: readonly ["system_image", "avd_profile"];
};

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
  profile_provenance: AndroidVisualProfileProvenance;
  workflow_run_id?: string;
  captured_at?: string;
};

export type AndroidVisualBatchMode = "single" | "all";

export type AndroidVisualBatchManifest = {
  schema_version: typeof ANDROID_BATCH_MANIFEST_SCHEMA_VERSION;
  workflow_run_id: string;
  source_commit_sha: string;
  requested_mode: AndroidVisualBatchMode;
  expected_case_count: number;
  capture_case_keys: readonly string[];
  captured_case_count: number;
  captured_case_keys: readonly string[];
  complete: boolean;
  failed_case_key?: string;
  failure_message?: string;
};

export type AndroidVisualManifestValidationOptions = {
  expectedCaptureCaseKey: string;
  expectedSourceCommitSha: string;
  automationApkPath?: string;
};

function isSha(value: string, length: number): boolean {
  return typeof value === "string" && new RegExp(`^[0-9a-f]{${length}}$`).test(value);
}

export function listAndroidCaptureCaseKeys(): readonly string[] {
  const keys =
    VISUAL_CAPTURE_CASE_BY_KEY.size === 0
      ? []
      : [...VISUAL_CAPTURE_CASE_BY_KEY.values()]
          .filter((captureCase) => captureCase.platform === "android")
          .map((captureCase) => captureCase.captureCaseKey);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length > 0)
    throw new Error(
      `Android Capture Case registry contains duplicates: ${[...new Set(duplicates)].join(", ")}`,
    );
  return keys;
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
  for (const field of ["system_image", "abi", "avd_profile"] as const) {
    if (manifest[field] !== ANDROID_CANONICAL_PROFILE[field])
      issues.push(`${field} must be ${ANDROID_CANONICAL_PROFILE[field]}`);
  }
  const observedIssues = validateAndroidObservedVisualProfile({
    api_level: manifest.api_level,
    abi: manifest.abi,
    resolution: manifest.resolution,
    density: manifest.density,
    locale: manifest.locale,
    font_scale: manifest.font_scale,
    ui_mode: manifest.ui_mode,
    orientation: manifest.orientation,
  });
  issues.push(...observedIssues);
  if (manifest.profile_provenance === undefined) {
    issues.push("profile_provenance is required for Android visual manifests");
  } else {
    const observedFields = [...manifest.profile_provenance.runtime_observed].sort().join(",");
    const expectedFields = [...RUNTIME_PROFILE_FIELDS].sort().join(",");
    if (observedFields !== expectedFields)
      issues.push("profile_provenance.runtime_observed must list every runtime profile field");
    if (manifest.profile_provenance.workflow_configuration.join(",") !== "system_image,avd_profile")
      issues.push(
        "profile_provenance.workflow_configuration must identify system_image and avd_profile",
      );
  }
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
  observedProfile: AndroidObservedVisualProfile;
  systemImage: string;
  avdProfile: string;
  workflowRunId?: string;
};

const RUNTIME_PROFILE_FIELDS = [
  "api_level",
  "abi",
  "resolution",
  "density",
  "locale",
  "font_scale",
  "ui_mode",
  "orientation",
] as const satisfies readonly (keyof AndroidObservedVisualProfile)[];

export function validateAndroidObservedVisualProfile(
  observed: AndroidObservedVisualProfile,
): string[] {
  const issues: string[] = [];
  if (!/^\d+x\d+$/.test(observed.resolution))
    issues.push(`resolution must be a WxH value: ${observed.resolution}`);
  if (!Number.isFinite(observed.density) || observed.density <= 0)
    issues.push(`density must be a positive number: ${observed.density}`);
  for (const field of RUNTIME_PROFILE_FIELDS) {
    if (observed[field] !== ANDROID_CANONICAL_PROFILE[field])
      issues.push(
        `${field} must match canonical runtime profile: ${String(observed[field])} !== ${String(ANDROID_CANONICAL_PROFILE[field])}`,
      );
  }
  return issues;
}

export type AndroidVisualBatchValidationOptions = {
  artifactDir: string;
  expectedSourceCommitSha: string;
  automationApkPath: string;
};

export type AndroidVisualBatchEntry = {
  captureCaseKey: string;
  rawPngPath: string;
  manifestPath: string;
  manifest: AndroidVisualCaptureManifest;
};

export type AndroidVisualBatchValidationResult = {
  issues: readonly string[];
  entries: readonly AndroidVisualBatchEntry[];
};

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function duplicateStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isWithinRoot(rootDir: string, candidatePath: string): boolean {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(candidatePath);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function derivedRawPaths(
  artifactDir: string,
  captureCaseKey: string,
): {
  rawPngPath: string;
  manifestPath: string;
} {
  const captureCase = VISUAL_CAPTURE_CASE_BY_KEY.get(captureCaseKey);
  if (captureCase === undefined || captureCase.platform !== "android")
    throw new Error(`Android Capture Case is not registered: ${captureCaseKey}`);
  const caseRoot = path.join(artifactDir, "raw", captureCase.screenId, captureCase.stateSlug);
  return {
    rawPngPath: path.join(caseRoot, "android.png"),
    manifestPath: path.join(caseRoot, "android.manifest.json"),
  };
}

async function validateRawAndroidPng(rawPngPath: string): Promise<string[]> {
  if (!fs.existsSync(rawPngPath)) return [`raw PNG does not exist: ${rawPngPath}`];
  const stats = await fs.promises.stat(rawPngPath);
  if (stats.size <= 0) return [`raw PNG is empty: ${rawPngPath}`];
  try {
    const metadata = await sharp(rawPngPath).metadata();
    const expectedResolution = ANDROID_CANONICAL_PROFILE.resolution.split("x").map(Number);
    if (metadata.format !== "png") return [`raw visual is not PNG: ${rawPngPath}`];
    if (metadata.width !== expectedResolution[0] || metadata.height !== expectedResolution[1])
      return [`raw PNG dimensions must be ${ANDROID_CANONICAL_PROFILE.resolution}: ${rawPngPath}`];
  } catch (error) {
    return [
      `raw PNG cannot be decoded: ${rawPngPath}: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  return [];
}

function validateBatchManifestShape(
  manifest: AndroidVisualBatchManifest,
  expectedCaseKeys: readonly string[],
  expectedSourceCommitSha: string,
): string[] {
  const issues: string[] = [];
  const allowedKeys = new Set([
    "schema_version",
    "workflow_run_id",
    "source_commit_sha",
    "requested_mode",
    "expected_case_count",
    "capture_case_keys",
    "captured_case_count",
    "captured_case_keys",
    "complete",
    "failed_case_key",
    "failure_message",
  ]);
  for (const key of Object.keys(manifest as object))
    if (!allowedKeys.has(key)) issues.push(`batch manifest contains unexpected field: ${key}`);
  if (manifest.schema_version !== ANDROID_BATCH_MANIFEST_SCHEMA_VERSION)
    issues.push(`batch manifest schema_version must be ${ANDROID_BATCH_MANIFEST_SCHEMA_VERSION}`);
  if (typeof manifest.workflow_run_id !== "string" || manifest.workflow_run_id.trim() === "")
    issues.push("batch manifest workflow_run_id is required");
  if (!isSha(manifest.source_commit_sha, 40))
    issues.push("batch manifest source_commit_sha must be a 40-character lowercase Git SHA");
  if (manifest.source_commit_sha !== expectedSourceCommitSha)
    issues.push(
      `batch manifest source_commit_sha does not match expected source: ${manifest.source_commit_sha} !== ${expectedSourceCommitSha}`,
    );
  if (manifest.requested_mode !== "all")
    issues.push(`batch manifest requested_mode must be all: ${manifest.requested_mode}`);
  if (manifest.expected_case_count !== expectedCaseKeys.length)
    issues.push(
      `batch manifest expected_case_count does not match Registry: ${manifest.expected_case_count} !== ${expectedCaseKeys.length}`,
    );
  if (!isStringArray(manifest.capture_case_keys)) {
    issues.push("batch manifest capture_case_keys must be a string array");
  } else {
    const duplicates = duplicateStrings(manifest.capture_case_keys);
    if (duplicates.length > 0)
      issues.push(`batch manifest capture_case_keys contains duplicates: ${duplicates.join(", ")}`);
    if (!sameStringArray(manifest.capture_case_keys, expectedCaseKeys))
      issues.push(
        "batch manifest capture_case_keys does not exactly match the Registry Android case order",
      );
  }
  if (!Number.isInteger(manifest.captured_case_count) || manifest.captured_case_count < 0)
    issues.push("batch manifest captured_case_count must be a non-negative integer");
  if (!isStringArray(manifest.captured_case_keys)) {
    issues.push("batch manifest captured_case_keys must be a string array");
  } else {
    const duplicates = duplicateStrings(manifest.captured_case_keys);
    if (duplicates.length > 0)
      issues.push(
        `batch manifest captured_case_keys contains duplicates: ${duplicates.join(", ")}`,
      );
    if (manifest.captured_case_count !== manifest.captured_case_keys.length)
      issues.push("batch manifest captured_case_count does not match captured_case_keys");
    const expectedSet = new Set(expectedCaseKeys);
    for (const key of manifest.captured_case_keys)
      if (!expectedSet.has(key)) issues.push(`batch manifest has unexpected captured case: ${key}`);
    if (manifest.complete && !sameStringArray(manifest.captured_case_keys, expectedCaseKeys))
      issues.push("complete batch manifest must capture every Registry Android case in order");
  }
  if (manifest.complete !== true)
    issues.push("batch manifest is incomplete; canonical promotion requires complete=true");
  if (manifest.complete && manifest.failed_case_key !== undefined)
    issues.push("complete batch manifest must not contain failed_case_key");
  if (!manifest.complete && typeof manifest.failed_case_key !== "string")
    issues.push("incomplete batch manifest must identify failed_case_key");
  return issues;
}

export async function validateAndroidVisualBatch(
  manifest: AndroidVisualBatchManifest,
  options: AndroidVisualBatchValidationOptions,
): Promise<AndroidVisualBatchValidationResult> {
  const expectedCaseKeys = listAndroidCaptureCaseKeys();
  const issues = validateBatchManifestShape(
    manifest,
    expectedCaseKeys,
    options.expectedSourceCommitSha,
  );
  const entries: AndroidVisualBatchEntry[] = [];
  const capturedKeys = isStringArray(manifest.captured_case_keys)
    ? manifest.captured_case_keys
    : [];
  const expectedSet = new Set(expectedCaseKeys);
  for (const captureCaseKey of capturedKeys) {
    if (!expectedSet.has(captureCaseKey)) continue;
    const paths = derivedRawPaths(options.artifactDir, captureCaseKey);
    issues.push(...(await validateRawAndroidPng(paths.rawPngPath)));
    if (!fs.existsSync(paths.manifestPath)) {
      issues.push(`per-case manifest does not exist: ${paths.manifestPath}`);
      continue;
    }
    let caseManifest: AndroidVisualCaptureManifest;
    try {
      caseManifest = JSON.parse(
        await readFile(paths.manifestPath, "utf8"),
      ) as AndroidVisualCaptureManifest;
    } catch (error) {
      issues.push(
        `per-case manifest is not valid JSON: ${paths.manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    issues.push(
      ...(await validateAndroidVisualManifest(caseManifest, {
        expectedCaptureCaseKey: captureCaseKey,
        expectedSourceCommitSha: options.expectedSourceCommitSha,
        automationApkPath: options.automationApkPath,
      })),
    );
    if (caseManifest.workflow_run_id !== manifest.workflow_run_id)
      issues.push(`per-case manifest workflow_run_id does not match batch: ${captureCaseKey}`);
    entries.push({
      captureCaseKey,
      rawPngPath: paths.rawPngPath,
      manifestPath: paths.manifestPath,
      manifest: caseManifest,
    });
  }
  return { issues, entries };
}

export async function writeAndroidVisualManifest(
  options: WriteAndroidVisualManifestOptions,
): Promise<AndroidVisualCaptureManifest> {
  if (!fs.existsSync(options.rawPngPath)) {
    throw new Error(`raw Android screenshot does not exist: ${options.rawPngPath}`);
  }
  if (!fs.existsSync(options.automationApkPath)) {
    throw new Error(`automation APK does not exist: ${options.automationApkPath}`);
  }
  const observedIssues = validateAndroidObservedVisualProfile(options.observedProfile);
  if (observedIssues.length > 0) throw new Error(observedIssues.join("\n"));
  const manifest: AndroidVisualCaptureManifest = {
    capture_case_key: options.captureCaseKey,
    source_commit_sha: options.expectedSourceCommitSha,
    automation_apk_sha256: await sha256(options.automationApkPath),
    ...options.observedProfile,
    system_image: options.systemImage,
    avd_profile: options.avdProfile,
    profile_provenance: {
      runtime_observed: RUNTIME_PROFILE_FIELDS,
      workflow_configuration: ["system_image", "avd_profile"],
    },
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

function readOptionalCliOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.trim() === "") throw new Error(`Missing CLI option: ${name}`);
  return value;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    throw new Error(
      `Unable to read JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function runCli(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === "list-cases") {
    const captureCaseKeys = listAndroidCaptureCaseKeys();
    console.log(
      JSON.stringify(
        {
          platform: "android",
          count: captureCaseKeys.length,
          capture_case_keys: captureCaseKeys,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (command === "describe-case") {
    const captureCaseKey = readCliOption(args, "--capture-case-key");
    const captureCase = VISUAL_CAPTURE_CASE_BY_KEY.get(captureCaseKey);
    if (captureCase === undefined || captureCase.platform !== "android")
      throw new Error(`capture_case_key is not a registered Android target: ${captureCaseKey}`);
    if (captureCase.nativeSetupId === undefined || captureCase.nativeReadyId === undefined)
      throw new Error(`Android Capture Case is missing native setup metadata: ${captureCaseKey}`);
    console.log(
      JSON.stringify(
        {
          capture_case_key: captureCase.captureCaseKey,
          screen_id: captureCase.screenId,
          state_slug: captureCase.stateSlug,
          platform: captureCase.platform,
          scenario: captureCase.scenario,
          route: captureCase.route,
          role: captureCase.role,
          setup: captureCase.setup,
          ready: captureCase.ready,
          native_setup_id: captureCase.nativeSetupId,
          native_setup_subflow: NATIVE_CAPTURE_SETUP_PLANS[captureCase.nativeSetupId].subflow,
          native_reset_payment_delay_ms:
            NATIVE_CAPTURE_SETUP_PLANS[captureCase.nativeSetupId].resetPaymentDelayMs,
          native_checkout_step: NATIVE_CAPTURE_SETUP_PLANS[captureCase.nativeSetupId].checkoutStep,
          native_ready_id: captureCase.nativeReadyId,
          ready_conditions: NATIVE_CAPTURE_READY_CONDITIONS[captureCase.nativeReadyId],
          capture_mode: captureCase.captureMode,
          status: captureCase.status,
          canonical_asset_path: visualAssetPath(captureCase),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (command === "validate-profile") {
    const profilePath = readCliOption(args, "--profile-json");
    const observedProfile = await readJsonFile<AndroidObservedVisualProfile>(profilePath);
    const issues = validateAndroidObservedVisualProfile(observedProfile);
    if (issues.length > 0) throw new Error(issues.join("\n"));
    console.log("Android canonical runtime profile validated.");
    return;
  }
  if (command === "write-manifest") {
    const captureCaseKey = readCliOption(args, "--capture-case-key");
    const sourceCommitSha = readCliOption(args, "--source-commit-sha");
    const automationApkPath = readCliOption(args, "--automation-apk-path");
    const rawPngPath = readCliOption(args, "--raw-png-path");
    const outputPath = readCliOption(args, "--output");
    const profilePath = readCliOption(args, "--observed-profile-json");
    const systemImage = readCliOption(args, "--system-image");
    const avdProfile = readCliOption(args, "--avd-profile");
    const workflowRunId = readOptionalCliOption(args, "--workflow-run-id");
    const observedProfile = await readJsonFile<AndroidObservedVisualProfile>(profilePath);
    await writeAndroidVisualManifest({
      expectedCaptureCaseKey: captureCaseKey,
      expectedSourceCommitSha: sourceCommitSha,
      automationApkPath,
      captureCaseKey,
      rawPngPath,
      outputPath,
      observedProfile,
      systemImage,
      avdProfile,
      ...(workflowRunId === undefined ? {} : { workflowRunId }),
    });
    console.log(`Wrote Android visual manifest: ${outputPath}`);
    return;
  }
  if (command === "promote") {
    const captureCaseKey = readCliOption(args, "--capture-case-key");
    const manifestPath = readCliOption(args, "--manifest");
    const rawPngPath = readCliOption(args, "--raw-png-path");
    const automationApkPath = readCliOption(args, "--automation-apk-path");
    const expectedSourceCommitSha = readCliOption(args, "--expected-source-commit-sha");
    const rootDir = readOptionalCliOption(args, "--root-dir") ?? process.cwd();
    const outputPath = readOptionalCliOption(args, "--output");
    const manifest = await readJsonFile<AndroidVisualCaptureManifest>(manifestPath);
    const promotedPath = await promoteAndroidVisualCapture({
      manifest,
      expectedCaptureCaseKey: captureCaseKey,
      expectedSourceCommitSha,
      automationApkPath,
      rootDir,
      rawPngPath,
      ...(outputPath === undefined ? {} : { outputPath }),
    });
    console.log(`Promoted Android canonical visual: ${promotedPath}`);
    return;
  }
  if (command === "apply-batch") {
    const artifactDir = readCliOption(args, "--artifact-dir");
    const automationApkPath = readCliOption(args, "--automation-apk-path");
    const expectedSourceCommitSha = readCliOption(args, "--expected-source-commit-sha");
    const rootDir = readOptionalCliOption(args, "--root-dir") ?? process.cwd();
    const applied = await applyAndroidVisualBatch({
      artifactDir,
      automationApkPath,
      expectedSourceCommitSha,
      rootDir,
    });
    console.log(
      JSON.stringify(
        {
          promoted_case_count: applied.promotedPaths.length,
          promoted_paths: applied.promotedPaths,
          status_transition: applied.statusTransition,
        },
        null,
        2,
      ),
    );
    return;
  }
  throw new Error(
    "Usage: list-cases | describe-case | validate-profile | write-manifest | promote | apply-batch (see repository Plan for options)",
  );
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

export type PromoteAndroidVisualBatchOptions = AndroidVisualBatchValidationOptions & {
  rootDir: string;
};

export async function promoteAndroidVisualBatch(
  options: PromoteAndroidVisualBatchOptions,
): Promise<readonly string[]> {
  const artifactDir = path.resolve(options.artifactDir);
  const rootDir = path.resolve(options.rootDir);
  const batchManifestPath = path.join(artifactDir, "batch.manifest.json");
  if (!fs.existsSync(batchManifestPath))
    throw new Error(`batch manifest does not exist: ${batchManifestPath}`);
  const batchManifest = await readJsonFile<AndroidVisualBatchManifest>(batchManifestPath);
  const validation = await validateAndroidVisualBatch(batchManifest, {
    artifactDir,
    expectedSourceCommitSha: options.expectedSourceCommitSha,
    automationApkPath: options.automationApkPath,
  });
  if (validation.issues.length > 0) throw new Error(validation.issues.join("\n"));

  const stagingRoot = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "qa-store-android-visual-batch-"),
  );
  const stagedOutputs: { outputPath: string; stagedPath: string }[] = [];
  try {
    for (const entry of validation.entries) {
      const captureCase = VISUAL_CAPTURE_CASE_BY_KEY.get(entry.captureCaseKey);
      if (captureCase === undefined || captureCase.platform !== "android")
        throw new Error(`Android Capture Case is not registered: ${entry.captureCaseKey}`);
      const relativeOutput = visualAssetPath(captureCase);
      if (path.isAbsolute(relativeOutput))
        throw new Error(`Android promotion output must be repository-relative: ${relativeOutput}`);
      const outputPath = path.resolve(rootDir, relativeOutput);
      if (!isWithinRoot(rootDir, outputPath))
        throw new Error(`Android promotion output escapes repository root: ${relativeOutput}`);
      const stagedPath = path.join(stagingRoot, "outputs", relativeOutput);
      await fs.promises.mkdir(path.dirname(stagedPath), { recursive: true });
      await sharp(entry.rawPngPath).webp({ quality: 88 }).toFile(stagedPath);
      stagedOutputs.push({ outputPath, stagedPath });
    }

    const backups: { outputPath: string; backupPath: string | null }[] = [];
    for (const [index, staged] of stagedOutputs.entries()) {
      if (!fs.existsSync(staged.outputPath)) {
        backups.push({ outputPath: staged.outputPath, backupPath: null });
        continue;
      }
      const backupPath = path.join(stagingRoot, "backups", `${index}.webp`);
      await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.promises.copyFile(staged.outputPath, backupPath);
      backups.push({ outputPath: staged.outputPath, backupPath });
    }

    try {
      for (const staged of stagedOutputs) {
        await fs.promises.mkdir(path.dirname(staged.outputPath), { recursive: true });
        await fs.promises.copyFile(staged.stagedPath, staged.outputPath);
      }
    } catch (error) {
      const rollbackIssues: string[] = [];
      for (const backup of backups) {
        try {
          if (backup.backupPath !== null) {
            await fs.promises.copyFile(backup.backupPath, backup.outputPath);
          } else if (fs.existsSync(backup.outputPath)) {
            await fs.promises.unlink(backup.outputPath);
          }
        } catch (rollbackError) {
          rollbackIssues.push(
            `${backup.outputPath}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
          );
        }
      }
      const rollbackMessage =
        rollbackIssues.length === 0 ? "" : `; rollback failed for ${rollbackIssues.join(", ")}`;
      throw new Error(
        `Android batch canonical promotion failed after validation: ${error instanceof Error ? error.message : String(error)}${rollbackMessage}`,
      );
    }
    return stagedOutputs.map(({ outputPath }) =>
      path.relative(rootDir, outputPath).split(path.sep).join("/"),
    );
  } finally {
    await fs.promises.rm(stagingRoot, { recursive: true, force: true });
  }
}

export async function markAndroidCanonicalCaptureCaptured(rootDir: string): Promise<void> {
  const resolvedRoot = path.resolve(rootDir);
  const registryPath = path.resolve(resolvedRoot, "scripts/spec/visual-registry.ts");
  if (!isWithinRoot(resolvedRoot, registryPath))
    throw new Error("Android status transition path escapes repository root");
  const source = await readFile(registryPath, "utf8");
  const blockedDeclaration =
    'export const ANDROID_CANONICAL_CAPTURE_STATUS: CaptureStatus = "blocked";';
  const capturedDeclaration =
    'export const ANDROID_CANONICAL_CAPTURE_STATUS: CaptureStatus = "captured";';
  if (source.includes(capturedDeclaration)) return;
  if (!source.includes(blockedDeclaration))
    throw new Error("Android canonical capture status switch is not in the expected blocked state");
  await fs.promises.writeFile(
    registryPath,
    source.replace(blockedDeclaration, capturedDeclaration),
    "utf8",
  );
}

export type ApplyAndroidVisualBatchResult = {
  promotedPaths: readonly string[];
  statusTransition: "captured";
};

export async function applyAndroidVisualBatch(
  options: PromoteAndroidVisualBatchOptions,
): Promise<ApplyAndroidVisualBatchResult> {
  const promotedPaths = await promoteAndroidVisualBatch(options);
  await markAndroidCanonicalCaptureCaptured(options.rootDir);
  return { promotedPaths, statusTransition: "captured" };
}
