import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ANDROID_BATCH_MANIFEST_SCHEMA_VERSION,
  ANDROID_CANONICAL_PROFILE,
  applyAndroidVisualBatch,
  listAndroidCaptureCaseKeys,
  promoteAndroidVisualBatch,
  validateAndroidVisualBatch,
  writeAndroidVisualManifest,
  type AndroidVisualBatchManifest,
  type AndroidVisualCaptureManifest,
} from "../../scripts/spec/android-visual-capture";
import {
  ANDROID_CANONICAL_CAPTURE_STATUS,
  VISUAL_CAPTURE_CASES,
  visualAssetPath,
} from "../../scripts/spec/visual-registry";

const SOURCE_SHA = "a".repeat(40);
const WORKFLOW_RUN_ID = "123456789";

async function createBatchFixture(rootDir: string): Promise<{
  artifactDir: string;
  automationApkPath: string;
  batchManifest: AndroidVisualBatchManifest;
  batchManifestPath: string;
  firstCase: (typeof VISUAL_CAPTURE_CASES)[number];
  firstManifestPath: string;
}> {
  const artifactDir = path.join(rootDir, "artifact");
  const automationApkPath = path.join(rootDir, "native-automation.apk");
  const rawTemplatePath = path.join(rootDir, "template.png");
  await mkdir(artifactDir, { recursive: true });
  await writeFile(automationApkPath, "automation apk from one workflow run", "utf8");
  await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 24, g: 32, b: 48, alpha: 1 },
    },
  })
    .png()
    .toFile(rawTemplatePath);

  const androidCases = VISUAL_CAPTURE_CASES.filter(
    (captureCase) => captureCase.platform === "android",
  );
  const captureCaseKeys = listAndroidCaptureCaseKeys();
  for (const captureCase of androidCases) {
    const caseRoot = path.join(artifactDir, "raw", captureCase.screenId, captureCase.stateSlug);
    const rawPngPath = path.join(caseRoot, "android.png");
    const manifestPath = path.join(caseRoot, "android.manifest.json");
    await mkdir(caseRoot, { recursive: true });
    await copyFile(rawTemplatePath, rawPngPath);
    await writeAndroidVisualManifest({
      expectedCaptureCaseKey: captureCase.captureCaseKey,
      expectedSourceCommitSha: SOURCE_SHA,
      automationApkPath,
      captureCaseKey: captureCase.captureCaseKey,
      rawPngPath,
      outputPath: manifestPath,
      observedProfile: {
        api_level: ANDROID_CANONICAL_PROFILE.api_level,
        abi: ANDROID_CANONICAL_PROFILE.abi,
        resolution: ANDROID_CANONICAL_PROFILE.resolution,
        density: ANDROID_CANONICAL_PROFILE.density,
        locale: ANDROID_CANONICAL_PROFILE.locale,
        font_scale: ANDROID_CANONICAL_PROFILE.font_scale,
        ui_mode: ANDROID_CANONICAL_PROFILE.ui_mode,
        orientation: ANDROID_CANONICAL_PROFILE.orientation,
      },
      systemImage: ANDROID_CANONICAL_PROFILE.system_image,
      avdProfile: ANDROID_CANONICAL_PROFILE.avd_profile,
      workflowRunId: WORKFLOW_RUN_ID,
    });
  }

  const batchManifest: AndroidVisualBatchManifest = {
    schema_version: ANDROID_BATCH_MANIFEST_SCHEMA_VERSION,
    workflow_run_id: WORKFLOW_RUN_ID,
    source_commit_sha: SOURCE_SHA,
    requested_mode: "all",
    expected_case_count: captureCaseKeys.length,
    capture_case_keys: captureCaseKeys,
    captured_case_count: captureCaseKeys.length,
    captured_case_keys: captureCaseKeys,
    complete: true,
  };
  const batchManifestPath = path.join(artifactDir, "batch.manifest.json");
  await writeFile(batchManifestPath, `${JSON.stringify(batchManifest, null, 2)}\n`, "utf8");
  const firstCase = androidCases[0];
  if (firstCase === undefined) throw new Error("Android fixture case is missing");
  return {
    artifactDir,
    automationApkPath,
    batchManifest,
    batchManifestPath,
    firstCase,
    firstManifestPath: path.join(
      artifactDir,
      "raw",
      firstCase.screenId,
      firstCase.stateSlug,
      "android.manifest.json",
    ),
  };
}

async function writeBatchManifest(
  fixture: Awaited<ReturnType<typeof createBatchFixture>>,
  manifest: AndroidVisualBatchManifest,
): Promise<void> {
  await writeFile(fixture.batchManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

describe("Android canonical visual batch capture contract", () => {
  it("derives 25 deterministic unique Android case keys from the Registry", () => {
    const registryKeys = VISUAL_CAPTURE_CASES.filter(
      (captureCase) => captureCase.platform === "android",
    ).map((captureCase) => captureCase.captureCaseKey);
    const listedKeys = listAndroidCaptureCaseKeys();
    expect(listedKeys).toEqual(registryKeys);
    expect(listedKeys).toHaveLength(25);
    expect(new Set(listedKeys).size).toBe(listedKeys.length);
  });

  it("rejects missing, duplicate, unexpected, incomplete, and stale batch metadata", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "qa-store-android-batch-contract-"));
    try {
      const fixture = await createBatchFixture(rootDir);
      const expected = [...fixture.batchManifest.capture_case_keys];
      const invalidCases: readonly [string, AndroidVisualBatchManifest, string][] = [
        [
          "missing case",
          {
            ...fixture.batchManifest,
            expected_case_count: expected.length - 1,
            capture_case_keys: expected.slice(0, -1),
          },
          "does not exactly match the Registry Android case order",
        ],
        [
          "duplicate case",
          {
            ...fixture.batchManifest,
            capture_case_keys: [...expected.slice(0, -1), expected[0] ?? ""],
          },
          "contains duplicates",
        ],
        [
          "unexpected case",
          {
            ...fixture.batchManifest,
            capture_case_keys: ["SCREEN-UNKNOWN/default/android", ...expected.slice(1)],
          },
          "does not exactly match the Registry Android case order",
        ],
        [
          "incomplete batch",
          {
            ...fixture.batchManifest,
            captured_case_count: 1,
            captured_case_keys: expected.slice(0, 1),
            complete: false,
            failed_case_key: expected[1]!,
          },
          "requires complete=true",
        ],
        [
          "stale source",
          { ...fixture.batchManifest, source_commit_sha: "b".repeat(40) },
          "does not match expected source",
        ],
      ];
      for (const [name, invalidManifest, expectedMessage] of invalidCases) {
        await writeBatchManifest(fixture, invalidManifest);
        const result = await validateAndroidVisualBatch(invalidManifest, {
          artifactDir: fixture.artifactDir,
          expectedSourceCommitSha: SOURCE_SHA,
          automationApkPath: fixture.automationApkPath,
        });
        expect(
          result.issues.some((issue) => issue.includes(expectedMessage)),
          name,
        ).toBe(true);
      }
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("rejects stale APK/profile/per-case manifest and path traversal metadata", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "qa-store-android-batch-profile-"));
    try {
      const fixture = await createBatchFixture(rootDir);
      const originalCaseManifest = JSON.parse(
        await readFile(fixture.firstManifestPath, "utf8"),
      ) as AndroidVisualCaptureManifest;
      const mutations: readonly [string, Partial<AndroidVisualCaptureManifest>, string][] = [
        ["API", { api_level: 33 }, "api_level must be 34"],
        ["ABI", { abi: "arm64-v8a" }, "abi must be x86_64"],
        ["locale", { locale: "en-US" }, "locale must match canonical runtime profile"],
        [
          "resolution",
          { resolution: "1920x1080" },
          "resolution must match canonical runtime profile",
        ],
        ["density", { density: 420 }, "density must match canonical runtime profile"],
        [
          "APK SHA",
          { automation_apk_sha256: "c".repeat(64) },
          "automation_apk_sha256 does not match APK",
        ],
      ];
      for (const [name, mutation, expectedMessage] of mutations) {
        const mutated = { ...originalCaseManifest, ...mutation };
        await writeFile(fixture.firstManifestPath, `${JSON.stringify(mutated, null, 2)}\n`, "utf8");
        const result = await validateAndroidVisualBatch(fixture.batchManifest, {
          artifactDir: fixture.artifactDir,
          expectedSourceCommitSha: SOURCE_SHA,
          automationApkPath: fixture.automationApkPath,
        });
        expect(
          result.issues.some((issue) => issue.includes(expectedMessage)),
          name,
        ).toBe(true);
      }
      await writeFile(
        fixture.firstManifestPath,
        `${JSON.stringify(originalCaseManifest, null, 2)}\n`,
        "utf8",
      );
      const traversalManifest = {
        ...fixture.batchManifest,
        output_path: "../outside.webp",
      } as AndroidVisualBatchManifest & { output_path: string };
      const traversalResult = await validateAndroidVisualBatch(traversalManifest, {
        artifactDir: fixture.artifactDir,
        expectedSourceCommitSha: SOURCE_SHA,
        automationApkPath: fixture.automationApkPath,
      });
      expect(traversalResult.issues).toContain(
        "batch manifest contains unexpected field: output_path",
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("does not mutate canonical assets when batch validation fails", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "qa-store-android-batch-fail-close-"));
    try {
      const fixture = await createBatchFixture(rootDir);
      const incompleteManifest = {
        ...fixture.batchManifest,
        captured_case_count: 24,
        captured_case_keys: fixture.batchManifest.capture_case_keys.slice(0, 24),
        complete: false,
        failed_case_key: fixture.batchManifest.capture_case_keys[24]!,
      };
      await writeBatchManifest(fixture, incompleteManifest);
      await expect(
        promoteAndroidVisualBatch({
          artifactDir: fixture.artifactDir,
          automationApkPath: fixture.automationApkPath,
          expectedSourceCommitSha: SOURCE_SHA,
          rootDir,
        }),
      ).rejects.toThrow("requires complete=true");
      await expect(
        readFile(path.join(rootDir, visualAssetPath(fixture.firstCase))),
      ).rejects.toThrow();
      expect(await stat(fixture.batchManifestPath)).toBeDefined();
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("promotes only a complete validated batch and leaves status transition explicit", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "qa-store-android-batch-promote-"));
    try {
      const fixture = await createBatchFixture(rootDir);
      const promotedPaths = await promoteAndroidVisualBatch({
        artifactDir: fixture.artifactDir,
        automationApkPath: fixture.automationApkPath,
        expectedSourceCommitSha: SOURCE_SHA,
        rootDir,
      });
      expect(promotedPaths).toHaveLength(25);
      for (const captureCaseKey of fixture.batchManifest.capture_case_keys) {
        const captureCase = VISUAL_CAPTURE_CASES.find(
          (candidate) => candidate.captureCaseKey === captureCaseKey,
        );
        if (captureCase === undefined) throw new Error(`Missing fixture case: ${captureCaseKey}`);
        const output = path.join(rootDir, visualAssetPath(captureCase));
        expect((await stat(output)).size).toBeGreaterThan(0);
      }
      expect(ANDROID_CANONICAL_CAPTURE_STATUS).toBe("blocked");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  }, 30000);

  it("transitions the single explicit status switch only after batch apply succeeds", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "qa-store-android-batch-status-"));
    try {
      const fixture = await createBatchFixture(rootDir);
      const registryPath = path.join(rootDir, "scripts", "spec", "visual-registry.ts");
      await mkdir(path.dirname(registryPath), { recursive: true });
      await writeFile(
        registryPath,
        'export const ANDROID_CANONICAL_CAPTURE_STATUS: CaptureStatus = "blocked";\n',
        "utf8",
      );
      const result = await applyAndroidVisualBatch({
        artifactDir: fixture.artifactDir,
        automationApkPath: fixture.automationApkPath,
        expectedSourceCommitSha: SOURCE_SHA,
        rootDir,
      });
      expect(result.promotedPaths).toHaveLength(25);
      expect(result.statusTransition).toBe("captured");
      expect(await readFile(registryPath, "utf8")).toContain(
        'ANDROID_CANONICAL_CAPTURE_STATUS: CaptureStatus = "captured"',
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  }, 30000);
});
