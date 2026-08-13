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

const nativeWorkflow = readWorkflow(".github/workflows/native-ci.yml");
const iosWorkflow = readWorkflow(".github/workflows/native-ios-ci.yml");
const phaseOneWorkflow = readWorkflow(".github/workflows/ci.yml");
const androidStartupHelper = readWorkflow("scripts/native/android-maestro-run.sh");
const storefrontFlow = readWorkflow("maestro/native-storefront.yaml");
const visualCaptureFlow = readWorkflow("maestro/native-visual-capture.yaml");
const webUiReview = readWorkflow("e2e/web/ui-review.spec.ts");

describe("Native CI workflow contracts", () => {
  it("accepts only the Processing heading for Checkout Processing visual capture", () => {
    expect(webUiReview).toContain(
      'page.getByRole("heading", { name: "支払いを処理しています", exact: true })',
    );
    expect(webUiReview).not.toContain("支払いを処理しています|支払いを完了できませんでした");
    expect(webUiReview).not.toContain(
      "name: /支払いを処理しています|支払いを完了できませんでした/",
    );
  });

  it("keeps Android automation and production builds independent and self-contained", () => {
    const automation = jobBlock(
      nativeWorkflow,
      "android-automation-build",
      "android-production-build",
    );
    const production = jobBlock(nativeWorkflow, "android-production-build", "android-runtime");

    expect(automation).toContain("name: Android Automation Build");
    expect(production).toContain("name: Android Production-validation Build");
    expect(automation).toContain("needs: detect");
    expect(production).toContain("needs: detect");
    expect(automation).not.toContain("android-production-build");
    expect(production).not.toContain("android-automation-build");
    expectInOrder(automation, [
      "Verify Automation runtime metadata",
      "Run Expo prebuild",
      "Build Automation Release APK",
      "Verify Automation Release APK",
      "Upload Automation Release APK",
    ]);
    expectInOrder(production, [
      "Verify Production runtime metadata",
      "Run Expo prebuild",
      "Build Production-validation Release APK",
      "Verify Production-validation Release APK",
      "Upload Production-validation Release APK",
    ]);
    expect(automation).toContain("EXPO_PUBLIC_APP_ENV: automation");
    expect(automation).toContain("EXPO_PUBLIC_BUILD_KIND: automation");
    expect(automation).toContain('EXPO_PUBLIC_TEST_MODE: "true"');
    expect(automation).toContain("EXPO_PUBLIC_DEFAULT_SEED: default");
    expect(production).toContain("EXPO_PUBLIC_APP_ENV: production");
    expect(production).toContain("EXPO_PUBLIC_BUILD_KIND: production");
    expect(production).toContain('EXPO_PUBLIC_TEST_MODE: "false"');
    expect(production).toContain("EXPO_PUBLIC_DEFAULT_SEED: default");
    expect(automation).toContain("./gradlew :app:assembleRelease");
    expect(production).toContain("./gradlew :app:assembleRelease");
    expect(nativeWorkflow).not.toContain("createBundleReleaseJsAndAssets");
    expect(nativeWorkflow).not.toContain("--rerun-tasks");
    expect(automation).not.toContain("system-images");
    expect(production).not.toContain("system-images");
    expect(automation).not.toContain("maestro test");
    expect(production).not.toContain("maestro test");
  });

  it("keeps Android APK producer and consumer paths explicit", () => {
    const automation = jobBlock(
      nativeWorkflow,
      "android-automation-build",
      "android-production-build",
    );
    const production = jobBlock(nativeWorkflow, "android-production-build", "android-runtime");
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");

    for (const contract of [
      {
        artifact: "native-android-apk-${{ github.run_id }}",
        saved: "native-automation.apk",
        runtimeDir: "native-apk",
        download: "Download Automation Release APK",
        install: 'timeout 180 "$ADB" install -r "$APK_PATH"',
      },
      {
        artifact: "native-android-production-apk-${{ github.run_id }}",
        saved: "native-production-validation.apk",
        runtimeDir: "native-production-apk",
        download: "Download Production-validation Release APK",
        install: 'timeout 180 "$ADB" install -r "$PRODUCTION_APK_PATH"',
      },
    ]) {
      const producer = contract.saved === "native-automation.apk" ? automation : production;
      const variable =
        contract.saved === "native-automation.apk" ? "APK_PATH" : "PRODUCTION_APK_PATH";
      expect(producer).toContain(`cp "$APK_PATH" "$RUNNER_TEMP/native-apks/${contract.saved}"`);
      expect(producer).toContain(`name: ${contract.artifact}`);
      expect(producer).toContain("path: ${{ runner.temp }}/native-apks/" + contract.saved);
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

  it("guards downloaded Production APK by reading every JavaScript bundle body", () => {
    const production = jobBlock(nativeWorkflow, "android-production-build", "android-runtime");
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");

    for (const source of [production, runtime]) {
      expect(source).toContain('unzip -Z1 "$PRODUCTION_APK_PATH"');
      expect(source).toContain("^assets/.*\\.(bundle|hbc)$");
      expect(source).toContain('test -n "$bundle_entries"');
      expect(source).toContain('unzip -p "$PRODUCTION_APK_PATH" "$bundle_entry"');
      const markerScan =
        source.match(
          /if unzip -p "\$PRODUCTION_APK_PATH" "\$bundle_entry" \|[\s\S]*?\n\s*then/,
        )?.[0] ?? "";
      expect(markerScan).toContain(
        "grep -aE '__SCENARIO_SHOP_NATIVE_AUTOMATION__|__SCENARIO_SHOP_NATIVE_CONTRACT_HARNESS__|NativeTestControlService' > /dev/null",
      );
      expect(markerScan).not.toMatch(/\bgrep\b[^\r\n]*(?:-q|--quiet)/);
      for (const marker of [
        "__SCENARIO_SHOP_NATIVE_AUTOMATION__",
        "__SCENARIO_SHOP_NATIVE_CONTRACT_HARNESS__",
        "NativeTestControlService",
      ]) {
        expect(source).toContain(marker);
      }
    }
    expect(runtime).not.toContain(
      'unzip -l "$PRODUCTION_APK_PATH" | grep -Eq \'__SCENARIO_SHOP_NATIVE_AUTOMATION__',
    );
  });

  it("starts Android Runtime when either independent build succeeds and never builds there", () => {
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");

    expect(runtime).toContain(
      "needs: [detect, android-automation-build, android-production-build]",
    );
    expect(runtime).toContain("always()");
    expect(runtime).toContain("needs.android-automation-build.result == 'success'");
    expect(runtime).toContain("needs.android-production-build.result == 'success'");
    expect(runtime).not.toContain("assembleRelease");
    expect(runtime).not.toContain("expo prebuild");
    expect(runtime).not.toContain("gradle/actions/setup-gradle");
    expect(runtime).not.toContain("actions/setup-node@v4");
    expect(runtime).not.toContain("continue-on-error: true");
    expectInOrder(runtime, [
      "Start Android Emulator with KVM",
      "Install pinned Maestro CLI",
      "Download Automation Release APK",
      "Install and launch Automation APK",
      "Run Maestro Test Control flow",
      "Download Production-validation Release APK",
      "Install and launch Production-validation APK",
      "Run Maestro Native Production-validation flow",
    ]);
  });

  it("keeps canonical Android visual capture manual, profile-bound, and provenance-bound", () => {
    const runtime = jobBlock(nativeWorkflow, "android-runtime", "native-ios");
    const captureStart = runtime.indexOf("- name: Capture Android Screen Catalog baseline");
    const captureEnd = runtime.indexOf("\n      - name:", captureStart + 1);
    const capture = runtime.slice(captureStart, captureEnd === -1 ? undefined : captureEnd);

    expect(nativeWorkflow).toContain("capture_spec_visuals:");
    expect(nativeWorkflow).toContain("type: boolean");
    expect(nativeWorkflow).toContain("default: false");
    expect(nativeWorkflow).toContain("capture_case_key:");
    expect(nativeWorkflow).toContain("type: string");
    expect(nativeWorkflow).toContain("default: SCREEN-STOREFRONT-HOME/default/android");
    expect(captureStart).toBeGreaterThanOrEqual(0);
    expect(capture).toContain("inputs.capture_spec_visuals == true");
    expect(capture).toContain("steps.android_profile_normalize.outcome == 'success'");
    expect(capture).not.toContain("pull_request");
    expect(capture).toContain('CASE_KEY="${{ inputs.capture_case_key }}"');
    expect(capture).toContain("android-visual-capture.ts describe-case");
    for (const captureMetadata of [
      "scenario",
      "route",
      "role",
      "setup",
      "ready",
      "native_setup_id",
      "native_reset_payment_delay_ms",
      "native_ready_id",
      "ready_conditions",
      "capture_mode",
    ]) {
      expect(capture).toContain(`.${captureMetadata}`);
    }
    expect(capture).toContain("maestro/native-visual-capture.yaml");
    expect(capture).toContain("android-maestro-run.sh");
    expect(capture).toContain('--env "SETUP_SUBFLOW=$NATIVE_SETUP_SUBFLOW"');
    expect(capture).toContain('jq -rn --arg value "$SCENARIO"');
    expect(capture).toContain("scenario=${scenario_encoded}");
    expect(capture).toContain('--env "ROLE=$ROLE"');
    expectInOrder(capture, ["android-maestro-run.sh", "exec-out screencap -p"]);
    expect(capture).not.toContain('test -n "$READY"');
    expect(capture).toContain("source-commit-sha");
    expect(capture).toContain("--automation-apk-path");
    expect(capture).toContain("android-visual-capture.ts write-manifest");
    expect(capture).toContain("--observed-profile-json");
    expectInOrder(runtime, [
      "Normalize Android canonical visual profile",
      "Capture Android Screen Catalog baseline",
    ]);
    expect(capture).toContain("--system-image google_apis");
    expect(capture).toContain("--avd-profile pixel_2");
    expect(runtime).toContain("native-android-screen-catalog-visuals-");
    for (const profileValue of [
      "android-${ANDROID_API_LEVEL}",
      "google_apis",
      "x86_64",
      "pixel_2",
      "ja-JP",
      "font_scale 1.0",
    ]) {
      expect(runtime).toContain(profileValue);
    }
    expect(capture).toContain("exec-out screencap -p");
    expect(capture).toContain("APK_PATH");
    expect(capture).toContain("GITHUB_SHA");
    expect(capture).toContain("GITHUB_RUN_ID");
  });

  it("executes Capture Case setup metadata and asserts role plus all ready matcher slots", () => {
    expect(visualCaptureFlow).toContain("- launchApp\n");
    expect(visualCaptureFlow).toContain("SETUP_SUBFLOW");
    expect(visualCaptureFlow).toContain('true: ${ROLE == "customer"}');
    expect(visualCaptureFlow).toContain('true: ${ROLE == "guest"}');
    for (const slot of [1, 2, 3]) {
      expect(visualCaptureFlow).toContain(`READY_KIND_${slot}`);
      expect(visualCaptureFlow).toContain(`READY_VALUE_${slot}`);
    }
    expect(visualCaptureFlow).not.toMatch(/^\s+- sleep:/m);
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
    const productionInstall = runtime.slice(productionInstallStart, productionFlowStart);
    const productionFlow = runtime.slice(productionFlowStart);
    expect(productionInstall).toContain("needs.android-production-build.result == 'success'");
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
    ]);
    expect(verify).toContain("needs.style-quality.result");
    expect(verify).toContain('require_success "style-quality" "$STYLE_QUALITY_RESULT"');
    expect(phaseOneWorkflow).not.toContain("continue-on-error: true");
  });

  it("uses a fail-closed Android cleanup helper before every Maestro launch", () => {
    expect(androidStartupHelper).toContain('am force-stop "$PACKAGE_ID"');
    expect(androidStartupHelper).toContain('shell pm clear "$PACKAGE_ID"');
    expect(androidStartupHelper).toContain('shell pidof "$PACKAGE_ID"');
    expect(androidStartupHelper).toContain('"$MAESTRO_BIN" "${maestro_args[@]}"');
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
  });

  it("keeps Native CI final verify fail-closed and preserves the no-change skip", () => {
    const verify = jobBlock(nativeWorkflow, "verify");
    const nativeIos = jobBlock(nativeWorkflow, "native-ios", "verify");

    expect(nativeIos).toContain("needs: detect");
    expect(nativeIos).toContain(
      "if: needs.detect.outputs.native_changed == 'true' || github.event_name == 'workflow_dispatch'",
    );
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
    expect(verify).toContain('test "$ANDROID_AUTOMATION_BUILD_RESULT" = skipped');
    expect(verify).toContain('test "$ANDROID_PRODUCTION_BUILD_RESULT" = skipped');
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
