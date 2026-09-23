#!/usr/bin/env bash
set -euo pipefail
: "${ADB:?ADB is required}"
: "${AVDMANAGER:?AVDMANAGER is required}"
: "${EMULATOR:?EMULATOR is required}"
: "${ANDROID_API_LEVEL:?ANDROID_API_LEVEL is required}"
: "${RUNNER_TEMP:?RUNNER_TEMP is required}"
: "${GITHUB_ENV:?GITHUB_ENV is required}"

ANDROID_AVD_HOME="$RUNNER_TEMP/android-avd"
mkdir -p "$ANDROID_AVD_HOME"
echo "ANDROID_AVD_HOME=$ANDROID_AVD_HOME" >> "$GITHUB_ENV"
export ANDROID_AVD_HOME
echo "ANDROID_AVD_HOME=$ANDROID_AVD_HOME"
echo "ANDROID_PREFS_ROOT=${ANDROID_PREFS_ROOT:-<unset>}"
echo "HOME=${HOME:-<unset>}"

fail_emulator() {
  echo "$1" >&2
  echo "ANDROID_AVD_HOME=${ANDROID_AVD_HOME:-<unset>}" >&2
  echo "ANDROID_PREFS_ROOT=${ANDROID_PREFS_ROOT:-<unset>}" >&2
  echo "HOME=${HOME:-<unset>}" >&2
  echo "emulator -list-avds:" >&2
  if [[ -f "$RUNNER_TEMP/avd-list.txt" ]]; then
    cat "$RUNNER_TEMP/avd-list.txt" >&2
  else
    echo "<not captured>" >&2
  fi
  echo "AVD files:" >&2
  if [[ -d "${ANDROID_AVD_HOME:-}" ]]; then
    find "$ANDROID_AVD_HOME" -maxdepth 3 -print >&2
  else
    echo "<missing>" >&2
  fi
  if [[ -f "$RUNNER_TEMP/emulator.log" ]]; then
    echo "emulator.log (tail):" >&2
    tail -n 200 "$RUNNER_TEMP/emulator.log" >&2
  fi
  exit 1
}

if [[ -e /dev/kvm ]]; then
  ls -l /dev/kvm
else
  fail_emulator "/dev/kvm is not available."
fi
sudo chmod 666 /dev/kvm
if ! printf 'no\n' | timeout 120 "$AVDMANAGER" create avd \
  -n native-api34 \
  -k "system-images;android-${ANDROID_API_LEVEL};google_apis;x86_64" \
  -p "$ANDROID_AVD_HOME/native-api34.avd" \
  --device "pixel_2" \
  --force; then
  fail_emulator "Android AVD creation failed."
fi
find "$ANDROID_AVD_HOME" -maxdepth 3 -type f -print \
  | tee "$RUNNER_TEMP/avd-files.txt"
if [[ ! -f "$ANDROID_AVD_HOME/native-api34.ini" || ! -d "$ANDROID_AVD_HOME/native-api34.avd" ]]; then
  fail_emulator "AVD files were not created in ANDROID_AVD_HOME."
fi
set +e
"$EMULATOR" -list-avds | tee "$RUNNER_TEMP/avd-list.txt"
avd_list_status=${PIPESTATUS[0]}
set -e
if [[ "$avd_list_status" -ne 0 ]] || ! grep -Fxq "native-api34" "$RUNNER_TEMP/avd-list.txt"; then
  fail_emulator "Android Emulator did not recognize native-api34."
fi
"$EMULATOR" \
  -avd native-api34 \
  -no-window \
  -no-audio \
  -no-boot-anim \
  -no-snapshot \
  -wipe-data \
  -gpu swiftshader_indirect \
  >"$RUNNER_TEMP/emulator.log" 2>&1 &
EMULATOR_PID=$!
echo "EMULATOR_PID=$EMULATOR_PID" | tee "$RUNNER_TEMP/emulator-pid.txt"
echo "EMULATOR_PID=$EMULATOR_PID" >> "$GITHUB_ENV"

adb_ready=false
for _ in $(seq 1 90); do
  if ! kill -0 "$EMULATOR_PID" 2>/dev/null; then
    fail_emulator "Android Emulator terminated before ADB became available."
  fi
  if "$ADB" get-state >/dev/null 2>&1; then
    adb_ready=true
    break
  fi
  sleep 2
done
if [[ "$adb_ready" != true ]]; then
  fail_emulator "Android Emulator did not become available through ADB."
fi
"$ADB" get-state
"$ADB" devices -l

boot_completed=false
for _ in $(seq 1 150); do
  if ! kill -0 "$EMULATOR_PID" 2>/dev/null; then
    fail_emulator "Android Emulator terminated before Android boot completed."
  fi
  boot_state=""
  if boot_state=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d "\r"); then
    if [[ "$boot_state" == "1" ]]; then
      boot_completed=true
      break
    fi
  fi
  sleep 2
done
if [[ "$boot_completed" != true ]]; then
  fail_emulator "Android Emulator did not report sys.boot_completed=1."
fi
"$ADB" shell getprop sys.boot_completed
"$ADB" shell getprop ro.build.version.sdk
"$ADB" shell getprop ro.product.cpu.abi

package_service_ready=false
for _ in $(seq 1 90); do
  if ! kill -0 "$EMULATOR_PID" 2>/dev/null; then
    fail_emulator "Android Emulator terminated before the package service became available."
  fi
  if "$ADB" shell service check package 2>/dev/null | grep -q "found"; then
    package_service_ready=true
    break
  fi
  sleep 2
done
if [[ "$package_service_ready" != true ]]; then
  fail_emulator "Android package service did not become available."
fi
"$ADB" shell settings put global window_animation_scale 0
"$ADB" shell settings put global transition_animation_scale 0
"$ADB" shell settings put global animator_duration_scale 0
"$ADB" shell input keyevent 82
