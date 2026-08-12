import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ANDROID_CANONICAL_PROFILE,
  promoteAndroidVisualCapture,
  validateAndroidVisualManifest,
  writeAndroidVisualManifest,
  type AndroidVisualCaptureManifest,
} from "../../scripts/spec/android-visual-capture";
import { parseScreenCatalog, validateVisualContract } from "../../scripts/spec/visual-contract";
import {
  VISUAL_CAPTURE_CASES,
  validateVisualCaptureRegistry,
  visualAssetPath,
} from "../../scripts/spec/visual-registry";

function androidManifest(
  captureCaseKey: string,
  sourceCommitSha: string,
  automationApkSha256: string,
): AndroidVisualCaptureManifest {
  return {
    capture_case_key: captureCaseKey,
    source_commit_sha: sourceCommitSha,
    automation_apk_sha256: automationApkSha256,
    ...ANDROID_CANONICAL_PROFILE,
    resolution: "1080x1920",
    density: 420,
  };
}

describe("Screen Catalog / Visual Contract", () => {
  it("keeps the Current route universe and class counts explicit", async () => {
    const catalog = parseScreenCatalog();
    expect(catalog).toHaveLength(38);
    expect(catalog.filter((entry) => entry.screenClass === "Product")).toHaveLength(31);
    expect(catalog.filter((entry) => entry.screenClass === "Supporting")).toHaveLength(4);
    expect(catalog.filter((entry) => entry.screenClass === "Boundary")).toHaveLength(2);
    expect(catalog.filter((entry) => entry.screenClass === "Test-only")).toHaveLength(1);
    expect(new Set(catalog.map((entry) => entry.screenId)).size).toBe(catalog.length);

    const result = await validateVisualContract();
    expect(result.issues).toEqual([]);
    expect(result.summary.captureTargetCount).toBe(94);
    expect(result.summary.pendingTargetCount).toBe(0);
    expect(result.summary.blockedTargetCount).toBe(26);
  });

  it("rejects duplicate or mismatched Capture Case identities", () => {
    const first = VISUAL_CAPTURE_CASES[0]!;
    expect(validateVisualCaptureRegistry([first, { ...first }])).toContain(
      `duplicate captureCaseKey: ${first.captureCaseKey}`,
    );
    expect(
      validateVisualCaptureRegistry([
        { ...first, captureCaseKey: "SCREEN-OTHER/invalid/web-desktop" },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "invalid captureCaseKey: SCREEN-OTHER/invalid/web-desktop",
        `captureCaseKey metadata mismatch: SCREEN-OTHER/invalid/web-desktop`,
      ]),
    );
  });

  it("fails Android promotion when the source revision or APK digest is stale", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "qa-store-visual-contract-"));
    try {
      const androidCase = VISUAL_CAPTURE_CASES.find(
        (captureCase) => captureCase.platform === "android",
      )!;
      const apkPath = path.join(tempRoot, "automation.apk");
      await writeFile(apkPath, "current automation apk");
      const apkSha = createHash("sha256")
        .update(await readFile(apkPath))
        .digest("hex");
      const manifest = androidManifest(androidCase.captureCaseKey, "a".repeat(40), apkSha);
      const issues = await validateAndroidVisualManifest(manifest, {
        expectedCaptureCaseKey: androidCase.captureCaseKey,
        expectedSourceCommitSha: "b".repeat(40),
        automationApkPath: apkPath,
      });
      expect(issues).toContain(
        `source_commit_sha does not match expected source: ${"a".repeat(40)} !== ${"b".repeat(40)}`,
      );

      const rawPngPath = path.join(tempRoot, "raw.png");
      await sharp({
        create: { width: 2, height: 2, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } },
      })
        .png()
        .toFile(rawPngPath);
      const outputPath = path.join(tempRoot, visualAssetPath(androidCase));
      await expect(
        promoteAndroidVisualCapture({
          ...manifest,
          manifest,
          expectedCaptureCaseKey: androidCase.captureCaseKey,
          expectedSourceCommitSha: "b".repeat(40),
          automationApkPath: apkPath,
          rootDir: tempRoot,
          rawPngPath,
          outputPath,
        }),
      ).rejects.toThrow("source_commit_sha does not match expected source");
      await expect(readFile(outputPath)).rejects.toThrow();

      const staleManifest = androidManifest(
        androidCase.captureCaseKey,
        "b".repeat(40),
        "c".repeat(64),
      );
      const staleIssues = await validateAndroidVisualManifest(staleManifest, {
        expectedCaptureCaseKey: androidCase.captureCaseKey,
        expectedSourceCommitSha: "b".repeat(40),
        automationApkPath: apkPath,
      });
      expect(staleIssues).toContain(
        `automation_apk_sha256 does not match APK: ${"c".repeat(64)} !== ${apkSha}`,
      );

      const manifestPath = path.join(tempRoot, "android.manifest.json");
      const written = await writeAndroidVisualManifest({
        expectedCaptureCaseKey: androidCase.captureCaseKey,
        expectedSourceCommitSha: "b".repeat(40),
        automationApkPath: apkPath,
        captureCaseKey: androidCase.captureCaseKey,
        rawPngPath,
        outputPath: manifestPath,
        resolution: "1080x1920",
        density: 420,
        workflowRunId: "12345",
      });
      expect(written.capture_case_key).toBe(androidCase.captureCaseKey);
      expect(written.automation_apk_sha256).toBe(apkSha);
      expect(JSON.parse(await readFile(manifestPath, "utf8"))).toMatchObject({
        source_commit_sha: "b".repeat(40),
        workflow_run_id: "12345",
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
