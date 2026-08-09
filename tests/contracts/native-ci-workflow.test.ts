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
const storefrontFlow = readWorkflow("maestro/native-storefront.yaml");

describe("Native CI workflow contracts", () => {
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
    const production = jobBlock(iosWorkflow, "ios-production-build", "ios-runtime");

    expect(automation).toContain("name: iOS Automation Build");
    expect(production).toContain("name: iOS Production-validation Build");
    expect(automation).not.toContain("needs:");
    expect(production).not.toContain("needs:");
    expectInOrder(automation, [
      "Verify Automation runtime metadata",
      "Run Expo prebuild",
      "Install CocoaPods",
      "xcodebuild \\",
      "Release-iphonesimulator",
      "actions/upload-artifact@v4",
    ]);
    expectInOrder(production, [
      "Verify Production runtime metadata",
      "Run Expo prebuild",
      "Install CocoaPods",
      "xcodebuild \\",
      "-configuration Release",
      "iOS Production Validation / Bundle Guard",
      "Release-iphonesimulator",
      "actions/upload-artifact@v4",
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

  it("keeps iOS app producer and consumer paths explicit", () => {
    const automation = jobBlock(iosWorkflow, "ios-automation-build", "ios-production-build");
    const production = jobBlock(iosWorkflow, "ios-production-build", "ios-runtime");
    const runtime = jobBlock(iosWorkflow, "ios-runtime", "ios-verify");

    for (const contract of [
      {
        producer: automation,
        artifact: "native-ios-app-${{ github.run_id }}",
        saved: "native-automation.app",
        directory: "native-ios-app",
        download: "Download Automation iOS Simulator app",
        variable: "APP_PATH",
      },
      {
        producer: production,
        artifact: "native-ios-production-app-${{ github.run_id }}",
        saved: "native-production-validation.app",
        directory: "native-ios-production-app",
        download: "Download Production-validation iOS Simulator app",
        variable: "PRODUCTION_APP_PATH",
      },
    ]) {
      expect(contract.producer).toContain(`name: ${contract.artifact}`);
      expect(contract.producer).toContain("path: ${{ runner.temp }}/" + contract.directory);
      expect(contract.producer).toContain(`$RUNNER_TEMP/${contract.directory}/${contract.saved}`);
      expect(runtime).toContain(`- name: ${contract.download}`);
      expect(runtime).toContain(`name: ${contract.artifact}`);
      expect(runtime).toContain("path: ${{ runner.temp }}/" + contract.directory);
      expect(runtime).toContain(
        `${contract.variable}="$RUNNER_TEMP/${contract.directory}/${contract.saved}"`,
      );
      expect(runtime).toContain(`xcrun simctl install "$IOS_DEVICE" "$${contract.variable}"`);
    }
  });

  it("boots the iOS Simulator separately and runs the matching Runtime branch", () => {
    const runtime = jobBlock(iosWorkflow, "ios-runtime", "ios-verify");

    expect(runtime).toContain("needs: [ios-automation-build, ios-production-build]");
    expect(runtime).toContain("always()");
    expect(runtime).toContain("needs.ios-automation-build.result == 'success'");
    expect(runtime).toContain("needs.ios-production-build.result == 'success'");
    expect(runtime).toContain("id: ios_simulator_ready");
    expect(runtime).toContain("id: ios_automation_install");
    expect(runtime).not.toContain("xcodebuild -workspace");
    expect(runtime).not.toContain("expo prebuild");
    expect(runtime).not.toContain("pod install");
    expect(runtime).not.toContain("CODE_SIGNING_ALLOWED=NO");
    expect(runtime).not.toContain("ios_runtime_ready");
    expectInOrder(runtime, [
      "Boot iOS Simulator",
      "Install pinned Maestro CLI",
      "Download Automation iOS Simulator app",
      "Install and launch Automation iOS Simulator app",
      "Run iOS Native Customer Maestro flows",
      "Download Production-validation iOS Simulator app",
      "Install and launch Production-validation Simulator app",
      "Run iOS Production-validation Maestro flow",
    ]);
  });

  it("collects iOS simctl diagnose evidence for the selected device", () => {
    const runtime = jobBlock(iosWorkflow, "ios-runtime", "ios-verify");
    const evidenceStart = runtime.indexOf("- name: Collect iOS runtime evidence");
    const evidence = runtime.slice(evidenceStart);

    expect(evidenceStart).toBeGreaterThanOrEqual(0);
    expect(evidence).toContain('--udid="$IOS_DEVICE"');
    expect(evidence).toContain('--output="$DIAGNOSE_DIR"');
    expect(evidence).toContain("--no-archive");
    expect(evidence).toContain("printf '\\n' | xcrun simctl diagnose");
    expect(evidence).toContain('diagnose_status="${PIPESTATUS[1]}"');
    expect(evidence).toContain("simctl-diagnose-status.txt");
    expect(evidence).toContain("simctl_diagnose_exit_code");
    expect(evidence).toContain("simctl_diagnose_output_exists");
    expect(evidence).toContain("simctl_diagnose_output_files");
    expect(evidence).toContain('[[ "$diagnose_status" -eq 0 && "$diagnose_output_files" -gt 0 ]]');
    expect(evidence).toContain("simctl_diagnose_evidence_success");
    expect(evidence).toContain("if: always()");
  });

  it("runs all iOS automation flows before failing and keeps Production independent", () => {
    const runtime = jobBlock(iosWorkflow, "ios-runtime", "ios-verify");
    const automationStart = runtime.indexOf("- name: Run iOS Native Customer Maestro flows");
    const productionInstallStart = runtime.indexOf(
      "- name: Install and launch Production-validation Simulator app",
    );
    const productionFlowStart = runtime.indexOf(
      "- name: Run iOS Production-validation Maestro flow",
    );
    const automation = runtime.slice(automationStart, productionInstallStart);
    const productionInstall = runtime.slice(productionInstallStart, productionFlowStart);
    const productionFlow = runtime.slice(productionFlowStart);

    expect(automation).toContain("overall_status=0");
    expect(automation).toContain("overall_status=1");
    expect(automation).toContain('exit "$overall_status"');
    expect((automation.match(/^\s+run_flow /gm) ?? []).length).toBe(15);
    expect(productionInstall).toContain("needs.ios-production-build.result == 'success'");
    expect(productionFlow).toContain("steps.production_install.outcome == 'success'");
    expect(productionFlow).not.toContain("ios_automation_install");
    expect(iosWorkflow).not.toContain("continue-on-error: true");
  });

  it("has a fail-closed iOS aggregate and no-build skip contract", () => {
    const verify = jobBlock(iosWorkflow, "ios-verify");
    expect(verify).toContain("needs: [ios-automation-build, ios-production-build, ios-runtime]");
    expect(verify).toContain("if: always()");
    expect(verify).toContain('test "$AUTOMATION_RESULT" = success');
    expect(verify).toContain('test "$PRODUCTION_RESULT" = success');
    expect(verify).toContain('test "$RUNTIME_RESULT" = success');
    expect(verify).toContain('test "$AUTOMATION_RESULT" = skipped');
    expect(verify).toContain('test "$PRODUCTION_RESULT" = skipped');
    expect(verify).toContain('test "$RUNTIME_RESULT" = skipped');
  });
});
