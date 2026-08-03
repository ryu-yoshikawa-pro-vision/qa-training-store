import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const nativeWorkflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/native-ci.yml"),
  "utf8",
);
const iosWorkflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/native-ios-ci.yml"),
  "utf8",
);

describe("Native CI workflow contracts", () => {
  it("resolves the Android SDK and sdkmanager without relying on PATH", () => {
    expect(nativeWorkflow).toContain(
      'SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/usr/local/lib/android/sdk}}"',
    );
    expect(nativeWorkflow).toContain('test -d "$SDK_ROOT"');
    expect(nativeWorkflow).toContain('find "$SDK_ROOT/cmdline-tools"');
    expect(nativeWorkflow).toContain('test -x "$SDKMANAGER"');
    expect(nativeWorkflow).toContain('ADB="$SDK_ROOT/platform-tools/adb"');
    expect(nativeWorkflow).toContain('EMULATOR="$SDK_ROOT/emulator/emulator"');
    expect(nativeWorkflow).toContain('AVDMANAGER="$(dirname "$SDKMANAGER")/avdmanager"');
    expect(nativeWorkflow).toContain('test -x "$ADB"');
    expect(nativeWorkflow).toContain('test -x "$EMULATOR"');
    expect(nativeWorkflow).toContain('test -x "$AVDMANAGER"');
    expect(nativeWorkflow).toContain('"$SDKMANAGER" --licenses');
    expect(nativeWorkflow).toContain('"$SDKMANAGER" \\');
    expect(nativeWorkflow).toContain('echo "ADB=$ADB" >> "$GITHUB_ENV"');
    expect(nativeWorkflow).toContain('echo "EMULATOR=$EMULATOR" >> "$GITHUB_ENV"');
    expect(nativeWorkflow).toContain('echo "AVDMANAGER=$AVDMANAGER" >> "$GITHUB_ENV"');
    expect(nativeWorkflow).toContain('echo "$SDK_ROOT/platform-tools" >> "$GITHUB_PATH"');
    expect(nativeWorkflow).toContain('echo "$SDK_ROOT/emulator" >> "$GITHUB_PATH"');
    expect(nativeWorkflow).toContain("Verify Android SDK paths");
    expect(nativeWorkflow).toContain("Verify adb");
    expect(nativeWorkflow).toContain("Verify avdmanager");
    expect(nativeWorkflow).toContain("Inspect emulator binary");
    expect(nativeWorkflow).not.toMatch(/(^|\n)\s*sdkmanager\s+--licenses/m);
  });

  it("installs Android SDK components before verifying installed tools", () => {
    const stepIndices = [
      "Resolve Android SDK and sdkmanager",
      "Install Android SDK components",
      "Verify Android SDK paths",
      "Verify adb",
      "Verify avdmanager",
      "Inspect emulator binary",
      "Build Automation Release APK",
    ].map((stepName) => nativeWorkflow.indexOf(`- name: ${stepName}`));

    stepIndices.forEach((stepIndex, index) => {
      expect(stepIndex).toBeGreaterThanOrEqual(0);
      if (index > 0) {
        expect(stepIndex).toBeGreaterThan(stepIndices[index - 1]!);
      }
    });

    const resolveIndex = stepIndices[0]!;
    const installIndex = stepIndices[1]!;
    const verifyIndex = stepIndices[2]!;
    const buildIndex = stepIndices[6]!;

    const resolveSection = nativeWorkflow.slice(resolveIndex, installIndex);
    const verifySection = nativeWorkflow.slice(verifyIndex, buildIndex);

    expect(resolveSection).not.toContain('test -x "$ADB"');
    expect(resolveSection).not.toContain('test -x "$EMULATOR"');
    expect(resolveSection).not.toContain('test -x "$AVDMANAGER"');
    expect(resolveSection).toContain('test -x "$SDKMANAGER"');
    expect(resolveSection.indexOf('echo "ADB=$ADB" >> "$GITHUB_ENV"')).toBeGreaterThanOrEqual(0);
    expect(verifySection).toContain('test -x "$ADB"');
    expect(verifySection).toContain('test -x "$EMULATOR"');
    expect(verifySection).toContain('test -x "$AVDMANAGER"');
  });

  it("builds and verifies a Metro-free Automation Release APK", () => {
    expect(nativeWorkflow).toContain("./gradlew assembleRelease --no-daemon --stacktrace");
    expect(nativeWorkflow).toContain("android/app/build/outputs/apk/release/app-release.apk");
    expect(
      nativeWorkflow.match(/android\/app\/build\/outputs\/apk\/release\/app-release\.apk/g),
    ).toHaveLength(1);
    expect(nativeWorkflow).toContain(
      'APK_PATH="$GITHUB_WORKSPACE/android/app/build/outputs/apk/release/app-release.apk"',
    );
    expect(nativeWorkflow).toContain('test -s "$APK_PATH"');
    expect(nativeWorkflow).toContain("set -o pipefail");
    expect(nativeWorkflow).toContain('tee "$RUNNER_TEMP/gradle-assemble-release.log"');
    expect(nativeWorkflow).not.toContain("assembleDebug");
    expect(nativeWorkflow).not.toContain("app-debug.apk");
    expect(nativeWorkflow).toContain(
      '"$ADB" shell pm path com.ryuyoshikawa.scenarioshop | grep -F',
    );
    expect(nativeWorkflow).toContain('"$ADB" shell monkey');
    expect(nativeWorkflow).toContain('"$ADB" shell pidof com.ryuyoshikawa.scenarioshop');
  });

  it("uses an explicit AVD home and verifies the AVD before starting the emulator", () => {
    const startIndex = nativeWorkflow.indexOf("- name: Start Android Emulator with KVM");
    const installIndex = nativeWorkflow.indexOf("- name: Install and launch APK");
    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(installIndex).toBeGreaterThan(startIndex);

    const startSection = nativeWorkflow.slice(startIndex, installIndex);
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
    expect(nativeWorkflow).toContain('"$EMULATOR" \\');
    expect(nativeWorkflow).toContain('"$ADB" install -r "$APK_PATH"');
    expect(nativeWorkflow.indexOf("sys.boot_completed")).toBeLessThan(
      nativeWorkflow.indexOf('"$ADB" install -r "$APK_PATH"'),
    );
    expect(nativeWorkflow).not.toMatch(/^\s+adb\s/m);
    expect(nativeWorkflow).not.toMatch(/^\s+emulator\s/m);
    expect(nativeWorkflow).not.toMatch(/^\s+avdmanager\s/m);
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
    expect(nativeWorkflow).toContain("Android device was not started or was unavailable.");
    expect(nativeWorkflow).toContain("Emulator was not started.");
    expect(nativeWorkflow).toContain("Gradle Release build log was not generated.");
  });

  it("detects shared Native dependencies and fail-closes the final Verify job", () => {
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
    expect(nativeWorkflow).toContain('test "$STATIC_RESULT" = success');
  });

  it("keeps Maestro screenshots in dedicated output directories", () => {
    expect(nativeWorkflow).toContain('--test-output-dir="$RUNNER_TEMP/maestro-artifacts/');
    expect(nativeWorkflow).toContain("native-restart-persistence.yaml");
    expect(nativeWorkflow).toContain("native-reset-dirty-state.yaml");
    expect(nativeWorkflow).toContain("native-out-of-stock.yaml");
    expect(nativeWorkflow).toContain("native-low-stock.yaml");
    expect(nativeWorkflow).toContain("native-purchase-limit.yaml");
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
