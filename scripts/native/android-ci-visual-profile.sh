#!/usr/bin/env bash
set -euo pipefail
: "${ADB:?ADB is required}"
: "${MAESTRO_BIN:?MAESTRO_BIN is required}"
: "${ADB_ROOT_AVAILABLE:?ADB_ROOT_AVAILABLE is required}"
: "${RUNNER_TEMP:?RUNNER_TEMP is required}"
: "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
: "${GITHUB_ENV:?GITHUB_ENV is required}"

evidence_dir="$RUNNER_TEMP/native-runtime-evidence"
mkdir -p "$evidence_dir"
provisioning_mode="settings_ui"
if [[ "${ADB_ROOT_AVAILABLE:-false}" = true ]]; then
  provisioning_mode="adb_root"
  "$ADB" shell setprop persist.sys.locale ja-JP
  "$ADB" shell stop
  sleep 2
  "$ADB" shell start
else
  "$ADB" shell am force-stop com.android.settings
  "$ADB" shell am start -a android.settings.LOCALE_SETTINGS
  locale_flow_output="$RUNNER_TEMP/locale-provisioning"
  mkdir -p "$locale_flow_output"
  "$MAESTRO_BIN" test \
    --test-output-dir="$locale_flow_output" \
    --format junit \
    --output "$locale_flow_output/locale-provisioning.xml" \
    "$GITHUB_WORKSPACE/maestro/android-locale-provision.yaml"
  "$ADB" shell am force-stop com.android.settings
fi
if [[ "$provisioning_mode" = "adb_root" ]]; then
  "$ADB" unroot
  "$ADB" wait-for-device
  sleep 2
fi
observation_shell_id="$("$ADB" shell id | tr -d '\r')"
observation_shell_uid="$("$ADB" shell id -u | tr -d '\r')"
{
  echo "locale_observation_shell_id=$observation_shell_id"
  echo "locale_observation_shell_uid=$observation_shell_uid"
} | tee -a "$evidence_dir/adb-root.txt"
test "$observation_shell_uid" != "0"
boot_completed=false
for _ in $(seq 1 90); do
  if [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    boot_completed=true
    break
  fi
  sleep 2
done
test "$boot_completed" = true
package_service_ready=false
for _ in $(seq 1 90); do
  if "$ADB" shell service check package 2>/dev/null | grep -q "found"; then
    package_service_ready=true
    break
  fi
  sleep 2
done
test "$package_service_ready" = true
settings_service_ready=false
for _ in $(seq 1 90); do
  if "$ADB" shell service check settings 2>/dev/null | grep -Eq ':[[:space:]]+found[[:space:]]*$'; then
    settings_service_ready=true
    break
  fi
  sleep 2
done
test "$settings_service_ready" = true
"$ADB" shell settings put system font_scale 1.0
"$ADB" shell cmd uimode night no
"$ADB" shell settings put system accelerometer_rotation 0
"$ADB" shell settings put system user_rotation 0
"$ADB" shell wm density 440
api_level="$($ADB shell getprop ro.build.version.sdk | tr -d '\r')"
abi="$($ADB shell getprop ro.product.cpu.abi | tr -d '\r')"
locale_value="$($ADB shell getprop persist.sys.locale | tr -d '\r')"
locale_settings="$($ADB shell settings get system system_locales | tr -d '\r')"
# Observe the effective ActivityManager configuration through the non-root shell.
# API34 google_apis exposes the applied locale here as [ja_JP].
effective_locale_observation="dumpsys activity activities"
effective_config="$($ADB shell dumpsys activity activities | tr -d '\r')"
effective_locale="unknown"
for _ in $(seq 1 30); do
  if printf '%s\n' "$effective_config" | grep -Eq '\[(ja_JP|ja-JP)(,|\])' ; then
    effective_locale="ja-JP"
  else
    effective_locale="unknown"
  fi
  if [[ "$effective_locale" = "ja-JP" ]]; then
    break
  fi
  sleep 1
  locale_settings="$($ADB shell settings get system system_locales | tr -d '\r')"
  effective_config="$($ADB shell dumpsys activity activities | tr -d '\r')"
done
font_scale="$($ADB shell settings get system font_scale | tr -d '\r')"
night_mode="$($ADB shell cmd uimode night | tr -d '\r')"
resolution="$($ADB shell wm size | sed -n 's/.*Physical size: //p' | head -n 1 | tr -d '\r')"
density="$($ADB shell wm density | sed -n 's/.*Override density: //p' | head -n 1 | tr -d '\r')"
effective_orientation="unknown"
if printf '%s\n' "$effective_config" | grep -Eq '(^|[[:space:]])port([[:space:]]|$)' ; then
  effective_orientation="portrait"
elif printf '%s\n' "$effective_config" | grep -Eq '(^|[[:space:]])land([[:space:]]|$)' ; then
  effective_orientation="landscape"
fi
case "$night_mode" in
  *yes*) ui_mode="dark" ;;
  *no*) ui_mode="light" ;;
  *) echo "Unable to normalize Android UI mode from: $night_mode" >&2; exit 1 ;;
esac
case "$effective_orientation" in
  portrait|landscape) orientation="$effective_orientation" ;;
  *) echo "Unable to normalize Android orientation from effective configuration." >&2; exit 1 ;;
esac
echo "api_level=$api_level"
echo "abi=$abi"
echo "locale_provisioning_mode=$provisioning_mode"
echo "locale_property=$locale_value"
echo "locale_settings=$locale_settings"
echo "locale_observation_source=$effective_locale_observation"
echo "locale_effective=$effective_locale"
echo "font_scale=$font_scale"
echo "ui_mode=$ui_mode"
echo "orientation=$orientation"
echo "resolution=$resolution"
echo "density=$density"
test "$api_level" = "34"
test "$abi" = "x86_64"
test "$effective_locale" = "ja-JP"
test "$font_scale" = "1.0"
test -n "$resolution"
test -n "$density"
profile_json="$RUNNER_TEMP/android-observed-profile.json"
jq -n \
  --arg api_level "$api_level" \
  --arg abi "$abi" \
  --arg resolution "$resolution" \
  --arg density "$density" \
  --arg locale "$effective_locale" \
  --arg font_scale "$font_scale" \
  --arg ui_mode "$ui_mode" \
  --arg orientation "$orientation" \
  '{api_level: ($api_level | tonumber), abi: $abi, resolution: $resolution, density: ($density | tonumber), locale: $locale, font_scale: ($font_scale | tonumber), ui_mode: $ui_mode, orientation: $orientation}' \
  > "$profile_json"
pnpm exec tsx scripts/spec/android-visual-capture.ts validate-profile \
  --profile-json "$profile_json"
echo "ANDROID_OBSERVED_PROFILE_JSON=$profile_json" >> "$GITHUB_ENV"
