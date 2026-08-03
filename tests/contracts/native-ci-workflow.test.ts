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
    expect(nativeWorkflow).toContain('"$SDKMANAGER" --licenses');
    expect(nativeWorkflow).toContain('"$SDKMANAGER" \\');
    expect(nativeWorkflow).toContain('echo "$SDK_ROOT/platform-tools" >> "$GITHUB_PATH"');
    expect(nativeWorkflow).toContain('echo "$SDK_ROOT/emulator" >> "$GITHUB_PATH"');
    expect(nativeWorkflow).toContain("command -v adb");
    expect(nativeWorkflow).toContain("command -v emulator");
    expect(nativeWorkflow).toContain("command -v avdmanager");
    expect(nativeWorkflow).not.toMatch(/(^|\n)\s*sdkmanager\s+--licenses/m);
  });

  it("builds and verifies a Metro-free Automation Release APK", () => {
    expect(nativeWorkflow).toContain("./gradlew assembleRelease --no-daemon --stacktrace");
    expect(nativeWorkflow).toContain("android/app/build/outputs/apk/release/app-release.apk");
    expect(nativeWorkflow).not.toContain("assembleDebug");
    expect(nativeWorkflow).not.toContain("app-debug.apk");
    expect(nativeWorkflow).toContain("adb shell pm list packages | grep -F");
    expect(nativeWorkflow).toContain("adb shell monkey");
    expect(nativeWorkflow).toContain("pidof com.ryuyoshikawa.scenarioshop");
  });

  it("waits for Android OS and package service readiness with a timeout", () => {
    expect(nativeWorkflow).toContain("-no-snapshot");
    expect(nativeWorkflow).toContain("-wipe-data");
    expect(nativeWorkflow).toContain("sys.boot_completed");
    expect(nativeWorkflow).toContain("service check package");
    expect(nativeWorkflow).toContain("timeout 180 adb wait-for-device");
    expect(nativeWorkflow).toContain("timeout 180 bash -c");
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
