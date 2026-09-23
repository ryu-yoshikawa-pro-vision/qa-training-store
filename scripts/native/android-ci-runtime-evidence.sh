#!/usr/bin/env bash
set -euo pipefail
: "${NATIVE_ANDROID_JOB_STATUS:?NATIVE_ANDROID_JOB_STATUS is required}"
: "${RUNNER_TEMP:?RUNNER_TEMP is required}"

mkdir -p "$RUNNER_TEMP/native-runtime-evidence"

capture_command() {
  local output="$1"
  shift
  set +e
  timeout 15 "$@" > "$output" 2>&1
  local status=$?
  set -e
  if [[ "$status" -ne 0 ]]; then
    echo "command exit code: $status" >> "$output"
  fi
}

{
  echo "job_status=${NATIVE_ANDROID_JOB_STATUS:-unknown}"
  echo "ANDROID_AVD_HOME=${ANDROID_AVD_HOME:-<unset>}"
  echo "ANDROID_PREFS_ROOT=${ANDROID_PREFS_ROOT:-<unset>}"
  echo "HOME=${HOME:-<unset>}"
} > "$RUNNER_TEMP/native-runtime-evidence/android-environment.txt"

if [[ "${NATIVE_ANDROID_JOB_STATUS:-failure}" != "success" && -n "${ANDROID_AVD_HOME:-}" && -d "$ANDROID_AVD_HOME" ]]; then
  capture_command "$RUNNER_TEMP/native-runtime-evidence/avd-files.txt" \
    find "$ANDROID_AVD_HOME" -maxdepth 3 -print
else
  echo "Full AVD file listing is collected only after a failed Android runtime job." \
    > "$RUNNER_TEMP/native-runtime-evidence/avd-files.txt"
fi
if [[ -f "$RUNNER_TEMP/avd-list.txt" ]]; then
  if ! cp "$RUNNER_TEMP/avd-list.txt" "$RUNNER_TEMP/native-runtime-evidence/avd-list.txt"; then
    echo "AVD list copy failed." > "$RUNNER_TEMP/native-runtime-evidence/avd-list.txt"
  fi
else
  echo "emulator -list-avds was not completed." \
    > "$RUNNER_TEMP/native-runtime-evidence/avd-list.txt"
fi
if [[ -f "$RUNNER_TEMP/emulator-pid.txt" ]]; then
  if ! cp "$RUNNER_TEMP/emulator-pid.txt" "$RUNNER_TEMP/native-runtime-evidence/emulator-pid.txt"; then
    echo "Emulator PID copy failed." > "$RUNNER_TEMP/native-runtime-evidence/emulator-pid.txt"
  fi
fi

if [[ -n "${ADB:-}" && -x "${ADB:-}" ]]; then
  if timeout 5 "$ADB" get-state >/dev/null 2>&1; then
    capture_command "$RUNNER_TEMP/native-runtime-evidence/adb-get-state.txt" "$ADB" get-state
    capture_command "$RUNNER_TEMP/native-runtime-evidence/adb-devices.txt" "$ADB" devices -l
    capture_command "$RUNNER_TEMP/native-runtime-evidence/sys-boot-completed.txt" "$ADB" shell getprop sys.boot_completed
    capture_command "$RUNNER_TEMP/native-runtime-evidence/android-build-properties.txt" "$ADB" shell getprop ro.build.version.sdk
    capture_command "$RUNNER_TEMP/native-runtime-evidence/android-abi.txt" "$ADB" shell getprop ro.product.cpu.abi
    capture_command "$RUNNER_TEMP/native-runtime-evidence/package-path.txt" "$ADB" shell pm path com.ryuyoshikawa.scenarioshop
    capture_command "$RUNNER_TEMP/native-runtime-evidence/package-process.txt" "$ADB" shell pidof com.ryuyoshikawa.scenarioshop
    if [[ "${NATIVE_ANDROID_JOB_STATUS:-failure}" != "success" ]]; then
      capture_command "$RUNNER_TEMP/native-runtime-evidence/dumpsys-package.txt" "$ADB" shell dumpsys package com.ryuyoshikawa.scenarioshop
      capture_command "$RUNNER_TEMP/native-runtime-evidence/dumpsys-activity.txt" "$ADB" shell dumpsys activity activities
      capture_command "$RUNNER_TEMP/native-runtime-evidence/adb-logcat.txt" "$ADB" logcat -d
    else
      echo "Full dumpsys and logcat are omitted for a successful Android runtime job." \
        > "$RUNNER_TEMP/native-runtime-evidence/diagnostics-status.txt"
    fi
  else
    echo "Android device was not started or was unavailable." \
      > "$RUNNER_TEMP/native-runtime-evidence/adb-get-state.txt"
    echo "Android device was not started or was unavailable." \
      > "$RUNNER_TEMP/native-runtime-evidence/adb-devices.txt"
    echo "Android device was not started or was unavailable." \
      > "$RUNNER_TEMP/native-runtime-evidence/adb-logcat.txt"
  fi
else
  echo "Android adb executable was not resolved." \
    > "$RUNNER_TEMP/native-runtime-evidence/adb-get-state.txt"
  echo "Android adb executable was not resolved." \
    > "$RUNNER_TEMP/native-runtime-evidence/adb-devices.txt"
  echo "Android adb executable was not resolved." \
    > "$RUNNER_TEMP/native-runtime-evidence/adb-logcat.txt"
fi
if [[ "${NATIVE_ANDROID_JOB_STATUS:-failure}" != "success" && -f "$RUNNER_TEMP/emulator.log" ]]; then
  if ! cp "$RUNNER_TEMP/emulator.log" "$RUNNER_TEMP/native-runtime-evidence/emulator.log"; then
    echo "Emulator log copy failed." > "$RUNNER_TEMP/native-runtime-evidence/emulator.log"
  fi
elif [[ "${NATIVE_ANDROID_JOB_STATUS:-failure}" == "success" ]]; then
  echo "Full emulator log is collected only after a failed Android runtime job." \
    > "$RUNNER_TEMP/native-runtime-evidence/emulator.log"
else
  echo "Emulator was not started; no emulator log was generated." \
    > "$RUNNER_TEMP/native-runtime-evidence/emulator.log"
fi
if [[ -n "${APK_PATH:-}" && -f "$APK_PATH" ]]; then
  if [[ "${NATIVE_ANDROID_JOB_STATUS:-failure}" != "success" ]]; then
    if ! cp "$APK_PATH" "$RUNNER_TEMP/native-runtime-evidence/native-automation.apk"; then
      echo "Automation Release APK copy failed." \
        > "$RUNNER_TEMP/native-runtime-evidence/apk-copy-status.txt"
    fi
    capture_command "$RUNNER_TEMP/native-runtime-evidence/apk-info.txt" bash -c \
      'ls -lh "$1"; file "$1"; unzip -l "$1" | grep -E "AndroidManifest.xml|assets/.*\\.(bundle|hbc)|lib/x86_64/.*\\.so"' \
      bash "$APK_PATH"
  else
    capture_command "$RUNNER_TEMP/native-runtime-evidence/apk-size.txt" \
      stat -c 'size_bytes=%s' "$APK_PATH"
    capture_command "$RUNNER_TEMP/native-runtime-evidence/apk-sha256.txt" \
      sha256sum "$APK_PATH"
    capture_command "$RUNNER_TEMP/native-runtime-evidence/apk-info.txt" bash -c \
      'unzip -l "$1" | grep -E "AndroidManifest.xml|assets/.*\\.(bundle|hbc)|lib/x86_64/.*\\.so"' \
      bash "$APK_PATH"
  fi
else
  echo "Automation Release APK was not downloaded." \
    > "$RUNNER_TEMP/native-runtime-evidence/apk-status.txt"
fi
if [[ -n "${PRODUCTION_APK_PATH:-}" && -f "$PRODUCTION_APK_PATH" ]]; then
  {
    echo "production_apk_path=$PRODUCTION_APK_PATH"
    stat -c 'size_bytes=%s' "$PRODUCTION_APK_PATH"
    sha256sum "$PRODUCTION_APK_PATH" || true
  } > "$RUNNER_TEMP/native-runtime-evidence/production-apk-metadata.txt"
else
  echo "Production-validation APK was not downloaded." \
    > "$RUNNER_TEMP/native-runtime-evidence/production-apk-status.txt"
fi
if [[ -f "$RUNNER_TEMP/emulator-version.txt" ]]; then
  if ! cp "$RUNNER_TEMP/emulator-version.txt" \
    "$RUNNER_TEMP/native-runtime-evidence/emulator-version.txt"; then
    echo "Emulator version copy failed." \
      > "$RUNNER_TEMP/native-runtime-evidence/emulator-version.txt"
  fi
fi
if [[ "${NATIVE_ANDROID_JOB_STATUS:-failure}" != "success" && -f "$RUNNER_TEMP/app-launch-logcat.txt" ]]; then
  if ! cp "$RUNNER_TEMP/app-launch-logcat.txt" \
    "$RUNNER_TEMP/native-runtime-evidence/app-launch-logcat.txt"; then
    echo "Application launch logcat copy failed." \
      > "$RUNNER_TEMP/native-runtime-evidence/app-launch-logcat-status.txt"
  fi
elif [[ "${NATIVE_ANDROID_JOB_STATUS:-failure}" == "success" ]]; then
  echo "Application launch logcat is omitted for a successful Android runtime job." \
    > "$RUNNER_TEMP/native-runtime-evidence/app-launch-logcat-status.txt"
fi
shopt -s nullglob
for junit_path in "$RUNNER_TEMP"/maestro-*.xml; do
  if ! cp "$junit_path" "$RUNNER_TEMP/native-runtime-evidence/"; then
    echo "JUnit copy failed: $junit_path" \
      >> "$RUNNER_TEMP/native-runtime-evidence/junit-copy-status.txt"
  fi
done
if [[ -d "$RUNNER_TEMP/maestro-artifacts" ]]; then
  mkdir -p "$RUNNER_TEMP/native-runtime-evidence/maestro-artifacts"
  if ! cp -R "$RUNNER_TEMP/maestro-artifacts/." \
    "$RUNNER_TEMP/native-runtime-evidence/maestro-artifacts/"; then
    echo "Maestro artifact copy failed." \
      > "$RUNNER_TEMP/native-runtime-evidence/maestro-copy-status.txt"
  fi
  set +e
  grep -R -h -E 'test-runtime-(ready|error)|native-contract-(running|passed|failed)' \
    "$RUNNER_TEMP/maestro-artifacts" \
    > "$RUNNER_TEMP/native-runtime-evidence/test-control-contract-signals.txt"
  signal_status=$?
  set -e
  if [[ "$signal_status" -ne 0 ]]; then
    echo "No Test Control or Contract Harness signal text was captured." \
      > "$RUNNER_TEMP/native-runtime-evidence/test-control-contract-signals.txt"
  fi
else
  echo "Maestro artifact directory was not created." \
    > "$RUNNER_TEMP/native-runtime-evidence/test-control-contract-signals.txt"
fi
