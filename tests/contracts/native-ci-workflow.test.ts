import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readWorkflow(filePath: string): string {
  return readFileSync(resolve(process.cwd(), filePath), "utf8").replace(/\r\n/g, "\n");
}

function jobBlock(source: string, jobName: string, nextJobName?: string): string {
  const start = source.indexOf(`  ${jobName}:\n`);
  expect(start).toBeGreaterThanOrEqual(0);

  if (nextJobName === undefined) return source.slice(start);

  const end = source.indexOf(`  ${nextJobName}:\n`, start + 1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function expectInOrder(source: string, fragments: string[]): void {
  let previous = -1;
  for (const fragment of fragments) {
    const index = source.indexOf(fragment);
    expect(index).toBeGreaterThan(previous);
    previous = index;
  }
}

function assertAndroidLauncherStabilizationContract(source: string): void {
  const capture = 'if ! timeout 30 "$ADB" shell pm list packages > "$launcher_package_list"; then';
  const normalize =
    'if ! tr -d \'\\r\' < "$launcher_package_list" > "$launcher_package_list_normalized"; then';
  const exactMatch =
    'if grep -Fqx "package:$LAUNCHER_PACKAGE" "$launcher_package_list_normalized"; then';
  const forceStop = 'timeout 30 "$ADB" shell am force-stop "$LAUNCHER_PACKAGE"';
  const captureIndex = source.indexOf(capture);
  const captureFailure = source.indexOf("exit 1", captureIndex);
  const normalizeIndex = source.indexOf(normalize, captureIndex);
  const exactMatchIndex = source.indexOf(exactMatch, normalizeIndex);
  const forceStopIndex = source.indexOf(forceStop, exactMatchIndex);

  if (captureIndex < 0 || captureFailure < captureIndex)
    throw new Error("launcher package capture must fail closed");
  if (normalizeIndex < 0 || exactMatchIndex < normalizeIndex || forceStopIndex < exactMatchIndex)
    throw new Error("launcher package normalization, exact match, and force-stop order is invalid");
  if (source.includes("pm list packages |"))
    throw new Error("launcher package detection must not use a truncating pipeline");
}

function assertAndroidStartupInvocationContract(source: string): void {
  const functionStart = source.indexOf("dismiss_launcher_anr_dialog() {");
  const functionEnd = source.indexOf(
    '\n}\n\necho "Preparing Android application state before Maestro launch."',
    functionStart,
  );
  const standaloneCalls = [...source.matchAll(/^dismiss_launcher_anr_dialog\s*$/gm)];
  const firstForceStop = source.indexOf(
    'timeout 30 "$ADB_BIN" shell am force-stop "$PACKAGE_ID"',
    functionEnd,
  );
  const standaloneCall = standaloneCalls[0]?.index ?? -1;

  if (functionStart < 0 || functionEnd < functionStart)
    throw new Error("launcher dismissal function is missing");
  if (standaloneCalls.length !== 1 || standaloneCall <= functionEnd)
    throw new Error(
      "launcher dismissal must have exactly one standalone call after its definition",
    );
  if (firstForceStop < 0 || standaloneCall > firstForceStop)
    throw new Error("launcher dismissal must run before application force-stop");
}

const nativeWorkflow = readWorkflow(".github/workflows/native-ci.yml");
const androidBuildWorkflow = readWorkflow(".github/workflows/native-android-build.yml");
const nativeBundleValidator = readWorkflow("scripts/validate-native-production-bundle.ts");
const productionGuardHelper = readWorkflow("scripts/native/android-ci-production-bundle-guard.sh");
const emulatorStartHelper = readWorkflow("scripts/native/android-ci-emulator-start.sh");
const visualProfileHelper = readWorkflow("scripts/native/android-ci-visual-profile.sh");
const visualCaptureHelper = readWorkflow("scripts/native/android-ci-visual-capture.sh");
const runtimeEvidenceHelper = readWorkflow("scripts/native/android-ci-runtime-evidence.sh");
const iosWorkflow = readWorkflow(".github/workflows/native-ios-ci.yml");
const phaseOneWorkflow = readWorkflow(".github/workflows/ci.yml");
const androidStartupHelper = readWorkflow("scripts/native/android-maestro-run.sh");
const storefrontFlow = readWorkflow("maestro/native-storefront.yaml");
const visualCaptureFlow = readWorkflow("maestro/native-visual-capture.yaml");
const localeProvisionFlow = readWorkflow("maestro/android-locale-provision.yaml");
const customerCheckoutSetupFlow = readWorkflow(
  "maestro/subflows/native-visual-capture-customer-checkout.yaml",
);
const guestCartSetupFlow = readWorkflow("maestro/subflows/native-visual-capture-guest-cart.yaml");
const customerLoginSetupFlow = readWorkflow(
  "maestro/subflows/native-visual-capture-customer-login.yaml",
);
const webUiReview = readWorkflow("e2e/web/ui-review.spec.ts");

describe("Native CI workflow contracts", () => {
  it("disables Husky for Native CI and iOS CI installs", () => {
    expect(nativeWorkflow).toContain('  PNPM_VERSION: 10.34.5\n  HUSKY: "0"\n');
    expect(iosWorkflow).toContain('  PNPM_VERSION: 10.34.5\n  HUSKY: "0"\n');
  });

  it("inspects Hermes bytecode through the shared decoded-artifact contract", () => {
    expect(nativeBundleValidator).toContain('require.resolve("hermes-compiler/package.json")');
    expect(nativeBundleValidator).toContain('["-dump-bytecode", path]');
    expect(nativeBundleValidator).toContain("--automation-bundle-path");
    expect(nativeBundleValidator).toContain("--production-bundle-path");
    expect(nativeBundleValidator).toContain(
      "Automation Hermes artifacts are missing decoded markers",
    );
    expect(nativeBundleValidator).toContain(
      "Production Hermes artifacts contain decoded Automation/Test Control markers",
    );
    expect(nativeBundleValidator).not.toContain("readFileSync");
    expect(nativeBundleValidator).not.toContain("grep");
  });

  it("accepts only the Processing heading for Checkout Processing visual capture", () => {
    expect(webUiReview).toContain(
      'page.getByRole("heading", { name: "支払いを処理しています", exact: true })',
    );
    expect(webUiReview).not.toContain("支払いを処理しています|支払いを完了できませんでした");
    expect(webUiReview).not.toContain(
      "name: /支払いを処理しています|支払いを完了できませんでした/",
    );
  });

  it("runs the Native platform-boundary enforcement gate in Native CI", () => {
    const nativeStatic = jobBlock(nativeWorkflow, "native-static", "android-automation-build");
    expect(nativeStatic).toContain("run: pnpm run check:native-route-dependencies");
  });

  it("detects regular Native CI helper paths without broadening manual-only visual detection", () => {
    const detect = jobBlock(nativeWorkflow, "detect", "native-static");

    for (const path of [
      ".github/workflows/native-android-build.yml",
      "scripts/native/android-maestro-run.sh",
      "scripts/native/android-ci-production-bundle-guard.sh",
      "scripts/native/android-ci-emulator-start.sh",
      "scripts/native/android-ci-runtime-evidence.sh",
    ]) {
      expect(detect).toContain(`'${path}'`);
    }
    for (const path of [
      "scripts/native/android-ci-visual-profile.sh",
      "scripts/native/android-ci-visual-capture.sh",
      "scripts/spec/android-visual-capture.ts",
      "scripts/spec/android-visual-setup.ts",
      "scripts/spec/visual-registry.ts",
    ]) {
      expect(detect).not.toContain(`'${path}'`);
    }
    expect(detect).not.toContain("scripts/native/**");
    expect(nativeWorkflow).not.toContain("visual_changed:");
  });

  it("keeps Android build caller IDs and delegates only the build kind", () => {
    const automation = jobBlock(
      nativeWorkflow,
      "android-automation-build",
      "android-production-build",
    );
    const production = jobBlock(
      nativeWorkflow,
      "android-production-build",
      "production-bundle-guard",
    );

    expect(automation).toContain("name: Android Automation Build");
    expect(production).toContain("name: Android Production-validation Build");
    expect(automation).toContain("needs: detect");
    expect(production).toContain("needs: detect");
    expect(automation).toContain(
      "if: needs.detect.outputs.native_changed == 'true' || github.event_name == 'workflow_dispatch'",
    );
    expect(production).toContain(
      "if: needs.detect.outputs.native_changed == 'true' || github.event_name == 'workflow_dispatch'",
    );
    for (const [caller, buildKind] of [
      [automation, "automation"],
      [production, "production"],
    ]) {
      expect(caller).toContain("uses: ./.github/workflows/native-android-build.yml");
      expect(caller).toContain(`build_kind: ${buildKind}`);
      expect(caller).not.toContain("runs-on:");
      expect(caller).not.toContain("timeout-minutes:");
      expect(caller).not.toContain("steps:");
      expect(caller).not.toContain("env:");
      expect(caller).not.toContain("artifact_name:");
      expect(caller).not.toContain("filename:");
    }
  });

  it("owns Android builds in a constrained reusable workflow and preserves their asymmetry", () => {
    const workflowCall = androidBuildWorkflow.slice(
      androidBuildWorkflow.indexOf("workflow_call:"),
      androidBuildWorkflow.indexOf("\njobs:"),
    );
    const build = jobBlock(androidBuildWorkflow, "android-build");

    expect(workflowCall).toContain("build_kind:");
    expect(workflowCall).toContain("required: true");
    expect(workflowCall).toContain("type: string");
    expect(workflowCall.match(/^      [a-z][a-z0-9_-]*:/gm)).toEqual(["      build_kind:"]);
    expect(androidBuildWorkflow).not.toContain("concurrency:");
    expect(build).toContain("runs-on: ubuntu-24.04");
    expect(build).toContain("timeout-minutes: 40");
    expect(androidBuildWorkflow).toContain("NODE_VERSION: 24");
    expect(androidBuildWorkflow).toContain("PNPM_VERSION: 10.34.5");
    expect(androidBuildWorkflow).toContain('HUSKY: "0"');
    for (const versionName of ["NODE_VERSION", "PNPM_VERSION", "HUSKY"]) {
      const parentValue = nativeWorkflow.match(new RegExp(`^  ${versionName}: (.+)$`, "m"))?.[1];
      const buildValue = androidBuildWorkflow.match(
        new RegExp(`^  ${versionName}: (.+)$`, "m"),
      )?.[1];
      expect(buildValue).toBe(parentValue);
    }
    expect(androidBuildWorkflow).toContain('case "$BUILD_KIND" in');
    expect(androidBuildWorkflow).toContain("automation|production) ;;");
    expect(build).toContain("EXPO_PUBLIC_APP_ENV: ${{ inputs.build_kind }}");
    expect(build).toContain("EXPO_PUBLIC_BUILD_KIND: ${{ inputs.build_kind }}");
    expect(androidBuildWorkflow).toContain(
      "EXPO_PUBLIC_TEST_MODE: ${{ inputs.build_kind == 'automation' && 'true' || 'false' }}",
    );
    expect(build).toContain("EXPO_PUBLIC_DEFAULT_SEED: default");
    expect(build).toContain('ANDROID_COMPILE_API_LEVEL: "36"');
    expect(androidBuildWorkflow).toContain("format('native-android-apk-{0}', github.run_id)");
    expect(androidBuildWorkflow).toContain("native-automation.apk");
    expect(androidBuildWorkflow).toContain(
      "format('native-android-production-apk-{0}', github.run_id)",
    );
    expect(androidBuildWorkflow).toContain("native-production-validation.apk");
    expect(androidBuildWorkflow).toContain(
      "format('native-android-build-evidence-{0}', github.run_id)",
    );
    expect(androidBuildWorkflow).toContain(
      "format('native-android-production-build-evidence-{0}', github.run_id)",
    );
    expectInOrder(androidBuildWorkflow, [
      "Build Android Release APK",
      "Verify Automation Release APK",
      "Save Automation Release APK",
      "Save Production-validation Release APK",
      "Verify Production-validation Release APK",
    ]);
    expect(androidBuildWorkflow).toContain("x86_64");
    expect(androidBuildWorkflow).toContain("arm64-v8a|armeabi-v7a|x86");
    expect(androidBuildWorkflow).not.toContain("emulator");
    expect(androidBuildWorkflow).not.toContain("maestro test");
    expect(nativeWorkflow).not.toContain("createBundleReleaseJsAndAssets");
    expect(nativeWorkflow).not.toContain("--rerun-tasks");

    for (const action of [
      "actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8",
      "pnpm/action-setup@a15d269cd4658e1107c09f1fabf4cbd7bd1f308a",
      "actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444",
      "actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961",
      "gradle/actions/setup-gradle@f236b35da9d031e13b1005234ebe4392ed54c580",
      "actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f",
    ]) {
      expect(androidBuildWorkflow).toContain(action);
    }
    expect(androidBuildWorkflow).toContain("persist-credentials: false");
    expect(androidBuildWorkflow).toContain("version: ${{ env.PNPM_VERSION }}");
    expect(androidBuildWorkflow).toContain("node-version: ${{ env.NODE_VERSION }}");
    expect(androidBuildWorkflow).toContain("cache: pnpm");
    expect(androidBuildWorkflow).toContain("distribution: temurin");
    expect(androidBuildWorkflow).toContain('java-version: "17"');
    expect(androidBuildWorkflow).toContain(
      "cache-read-only: ${{ github.event_name == 'pull_request' }}",
    );
    expect(androidBuildWorkflow).toContain("if-no-files-found: error");
    expect(androidBuildWorkflow).toContain("overwrite: true");
    expect(androidBuildWorkflow).toContain("retention-days: 3");
    expect(androidBuildWorkflow).toContain("if: always()");
    expect(androidBuildWorkflow).toContain("if-no-files-found: warn");
    expect(androidBuildWorkflow).toContain("retention-days: 7");
  });

  it("keeps Android APK producer and consumer paths explicit", () => {
    const androidBuild = jobBlock(androidBuildWorkflow, "android-build");
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");

    for (const contract of [
      {
        artifact: "native-android-apk-${{ github.run_id }}",
        buildArtifact: "format('native-android-apk-{0}', github.run_id)",
        saved: "native-automation.apk",
        runtimeDir: "native-apk",
        download: "Download Automation Release APK",
        install: 'timeout 180 "$ADB" install -r "$APK_PATH"',
      },
      {
        artifact: "native-android-production-apk-${{ github.run_id }}",
        buildArtifact: "format('native-android-production-apk-{0}', github.run_id)",
        saved: "native-production-validation.apk",
        runtimeDir: "native-production-apk",
        download: "Download Production-validation Release APK",
        install: 'timeout 180 "$ADB" install -r "$PRODUCTION_APK_PATH"',
      },
    ]) {
      const variable =
        contract.saved === "native-automation.apk" ? "APK_PATH" : "PRODUCTION_APK_PATH";
      expect(androidBuildWorkflow).toContain(contract.buildArtifact);
      expect(androidBuildWorkflow).toContain(contract.saved);
      expect(androidBuild).toContain('cp "$APK_PATH" "$RUNNER_TEMP/native-apks/$APK_FILENAME"');
      expect(androidBuild).toContain("name: ${{ env.APK_ARTIFACT_NAME }}");
      expect(androidBuild).toContain("$RUNNER_TEMP/native-apks/$APK_FILENAME");
      expect(runtime).toContain(`- name: ${contract.download}`);
      expect(runtime).toContain(`name: ${contract.artifact}`);
      expect(runtime).toContain("path: ${{ runner.temp }}/" + contract.runtimeDir);
      expect(runtime).toContain(
        `${variable}="$RUNNER_TEMP/${contract.runtimeDir}/${contract.saved}"`,
      );
      expect(runtime).toContain(`test -f "$${variable}"`);
      expect(runtime).toContain(contract.install);
    }
    expect(runtime).toContain("id: android_emulator_ready");
    expect(runtime).toContain("id: android_automation_install");
    expect(runtime).toContain("id: production_install");
  });

  it("guards Actual Production APK Hermes artifacts through the shared validator", () => {
    const productionGuard = jobBlock(nativeWorkflow, "production-bundle-guard", "android-runtime");
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");

    expect(productionGuard).toContain(
      "needs: [detect, android-automation-build, android-production-build]",
    );
    expect(productionGuard).toContain("Download Automation Release APK");
    expect(productionGuard).toContain("Download Production-validation Release APK");
    expect(productionGuard).toContain("Inspect Actual Hermes artifacts with shared validator");
    expect(productionGuard).toContain(
      "run: bash scripts/native/android-ci-production-bundle-guard.sh",
    );
    expect(productionGuard).toContain("AUTOMATION_APK_PATH:");
    expect(productionGuard).toContain("PRODUCTION_APK_PATH:");
    expect(productionGuardHelper).toContain('unzip -Z1 "$apk_path"');
    expect(productionGuardHelper).toContain('unzip -p "$apk_path" "$entry"');
    expect(productionGuardHelper).toContain("^assets/.*\\.(bundle|hbc)$");
    expect(productionGuardHelper).toContain("--automation-bundle-path");
    expect(productionGuardHelper).toContain("--production-bundle-path");
    expect(productionGuardHelper).toContain(
      'pnpm run validate:native-production-bundle "${validator_args[@]}"',
    );
    expect(productionGuardHelper).not.toContain(
      'pnpm run validate:native-production-bundle -- "${validator_args[@]}"',
    );
    expect(productionGuardHelper).not.toContain("grep -aE");

    const androidBuild = jobBlock(androidBuildWorkflow, "android-build");
    for (const source of [androidBuild, runtime]) {
      expect(source).toContain('unzip -Z1 "$PRODUCTION_APK_PATH"');
      expect(source).toContain("^assets/.*\\.(bundle|hbc)$");
      expect(source).toContain('test -n "$bundle_entries"');
      expect(source).not.toContain("grep -aE");
    }
    for (const marker of [
      "__SCENARIO_SHOP_NATIVE_AUTOMATION__",
      "__SCENARIO_SHOP_NATIVE_CONTRACT_HARNESS__",
      "NativeTestControlService",
    ]) {
      expect(nativeWorkflow).not.toContain(marker);
      expect(productionGuardHelper).not.toContain(marker);
    }
    expect(runtime).not.toContain(
      'unzip -l "$PRODUCTION_APK_PATH" | grep -Eq \'__SCENARIO_SHOP_NATIVE_AUTOMATION__',
    );
  });

  it("starts Android Runtime when either independent build succeeds and never builds there", () => {
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");

    expect(runtime).toContain(
      "needs: [detect, android-automation-build, android-production-build, production-bundle-guard]",
    );
    expect(runtime).toContain("always()");
    expect(runtime).toContain("needs.android-automation-build.result == 'success'");
    expect(runtime).toContain("needs.android-production-build.result == 'success'");
    expect(runtime).toContain("needs.production-bundle-guard.result == 'success'");
    expect(runtime).not.toContain("assembleRelease");
    expect(runtime).not.toContain("expo prebuild");
    expect(runtime).not.toContain("gradle/actions/setup-gradle");
    expect(runtime).not.toContain("actions/setup-node@v4");
    expect(runtime).not.toContain("continue-on-error: true");
    expectInOrder(runtime, [
      "Start Android Emulator with KVM",
      "Stabilize Android launcher before APK launch",
      "Install pinned Maestro CLI",
      "Download Automation Release APK",
      "Install and launch Automation APK",
      "Run Maestro Test Control flow",
      "Run Training Maestro baseline",
      "Download Production-validation Release APK",
      "Install and launch Production-validation APK",
      "Run Maestro Native Production-validation flow",
    ]);
  });

  it("stops the Pixel Launcher before the Android runtime APK is launched", () => {
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");

    expect(runtime).toContain('LAUNCHER_PACKAGE="com.google.android.apps.nexuslauncher"');
    expect(runtime).toContain('shell am force-stop "$LAUNCHER_PACKAGE"');
    expect(runtime).toContain(
      "Pixel Launcher package is absent; continuing without launcher stabilization.",
    );
    expectInOrder(runtime, [
      "Start Android Emulator with KVM",
      "Stabilize Android launcher before APK launch",
      "Install pinned Maestro CLI",
      "Install and launch Automation APK",
    ]);

    const stabilizationStart = runtime.indexOf(
      "- name: Stabilize Android launcher before APK launch",
    );
    const stabilizationEnd = runtime.indexOf("\n      - name:", stabilizationStart + 1);
    const stabilization = runtime.slice(
      stabilizationStart,
      stabilizationEnd === -1 ? undefined : stabilizationEnd,
    );
    expect(() => assertAndroidLauncherStabilizationContract(stabilization)).not.toThrow();
    const captureLine =
      'if ! timeout 30 "$ADB" shell pm list packages > "$launcher_package_list"; then';
    expect(() =>
      assertAndroidLauncherStabilizationContract(
        stabilization.replace(captureLine, captureLine.slice(3)),
      ),
    ).toThrow(/fail closed/);
  });

  it("keeps canonical Android visual capture manual, profile-bound, and provenance-bound", () => {
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");
    const profileStart = runtime.indexOf("- name: Normalize Android canonical visual profile");
    const profileEnd = runtime.indexOf("\n      - name:", profileStart + 1);
    const profileStep = runtime.slice(profileStart, profileEnd === -1 ? undefined : profileEnd);
    const captureStart = runtime.indexOf("- name: Capture Android Screen Catalog baseline");
    const captureEnd = runtime.indexOf("\n      - name:", captureStart + 1);
    const captureStep = runtime.slice(captureStart, captureEnd === -1 ? undefined : captureEnd);

    expect(nativeWorkflow).toContain("capture_spec_visuals:");
    expect(nativeWorkflow).toContain("type: boolean");
    expect(nativeWorkflow).toContain("default: false");
    expect(nativeWorkflow).toContain("capture_case_key:");
    expect(nativeWorkflow).toContain("type: string");
    expect(nativeWorkflow).toContain("default: SCREEN-STOREFRONT-HOME/default/android");
    expect(profileStart).toBeGreaterThanOrEqual(0);
    expect(captureStart).toBeGreaterThanOrEqual(0);
    expect(profileStep).toContain("id: android_profile_normalize");
    expect(profileStep).toContain("steps.android_adb_root.outcome == 'success'");
    expect(profileStep).toContain("run: bash scripts/native/android-ci-visual-profile.sh");
    expect(captureStep).toContain("inputs.capture_spec_visuals == true");
    expect(captureStep).toContain("steps.android_profile_normalize.outcome == 'success'");
    expect(captureStep).not.toContain("pull_request");
    expect(captureStep).toContain("CAPTURE_CASE_SELECTION: ${{ inputs.capture_case_key }}");
    expect(captureStep).toContain("run: bash scripts/native/android-ci-visual-capture.sh");
    expectInOrder(runtime, [
      "Normalize Android canonical visual profile",
      "Capture Android Screen Catalog baseline",
    ]);
    expect(runtime).toContain("native-android-screen-catalog-visuals-");

    expect(visualCaptureHelper).toContain(': "${CAPTURE_CASE_SELECTION:?');
    expect(visualCaptureHelper).toContain("android-visual-capture.ts list-cases");
    expect(visualCaptureHelper).toContain("android-visual-capture.ts describe-case");
    expect(visualCaptureHelper).toContain('for CASE_KEY in "${CASE_KEYS[@]}"');
    expect(visualCaptureHelper).toContain("capture_case() (");
    for (const captureMetadata of [
      "scenario",
      "route",
      "role",
      "setup",
      "ready",
      "native_setup_id",
      "native_reset_payment_delay_ms",
      "native_checkout_step",
      "native_ready_id",
      "ready_conditions",
      "capture_mode",
    ]) {
      expect(visualCaptureHelper).toContain(`.${captureMetadata}`);
    }
    expect(visualCaptureHelper).toContain("maestro/native-visual-capture.yaml");
    expect(visualCaptureHelper).toContain("android-maestro-run.sh");
    expect(visualCaptureHelper).toContain('--env "SETUP_SUBFLOW=$NATIVE_SETUP_SUBFLOW"');
    expect(visualCaptureHelper).toContain('--env "CHECKOUT_STEP=$NATIVE_CHECKOUT_STEP"');
    expect(visualCaptureHelper).toContain('jq -rn --arg value "$SCENARIO"');
    expect(visualCaptureHelper).toContain("scenario=${scenario_encoded}");
    expect(visualCaptureHelper).toContain('--env "ROLE=$ROLE"');
    expectInOrder(visualCaptureHelper, [
      "list-cases",
      "capture_case() (",
      "android-maestro-run.sh",
      "exec-out screencap -p",
      "android-visual-capture.ts write-manifest",
    ]);
    expect(visualCaptureHelper).not.toContain('test -n "$READY"');
    expect(visualCaptureHelper).toContain("source-commit-sha");
    expect(visualCaptureHelper).toContain("--automation-apk-path");
    expect(visualCaptureHelper).toContain("android-visual-capture.ts write-manifest");
    expect(visualCaptureHelper).toContain("--observed-profile-json");
    expect(visualCaptureHelper).toContain("--system-image google_apis");
    expect(visualCaptureHelper).toContain("--avd-profile pixel_2");
    expect(visualCaptureHelper).toContain("batch.manifest.json");
    expect(visualCaptureHelper).toContain("capture_case_keys");
    expect(visualCaptureHelper).toContain("complete");
    expect(visualCaptureHelper).toContain("canonical promotion is forbidden");
    expect(visualCaptureHelper).not.toContain("25");
    for (const profileValue of ['test "$api_level" = "34"', "ja-JP", "font_scale 1.0"]) {
      expect(visualProfileHelper).toContain(profileValue);
    }
    for (const emulatorProfileValue of [
      "android-${ANDROID_API_LEVEL}",
      "google_apis",
      "x86_64",
      "pixel_2",
    ]) {
      expect(emulatorStartHelper).toContain(emulatorProfileValue);
    }
    expect(runtime).toContain('"$ADB" root');
    expect(runtime).toContain('root_uid="$("$ADB" shell id -u');
    expect(runtime).toContain("uid=0\\(root\\)");
    expect(runtime).toContain("ADB_ROOT_AVAILABLE");
    expect(visualProfileHelper).toContain('if [[ "${ADB_ROOT_AVAILABLE:-false}" = true ]]');
    expect(visualProfileHelper).toContain('provisioning_mode="settings_ui"');
    expect(visualProfileHelper).toContain("setprop persist.sys.locale ja-JP");
    expect(visualProfileHelper).toContain('"$ADB" shell stop');
    expect(visualProfileHelper).toContain('"$ADB" shell start');
    expect(visualProfileHelper).toContain('"$ADB" unroot');
    expect(visualProfileHelper).toContain("settings_service_ready=false");
    expect(visualProfileHelper).toContain(
      "service check settings 2>/dev/null | grep -Eq ':[[:space:]]+found[[:space:]]*$'",
    );
    expect(visualProfileHelper).not.toContain(
      'service check settings 2>/dev/null | grep -q "found"',
    );
    expect(visualProfileHelper).toContain('test "$settings_service_ready" = true');
    expect(visualProfileHelper).toContain('observation_shell_uid="$("$ADB" shell id -u');
    expect(visualProfileHelper).toContain('test "$observation_shell_uid" != "0"');
    expect(visualProfileHelper).toContain("android.settings.LOCALE_SETTINGS");
    expect(visualProfileHelper).toContain('"$MAESTRO_BIN" test');
    expect(visualProfileHelper).toContain("maestro/android-locale-provision.yaml");
    expect(visualProfileHelper).not.toContain('"$ADB" reboot');
    expect(visualProfileHelper).not.toContain("settings put system system_locales ja-JP");
    expect(visualProfileHelper).toContain("$ADB shell dumpsys activity activities");
    expect(visualProfileHelper).toContain('"$ADB" shell wm density 440');
    expect(visualProfileHelper).toContain("Override density:");
    expect(visualProfileHelper).toContain(
      'effective_locale_observation="dumpsys activity activities"',
    );
    expect(visualProfileHelper).toContain("grep -Eq '\\[(ja_JP|ja-JP)(,|\\])'");
    expect(visualProfileHelper).toContain('effective_orientation="unknown"');
    expect(visualProfileHelper).toContain("from effective configuration");
    expect(visualProfileHelper).toContain('effective_locale="unknown"');
    expect(visualProfileHelper).toContain('test "$effective_locale" = "ja-JP"');
    expect(visualProfileHelper).not.toContain('test "$locale_settings" = "ja-JP"');
    expect(visualProfileHelper).not.toContain('test "$locale_value" = "ja-JP"');
    expect(visualCaptureHelper).toContain("exec-out screencap -p");
    expect(visualCaptureHelper).toContain("APK_PATH");
    expect(visualCaptureHelper).toContain("GITHUB_SHA");
    expect(visualCaptureHelper).toContain("GITHUB_RUN_ID");
  });

  it("keeps adb root as a workflow step and moves runtime I/O into its helper owners", () => {
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");
    const profileStart = runtime.indexOf("- name: Normalize Android canonical visual profile");
    const profileEnd = runtime.indexOf("\n      - name:", profileStart + 1);
    const profileStep = runtime.slice(profileStart, profileEnd === -1 ? undefined : profileEnd);
    const rootStart = runtime.indexOf("- name: Check Android adb root capability");
    const rootEnd = runtime.indexOf("\n      - name:", rootStart + 1);
    const rootStep = runtime.slice(rootStart, rootEnd === -1 ? undefined : rootEnd);
    const emulatorStart = runtime.indexOf("- name: Start Android Emulator with KVM");
    const emulatorEnd = runtime.indexOf("\n      - name:", emulatorStart + 1);
    const emulatorStep = runtime.slice(emulatorStart, emulatorEnd === -1 ? undefined : emulatorEnd);
    const evidenceStart = runtime.indexOf("- name: Collect Android evidence");
    const evidenceEnd = runtime.indexOf("\n      - uses:", evidenceStart + 1);
    const evidenceStep = runtime.slice(evidenceStart, evidenceEnd === -1 ? undefined : evidenceEnd);

    expect(rootStep).toContain("id: android_adb_root");
    expect(rootStep).toContain('"$ADB" root');
    expect(rootStep).toContain("ADB_ROOT_AVAILABLE=$root_available");
    expect(runtime).toContain("steps.android_adb_root.outcome == 'success'");
    expect(emulatorStep).toContain("id: android_emulator_ready");
    expect(emulatorStep).toContain("run: bash scripts/native/android-ci-emulator-start.sh");
    for (const required of [
      "ADB",
      "AVDMANAGER",
      "EMULATOR",
      "ANDROID_API_LEVEL",
      "RUNNER_TEMP",
      "GITHUB_ENV",
    ]) {
      expect(emulatorStartHelper).toContain('"${' + required + ":?");
    }
    expect(emulatorStartHelper).toContain(
      'echo "ANDROID_AVD_HOME=$ANDROID_AVD_HOME" >> "$GITHUB_ENV"',
    );
    expect(emulatorStartHelper).toContain('echo "EMULATOR_PID=$EMULATOR_PID" >> "$GITHUB_ENV"');
    for (const diagnostic of [
      "avd-files.txt",
      "avd-list.txt",
      "emulator-pid.txt",
      "emulator.log",
    ]) {
      expect(emulatorStartHelper).toContain(diagnostic);
    }
    expect(emulatorStartHelper).not.toContain("HOME:?");
    expect(profileStep).toContain("run: bash scripts/native/android-ci-visual-profile.sh");
    for (const required of [
      "ADB",
      "MAESTRO_BIN",
      "ADB_ROOT_AVAILABLE",
      "RUNNER_TEMP",
      "GITHUB_WORKSPACE",
      "GITHUB_ENV",
    ]) {
      expect(visualProfileHelper).toContain('"${' + required + ":?");
    }
    expect(visualProfileHelper).toContain(
      'echo "ANDROID_OBSERVED_PROFILE_JSON=$profile_json" >> "$GITHUB_ENV"',
    );
    for (const required of [
      "ADB",
      "MAESTRO_BIN",
      "APK_PATH",
      "ANDROID_OBSERVED_PROFILE_JSON",
      "RUNNER_TEMP",
      "GITHUB_WORKSPACE",
      "GITHUB_SHA",
      "GITHUB_RUN_ID",
    ]) {
      expect(visualCaptureHelper).toContain('"${' + required + ":?");
    }
    expect(evidenceStep).toContain("NATIVE_ANDROID_JOB_STATUS: ${{ job.status }}");
    expect(evidenceStep).toContain("run: bash scripts/native/android-ci-runtime-evidence.sh");
    expect(runtimeEvidenceHelper).toContain(': "${NATIVE_ANDROID_JOB_STATUS:?');
    expect(runtimeEvidenceHelper).toContain(': "${RUNNER_TEMP:?');
    expect(runtimeEvidenceHelper).not.toContain('ADB="${ADB:?');
    expect(runtimeEvidenceHelper).not.toContain('APK_PATH="${APK_PATH:?');
    expect(runtimeEvidenceHelper).toContain('if [[ -n "${ADB:-}" && -x "${ADB:-}" ]]');
    expect(runtimeEvidenceHelper).toContain('if [[ -n "${APK_PATH:-}" && -f "$APK_PATH" ]]');
  });

  it("keeps rootless Android locale fallback isolated in a Settings UI flow", () => {
    expect(localeProvisionFlow).toContain("appId: com.android.settings");
    expect(localeProvisionFlow).toContain('id: "com.android.settings:id/add_language"');
    expect(localeProvisionFlow).toContain('id: "android:id/locale_search_menu"');
    expect(localeProvisionFlow).toContain('id: "android:id/locale"');
    expect(localeProvisionFlow).toContain('id: "android:id/button1"');
    expect(localeProvisionFlow).toContain('inputText: "Japanese"');
    expect(localeProvisionFlow).not.toContain("system_locales");
    expect(localeProvisionFlow).not.toContain("persist.sys.locale");
  });

  it("executes Capture Case setup metadata and asserts role plus all ready matcher slots", () => {
    expect(visualCaptureFlow).toContain("- launchApp\n");
    expect(visualCaptureHelper).toContain('.native_setup_subflow // ""');
    for (const setup of [
      ["guest-cart-with-basic-shirt", "subflows/native-visual-capture-guest-cart.yaml"],
      ["customer-login", "subflows/native-visual-capture-customer-login.yaml"],
      ["customer-login-processing", "subflows/native-visual-capture-customer-login.yaml"],
      ["customer-checkout-address", "subflows/native-visual-capture-customer-checkout.yaml"],
      ["customer-checkout-payment", "subflows/native-visual-capture-customer-checkout.yaml"],
      ["customer-checkout-confirm", "subflows/native-visual-capture-customer-checkout.yaml"],
    ] as const) {
      expect(visualCaptureFlow).toContain(`true: \${SETUP_ID == "${setup[0]}"}`);
      expect(visualCaptureFlow).toContain(`file: ${setup[1]}`);
    }
    expect(visualCaptureFlow).not.toContain("file: ${SETUP_SUBFLOW}");
    expect(visualCaptureFlow).toContain('true: ${ROLE == "customer"}');
    expect(visualCaptureFlow).toContain('true: ${ROLE == "guest"}');
    for (const slot of [1, 2, 3]) {
      expect(visualCaptureFlow).toContain(`READY_KIND_${slot}`);
      expect(visualCaptureFlow).toContain(`READY_VALUE_${slot}`);
    }
    expect(visualCaptureFlow).not.toMatch(/^\s+- sleep:/m);
    expectInOrder(visualCaptureFlow, [
      "file: subflows/native-visual-capture-guest-cart.yaml",
      "file: subflows/native-visual-capture-customer-checkout.yaml",
      'true: ${ROUTE_IS_ROOT == "false"}',
      'true: ${ROLE == "customer"}',
      "READY_KIND_1",
    ]);
  });

  it("executes the customer checkout setup up to the requested semantic step", () => {
    expect(customerCheckoutSetupFlow).not.toContain(
      "subflows/native-visual-capture-customer-login.yaml",
    );
    expect(customerCheckoutSetupFlow).toContain('id: "native-nav-orders"');
    expect(customerCheckoutSetupFlow).toContain('id: "native-persisted-state-ready"');
    expect(customerCheckoutSetupFlow).toContain(
      'id: "native-cart-item-product-basic-shirt-variant-basic-shirt-02"',
    );
    expect(customerCheckoutSetupFlow).toContain('id: "native-checkout-address-screen"');
    expect(customerCheckoutSetupFlow).toContain('id: "native-checkout-address-session-ready"');
    expect(customerCheckoutSetupFlow).toContain('true: ${CHECKOUT_STEP != "address"}');
    expect(customerCheckoutSetupFlow).toContain('id: "native-checkout-address-next"');
    expect(customerCheckoutSetupFlow).toContain('id: "native-checkout-payment-screen"');
    expect(customerCheckoutSetupFlow).toContain('true: ${CHECKOUT_STEP == "confirm"}');
    expect(customerCheckoutSetupFlow).toContain('id: "native-payment-method-TEST-SUCCESS"');
    expect(customerCheckoutSetupFlow).toContain('id: "native-checkout-payment-next"');
    expect(customerCheckoutSetupFlow).toContain('id: "native-checkout-confirm-screen"');
    expect(customerCheckoutSetupFlow).not.toMatch(/^\s+- sleep:/m);
  });

  it("resolves nested visual-capture subflows relative to their subflow directory", () => {
    for (const setupFlow of [
      guestCartSetupFlow,
      customerLoginSetupFlow,
      customerCheckoutSetupFlow,
    ]) {
      expect(setupFlow).toContain("runFlow: accept-ios-deep-link.yaml");
      expect(setupFlow).not.toContain("runFlow: subflows/accept-ios-deep-link.yaml");
    }
  });

  it("keeps Android Maestro flows independent while fail-closing the runtime job", () => {
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");
    const flowNames = [
      "Run Maestro Test Control flow",
      "Run Maestro Contract Harness flow",
      "Run Maestro Not Found flow",
      "Run Maestro Storefront flow",
      "Run Maestro Cart flow",
      "Run Maestro Search Input flow",
      "Run Maestro Restart Persistence flow",
      "Run Maestro Reset Dirty State flow",
      "Run Maestro Out of Stock boundary flow",
      "Run Maestro Low Stock boundary flow",
      "Run Maestro Purchase Limit boundary flow",
      "Run Maestro Native Purchase flow",
      "Run Maestro Native Review flow",
      "Run Maestro Native Payment Retry flow",
      "Run Maestro Native Session Checkout Restart flow",
    ];

    for (const name of flowNames) {
      const start = runtime.indexOf(`- name: ${name}`);
      const end = runtime.indexOf("\n      - name:", start + 1);
      const step = runtime.slice(start, end === -1 ? undefined : end);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(step).toContain("!cancelled()");
      expect(step).toContain("steps.android_automation_install.outcome == 'success'");
      expect(step).not.toContain("continue-on-error: true");
      expect(step).toContain("android-maestro-run.sh");
      expect(step).not.toContain("maestro test");
    }

    const productionInstallStart = runtime.indexOf(
      "- name: Install and launch Production-validation APK",
    );
    const productionFlowStart = runtime.indexOf(
      "- name: Run Maestro Native Production-validation flow",
    );
    const automationInstallStart = runtime.indexOf("- name: Install and launch Automation APK");
    const automationInstall = runtime.slice(automationInstallStart, productionInstallStart);
    const productionInstall = runtime.slice(productionInstallStart, productionFlowStart);
    const productionFlowEnd = runtime.indexOf("\n      - name:", productionFlowStart + 1);
    const productionFlow = runtime.slice(
      productionFlowStart,
      productionFlowEnd === -1 ? undefined : productionFlowEnd,
    );
    expect(automationInstall).toContain('MAIN_ACTIVITY="$PACKAGE_ID/.MainActivity"');
    expect(automationInstall).toContain("cmd package resolve-activity --brief");
    expect(automationInstall).toContain("activity_resolution_status=1");
    expect(automationInstall.indexOf("cmd package resolve-activity --brief")).toBeLessThan(
      automationInstall.indexOf('shell am start -W -n "$MAIN_ACTIVITY"'),
    );
    expect(automationInstall).toContain('shell am start -W -n "$MAIN_ACTIVITY"');
    expect(automationInstall).not.toContain("shell monkey");
    expect(productionInstall).toContain("needs.android-production-build.result == 'success'");
    expect(productionInstall).toContain("needs.production-bundle-guard.result == 'success'");
    expect(productionFlow).toContain("needs.production-bundle-guard.result == 'success'");
    expect(productionFlow).toContain("steps.production_install.outcome == 'success'");
    expect(productionFlow).not.toContain("android_automation_install");
    expect(productionFlow).toContain("android-maestro-run.sh");
  });

  it("connects the Final Visual gate to the Phase 1 Required path", () => {
    const styleQuality = jobBlock(phaseOneWorkflow, "style-quality", "code-quality");
    const verify = jobBlock(phaseOneWorkflow, "verify", "deploy-preview");

    expectInOrder(styleQuality, [
      "run: pnpm run validate:spec",
      "- name: Final Visual Specification gate",
      "run: pnpm run validate:spec-visuals:final",
      "- name: Curriculum validation",
      "run: pnpm run validate:curriculum",
    ]);
    expect(verify).toContain("needs.style-quality.result");
    expect(verify).toContain('require_success "style-quality" "$STYLE_QUALITY_RESULT"');
    expect(phaseOneWorkflow).not.toContain("continue-on-error: true");
  });

  it("uses a fail-closed Android cleanup helper before every Maestro launch", () => {
    expect(androidStartupHelper).toContain('am force-stop "$PACKAGE_ID"');
    expect(androidStartupHelper).toContain("uiautomator dump /dev/tty");
    expect(androidStartupHelper).toContain("Pixel Launcher isn't responding");
    expect(androidStartupHelper).toContain('text="Close app"');
    expect(androidStartupHelper).toContain('shell pm clear "$PACKAGE_ID"');
    expect(androidStartupHelper).toContain('shell pidof "$PACKAGE_ID"');
    expect(androidStartupHelper).toContain('"$MAESTRO_BIN" "${maestro_args[@]}"');
    expect(androidStartupHelper.indexOf("dismiss_launcher_anr_dialog() {")).toBeLessThan(
      androidStartupHelper.indexOf('am force-stop "$PACKAGE_ID"'),
    );
    expect(androidStartupHelper.indexOf("shell pm clear")).toBeGreaterThan(
      androidStartupHelper.indexOf("am force-stop"),
    );
    expect(androidStartupHelper.indexOf('shell pidof "$PACKAGE_ID"')).toBeGreaterThan(
      androidStartupHelper.indexOf("shell pm clear"),
    );
    expect(androidStartupHelper.indexOf('"$MAESTRO_BIN" "${maestro_args[@]}"')).toBeGreaterThan(
      androidStartupHelper.indexOf('shell pidof "$PACKAGE_ID"'),
    );
    expect(androidStartupHelper).not.toContain("clearState");
    expect(androidStartupHelper).not.toContain("retry");

    const tapIndex = androidStartupHelper.lastIndexOf(
      'timeout 15 "$ADB_BIN" shell input tap "$tap_x" "$tap_y"',
    );
    const finalAttemptIndex = androidStartupHelper.indexOf(
      'if [[ "$attempt" -eq 3 ]]; then',
      tapIndex,
    );
    const loopEndIndex = androidStartupHelper.indexOf("\n  done", finalAttemptIndex);
    expect(tapIndex).toBeGreaterThanOrEqual(0);
    expect(finalAttemptIndex).toBeGreaterThan(tapIndex);
    expect(loopEndIndex).toBeGreaterThan(finalAttemptIndex);
    const finalAttempt = androidStartupHelper.slice(finalAttemptIndex, loopEndIndex);
    expect(finalAttempt).toContain(
      'ui_dump="$(timeout 15 "$ADB_BIN" exec-out uiautomator dump /dev/tty 2>/dev/null)"',
    );
    expect(finalAttempt).toContain('if [[ "$ui_dump" != *"$launcher_anr_text"* ]]; then');
    expect(finalAttempt).toContain("return 0");

    expect(() => assertAndroidStartupInvocationContract(androidStartupHelper)).not.toThrow();
    const standaloneCall = "\ndismiss_launcher_anr_dialog\n";
    const withoutStandaloneCall = androidStartupHelper.replace(standaloneCall, "\n");
    expect(() => assertAndroidStartupInvocationContract(withoutStandaloneCall)).toThrow(
      /exactly one standalone call/,
    );
    const appForceStop = 'timeout 30 "$ADB_BIN" shell am force-stop "$PACKAGE_ID"';
    const movedAfterForceStop = withoutStandaloneCall.replace(
      `${appForceStop}\n`,
      `${appForceStop}\ndismiss_launcher_anr_dialog\n`,
    );
    expect(() => assertAndroidStartupInvocationContract(movedAfterForceStop)).toThrow(
      /before application force-stop/,
    );
  });

  it("detects Training Maestro changes and runs the baseline in the shared Android runtime", () => {
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");
    expect(nativeWorkflow).toContain("'training/maestro/**'");
    const trainingBaselineIndex = runtime.indexOf("- name: Run Training Maestro baseline");
    const productionDownloadIndex = runtime.indexOf(
      "- name: Download Production-validation Release APK",
    );
    const productionInstallIndex = runtime.indexOf(
      "- name: Install and launch Production-validation APK",
    );
    expect(trainingBaselineIndex).toBeGreaterThanOrEqual(0);
    expect(productionDownloadIndex).toBeGreaterThanOrEqual(0);
    expect(productionInstallIndex).toBeGreaterThanOrEqual(0);
    expect(trainingBaselineIndex).toBeLessThan(productionDownloadIndex);
    expect(trainingBaselineIndex).toBeLessThan(productionInstallIndex);
    const end = runtime.indexOf("\n      - name:", trainingBaselineIndex + 1);
    const step = runtime.slice(trainingBaselineIndex, end === -1 ? undefined : end);
    expect(step).toContain("steps.android_automation_install.outcome == 'success'");
    expect(step).toContain("steps.maestro_cli.outcome == 'success'");
    expect(step).toContain("android-maestro-run.sh");
    expect(step).toContain("training/maestro/baseline/native-training-baseline.yaml");
    expect(step).toContain("TRAINING_MAESTRO_OUTPUT_DIR");
    expect(step).toContain("maestro-training-baseline.xml");
    expect(step).not.toContain("maestro test");
    expect(step).not.toContain("continue-on-error: true");
    expect(step).not.toContain("assembleRelease");
  });

  it("keeps Native CI final verify fail-closed and preserves the no-change skip", () => {
    const nativeStatic = jobBlock(nativeWorkflow, "native-static", "android-automation-build");
    const productionGuard = jobBlock(nativeWorkflow, "production-bundle-guard", "android-runtime");
    const androidRuntime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");
    const verify = jobBlock(nativeWorkflow, "verify");
    const nativeIos = jobBlock(nativeWorkflow, "native-ios", "verify");
    const nativeChangedStart = verify.indexOf('if [[ "$NATIVE_CHANGED" == "true" ]]');
    const noChangeStart = verify.indexOf("\n          else\n", nativeChangedStart);
    const noChangeEnd = verify.indexOf("\n          fi", noChangeStart);
    const noChangeBranch = verify.slice(noChangeStart, noChangeEnd);
    const nativeRunCondition =
      "needs.detect.outputs.native_changed == 'true' || github.event_name == 'workflow_dispatch'";

    expect(nativeChangedStart).toBeGreaterThanOrEqual(0);
    expect(noChangeStart).toBeGreaterThan(nativeChangedStart);
    expect(noChangeEnd).toBeGreaterThan(noChangeStart);
    expect(nativeStatic).toContain(`if: ${nativeRunCondition}`);
    expect(productionGuard).toContain("if: >-");
    expect(productionGuard).toContain(`(${nativeRunCondition})`);
    expect(androidRuntime).toContain("if: >-");
    expect(androidRuntime).toContain(`(${nativeRunCondition})`);
    expect(nativeIos).toContain("needs: detect");
    expect(nativeIos).toContain(`if: ${nativeRunCondition}`);
    expect(verify).toContain("if: always()");
    for (const jobName of [
      "native-static",
      "production-bundle-guard",
      "android-automation-build",
      "android-production-build",
      "android-runtime",
      "native-ios",
    ]) {
      expect(verify).toContain(`needs.${jobName}.result`);
    }
    expect(verify).toContain("ANDROID_AUTOMATION_BUILD_RESULT");
    expect(verify).toContain("ANDROID_PRODUCTION_BUILD_RESULT");
    expect(verify).toContain('test "$ANDROID_AUTOMATION_BUILD_RESULT" = success');
    expect(verify).toContain('test "$ANDROID_PRODUCTION_BUILD_RESULT" = success');
    expect(verify).toContain('test "$ANDROID_RUNTIME_RESULT" = success');
    expect(verify).toContain('test "$IOS_RESULT" = success');
    for (const resultName of [
      "STATIC_RESULT",
      "PRODUCTION_RESULT",
      "ANDROID_AUTOMATION_BUILD_RESULT",
      "ANDROID_PRODUCTION_BUILD_RESULT",
      "ANDROID_RUNTIME_RESULT",
      "IOS_RESULT",
    ]) {
      expect(noChangeBranch).toContain(`test "$${resultName}" = skipped`);
    }
    expect(verify).toContain('echo "All Native CI gates completed successfully."');
    expect(verify).not.toContain("continue-on-error: true");
  });

  it("uses semantic scrolling for the storefront category", () => {
    expectInOrder(storefrontFlow, [
      'id: "native-home-screen"',
      'id: "native-category-category-apparel"',
      "direction: DOWN",
      'id: "native-catalog-screen"',
    ]);
    expect(storefrontFlow).toContain("scrollUntilVisible:");
    expect(storefrontFlow).toContain("visibilityPercentage: 100");
    expect(storefrontFlow).toContain("centerElement: true");
    expect(storefrontFlow).not.toMatch(/^\s+- sleep:/m);
  });
});

describe("Native iOS CI workflow contracts", () => {
  it("builds Automation and Production independently from clean jobs", () => {
    const automation = jobBlock(iosWorkflow, "ios-automation-build", "ios-production-build");
    const production = jobBlock(iosWorkflow, "ios-production-build", "ios-verify");

    expect(automation).toContain("name: iOS Automation Build");
    expect(production).toContain("name: iOS Production-validation Build");
    expect(automation).not.toContain("needs:");
    expect(production).not.toContain("needs:");
    expectInOrder(automation, [
      "Verify Automation build metadata",
      "Run Expo prebuild",
      "Install CocoaPods",
      "xcodebuild \\",
      "Release-iphonesimulator",
      "Verify Automation built app metadata",
      "Save Automation iOS Simulator app artifact",
      "Upload Automation iOS Simulator app",
    ]);
    expectInOrder(production, [
      "Verify Production build metadata",
      "Run Expo prebuild",
      "Install CocoaPods",
      "xcodebuild \\",
      "-configuration Release",
      "Verify Production-validation iOS Simulator artifact",
      "Release-iphonesimulator",
      "Verify Production built app metadata",
      "iOS Production Validation / Bundle Guard",
      "Save Production-validation iOS Simulator app artifact",
      "Upload Production-validation iOS Simulator app",
    ]);
    expect(automation).toContain("EXPO_PUBLIC_APP_ENV: automation");
    expect(automation).toContain("EXPO_PUBLIC_BUILD_KIND: automation");
    expect(automation).toContain('EXPO_PUBLIC_TEST_MODE: "true"');
    expect(production).toContain("EXPO_PUBLIC_APP_ENV: production");
    expect(production).toContain("EXPO_PUBLIC_BUILD_KIND: production");
    expect(production).toContain('EXPO_PUBLIC_TEST_MODE: "false"');
    for (const job of [automation, production]) {
      expect(job).toContain("expo prebuild --clean --platform ios --no-install");
      expect(job).toContain("pod install");
      expect(job).toContain("-sdk iphonesimulator");
      expect(job).toContain("-configuration Release");
      expect(job).toContain("CODE_SIGNING_ALLOWED=NO");
    }
    expect(automation).not.toContain("ios-production-build");
    expect(production).not.toContain("ios-automation-build");
  });

  it("keeps iOS Simulator app build artifact producer paths explicit", () => {
    const automation = jobBlock(iosWorkflow, "ios-automation-build", "ios-production-build");
    const production = jobBlock(iosWorkflow, "ios-production-build", "ios-verify");

    for (const contract of [
      {
        producer: automation,
        artifact: "native-ios-app-${{ github.run_id }}",
        saved: "native-automation.app",
        directory: "native-ios-app",
        variable: "ARTIFACT_APP_PATH",
      },
      {
        producer: production,
        artifact: "native-ios-production-app-${{ github.run_id }}",
        saved: "native-production-validation.app",
        directory: "native-ios-production-app",
        variable: "PRODUCTION_ARTIFACT_APP_PATH",
      },
    ]) {
      expect(contract.producer).toContain(`name: ${contract.artifact}`);
      expect(contract.producer).toContain("path: ${{ runner.temp }}/" + contract.directory);
      expect(contract.producer).toContain(`$RUNNER_TEMP/${contract.directory}/${contract.saved}`);
      expect(contract.producer).toContain(
        `${contract.variable}="$RUNNER_TEMP/${contract.directory}/${contract.saved}"`,
      );
      expect(contract.producer).toContain(`test -d "$${contract.variable}"`);
      expect(contract.producer).toContain("Release-iphonesimulator");
    }
    for (const [producer, expected] of [
      [automation, { environment: "automation", buildKind: "automation", testMode: "true" }],
      [production, { environment: "production", buildKind: "production", testMode: "false" }],
    ] as const) {
      expect(producer).toContain("EXConstants.bundle/app.config");
      expect(producer).toContain("JSON.parse");
      expect(producer).toContain("Built iOS artifact metadata mismatch");
      expect(producer).toContain("test -f");
      expect(producer).toContain("test -s");
      expect(producer).toContain(`appEnvironment: \"${expected.environment}\"`);
      expect(producer).toContain(`buildKind: \"${expected.buildKind}\"`);
      expect(producer).toContain(`testMode: \"${expected.testMode}\"`);
    }
    expect(iosWorkflow).toContain("if-no-files-found: error");
    expect(iosWorkflow).not.toContain("actions/download-artifact@v4");
  });

  it("has a fail-closed iOS aggregate and no-build skip contract", () => {
    const verify = jobBlock(iosWorkflow, "ios-verify");
    expect(verify).toContain("needs: [ios-automation-build, ios-production-build]");
    expect(verify).toContain("if: always()");
    expect(verify).toContain('test "$AUTOMATION_RESULT" = success');
    expect(verify).toContain('test "$PRODUCTION_RESULT" = success');
    expect(verify).toContain('test "$AUTOMATION_RESULT" = skipped');
    expect(verify).toContain('test "$PRODUCTION_RESULT" = skipped');
    expect(verify).not.toContain("RUNTIME_RESULT");
  });

  it("removes iOS Simulator Runtime machinery from the Build-only workflow", () => {
    expect(iosWorkflow).not.toContain("ios-runtime:");
    for (const runtimeOnlyToken of [
      "simctl",
      "IOS_DEVICE",
      "MAESTRO",
      "maestro test",
      "native-ios-runtime-evidence",
      "actions/download-artifact@v4",
      "Runtime / Maestro",
    ]) {
      expect(iosWorkflow).not.toContain(runtimeOnlyToken);
    }
    expect(iosWorkflow).not.toContain("continue-on-error: true");
  });
});
