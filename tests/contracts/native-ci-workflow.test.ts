import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readWorkflow(filePath: string): string {
  return readFileSync(resolve(process.cwd(), filePath), "utf8").replace(/\r\n/g, "\n");
}

const nativeWorkflow = readWorkflow(".github/workflows/native-ci.yml");
const iosWorkflow = readWorkflow(".github/workflows/native-ios-ci.yml");

function jobBlock(jobName: string, nextJobName?: string) {
  const start = nativeWorkflow.indexOf(`  ${jobName}:\n`);
  expect(start).toBeGreaterThanOrEqual(0);

  if (nextJobName === undefined) {
    return nativeWorkflow.slice(start);
  }

  const end = nativeWorkflow.indexOf(`  ${nextJobName}:\n`, start + 1);
  expect(end).toBeGreaterThan(start);
  return nativeWorkflow.slice(start, end);
}

describe("Native CI workflow contracts", () => {
  it("resolves the Android SDK and sdkmanager without relying on PATH", () => {
    const runtime = jobBlock("android-runtime", "verify");
    const build = jobBlock("android-build", "android-runtime");

    expect(runtime).toContain(
      'SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/usr/local/lib/android/sdk}}"',
    );
    expect(build).toContain(
      'SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/usr/local/lib/android/sdk}}"',
    );
    expect(nativeWorkflow).toContain('test -d "$SDK_ROOT"');
    expect(nativeWorkflow).toContain('find "$SDK_ROOT/cmdline-tools"');
    expect(nativeWorkflow).toContain('test -x "$SDKMANAGER"');
    expect(nativeWorkflow).toContain('ADB="$SDK_ROOT/platform-tools/adb"');
    expect(runtime).toContain('EMULATOR="$SDK_ROOT/emulator/emulator"');
    expect(runtime).toContain('AVDMANAGER="$(dirname "$SDKMANAGER")/avdmanager"');
    expect(runtime).toContain('echo "$SDK_ROOT/platform-tools" >> "$GITHUB_PATH"');
    expect(runtime).toContain('echo "$SDK_ROOT/emulator" >> "$GITHUB_PATH"');
    expect(nativeWorkflow).toContain('"$SDKMANAGER" --licenses');
    expect(nativeWorkflow).toContain('"$SDKMANAGER" "${missing_components[@]}"');
    expect(nativeWorkflow).not.toMatch(/(^|\n)\s*sdkmanager\s+--licenses/m);
  });

  it("installs Android SDK components before verifying installed tools in each job", () => {
    const runtime = jobBlock("android-runtime", "verify");
    const runtimeSteps = [
      "Resolve Android SDK and sdkmanager",
      "Install Android SDK emulator components",
      "Verify Android SDK paths",
      "Verify adb",
      "Verify avdmanager",
      "Inspect emulator binary",
    ].map((stepName) => runtime.indexOf(`- name: ${stepName}`));

    runtimeSteps.forEach((stepIndex, index) => {
      expect(stepIndex).toBeGreaterThanOrEqual(0);
      if (index > 0) {
        expect(stepIndex).toBeGreaterThan(runtimeSteps[index - 1]!);
      }
    });

    const resolveIndex = runtimeSteps[0]!;
    const installIndex = runtimeSteps[1]!;
    const verifyIndex = runtimeSteps[2]!;
    const downloadIndex = runtime.indexOf("- name: Verify downloaded Automation Release APK");

    const resolveSection = runtime.slice(resolveIndex, installIndex);
    const verifySection = runtime.slice(verifyIndex, downloadIndex);

    expect(resolveSection).not.toContain('test -x "$ADB"');
    expect(resolveSection).not.toContain('test -x "$EMULATOR"');
    expect(resolveSection).not.toContain('test -x "$AVDMANAGER"');
    expect(resolveSection).toContain('test -x "$SDKMANAGER"');
    expect(verifySection).toContain('test -x "$ADB"');
    expect(verifySection).toContain('test -x "$EMULATOR"');
    expect(verifySection).toContain('test -x "$AVDMANAGER"');

    const build = jobBlock("android-build", "android-runtime");
    const buildSteps = [
      "Resolve Android SDK and sdkmanager",
      "Install Android SDK build components",
      "Verify Android SDK build components",
      "Build Automation Release APK",
    ].map((stepName) => build.indexOf(`- name: ${stepName}`));
    buildSteps.forEach((stepIndex, index) => {
      expect(stepIndex).toBeGreaterThanOrEqual(0);
      if (index > 0) {
        expect(stepIndex).toBeGreaterThan(buildSteps[index - 1]!);
      }
    });
    const buildResolveSection = build.slice(buildSteps[0]!, buildSteps[1]!);
    const buildVerifySection = build.slice(buildSteps[2]!, buildSteps[3]!);
    expect(buildResolveSection).not.toContain('test -x "$ADB"');
    expect(buildResolveSection).toContain('test -x "$SDKMANAGER"');
    expect(buildVerifySection).toContain('test -x "$SDKMANAGER"');
    expect(buildVerifySection).toContain("android.jar");
    expect(buildVerifySection).toContain("aapt");
  });

  it("builds and verifies a Metro-free Automation Release APK in the build job", () => {
    const build = jobBlock("android-build", "android-runtime");

    expect(build).toContain("./gradlew :app:assembleRelease");
    expect(build).toContain("-PreactNativeArchitectures=x86_64");
    expect(build).toContain("--build-cache");
    expect(build).toContain("--parallel");
    expect(build).toContain("gradle/actions/setup-gradle@v4");
    expect(build).toContain(
      'APK_PATH="$GITHUB_WORKSPACE/android/app/build/outputs/apk/release/app-release.apk"',
    );
    expect(
      build.match(/android\/app\/build\/outputs\/apk\/release\/app-release\.apk/g),
    ).toHaveLength(2);
    expect(build).toContain('test -s "$APK_PATH"');
    expect(build).toContain("lib/x86_64/.*\\.so");
    expect(build).toContain("lib/(arm64-v8a|armeabi-v7a|x86)/.*\\.so");
    expect(build).toContain('tee "$RUNNER_TEMP/gradle-assemble-release.log"');
    expect(build).not.toContain("assembleDebug");
    expect(build).not.toContain("app-debug.apk");
    expect(build).not.toContain("Start Android Emulator with KVM");
    expect(build).not.toContain("Install and launch APK");
    expect(build).not.toContain("maestro test");
  });

  it("uploads the APK artifact and consumes it from the runtime job", () => {
    const build = jobBlock("android-build", "android-runtime");
    const runtime = jobBlock("android-runtime", "verify");

    expect(build).toContain("name: native-android-apk-${{ github.run_id }}");
    expect(build).toContain("path: android/app/build/outputs/apk/release/app-release.apk");
    expect(build).toContain("overwrite: true");
    expect(build).toContain("retention-days: 3");
    expect(runtime).toContain("Download Automation Release APK");
    expect(runtime).toContain("name: native-android-apk-${{ github.run_id }}");
    expect(runtime.indexOf("Download Automation Release APK")).toBeLessThan(
      runtime.indexOf("Start Android Emulator with KVM"),
    );
    expect(runtime).toContain('APK_PATH="$RUNNER_TEMP/native-apk/app-release.apk"');
    expect(runtime).toContain('echo "APK_PATH=$APK_PATH" >> "$GITHUB_ENV"');
  });

  it("keeps the build job free of emulator dependencies and the runtime free of Gradle", () => {
    const build = jobBlock("android-build", "android-runtime");
    const runtime = jobBlock("android-runtime", "verify");

    expect(build).not.toContain("libpulse0");
    expect(build).not.toContain("system-images");
    expect(build).not.toContain("emulator/emulator");
    expect(build).not.toContain("avdmanager");
    expect(runtime).not.toContain("assembleRelease");
    expect(runtime).not.toContain("expo prebuild");
    expect(runtime).not.toContain("gradle/actions/setup-gradle");
    expect(runtime).not.toContain("actions/setup-node@v4");
    expect(runtime).not.toContain("pnpm/action-setup@v4");
    expect(runtime).not.toContain("pnpm run");
    expect(runtime).toContain("actions/setup-java@v4");
    expect(runtime).toContain("distribution: temurin");
    expect(runtime).toContain('java-version: "17"');
    expect(runtime).toContain("libpulse0");
    expect(runtime).toContain("system-images");
  });

  it("uses an explicit AVD home and verifies the AVD before starting the emulator", () => {
    const runtime = jobBlock("android-runtime", "verify");
    const startIndex = runtime.indexOf("- name: Start Android Emulator with KVM");
    const installIndex = runtime.indexOf("- name: Install and launch APK");
    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(installIndex).toBeGreaterThan(startIndex);

    const startSection = runtime.slice(startIndex, installIndex);
    const avdHomeIndex = startSection.indexOf('ANDROID_AVD_HOME="$RUNNER_TEMP/android-avd"');
    const createIndex = startSection.indexOf('"$AVDMANAGER" create avd');
    const listIndex = startSection.indexOf('"$EMULATOR" -list-avds');
    const launchIndex = startSection.indexOf('"$EMULATOR" \\\n            -avd native-api34');
    const bootIndex = startSection.indexOf("sys.boot_completed");

    expect(avdHomeIndex).toBeGreaterThanOrEqual(0);
    expect(startSection).toContain('mkdir -p "$ANDROID_AVD_HOME"');
    expect(startSection).toContain('echo "ANDROID_AVD_HOME=$ANDROID_AVD_HOME" >> "$GITHUB_ENV"');
    expect(startSection).toContain('-p "$ANDROID_AVD_HOME/native-api34.avd"');
    expect(startSection).toContain('find "$ANDROID_AVD_HOME" -maxdepth 3 -type f -print');
    expect(startSection).toContain(
      'if [[ ! -f "$ANDROID_AVD_HOME/native-api34.ini" || ! -d "$ANDROID_AVD_HOME/native-api34.avd" ]]; then',
    );
    expect(startSection).toContain('grep -Fxq "native-api34" "$RUNNER_TEMP/avd-list.txt"');
    expect(createIndex).toBeGreaterThan(avdHomeIndex);
    expect(listIndex).toBeGreaterThan(createIndex);
    expect(launchIndex).toBeGreaterThan(listIndex);
    expect(bootIndex).toBeGreaterThan(launchIndex);
    expect(startSection).toContain("EMULATOR_PID=$!");
    expect(startSection).toContain('kill -0 "$EMULATOR_PID"');
    expect(startSection).toContain('"$ADB" get-state');
    expect(startSection).toContain('"$ADB" devices -l');
    expect(startSection).toContain('"$ADB" shell getprop ro.build.version.sdk');
    expect(startSection).toContain('"$ADB" shell getprop ro.product.cpu.abi');
  });

  it("waits for Android OS and package service readiness with process checks", () => {
    expect(nativeWorkflow).toContain("-no-snapshot");
    expect(nativeWorkflow).toContain("-wipe-data");
    expect(nativeWorkflow).toContain("sys.boot_completed");
    expect(nativeWorkflow).toContain("service check package");
    expect(nativeWorkflow).toContain("for _ in $(seq 1 90)");
    expect(nativeWorkflow).toContain("for _ in $(seq 1 150)");
    expect(nativeWorkflow).toContain('if ! kill -0 "$EMULATOR_PID" 2>/dev/null; then');
    expect(nativeWorkflow).toContain('"$AVDMANAGER" create avd');
    expect(nativeWorkflow).toContain('timeout 180 "$ADB" install -r "$APK_PATH"');
    expect(nativeWorkflow.indexOf("sys.boot_completed")).toBeLessThan(
      nativeWorkflow.indexOf('timeout 180 "$ADB" install -r "$APK_PATH"'),
    );
    expect(nativeWorkflow).not.toMatch(/^\s+adb\s/m);
    expect(nativeWorkflow).not.toMatch(/^\s+emulator\s/m);
    expect(nativeWorkflow).not.toMatch(/^\s+avdmanager\s/m);
  });

  it("runs Static, Production Guard, and Android Build in parallel after detect", () => {
    const staticJob = jobBlock("native-static", "production-bundle-guard");
    const guardJob = jobBlock("production-bundle-guard", "android-build");
    const buildJob = jobBlock("android-build", "android-runtime");
    const runtimeJob = jobBlock("android-runtime", "verify");

    for (const job of [staticJob, guardJob, buildJob]) {
      expect(job.match(/needs:/g)).toHaveLength(1);
      expect(job).toContain("needs: detect");
      expect(job).toContain(
        "if: needs.detect.outputs.native_changed == 'true' || github.event_name == 'workflow_dispatch'",
      );
    }
    expect(nativeWorkflow).not.toContain("needs: [detect, static]");
    expect(nativeWorkflow).not.toContain("needs: [detect, native-static]");
    expect(guardJob).not.toContain("needs.static.result");
    expect(buildJob).not.toContain("needs.static.result");
    expect(runtimeJob).toContain(
      "needs: [detect, native-static, production-bundle-guard, android-build]",
    );
  });

  it("skips every Native-specific job when Native paths did not change", () => {
    const staticJob = jobBlock("native-static", "production-bundle-guard");
    const guardJob = jobBlock("production-bundle-guard", "android-build");
    const buildJob = jobBlock("android-build", "android-runtime");
    const runtimeJob = jobBlock("android-runtime", "verify");

    for (const job of [staticJob, guardJob, buildJob, runtimeJob]) {
      expect(job).toContain(
        "if: needs.detect.outputs.native_changed == 'true' || github.event_name == 'workflow_dispatch'",
      );
    }
  });

  it("keeps Native Static scoped to Native-specific checks", () => {
    const staticJob = nativeWorkflow.slice(
      nativeWorkflow.indexOf("  native-static:\n"),
      nativeWorkflow.indexOf("  production-bundle-guard:\n"),
    );

    for (const required of [
      "pnpm run generate:native-assets",
      "git diff --exit-code -- src/generated/native-product-assets.ts",
      "pnpm run validate:image-manifest",
      "pnpm run test:component:native",
      "pnpm run check:native-route-dependencies",
      "pnpm run validate:eas:config",
      "pnpm dlx expo-doctor@",
    ]) {
      expect(staticJob).toContain(required);
    }
    for (const stepName of [
      "Generate Native assets",
      "Verify generated Native assets",
      "Validate image manifest",
      "Run Native component tests",
      "Check Native route dependencies",
      "Validate EAS config",
      "Run Expo Doctor",
    ]) {
      expect(staticJob).toContain(`- name: ${stepName}`);
    }
    expect(staticJob).not.toContain("pnpm run format:check");
    expect(staticJob).not.toContain("pnpm run lint");
    expect(staticJob).not.toContain("pnpm run typecheck");
    expect(staticJob).not.toContain("pnpm run test:repository");
    expect(staticJob).not.toContain("pnpm run test:contracts");
  });

  it("keeps emulator diagnostics and evidence bounded when no device exists", () => {
    expect(nativeWorkflow).toContain("timeout-minutes: 50");
    expect(nativeWorkflow).toContain("timeout-minutes: 3");
    expect(nativeWorkflow).toContain('timeout 5 "$ADB" get-state');
    expect(nativeWorkflow).toContain("capture_command");
    expect(nativeWorkflow).toContain("avd-list.txt");
    expect(nativeWorkflow).toContain("dumpsys-package.txt");
    expect(nativeWorkflow).toContain("dumpsys-activity.txt");
    expect(nativeWorkflow).toContain("sys-boot-completed.txt");
    expect(nativeWorkflow).toContain("test-control-contract-signals.txt");
    expect(nativeWorkflow).toContain(
      'capture_command "$RUNNER_TEMP/native-runtime-evidence/avd-files.txt"',
    );
    expect(nativeWorkflow).toContain(
      'capture_command "$RUNNER_TEMP/native-runtime-evidence/apk-sha256.txt"',
    );
    expect(nativeWorkflow).toContain("NATIVE_ANDROID_BUILD_JOB_STATUS: ${{ job.status }}");
    expect(nativeWorkflow).toContain(
      'tail -n 200 "$gradle_log" > "$RUNNER_TEMP/native-build-evidence/gradle-assemble-release.log"',
    );
    expect(nativeWorkflow).toContain(
      'cp "$gradle_log" "$RUNNER_TEMP/native-build-evidence/gradle-assemble-release.log"',
    );
    expect(nativeWorkflow).toContain(
      'if [[ "${NATIVE_ANDROID_BUILD_JOB_STATUS:-failure}" != "success" ]]; then',
    );
    expect(nativeWorkflow).toContain(
      'if [[ "${NATIVE_ANDROID_BUILD_JOB_STATUS:-failure}" == "success" ]]; then',
    );
    expect(nativeWorkflow).toContain("apk_path=$APK_PATH");
    expect(nativeWorkflow).toContain("apk-metadata.txt");
    expect(nativeWorkflow).toContain("apk-copy-status.txt");
    expect(nativeWorkflow).toContain("Maestro artifact copy failed.");
    expect(nativeWorkflow).toContain("Android device was not started or was unavailable.");
    expect(nativeWorkflow).toContain("Emulator was not started; no emulator log was generated.");
    const runtime = jobBlock("android-runtime", "verify");
    expect(runtime).toContain("native-android-runtime-evidence-${{ github.run_id }}");
    const build = jobBlock("android-build", "android-runtime");
    expect(build).toContain("native-android-build-evidence-${{ github.run_id }}");
  });

  it("detects shared Native dependencies and fail-closes the final Verify job", () => {
    for (const path of [
      "eas.json",
      ".eas/workflows/**",
      "scripts/validate-eas-static-config.ts",
      "scripts/check-native-route-dependencies.ts",
      "public/images/placeholder.svg",
      "android/app/build.gradle",
      "android/app/proguard-rules.pro",
      "android/app/src/**",
      "android/build.gradle",
      "android/settings.gradle",
      "android/gradle.properties",
      "android/gradle/wrapper/**",
      "android/gradlew",
      "scripts/validate-image-manifest.ts",
      "public/images/products/**",
    ]) {
      expect(nativeWorkflow).toContain(`'${path}'`);
    }
    expect(nativeWorkflow).not.toContain("'android/app/src/main/**'");
    for (const path of [
      "src/application/**",
      "src/domain/**",
      "src/seeds/**",
      "src/config/**",
      "src/presentation/design/**",
      "src/generated/**",
      "config/**",
      "public/images/product-image-manifest.json",
      "scripts/generate-native-asset-map.ts",
      "scripts/validate-native-production-bundle.ts",
    ]) {
      expect(nativeWorkflow).toContain(`'${path}'`);
    }
    expect(nativeWorkflow).toContain("DETECT_RESULT: ${{ needs.detect.result }}");
    expect(nativeWorkflow).toContain('test "$DETECT_RESULT" = success');
    expect(nativeWorkflow).toContain('test -n "$NATIVE_CHANGED"');
    expect(nativeWorkflow).toContain("STATIC_RESULT: ${{ needs.native-static.result }}");
    expect(nativeWorkflow).toContain("ANDROID_BUILD_RESULT: ${{ needs.android-build.result }}");
    expect(nativeWorkflow).toContain("ANDROID_RUNTIME_RESULT: ${{ needs.android-runtime.result }}");
  });

  it("keeps Native changes fail-closed and allows full skip otherwise", () => {
    const verify = jobBlock("verify");

    expect(verify).toContain(
      "needs: [detect, native-static, production-bundle-guard, android-build, android-runtime]",
    );
    expect(verify).toContain("if: always()");

    for (const jobName of [
      "native-static",
      "production-bundle-guard",
      "android-build",
      "android-runtime",
    ]) {
      expect(verify).toContain("${{ needs." + jobName + ".result }}");
    }
    expect(verify).toContain('test "$STATIC_RESULT" = success');
    expect(verify).toContain('test "$PRODUCTION_RESULT" = success');
    expect(verify).toContain('test "$ANDROID_BUILD_RESULT" = success');
    expect(verify).toContain('test "$ANDROID_RUNTIME_RESULT" = success');
    expect(verify).toContain('test "$STATIC_RESULT" = skipped');
    expect(verify).toContain('test "$PRODUCTION_RESULT" = skipped');
    expect(verify).toContain('test "$ANDROID_BUILD_RESULT" = skipped');
    expect(verify).toContain('test "$ANDROID_RUNTIME_RESULT" = skipped');
    expect(verify).not.toContain("needs.android.result");
  });

  it("keeps Maestro flows as steps inside one runtime job", () => {
    expect(nativeWorkflow).toContain("MAESTRO_VERSION: 2.8.0");
    expect(nativeWorkflow).toContain(
      "MAESTRO_DOWNLOAD_URL: https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.8.0/maestro.zip",
    );
    expect(nativeWorkflow).toContain("MAESTRO_CACHE_SCHEMA: v1");
    expect(nativeWorkflow).toContain("actions/cache@v4");
    expect(nativeWorkflow).toContain(
      "maestro-${{ runner.os }}-${{ env.MAESTRO_VERSION }}-${{ env.MAESTRO_CACHE_SCHEMA }}",
    );
    const runtime = jobBlock("android-runtime", "verify");
    expect(runtime).toContain("path: ~/.cache/maestro/${{ env.MAESTRO_VERSION }}");

    const installIndex = runtime.indexOf("- name: Install pinned Maestro CLI");
    const testControlIndex = runtime.indexOf("- name: Run Maestro Test Control flow");
    const contractHarnessIndex = runtime.indexOf("- name: Run Maestro Contract Harness flow");
    const notFoundIndex = runtime.indexOf("- name: Run Maestro Not Found flow");
    const storefrontIndex = runtime.indexOf("- name: Run Maestro Storefront flow");
    const cartIndex = runtime.indexOf("- name: Run Maestro Cart flow");
    const searchIndex = runtime.indexOf("- name: Run Maestro Search Input flow");
    const persistenceStepNames = [
      "Run Maestro Restart Persistence flow",
      "Run Maestro Reset Dirty State flow",
      "Run Maestro Out of Stock boundary flow",
      "Run Maestro Low Stock boundary flow",
      "Run Maestro Purchase Limit boundary flow",
    ];
    const persistenceIndexes = persistenceStepNames.map((name) =>
      runtime.indexOf(`- name: ${name}`),
    );
    expect(installIndex).toBeGreaterThanOrEqual(0);
    const stepIndexes = [
      testControlIndex,
      contractHarnessIndex,
      notFoundIndex,
      storefrontIndex,
      cartIndex,
      searchIndex,
      ...persistenceIndexes,
    ];
    stepIndexes.forEach((stepIndex) => {
      expect(stepIndex).toBeGreaterThan(installIndex);
    });
    for (let index = 1; index < stepIndexes.length; index += 1) {
      expect(stepIndexes[index]!).toBeGreaterThan(stepIndexes[index - 1]!);
    }

    const installSection = runtime.slice(installIndex, testControlIndex);
    expect(installSection).toContain('MAESTRO_BIN="$MAESTRO_HOME/maestro/bin/maestro"');
    expect(installSection).toContain("curl --fail --location --retry 3");
    expect(installSection).toContain('"$MAESTRO_DOWNLOAD_URL"');
    expect(installSection).toContain('test -x "$MAESTRO_BIN"');
    expect(installSection).toContain('"$MAESTRO_BIN" --version');
    expect(installSection).not.toContain(
      "https://github.com/mobile-dev-inc/maestro/releases/download/",
    );
    for (const flow of [
      "native-test-control",
      "native-contract-harness",
      "native-not-found",
      "native-storefront",
      "native-cart",
    ]) {
      expect(runtime).toContain(`"$GITHUB_WORKSPACE/maestro/${flow}.yaml"`);
    }
    expect(runtime).not.toContain("Run Maestro Runtime and Smoke flows");
    expect(runtime).not.toContain("maestro-runtime-smoke.xml");
    expect(runtime).not.toContain("Run Maestro Persistence and Boundary flows");
    expect(runtime).toContain('echo "start_utc=$(date -u');
    expect(runtime).toContain('echo "result=PASS"');
    expect(runtime).toContain('echo "result=FAIL"');
    expect(runtime).toContain('echo "exit_code=$flow_exit"');
    expect(runtime).toContain('echo "screenshots=$output_dir"');
    expect(runtime).toContain('echo "hierarchy=$output_dir"');
    expect(runtime).toContain('echo "maestro_output=$output_dir"');
    expect(runtime).not.toContain("Reset Test Control by Deep Link");
    for (const junit of [
      "maestro-test-control.xml",
      "maestro-contract-harness.xml",
      "maestro-not-found.xml",
      "maestro-storefront.xml",
      "maestro-cart.xml",
    ]) {
      expect(runtime).toContain(junit);
    }
    for (const output of [
      "test-control",
      "contract-harness",
      "not-found",
      "storefront",
      "cart",
      "persistence-restart",
      "persistence-reset",
      "boundary-out-of-stock",
      "boundary-low-stock",
      "boundary-purchase-limit",
    ]) {
      expect(runtime).toContain(`$RUNNER_TEMP/maestro-artifacts/${output}`);
    }
    expect(runtime).toContain("native-restart-persistence.yaml");
    expect(runtime).toContain("native-reset-dirty-state.yaml");
    expect(runtime).toContain("native-out-of-stock.yaml");
    expect(runtime).toContain("native-low-stock.yaml");
    expect(runtime).toContain("native-purchase-limit.yaml");
    for (const flow of [
      "native-test-control.yaml",
      "native-contract-harness.yaml",
      "native-not-found.yaml",
      "native-storefront.yaml",
      "native-cart.yaml",
      "native-search.yaml",
      "native-restart-persistence.yaml",
      "native-reset-dirty-state.yaml",
      "native-out-of-stock.yaml",
      "native-low-stock.yaml",
      "native-purchase-limit.yaml",
    ]) {
      expect(readFileSync(resolve(process.cwd(), "maestro", flow), "utf8")).toContain(
        "scenario-shop://test-control/reset",
      );
    }
    expect(nativeWorkflow).toContain(
      "Full dumpsys and logcat are omitted for a successful Android runtime job.",
    );
    expect(nativeWorkflow).toContain(
      "Full emulator log is collected only after a failed Android runtime job.",
    );
    expect(nativeWorkflow).toContain(
      "test-runtime-(ready|error)|native-contract-(running|passed|failed)",
    );
    expect(nativeWorkflow).not.toContain(
      "native-(test-runtime-ready|contract-(running|passed|failed))",
    );
    expect(nativeWorkflow).not.toContain("find . -type f");
  });
});

describe("Native iOS CI workflow contracts", () => {
  it("is manual-only and builds a Release Simulator app without signing", () => {
    expect(iosWorkflow).toContain("on:\n  workflow_dispatch:");
    expect(iosWorkflow).toContain("-configuration Release");
    expect(iosWorkflow).toContain("Release-iphonesimulator");
    expect(iosWorkflow).toContain("CODE_SIGNING_ALLOWED=NO");
    expect(iosWorkflow).not.toContain("-configuration Debug");
    expect(iosWorkflow).not.toContain("Debug-iphonesimulator");
    expect(iosWorkflow).not.toContain("pull_request:");
  });
});
