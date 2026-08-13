import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ANDROID_CANONICAL_PROFILE,
  promoteAndroidVisualCapture,
  validateAndroidObservedVisualProfile,
  validateAndroidVisualManifest,
  writeAndroidVisualManifest,
  type AndroidObservedVisualProfile,
  type AndroidVisualCaptureManifest,
} from "../../scripts/spec/android-visual-capture";
import { parseScreenCatalog, validateVisualContract } from "../../scripts/spec/visual-contract";
import { materializeVisualReferences } from "../../scripts/spec/materialize-visual-references";
import {
  type CaptureMode,
  type CaptureRole,
  type CaptureStatus,
  type CaptureCase,
  VISUAL_CAPTURE_CASES,
  validateVisualCaptureRegistry,
  visualAssetPath,
} from "../../scripts/spec/visual-registry";

sharp.cache(false);

type VisualFixtureOptions = {
  status?: CaptureStatus;
  audience?: string;
  platforms?: string;
  role?: CaptureRole;
  oracle?: string;
  includeFunctions?: boolean;
  includeVisualReferences?: boolean;
  emptyAlt?: boolean;
  visualRequirement?: "required" | "shared" | "not-applicable";
  visualDetail?: string;
};

async function createVisualFixture(
  rootDir: string,
  options: VisualFixtureOptions = {},
): Promise<CaptureCase[]> {
  const status = options.status ?? "captured";
  const audience = options.audience ?? "customer";
  const role = options.role ?? "customer";
  const platforms = (options.platforms ?? "web-desktop")
    .split(",")
    .map((platform) => platform.trim())
    .filter(Boolean);
  const requirement = options.visualRequirement ?? "required";
  const visualDetail = options.visualDetail ?? "-";
  const includeReference = options.includeVisualReferences ?? status === "captured";
  const oracle = options.oracle ?? "`BR-TEST-001`, `AC-TEST-001`";
  const assetFor = (platform: string) =>
    `docs/spec/assets/screens/SCREEN-TEST-EXAMPLE/default/${platform}.webp`;
  const relativeAssetFor = (platform: string) =>
    `../assets/screens/SCREEN-TEST-EXAMPLE/default/${platform}.webp`;
  const referenceLines = includeReference
    ? platforms
        .map((platform) => {
          const alt = options.emptyAlt ? "" : `SCREEN-TEST-EXAMPLE default ${platform}`;
          return `###### ${platform}\n\n[![${alt}](${relativeAssetFor(platform)})](${relativeAssetFor(platform)})`;
        })
        .join("\n\n")
    : "";
  const functions =
    options.includeFunctions === false ? "" : "#### Functions\n\n- Example function.\n\n";
  const screenSpec = `# Example\n\n## UI / Behavior Contract\n\n### SCREEN-TEST-EXAMPLE — Example\n\n${functions}#### Important UI States\n\n| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |\n|---|---|---|---|---|---|---|---|---|\n| \`default\` | baseline | ${audience} | \`default\` | Example UI. | \`${requirement}\` | ${platforms.join(", ")} | \`${visualDetail}\` | ${oracle} |\n\n#### Visual References\n\n##### \`default\`\n\n${referenceLines}\n\n## Business Rules\n\n### BR-TEST-001 — Example rule\n\nExample rule.\n\n## Acceptance Criteria\n\n### Criteria\n\n#### AC-TEST-001 — Example acceptance\n\nExample acceptance.\n`;
  await mkdir(path.join(rootDir, "docs/spec/features"), { recursive: true });
  await mkdir(path.join(rootDir, "docs/spec/assets/screens/SCREEN-TEST-EXAMPLE/default"), {
    recursive: true,
  });
  await mkdir(path.join(rootDir, "app"), { recursive: true });
  await writeFile(
    path.join(rootDir, "docs/spec/screen-catalog.md"),
    `# Screen Catalog\n\n| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |\n|---|---|---|---|---|---|---|---|\n| \`SCREEN-TEST-EXAMPLE\` | Example | Product | / | Yes | Yes | Customer | [Example](./features/example.md#screen-test-example-example) |\n`,
  );
  await writeFile(path.join(rootDir, "docs/spec/features/example.md"), screenSpec);
  await writeFile(
    path.join(rootDir, "app/index.tsx"),
    "export default function Example() { return null; }\n",
  );
  if (includeReference) {
    const sourceAsset = path.join(
      process.cwd(),
      "docs/spec/assets/screens/SCREEN-STOREFRONT-HOME/default/web-desktop.webp",
    );
    for (const platform of platforms) await cp(sourceAsset, path.join(rootDir, assetFor(platform)));
  }
  return platforms.map((platform) => ({
    captureCaseKey: `SCREEN-TEST-EXAMPLE/default/${platform}`,
    screenId: "SCREEN-TEST-EXAMPLE",
    stateSlug: "default",
    platform: platform as CaptureCase["platform"],
    scenario: "default",
    route: "/",
    role,
    setup: "fixture setup",
    ready: "fixture ready",
    captureMode: "viewport" as CaptureMode,
    status,
    blockerReason: status === "blocked" ? "fixture blocker" : null,
  }));
}

type SharedFixtureOptions = {
  targetStatus?: CaptureStatus;
  targetRequirement?: "required" | "shared";
  sharedDetail?: string;
};

async function createSharedVisualFixture(
  rootDir: string,
  options: SharedFixtureOptions = {},
): Promise<CaptureCase[]> {
  const targetStatus = options.targetStatus ?? "captured";
  const targetRequirement = options.targetRequirement ?? "required";
  const platforms = ["web-desktop", "android"] as const;
  const targetAsset = (platform: string) =>
    `docs/spec/assets/screens/SCREEN-TEST-BASE/default/${platform}.webp`;
  const relativeTargetAsset = (platform: string) =>
    `../assets/screens/SCREEN-TEST-BASE/default/${platform}.webp`;
  const targetDetail =
    targetRequirement === "required"
      ? "-"
      : platforms
          .map((platform) => `${platform}=ref: SCREEN-TEST-SHARED/default/${platform}`)
          .join("; ");
  const sharedDetail =
    options.sharedDetail ??
    platforms.map((platform) => `${platform}=ref: SCREEN-TEST-BASE/default/${platform}`).join("; ");
  const stateTable = (screenId: string, requirement: string, detail: string, references: string) =>
    `### ${screenId} — ${screenId === "SCREEN-TEST-BASE" ? "Base" : "Shared"}

#### Functions

- Example function.

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| \`default\` | baseline | customer | \`default\` | Example UI. | \`${requirement}\` | ${platforms.join(", ")} | ${detail} | \`BR-TEST-001\`, \`AC-TEST-001\` |

#### Visual References

##### \`default\`

${references}
`;
  const targetReferences =
    targetRequirement === "required"
      ? platforms
          .map(
            (platform) =>
              `[![SCREEN-TEST-BASE default ${platform}](${relativeTargetAsset(platform)})](${relativeTargetAsset(platform)})`,
          )
          .join("\n\n")
      : "";
  const sharedReferences = platforms
    .map(
      (platform) =>
        `[![SCREEN-TEST-SHARED default ${platform}](${relativeTargetAsset(platform)})](${relativeTargetAsset(platform)})`,
    )
    .join("\n\n");
  await mkdir(path.join(rootDir, "docs/spec/features"), { recursive: true });
  await mkdir(path.join(rootDir, "app"), { recursive: true });
  await writeFile(
    path.join(rootDir, "docs/spec/screen-catalog.md"),
    `# Screen Catalog

| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |
|---|---|---|---|---|---|---|---|
| \`SCREEN-TEST-BASE\` | Base | Product | / | Yes | Yes | Customer | [Shared](./features/shared.md#screen-test-base-base) |
| \`SCREEN-TEST-SHARED\` | Shared | Product | /shared | Yes | Yes | Customer | [Shared](./features/shared.md#screen-test-shared-shared) |
`,
  );
  await writeFile(
    path.join(rootDir, "docs/spec/features/shared.md"),
    `# Shared

## UI / Behavior Contract

${stateTable("SCREEN-TEST-BASE", targetRequirement, targetDetail, targetReferences)}
${stateTable("SCREEN-TEST-SHARED", "shared", sharedDetail, sharedReferences)}
## Business Rules

### BR-TEST-001 — Example rule

Example rule.

## Acceptance Criteria

### Criteria

#### AC-TEST-001 — Example acceptance

Example acceptance.
`,
  );
  await writeFile(
    path.join(rootDir, "app/index.tsx"),
    "export default function Example() { return null; }\n",
  );
  const sourceAsset = path.join(
    process.cwd(),
    "docs/spec/assets/screens/SCREEN-STOREFRONT-HOME/default/web-desktop.webp",
  );
  if (targetRequirement === "required" && targetStatus === "captured") {
    for (const platform of platforms) {
      await mkdir(path.join(rootDir, path.dirname(targetAsset(platform))), { recursive: true });
      await cp(sourceAsset, path.join(rootDir, targetAsset(platform)));
    }
  }
  if (targetRequirement === "shared") return [];
  return platforms.map((platform) => ({
    captureCaseKey: `SCREEN-TEST-BASE/default/${platform}`,
    screenId: "SCREEN-TEST-BASE",
    stateSlug: "default",
    platform,
    scenario: "default",
    route: "/",
    role: "customer",
    setup: "fixture setup",
    ready: "fixture ready",
    captureMode: "viewport" as CaptureMode,
    status: targetStatus,
    blockerReason: targetStatus === "blocked" ? "fixture blocker" : null,
  }));
}

function androidManifest(
  captureCaseKey: string,
  sourceCommitSha: string,
  automationApkSha256: string,
  overrides: Partial<AndroidVisualCaptureManifest> = {},
): AndroidVisualCaptureManifest {
  return {
    capture_case_key: captureCaseKey,
    source_commit_sha: sourceCommitSha,
    automation_apk_sha256: automationApkSha256,
    ...ANDROID_CANONICAL_PROFILE,
    profile_provenance: {
      runtime_observed: [
        "api_level",
        "abi",
        "resolution",
        "density",
        "locale",
        "font_scale",
        "ui_mode",
        "orientation",
      ],
      workflow_configuration: ["system_image", "avd_profile"],
    },
    ...overrides,
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
    expect(result.summary.capturedTargetCount).toBe(69);
    expect(result.summary.pendingTargetCount).toBe(0);
    expect(result.summary.blockedTargetCount).toBe(25);
  });

  it("separates structural validation from the fail-closed Final Visual Gate", async () => {
    const blockedRoot = await mkdtemp(path.join(os.tmpdir(), "qa-store-visual-final-blocked-"));
    const pendingRoot = await mkdtemp(path.join(os.tmpdir(), "qa-store-visual-final-pending-"));
    const capturedRoot = await mkdtemp(path.join(os.tmpdir(), "qa-store-visual-final-captured-"));
    try {
      const blockedCases = await createVisualFixture(blockedRoot, { status: "blocked" });
      const pendingCases = await createVisualFixture(pendingRoot, { status: "pending" });
      const capturedCases = await createVisualFixture(capturedRoot, { status: "captured" });

      const structural = await validateVisualContract(blockedRoot, { captureCases: blockedCases });
      expect(structural.issues).toEqual([]);
      expect(structural.summary.blockedTargetCount).toBe(1);

      const blockedFinal = await validateVisualContract(blockedRoot, {
        captureCases: blockedCases,
        requireComplete: true,
      });
      expect(blockedFinal.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining("blockedTargetCount === 0") }),
        ]),
      );

      const pendingFinal = await validateVisualContract(pendingRoot, {
        captureCases: pendingCases,
        requireComplete: true,
      });
      expect(pendingFinal.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining("pendingTargetCount === 0") }),
        ]),
      );

      const capturedFinal = await validateVisualContract(capturedRoot, {
        captureCases: capturedCases,
        requireComplete: true,
      });
      expect(capturedFinal.issues).toEqual([]);
      expect(capturedFinal.summary.capturedTargetCount).toBe(
        capturedFinal.summary.captureTargetCount,
      );
    } finally {
      await Promise.all([
        rm(blockedRoot, { recursive: true, force: true }),
        rm(pendingRoot, { recursive: true, force: true }),
        rm(capturedRoot, { recursive: true, force: true }),
      ]);
    }
  });

  it("rejects role, audience/platform ordering, inner grammar, Oracle, and alt violations", async () => {
    const cases = [
      {
        name: "role outside State Audience",
        options: { audience: "customer", role: "operator" as CaptureRole },
        message: "Capture Case role is outside State Audience / Role",
      },
      {
        name: "audience order",
        options: { audience: "customer, guest" },
        message: "Audience / Role must follow the fixed allowlist order",
      },
      {
        name: "platform order",
        options: { platforms: "android, web-desktop" },
        message: "Required platforms must follow the fixed allowlist order",
      },
      {
        name: "platform duplicate",
        options: { platforms: "web-desktop, web-desktop" },
        message: "Required platforms contains a duplicate",
      },
      {
        name: "Functions missing",
        options: { includeFunctions: false },
        message: "must contain exactly one #### Functions",
      },
      {
        name: "Visual References missing",
        options: { includeVisualReferences: false },
        message: "captured Target requires exactly one Markdown image reference",
      },
      {
        name: "invalid Oracle",
        options: { oracle: "`BR-UNKNOWN-001`, `AC-UNKNOWN-001`" },
        message: "Related Oracle references unknown BR",
      },
      {
        name: "empty alt",
        options: { emptyAlt: true },
        message: "canonical image alt must be non-empty",
      },
    ] as const;
    for (const testCase of cases) {
      const root = await mkdtemp(path.join(os.tmpdir(), "qa-store-visual-negative-"));
      try {
        const fixtureCases = await createVisualFixture(root, testCase.options);
        const result = await validateVisualContract(root, { captureCases: fixtureCases });
        expect(
          result.issues.map((issue) => issue.message),
          testCase.name,
        ).toEqual(expect.arrayContaining([expect.stringContaining(testCase.message)]));
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
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

  it("requires Android canonical profile fields to be observed runtime values", async () => {
    const observed: AndroidObservedVisualProfile = {
      api_level: ANDROID_CANONICAL_PROFILE.api_level,
      abi: ANDROID_CANONICAL_PROFILE.abi,
      resolution: ANDROID_CANONICAL_PROFILE.resolution,
      density: ANDROID_CANONICAL_PROFILE.density,
      locale: ANDROID_CANONICAL_PROFILE.locale,
      font_scale: ANDROID_CANONICAL_PROFILE.font_scale,
      ui_mode: ANDROID_CANONICAL_PROFILE.ui_mode,
      orientation: ANDROID_CANONICAL_PROFILE.orientation,
    };
    expect(validateAndroidObservedVisualProfile(observed)).toEqual([]);
    const mutations: [keyof AndroidObservedVisualProfile, string | number][] = [
      ["locale", "en-US"],
      ["font_scale", 1.15],
      ["ui_mode", "dark"],
      ["orientation", "landscape"],
      ["resolution", "1920x1080"],
      ["density", 420],
    ];
    for (const [field, value] of mutations) {
      const wrong = { ...observed, [field]: value } as AndroidObservedVisualProfile;
      expect(validateAndroidObservedVisualProfile(wrong)).toEqual(
        expect.arrayContaining([
          expect.stringContaining(`${field} must match canonical runtime profile`),
        ]),
      );
    }

    const nonAndroidCase = VISUAL_CAPTURE_CASES.find(
      (captureCase) => captureCase.platform !== "android",
    )!;
    const manifest = androidManifest(nonAndroidCase.captureCaseKey, "a".repeat(40), "b".repeat(64));
    const nonAndroidIssues = await validateAndroidVisualManifest(manifest, {
      expectedCaptureCaseKey: nonAndroidCase.captureCaseKey,
      expectedSourceCommitSha: "a".repeat(40),
    });
    expect(nonAndroidIssues).toContain(
      `capture_case_key is not an Android target: ${nonAndroidCase.captureCaseKey}`,
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

      await expect(
        promoteAndroidVisualCapture({
          manifest: androidManifest(androidCase.captureCaseKey, "b".repeat(40), apkSha),
          expectedCaptureCaseKey: androidCase.captureCaseKey,
          expectedSourceCommitSha: "b".repeat(40),
          automationApkPath: apkPath,
          rootDir: tempRoot,
          rawPngPath,
          outputPath: path.join(tempRoot, "wrong-output.webp"),
        }),
      ).rejects.toThrow("Android promotion output must be the canonical asset");
      await expect(readFile(path.join(tempRoot, "wrong-output.webp"))).rejects.toThrow();

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
        workflowRunId: "12345",
      });
      expect(written.capture_case_key).toBe(androidCase.captureCaseKey);
      expect(written.automation_apk_sha256).toBe(apkSha);
      expect(JSON.parse(await readFile(manifestPath, "utf8"))).toMatchObject({
        source_commit_sha: "b".repeat(40),
        workflow_run_id: "12345",
        profile_provenance: {
          runtime_observed: expect.arrayContaining(["density", "resolution"]),
          workflow_configuration: ["system_image", "avd_profile"],
        },
      });

      const { profile_provenance: _profileProvenance, ...withoutProvenance } = manifest;
      const provenanceIssues = await validateAndroidVisualManifest(
        withoutProvenance as AndroidVisualCaptureManifest,
        {
          expectedCaptureCaseKey: androidCase.captureCaseKey,
          expectedSourceCommitSha: "a".repeat(40),
        },
      );
      expect(provenanceIssues).toContain(
        "profile_provenance is required for Android visual manifests",
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("materializes canonical references idempotently", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "qa-store-visual-materializer-"));
    try {
      await mkdir(path.join(tempRoot, "docs/spec"), { recursive: true });
      await cp(path.join(process.cwd(), "docs/spec"), path.join(tempRoot, "docs/spec"), {
        recursive: true,
      });
      const specPath = path.join(tempRoot, "docs/spec/features/storefront.md");
      const original = await readFile(specPath, "utf8");
      const reference =
        "[![SCREEN-STOREFRONT-HOME default web-desktop](../assets/screens/SCREEN-STOREFRONT-HOME/default/web-desktop.webp)](../assets/screens/SCREEN-STOREFRONT-HOME/default/web-desktop.webp)";
      const withoutReference = original.replace(`${reference}\n`, "");
      expect(withoutReference).not.toBe(original);
      await writeFile(specPath, withoutReference);

      expect(await materializeVisualReferences(tempRoot)).toBe(1);
      const first = await readFile(specPath, "utf8");
      expect(await materializeVisualReferences(tempRoot)).toBe(0);
      const second = await readFile(specPath, "utf8");
      expect(second).toBe(first);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("rejects incomplete, blocked, and cyclic shared visual references", async () => {
    const cases = [
      {
        name: "missing platform reference",
        options: {
          sharedDetail: "web-desktop=ref: SCREEN-TEST-BASE/default/web-desktop",
        },
        message: "shared state is missing platform reference: android",
      },
      {
        name: "blocked target",
        options: { targetStatus: "blocked" as const },
        message: "shared state target must be captured: SCREEN-TEST-BASE/default/web-desktop",
      },
      {
        name: "shared to shared cycle",
        options: { targetRequirement: "shared" as const },
        message: "shared state must reference required state: SCREEN-TEST-SHARED/default",
      },
    ] as const;
    for (const testCase of cases) {
      const root = await mkdtemp(path.join(os.tmpdir(), "qa-store-visual-shared-negative-"));
      try {
        const fixtureCases = await createSharedVisualFixture(root, testCase.options);
        const result = await validateVisualContract(root, { captureCases: fixtureCases });
        expect(
          result.issues.map((issue) => issue.message),
          testCase.name,
        ).toEqual(expect.arrayContaining([expect.stringContaining(testCase.message)]));
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });
});
