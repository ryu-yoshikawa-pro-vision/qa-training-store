import { createHash } from "node:crypto";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
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
  throw new Error(
    "Usage: describe-case | validate-profile | write-manifest | promote (see repository Plan for options)",
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
